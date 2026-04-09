import random
import time
import threading
from datetime import datetime, timedelta
from pymongo import MongoClient
import schedule
from services.prediction_service import predict_for_batch
from services.alert_service import evaluate_alerts

client = MongoClient("mongodb://localhost:27017")
db = client["shelfnet"]

batches_col = db["batches"]
sensors_col = db["sensors"]
readings_col = db["sensor_readings"]

# Real-world fruit profiles with spoilage characteristics
FRUIT_PROFILES = {
    "Apple": {
        "temperature": (3.0, 6.0), "humidity": (85, 95), "ethylene": (1.5, 3.0),
        "shelf_life_days": 30, "ethylene_drift": 0.08, "co2_drift": 0.05, "o2_drift": 0.06
    },
    "Banana": {
        "temperature": (13.0, 18.0), "humidity": (85, 95), "ethylene": (2.5, 6.0),
        "shelf_life_days": 7, "ethylene_drift": 0.15, "co2_drift": 0.08, "o2_drift": 0.10
    },
    "Strawberry": {
        "temperature": (0.0, 4.0), "humidity": (90, 95), "ethylene": (0.1, 0.5),
        "shelf_life_days": 5, "ethylene_drift": 0.03, "co2_drift": 0.02, "o2_drift": 0.04
    },
    "Pear": {
        "temperature": (0.0, 4.0), "humidity": (85, 95), "ethylene": (1.0, 3.5),
        "shelf_life_days": 21, "ethylene_drift": 0.06, "co2_drift": 0.04, "o2_drift": 0.05
    },
    "Grapes": {
        "temperature": (0.0, 2.0), "humidity": (90, 95), "ethylene": (0.1, 0.4),
        "shelf_life_days": 14, "ethylene_drift": 0.02, "co2_drift": 0.03, "o2_drift": 0.03
    },
    "Cherry": {
        "temperature": (0.0, 2.0), "humidity": (90, 95), "ethylene": (0.2, 0.6),
        "shelf_life_days": 10, "ethylene_drift": 0.04, "co2_drift": 0.03, "o2_drift": 0.04
    },
    "Tomato": {
        "temperature": (12.0, 18.0), "humidity": (85, 95), "ethylene": (2.0, 5.0),
        "shelf_life_days": 14, "ethylene_drift": 0.10, "co2_drift": 0.06, "o2_drift": 0.08
    }
}

