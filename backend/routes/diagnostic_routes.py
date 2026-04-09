"""
Diagnostic routes to verify prediction system and real-time data pipeline
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
import random
from database import batches_collection, sensors_collection, sensor_readings_collection
from utils.auth_dependency import require_role, get_current_user
from services.prediction_service import predict_for_batch
from ml.dataset import FEATURES, SEQUENCE_LENGTH

router = APIRouter()

@router.get("/health/prediction-pipeline")
def check_prediction_pipeline(
    _=Depends(require_role(["ADMIN", "MANAGER"]))
):
    """Check if prediction pipeline is operational"""
    
    # Check ML model
    try:
        from services.prediction_service import _load_model
        model, scaler = _load_model()
        model_loaded = model is not None and scaler is not None
        model_status = "✅ LOADED" if model_loaded else "❌ NOT LOADED"
    except Exception as e:
        model_status = f"❌ ERROR: {str(e)}"
        model_loaded = False
    
    # Check database
    batches = list(batches_collection.find({"status": "ACTIVE"}, {"_id": 0}))
    sensors = list(sensors_collection.find({"status": "ACTIVE"}, {"_id": 0}))
    sensor_readings_count = sensor_readings_collection.count_documents({})
    
    # Check batch predictions
    batches_with_predictions = batches_collection.count_documents(
        {"status": "ACTIVE", "predicted_remaining_shelf_life_days": {"$exists": True}}
    )
    batches_without_predictions = len(batches) - batches_with_predictions
    
    # Analyze each batch's readiness
    batch_details = []
    for batch in batches:
        batch_id = batch["batch_id"]
        readings_count = sensor_readings_collection.count_documents({"batch_id": batch_id})
        has_prediction = batch.get("predicted_remaining_shelf_life_days") is not None
        
        batch_details.append({
            "batch_id": batch_id,
            "fruit": batch["fruit"],
            "readings_count": readings_count,
            "required_for_prediction": SEQUENCE_LENGTH,
            "can_predict": readings_count >= SEQUENCE_LENGTH,
            "has_prediction": has_prediction,
            "prediction_value": batch.get("predicted_remaining_shelf_life_days", "N/A"),
            "sensor_assigned": "current_batch_id" in batch or "assigned_sensor_id" in batch
        })
    
    return {
        "timestamp": datetime.utcnow(),
        "ml_model": model_status,
        "model_loaded": model_loaded,
        "database": {
            "active_batches": len(batches),
            "active_sensors": len(sensors),
            "total_sensor_readings": sensor_readings_count,
            "batches_with_predictions": batches_with_predictions,
            "batches_without_predictions": batches_without_predictions
        },
        "sequence_requirements": {
            "sequence_length_required": SEQUENCE_LENGTH,
            "features": FEATURES
        },
        "batch_readiness": batch_details,
        "recommendation": generate_recommendation(batches, batch_details)
    }

@router.post("/generate-initial-readings/{batch_id}")
def generate_initial_readings(
    batch_id: str,
    days: int = 5,
    _=Depends(require_role(["ADMIN"]))
):
    """Generate historical sensor readings for a batch to enable predictions"""
    
    batch = batches_collection.find_one({"batch_id": batch_id})
    if not batch:
        return {"error": f"Batch {batch_id} not found"}
    
    sensor = sensors_collection.find_one(
        {"current_batch_id": batch_id, "status": "ACTIVE"},
        {"_id": 0}
    )
    if not sensor:
        return {"error": f"No sensor assigned to batch {batch_id}"}
    
    # Generate historical readings
    from simulator.sensor_simulator import RealTimeSensorSimulator
    simulator = RealTimeSensorSimulator()
    
    fruit = batch["fruit"]
    warehouse_id = batch["warehouse_id"]
    arrival_date = batch["arrival_date"]
    sensor_id = sensor["sensor_id"]
    
    readings_inserted = 0
    start_time = arrival_date
    
    # Generate readings every 30 minutes for the specified days
    for day in range(days):
        current_time = start_time + timedelta(days=day)
        
        # 48 readings per day (every 30 minutes)
        for hour_block in range(48):
            days_since_arrival = (current_time - arrival_date).total_seconds() / (3600 * 24)
            
            reading = simulator.generate_reading(fruit, days_since_arrival)
            
            doc = {
                "batch_id": batch_id,
                "sensor_id": sensor_id,
                "warehouse_id": warehouse_id,
                "timestamp": current_time,
                **reading
            }
            
            sensor_readings_collection.insert_one(doc)
            readings_inserted += 1
            
            # Move time forward by 30 minutes
            current_time += timedelta(minutes=30)
    
    return {
        "batch_id": batch_id,
        "fruit": fruit,
        "readings_generated": readings_inserted,
        "days_simulated": days,
        "status": "✅ Historical readings generated successfully"
    }

@router.post("/trigger-predictions")
def trigger_predictions(
    _=Depends(require_role(["ADMIN"]))
):
    """Manually trigger prediction updates for all active batches"""
    
    batches = list(batches_collection.find({"status": "ACTIVE"}, {"_id": 0}))
    results = {
        "total_batches": len(batches),
        "successful": 0,
        "failed": 0,
        "predictions": []
    }
    
    for batch in batches:
        batch_id = batch["batch_id"]
        try:
            prediction = predict_for_batch(batch_id, force=True)
            results["successful"] += 1
            results["predictions"].append({
                "batch_id": batch_id,
                "fruit": batch["fruit"],
                "prediction_days": prediction,
                "status": "✅ SUCCESS"
            })
        except Exception as e:
            results["failed"] += 1
            results["predictions"].append({
                "batch_id": batch_id,
                "fruit": batch["fruit"],
                "error": str(e),
                "status": "❌ FAILED"
            })
    
    return results

@router.get("/batch/{batch_id}/prediction-status")
def get_batch_prediction_status(
    batch_id: str,
    user=Depends(get_current_user)
):
    """Get detailed prediction status for a specific batch"""
    
    batch = batches_collection.find_one({"batch_id": batch_id})
    if not batch:
        return {"error": f"Batch {batch_id} not found"}
    
    # Check warehouse access for managers
    if user["role"] == "MANAGER":
        if user.get("warehouse_id") != batch.get("warehouse_id"):
            return {"error": "Access denied"}
    
    readings_count = sensor_readings_collection.count_documents({"batch_id": batch_id})
    has_prediction = batch.get("predicted_remaining_shelf_life_days") is not None
    can_predict = readings_count >= SEQUENCE_LENGTH
    
    return {
        "batch_id": batch_id,
        "fruit": batch["fruit"],
        "warehouse_id": batch["warehouse_id"],
        "status": batch.get("status"),
        "sensor_readings": {
            "count": readings_count,
            "required_for_prediction": SEQUENCE_LENGTH,
            "ready_to_predict": can_predict,
            "missing_readings": max(0, SEQUENCE_LENGTH - readings_count)
        },
        "prediction": {
            "has_prediction": has_prediction,
            "value_days": batch.get("predicted_remaining_shelf_life_days", "N/A"),
            "last_updated": batch.get("last_predicted_at", "Never"),
            "can_update": can_predict
        },
        "recommendation": get_batch_recommendation(readings_count, has_prediction),
        "next_action": get_next_action(readings_count, has_prediction)
    }

def generate_recommendation(batches, batch_details):
    """Generate overall recommendation for the system"""
    
    if not batches:
        return "⚠️ No active batches. Create batches to begin monitoring."
    
    ready_batches = [b for b in batch_details if b["can_predict"]]
    predicted_batches = [b for b in batch_details if b["has_prediction"]]
    
    if len(predicted_batches) == len(batches):
        return "✅ All batches have predictions. System is fully operational!"
    
    if len(ready_batches) > 0:
        return f"🔄 {len(ready_batches)}/{len(batches)} batches ready for prediction. Run 'trigger-predictions' endpoint."
    
    avg_readings = sum(b["readings_count"] for b in batch_details) / len(batch_details) if batch_details else 0
    time_until_ready = (SEQUENCE_LENGTH - int(avg_readings)) * 30  # minutes
    hours = time_until_ready / 60
    
    return f"⏳ Batches need {SEQUENCE_LENGTH - int(avg_readings)} more readings. ETA: {hours:.1f} hours with 30-min intervals."

def get_batch_recommendation(readings_count, has_prediction):
    """Get specific recommendation for a batch"""
    
    if has_prediction:
        return "✅ Prediction available. Monitor shelf life in dashboards."
    
    if readings_count >= SEQUENCE_LENGTH:
        return "🔄 Ready for prediction. Trigger prediction update."
    
    missing = SEQUENCE_LENGTH - readings_count
    eta_hours = (missing * 30) / 60
    return f"⏳ Need {missing} more readings ({eta_hours:.1f} hours with current interval)."

def get_next_action(readings_count, has_prediction):
    """Get next recommended action for a batch"""
    
    if has_prediction:
        return ["Monitor in Manager Dashboard", "View in Sales Dashboard", "Check Alert Status"]
    
    if readings_count >= SEQUENCE_LENGTH:
        return ["POST /api/v1/trigger-predictions (admin only)"]
    
    return ["Wait for more sensor readings", "Or POST /api/v1/diagnostics/generate-initial-readings/{batch_id} (admin only)"]
