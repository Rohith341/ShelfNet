from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
import uuid
import numpy as np

from database import batches_collection, warehouses_collection, sensors_collection, sensor_readings_collection
from models.batch_model import BatchCreate
from utils.id_generator import generate_batch_id
from utils.auth_dependency import require_role, get_current_user
from services.prediction_service import predict_for_batch

def calculate_risk_level(predicted_shelf_life: float) -> str:
    """Calculate risk level based on predicted shelf life"""
    if predicted_shelf_life <= 2:
        return "CRITICAL"
    elif predicted_shelf_life <= 5:
        return "WARNING"
    else:
        return "SAFE"

router = APIRouter()

# Fruit-specific sensor profiles (simulated real-world conditions)
FRUIT_PROFILES = {
    "Apple": {"temp": 4, "humidity": 85, "ethylene": 0.1, "co2": 2, "o2": 18},
    "Banana": {"temp": 15, "humidity": 90, "ethylene": 2.5, "co2": 5, "o2": 15},
    "Strawberry": {"temp": 2, "humidity": 95, "ethylene": 0.05, "co2": 1, "o2": 19},
    "Pear": {"temp": 0, "humidity": 90, "ethylene": 0.2, "co2": 3, "o2": 17},
    "Grapes": {"temp": 0, "humidity": 95, "ethylene": 0.1, "co2": 1.5, "o2": 18},
    "Cherry": {"temp": -1, "humidity": 90, "ethylene": 0.05, "co2": 1, "o2": 19},
    "Mango": {"temp": 10, "humidity": 80, "ethylene": 1.5, "co2": 4, "o2": 16},
    "Orange": {"temp": 8, "humidity": 85, "ethylene": 0.3, "co2": 2, "o2": 18}
}

def generate_sensor_readings(batch_id: str, fruit: str, warehouse_id: str, quantity: int, num_readings: int = 15):
    """Generate simulated sensor readings for a batch"""
    profile = FRUIT_PROFILES.get(fruit, FRUIT_PROFILES["Apple"])
    
    # Add variation to simulate real sensor data
    sensor_readings = []
    base_time = datetime.utcnow() - timedelta(hours=num_readings)
    
    for i in range(num_readings):
        timestamp = base_time + timedelta(hours=i)
        
        # Add realistic drift and noise
        noise_factor = np.random.normal(1.0, 0.02)
        ripeness_factor = 1.0 + (i / num_readings) * 0.15  # Gradual ripening
        
        reading = {
            "batch_id": batch_id,
            "warehouse_id": warehouse_id,
            "timestamp": timestamp,
            "temperature": round(profile["temp"] * noise_factor * ripeness_factor, 2),
            "humidity": round(profile["humidity"] * noise_factor, 2),
            "ethylene": round(profile["ethylene"] * ripeness_factor * np.random.uniform(0.9, 1.1), 3),
            "co2": round(profile["co2"] * noise_factor * ripeness_factor, 2),
            "o2": round(profile["o2"] * noise_factor, 2),
            "quantity_monitored": quantity
        }
        sensor_readings.append(reading)
    
    return sensor_readings

@router.post(
    "",
    dependencies=[Depends(require_role(["MANAGER"]))],
)
def create_batch(
    batch: BatchCreate,
    user=Depends(get_current_user)
):
    # 1. Enforce warehouse ownership
    if user["warehouse_id"] != batch.warehouse_id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized for this warehouse"
        )

    # 2. Ensure warehouse exists & active
    warehouse = warehouses_collection.find_one(
        {"warehouse_id": batch.warehouse_id, "status": "ACTIVE"}
    )
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # 3. Generate batch ID
    count = batches_collection.count_documents(
        {"fruit": batch.fruit}
    ) + 1
    batch_id = generate_batch_id(batch.fruit, count)

    # 4. Insert batch document (no sensor assignment needed)
    batch_doc = {
        "batch_id": batch_id,
        **batch.dict(),
        "status": "ACTIVE",
        "created_at": datetime.utcnow(),
        "created_by_user_id": user["user_id"],
        "assigned_sensor_id": None  # No sensor assignment required
    }

    batches_collection.insert_one(batch_doc)

    # 5. Generate initial sensor readings (simulated)
    sensor_readings = generate_sensor_readings(
        batch_id=batch_id,
        fruit=batch.fruit,
        warehouse_id=batch.warehouse_id,
        quantity=batch.quantity_kg,
        num_readings=15
    )
    
    # Store in sensor_readings collection
    from database import sensor_readings_collection
    sensor_readings_collection.insert_many(sensor_readings)

    # 6. Increment warehouse counter
    warehouses_collection.update_one(
        {"warehouse_id": batch.warehouse_id},
        {"$inc": {"active_batches_count": 1}}
    )

    # 7. Trigger initial LSTM prediction
    predicted_shelf_life = None
    risk_level = "PENDING"
    
    try:
        predicted_shelf_life = predict_for_batch(batch_id, force=True)
        risk_level = calculate_risk_level(predicted_shelf_life)
        print(f"✅ Prediction for {batch_id}: {predicted_shelf_life} days (Risk: {risk_level})")
    except Exception as e:
        print(f"⚠️ Prediction error for {batch_id}: {str(e)}")

    # 8. Fetch updated batch with prediction
    updated_batch = batches_collection.find_one(
        {"batch_id": batch_id},
        {"_id": 0}
    )

    return {
        "batch_id": batch_id,
        "fruit": batch.fruit,
        "quantity_kg": batch.quantity_kg,
        "warehouse_id": batch.warehouse_id,
        "status": "ACTIVE",
        "sensor_readings_generated": len(sensor_readings),
        "predicted_remaining_shelf_life_days": predicted_shelf_life,
        "risk_level": risk_level,
        "arrival_date": batch.arrival_date,
        "expected_shelf_life_days": batch.expected_shelf_life_days,
        "created_at": batch_doc["created_at"]
    }