class RealTimeSensorSimulator:
    def __init__(self):
        self.running = False
        self.thread = None
        print("🏭 Real-Time Sensor Simulator initialized")

    def generate_reading(self, fruit, days_since_arrival, base_temp=None, base_humidity=None):
        """Generate realistic sensor reading with spoilage progression"""
        profile = FRUIT_PROFILES.get(fruit, FRUIT_PROFILES["Apple"])

        # Environmental factors (warehouse conditions)
        if base_temp is None:
            base_temp = random.uniform(*profile["temperature"])
        if base_humidity is None:
            base_humidity = random.uniform(*profile["humidity"])

        # Spoilage progression based on days since arrival
        spoilage_factor = min(days_since_arrival / profile["shelf_life_days"], 1.0)

        # Temperature with slight variations
        temp_variation = random.uniform(-1.0, 1.0)
        temperature = round(base_temp + temp_variation, 2)

        # Humidity with variations
        humidity_variation = random.uniform(-2.0, 2.0)
        humidity = round(max(0, min(100, base_humidity + humidity_variation)), 2)

        # Gas levels with spoilage drift
        ethylene_base = random.uniform(*profile["ethylene"])
        ethylene = round(min(10.0, ethylene_base + (spoilage_factor * profile["ethylene_drift"] * days_since_arrival)), 2)

        co2_base = random.uniform(0.6, 1.4)
        co2 = round(min(5.0, co2_base + (spoilage_factor * profile["co2_drift"] * days_since_arrival)), 2)

        o2_base = random.uniform(18.0, 20.5)
        o2 = round(max(10.0, o2_base - (spoilage_factor * profile["o2_drift"] * days_since_arrival)), 2)

        return {
            "temperature": temperature,
            "humidity": humidity,
            "ethylene": ethylene,
            "co2": co2,
            "o2": o2,
            "light": random.choice([0, 10, 50, 120]),
            "vibration": round(random.uniform(0.0, 0.05), 3),
            "power_status": "ON"
        }

    def simulate_batch_readings(self, batch):
        """Generate readings for a specific batch"""
        batch_id = batch["batch_id"]
        warehouse_id = batch["warehouse_id"]
        fruit = batch["fruit"]
        arrival_date = batch["arrival_date"]

        # Find assigned sensor
        sensor = sensors_col.find_one(
            {"current_batch_id": batch_id, "status": "ACTIVE"},
            {"_id": 0}
        )

        if not sensor:
            return  # No sensor assigned

        # Calculate days since arrival
        days_since_arrival = (datetime.utcnow() - arrival_date).total_seconds() / (3600 * 24)

        # Generate reading
        reading = self.generate_reading(fruit, days_since_arrival)

        doc = {
            "batch_id": batch_id,
            "sensor_id": sensor["sensor_id"],
            "warehouse_id": warehouse_id,
            "timestamp": datetime.utcnow(),
            **reading
        }

        readings_col.insert_one(doc)
        print(f"📊 Sensor reading: {batch_id} ({fruit}) - Temp: {reading['temperature']}°C, Ethylene: {reading['ethylene']} ppm")

    def update_predictions(self):
        """Update predictions for all active batches"""
        print("🔮 Updating predictions for all active batches...")

        active_batches = list(batches_col.find({"status": "ACTIVE"}, {"_id": 0}))
        updated_count = 0
        failed_count = 0

        for batch in active_batches:
            try:
                prediction = predict_for_batch(batch["batch_id"])
                updated_count += 1
                print(f"✅ Updated prediction for {batch['batch_id']} ({batch['fruit']}): {prediction:.1f} days remaining")
            except Exception as e:
                failed_count += 1
                print(f"❌ Failed to predict for {batch['batch_id']} ({batch['fruit']}): {e}")

        print(f"📈 Updated predictions for {updated_count} batches, {failed_count} failed")

        # If all predictions failed, it might be due to missing ML model
        if updated_count == 0 and len(active_batches) > 0:
            print("⚠️ No predictions updated. Check if ML model is trained and available.")

    def process_alerts(self):
        """Process alerts for all active batches"""
        print("🚨 Processing alerts...")

        active_batches = list(batches_col.find({"status": "ACTIVE"}, {"_id": 0}))

        for batch in active_batches:
            try:
                evaluate_alerts(batch["batch_id"])
            except Exception as e:
                print(f"❌ Failed to evaluate alerts for {batch['batch_id']}: {e}")

    def run_simulation_cycle(self):
        """Run one complete simulation cycle"""
        if not self.running:
            return

        print(f"\n🌟 Starting simulation cycle at {datetime.utcnow()}")

        # Get all active batches
        active_batches = list(batches_col.find({"status": "ACTIVE"}, {"_id": 0}))

        if not active_batches:
            print("⚠️ No active batches found")
            return

        print(f"📦 Processing {len(active_batches)} active batches")

        # Generate sensor readings for each batch
        for batch in active_batches:
            self.simulate_batch_readings(batch)

        # Update predictions every 6 cycles (3 hours with 30-min intervals)
        if hasattr(self, 'cycle_count'):
            self.cycle_count += 1
        else:
            self.cycle_count = 1

        if self.cycle_count % 6 == 0:
            self.update_predictions()

        # Process alerts every 2 cycles (1 hour)
        if self.cycle_count % 2 == 0:
            self.process_alerts()

        print(f"✅ Simulation cycle completed")

    def start_continuous_simulation(self, interval_minutes=30):
        """Start continuous real-time simulation"""
        if self.running:
            print("⚠️ Simulator already running")
            return

        self.running = True
        self.cycle_count = 0

        def simulation_loop():
            while self.running:
                try:
                    self.run_simulation_cycle()
                    time.sleep(interval_minutes * 60)  # Convert to seconds
                except Exception as e:
                    print(f"❌ Simulation error: {e}")
                    time.sleep(60)  # Wait 1 minute before retrying

        self.thread = threading.Thread(target=simulation_loop, daemon=True)
        self.thread.start()

        print(f"🚀 Real-Time Sensor Simulator started (interval: {interval_minutes} minutes)")
        print("📊 Generating live sensor data for all active batches")
        print("🔮 Updating predictions every 3 hours")
        print("🚨 Processing alerts every hour")

    def stop_simulation(self):
        """Stop the continuous simulation"""
        if not self.running:
            print("⚠️ Simulator not running")
            return

        self.running = False
        if self.thread:
            self.thread.join(timeout=5)

        print("🛑 Real-Time Sensor Simulator stopped")

