#!/usr/bin/env python3
"""
Background Worker for LSTM-based Shelf Life Predictions
========================================================

This worker:
1. Monitors new batches created by managers
2. Collects sensor readings (temperature, humidity, ethylene, CO2, O2)
3. Runs LSTM model predictions on collected data
4. Updates batch shelf life predictions
5. Triggers alerts when shelf life is predicted to be critical

Key Features:
- Continuous real-time sensor data collection via sensor_simulator.py
- LSTM neural network predicts actual shelf life based on sensor patterns
- Running predictions every 5 minutes (TTL cache prevents excessive computation)
- Alert generation for critical spoilage predictions
"""

import time
import schedule
import logging
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson.objectid import ObjectId

# Import services
from services.prediction_service import predict_for_batch
from services.alert_service import evaluate_alerts

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - LSTM Background Worker - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection
client = MongoClient("mongodb://localhost:27017")
db = client["shelfnet"]
batches_collection = db["batches"]
sensor_readings_collection = db["sensor_readings"]
alerts_collection = db["alerts"]

class LSTMBackgroundWorker:
    """
    Background worker for LSTM shelf-life predictions.
    
    Process Flow:
    1. Scan for active batches that need prediction updates
    2. Collect sensor data for each batch
    3. Feed data to LSTM model
    4. Update batch with predicted shelf life
    5. Evaluate alerts based on predictions
    6. Log results for monitoring
    """
    
    def __init__(self):
        self.processed_batches = set()
        self.logger = logger
        
    def run_predictions(self):
        """Main prediction loop - called every 5 minutes"""
        try:
            from routes.batch_routes import generate_sensor_readings
            
            active_batches = batches_collection.find({
                "status": "ACTIVE"
            })
            
            batch_count = 0
            for batch in active_batches:
                batch_id = batch.get("batch_id")
                
                if not batch_id:
                    continue
                    
                try:
                    # Generate new sensor readings for this batch (simulate continuous monitoring)
                    fruit = batch.get("fruit", "Apple")
                    warehouse_id = batch.get("warehouse_id")
                    quantity = batch.get("quantity_kg", 100)
                    
                    new_readings = generate_sensor_readings(
                        batch_id=batch_id,
                        fruit=fruit,
                        warehouse_id=warehouse_id,
                        quantity=quantity,
                        num_readings=3  # Add 3 new readings every cycle
                    )
                    sensor_readings_collection.insert_many(new_readings)
                    
                    # LSTM prediction with 30-minute TTL cache
                    predict_for_batch(batch_id, force=False)
                    batch_count += 1
                    
                    # Re-evaluate alerts after prediction
                    evaluate_alerts(batch_id)
                    
                    self.logger.info(f"✅ Updated predictions for batch: {batch_id}")
                    
                except Exception as e:
                    self.logger.error(f"❌ Prediction error for {batch_id}: {str(e)}")
                    
            self.logger.info(f"🔄 Completed predictions for {batch_count} active batches")
            
        except Exception as e:
            self.logger.error(f"❌ Worker error: {str(e)}")
    
    def get_sensor_statistics(self, batch_id: str):
        """
        Get sensor data statistics for a batch (used by LSTM model).
        
        Returns sensor patterns showing:
        - Temperature progressively decreasing (indicator of ripening)
        - Ethylene increasing (ripeness marker)
        - CO2 accumulation (respiration indicator)
        """
        try:
            sensor_data = list(sensor_readings_collection.find(
                {"batch_id": batch_id},
                sort=[("timestamp", -1)],
                limit=100
            ))
            
            if not sensor_data:
                return None
            
            stats = {
                "total_readings": len(sensor_data),
                "latest_reading": sensor_data[0].get("timestamp"),
                "data_points": sensor_data
            }
            
            return stats
            
        except Exception as e:
            self.logger.error(f"Error getting sensor stats: {e}")
            return None
    
    def log_worker_status(self):
        """Log current worker status for monitoring"""
        try:
            active_batches = batches_collection.count_documents({"status": "ACTIVE"})
            total_readings = sensor_readings_collection.count_documents({})
            recent_alerts = alerts_collection.count_documents({
                "created_at": {"$gte": datetime.utcnow() - timedelta(hours=1)}
            })
            
            self.logger.info(
                f"📊 Worker Status: {active_batches} active batches, "
                f"{total_readings} sensor readings, "
                f"{recent_alerts} alerts in last hour"
            )
        except Exception as e:
            self.logger.error(f"Error logging status: {e}")
    
    def start(self):
        """Start the background worker with scheduled tasks"""
        self.logger.info("🚀 Starting LSTM Background Worker...")
        
        # Schedule tasks
        schedule.every(5).minutes.do(self.run_predictions)  # Run predictions every 5 min
        schedule.every(1).hour.do(self.log_worker_status)   # Log status hourly
        
        # Main loop
        while True:
            try:
                schedule.run_pending()
                time.sleep(30)  # Check every 30 seconds
            except KeyboardInterrupt:
                self.logger.info("🛑 Stopping LSTM Background Worker...")
                break
            except Exception as e:
                self.logger.error(f"Unexpected error: {e}")
                time.sleep(60)

if __name__ == "__main__":
    worker = LSTMBackgroundWorker()
    worker.start()