@router.get("")
def list_batches(
    warehouse_id: str | None = Query(None),
    user=Depends(get_current_user)
):
    role = user["role"]

    # Build query
    if role == "ADMIN":
        query = {}
        if warehouse_id:
            query["warehouse_id"] = warehouse_id
    else:
        # MANAGER / SALES → forced warehouse from token
        query = {"warehouse_id": user["warehouse_id"]}

    batches = list(batches_collection.find(query, {"_id": 0}))

    # AUTO-REFRESH PREDICTIONS (lazy live update)
    updated_batches = []
    for b in batches:
        try:
            # Trigger prediction update
            predict_for_batch(b["batch_id"], force=False)
            
            # Fetch latest batch data with prediction
            latest_batch = batches_collection.find_one(
                {"batch_id": b["batch_id"]},
                {"_id": 0}
            )
            
            if latest_batch:
                # Calculate risk level based on prediction
                predicted_shelf = latest_batch.get("predicted_remaining_shelf_life_days")
                if predicted_shelf is not None:
                    risk_level = calculate_risk_level(predicted_shelf)
                else:
                    risk_level = "PENDING"
                
                latest_batch["risk_level"] = risk_level
                updated_batches.append(latest_batch)
            else:
                updated_batches.append(b)
        except Exception as e:
            print(f"⚠️ Error updating batch {b.get('batch_id')}: {str(e)}")
            b["risk_level"] = "PENDING"
            updated_batches.append(b)

    return updated_batches


@router.post("/{batch_id}/generate-readings")
def generate_batch_readings(
    batch_id: str,
    num_readings: int = 5,
    user=Depends(get_current_user)
):
    """Generate additional sensor readings for continuous prediction updates"""
    batch = batches_collection.find_one({"batch_id": batch_id})
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Authorization check
    if user["role"] == "MANAGER" and batch["warehouse_id"] != user["warehouse_id"]:
        raise HTTPException(status_code=403, detail="Not authorized for this batch")
    
    # Generate new readings
    from database import sensor_readings_collection
    sensor_readings = generate_sensor_readings(
        batch_id=batch_id,
        fruit=batch["fruit"],
        warehouse_id=batch["warehouse_id"],
        quantity=batch["quantity_kg"],
        num_readings=num_readings
    )
    
    # Insert new readings
    sensor_readings_collection.insert_many(sensor_readings)
    
    # Trigger prediction update
    try:
        predicted_shelf_life = predict_for_batch(batch_id, force=True)
    except Exception as e:
        predicted_shelf_life = None
    
    return {
        "batch_id": batch_id,
        "readings_generated": len(sensor_readings),
        "predicted_shelf_life_days": predicted_shelf_life
    }


@router.post("/{batch_id}/close")
def close_batch(
    batch_id: str,
    user=Depends(get_current_user)
):
    batch = batches_collection.find_one(
        {"batch_id": batch_id, "status": "ACTIVE"}
    )

    if not batch:
        raise HTTPException(status_code=404, detail="Active batch not found")

    if user["role"] == "MANAGER" and batch["warehouse_id"] != user["warehouse_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # 1. Mark batch inactive
    batches_collection.update_one(
        {"batch_id": batch_id},
        {"$set": {"status": "INACTIVE", "closed_at": datetime.utcnow()}}
    )

    # 2. Free up assigned sensor
    if batch.get("assigned_sensor_id"):
        sensors_collection.update_one(
            {"sensor_id": batch["assigned_sensor_id"]},
            {"$unset": {"current_batch_id": ""}}
        )

    # 3. 🔥 Decrement warehouse counter
    warehouses_collection.update_one(
        {"warehouse_id": batch["warehouse_id"]},
        {"$inc": {"active_batches_count": -1}}
    )

    return {"status": "CLOSED"}