# Global simulator instance
simulator = RealTimeSensorSimulator()

def start_real_time_simulation(interval_minutes=30):
    """Start the real-time sensor simulation"""
    simulator.start_continuous_simulation(interval_minutes)

def stop_real_time_simulation():
    """Stop the real-time sensor simulation"""
    simulator.stop_simulation()

# Legacy functions for backward compatibility
def generate_reading(fruit, day_index):
    """Legacy function for backward compatibility"""
    profile = FRUIT_PROFILES.get(fruit, FRUIT_PROFILES["Apple"])
    spoilage_factor = min(day_index / profile["shelf_life_days"], 1.0)

    return {
        "temperature": round(random.uniform(*profile["temperature"]), 2),
        "humidity": round(random.uniform(*profile["humidity"]), 2),
        "ethylene": round(min(profile["ethylene"][1], random.uniform(*profile["ethylene"]) + (spoilage_factor * profile["ethylene_drift"] * day_index)), 2),
        "co2": round(min(2.5, random.uniform(0.6, 1.4) + (spoilage_factor * profile["co2_drift"] * day_index)), 2),
        "o2": round(max(16.0, random.uniform(18.0, 20.5) - (spoilage_factor * profile["o2_drift"] * day_index)), 2),
        "light": random.choice([0, 10, 50, 120]),
        "vibration": round(random.uniform(0.0, 0.05), 3),
        "power_status": "ON"
    }

def generate_future_readings(days=7, interval_minutes=30):
    """Legacy function - generates historical data"""
    print("🔄 Generating historical sensor readings for ML training...\n")

    start_time = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    interval = timedelta(minutes=interval_minutes)

    active_batches = list(batches_col.find({"status": "ACTIVE"}, {"_id": 0}))

    total_inserted = 0

    for batch in active_batches:
        batch_id = batch["batch_id"]
        warehouse_id = batch["warehouse_id"]
        fruit = batch["fruit"]

        sensor = sensors_col.find_one(
            {"current_batch_id": batch_id},
            {"_id": 0}
        )

        if not sensor:
            print(f"⚠️ No sensor for batch {batch_id}")
            continue

        for day in range(days):
            current_time = start_time + timedelta(days=day)

            for _ in range(int(24 * 60 / interval_minutes)):
                reading = generate_reading(fruit, day)

                doc = {
                    "batch_id": batch_id,
                    "sensor_id": sensor["sensor_id"],
                    "warehouse_id": warehouse_id,
                    "timestamp": current_time,
                    **reading
                }

                readings_col.insert_one(doc)
                total_inserted += 1

                current_time += interval

    print(f"\n✅ Done! Inserted {total_inserted} historical readings.")
    print("📊 Data now spans multiple days and is ML-ready.")

if __name__ == "__main__":
    print("🏭 ShelfNet Real-Time Sensor Simulator")
    print("=" * 50)
    print("1. Generate historical data for ML training")
    print("2. Start real-time continuous simulation")
    print("3. Stop real-time simulation")
    print("=" * 50)

    choice = input("Choose option (1-3): ").strip()

    if choice == "1":
        generate_future_readings(days=7, interval_minutes=30)
    elif choice == "2":
        print("🚀 Starting real-time simulation...")
        start_real_time_simulation(interval_minutes=30)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping simulation...")
            stop_real_time_simulation()
    elif choice == "3":
        stop_real_time_simulation()
    else:
        print("❌ Invalid choice")
