from fastapi import APIRouter, HTTPException, Depends
from pymongo import MongoClient
from datetime import datetime, timedelta
from bson import ObjectId

from utils.auth_dependency import require_role, get_current_user
from services.prediction_service import predict_for_batch

router = APIRouter(
    prefix="/manager",
    tags=["Manager Dashboard"],
    dependencies=[Depends(require_role(["MANAGER", "ADMIN"]))]
)

client = MongoClient("mongodb://localhost:27017")
db = client["shelfnet"]

batches_col = db["batches"]
alerts_col = db["alerts"]
sensors_col = db["sensors"]
readings_col = db["sensor_readings"]

def check_warehouse_access(user, warehouse_id: str):
    if user["role"] == "MANAGER" and user.get("warehouse_id") != warehouse_id:
        raise HTTPException(status_code=403, detail="Access denied to this warehouse")

@router.get("/{warehouse_id}/kpis")
def get_manager_kpis(
    warehouse_id: str,
    user=Depends(get_current_user)
):
    check_warehouse_access(user, warehouse_id)

    return {
        "active_batches": batches_col.count_documents({
            "warehouse_id": warehouse_id,
            "status": "ACTIVE"
        }),
        "critical_alerts": alerts_col.count_documents({
            "warehouse_id": warehouse_id,
            "alert_type": "CRITICAL",
            "resolved": False
        }),
        "expiring_batches": batches_col.count_documents({
            "warehouse_id": warehouse_id,
            "predicted_remaining_shelf_life_days": {"$lte": 5}
        }),
        "sensors_online": sensors_col.count_documents({
            "warehouse_id": warehouse_id,
            "status": "ACTIVE"
        }),
        "sensors_total": sensors_col.count_documents({
            "warehouse_id": warehouse_id
        })
    }


@router.get("/{warehouse_id}/alerts")
def get_warehouse_alerts(
    warehouse_id: str,
    user=Depends(get_current_user)
):
    check_warehouse_access(user, warehouse_id)

    return list(
        alerts_col.find(
            {"warehouse_id": warehouse_id, "resolved": False},
            {"_id": 0}
        ).sort("created_at", -1)
    )


@router.get("/{warehouse_id}/batches")
def get_active_batches(
    warehouse_id: str,
    user=Depends(get_current_user)
):
    check_warehouse_access(user, warehouse_id)

    try:
        print(f"[get_active_batches] warehouse_id={warehouse_id}, user_id={user.get('user_id', 'unknown')}, role={user.get('role', 'unknown')}" )

        batches = list(
            batches_col.find(
                {"warehouse_id": warehouse_id, "status": "ACTIVE"},
                {"_id": 0}
            )
        )

        for batch in batches:
            print(f"[get_active_batches] processing batch {batch.get('batch_id')} with existing predicted={batch.get('predicted_remaining_shelf_life_days')}")
            batch_id = batch.get("batch_id")

            # Count active alerts
            alert_count = alerts_col.count_documents({
                "batch_id": batch_id,
                "resolved": False
            })

            # Predict or fallback shelf life value
            remaining = batch.get("predicted_remaining_shelf_life_days")
            if remaining is None:
                try:
                    remaining = predict_for_batch(batch_id)
                except Exception as pred_err:
                    # fallback estimate using expected shelf life and age
                    remaining = None
                    arrival = batch.get("arrival_date")
                    expected = batch.get("expected_shelf_life_days")
                    if arrival and expected is not None:
                        if isinstance(arrival, str):
                            try:
                                arrival_dt = datetime.fromisoformat(arrival)
                            except Exception:
                                arrival_dt = None
                        else:
                            arrival_dt = arrival

                        if arrival_dt:
                            age_days = (datetime.utcnow() - arrival_dt).total_seconds() / 86400
                            remaining = max(0, float(expected) - age_days)

            if remaining is None:
                remaining = 999

            batch["predicted_remaining_shelf_life_days"] = round(float(remaining), 2)
            # update risk based on remaining shelf life
            batch["risk_level"] = (
                "CRITICAL" if remaining <= 2 else
                "WARNING" if remaining <= 5 else
                "SAFE"
            )
            batch["active_alerts"] = alert_count
            
            # Convert all datetime objects to ISO strings for JSON serialization
            if isinstance(batch.get("arrival_date"), datetime):
                batch["arrival_date"] = batch["arrival_date"].isoformat()
            if isinstance(batch.get("created_at"), datetime):
                batch["created_at"] = batch["created_at"].isoformat()
            if isinstance(batch.get("last_predicted_at"), datetime):
                batch["last_predicted_at"] = batch["last_predicted_at"].isoformat()

        return batches

    except Exception as e:
        import traceback
        print("[manager_dashboard_routes] get_active_batches error:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{warehouse_id}/batches/{batch_id}/refresh-prediction")
def refresh_batch_prediction(
    warehouse_id: str,
    batch_id: str,
    user=Depends(get_current_user)
):
    """Manually refresh prediction for a batch"""
    check_warehouse_access(user, warehouse_id)
    
    batch = batches_col.find_one({"batch_id": batch_id, "warehouse_id": warehouse_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    try:
        # Force prediction recalculation
        predicted_value = predict_for_batch(batch_id, force=True)
    except Exception as e:
        # fallback to last value or estimate, not fatal
        prediction_error = str(e)
        predicted_value = None

    # Return updated batch
    updated_batch = batches_col.find_one(
        {"batch_id": batch_id},
        {"_id": 0}
    )
    if not updated_batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    remaining = updated_batch.get("predicted_remaining_shelf_life_days")
    if remaining is None and updated_batch.get("expected_shelf_life_days") is not None:
        arrival = updated_batch.get("arrival_date")
        if isinstance(arrival, str):
            from datetime import datetime
            try:
                arrival_dt = datetime.fromisoformat(arrival)
            except Exception:
                arrival_dt = None
        else:
            arrival_dt = arrival

        if arrival_dt:
            age_days = (datetime.utcnow() - arrival_dt).total_seconds() / 86400
            remaining = max(0, float(updated_batch.get("expected_shelf_life_days", 0)) - age_days)
            updated_batch["predicted_remaining_shelf_life_days"] = round(remaining, 2)

    if remaining is None:
        remaining = 999

    updated_batch["risk_level"] = (
        "CRITICAL" if remaining <= 2 else
        "WARNING" if remaining <= 5 else
        "SAFE"
    )

    response_payload = {
        "status": "success",
        "batch": updated_batch,
        "prediction": predicted_value if predicted_value is not None else remaining
    }
    if 'prediction_error' in locals():
        response_payload["warning"] = f"Prediction failed, using fallback: {prediction_error}"

    return response_payload


@router.get("/{warehouse_id}/realtime-dashboard")
def get_realtime_dashboard(
    warehouse_id: str,
    user=Depends(get_current_user)
):
    check_warehouse_access(user, warehouse_id)

    # Get all active batches with their latest sensor readings
    batches = list(
        batches_col.find(
            {"warehouse_id": warehouse_id, "status": "ACTIVE"},
            {"_id": 0}
        )
    )

    dashboard_data = {
        "warehouse_id": warehouse_id,
        "timestamp": datetime.utcnow(),
        "summary": {
            "total_batches": len(batches),
            "critical_batches": 0,
            "warning_batches": 0,
            "safe_batches": 0,
            "total_alerts": 0
        },
        "batches": []
    }

    for batch in batches:
        batch_id = batch.get("batch_id")

        # Get latest sensor reading
        latest_reading = readings_col.find_one(
            {"batch_id": batch_id},
            {"_id": 0}
        )
        latest_reading = dict(sorted(latest_reading.items(), key=lambda x: x[0])) if latest_reading else None

        # Count active alerts
        alert_count = alerts_col.count_documents({
            "batch_id": batch_id,
            "resolved": False
        })

        # Determine risk level from cached prediction
        remaining = batch.get("predicted_remaining_shelf_life_days", 999)
        risk_level = (
            "CRITICAL" if remaining <= 2 else
            "WARNING" if remaining <= 5 else
            "SAFE"
        )

        # Update summary counters
        if risk_level == "CRITICAL":
            dashboard_data["summary"]["critical_batches"] += 1
        elif risk_level == "WARNING":
            dashboard_data["summary"]["warning_batches"] += 1
        else:
            dashboard_data["summary"]["safe_batches"] += 1

        dashboard_data["summary"]["total_alerts"] += alert_count

        # Add batch data
        batch_data = {
            "batch_id": batch["batch_id"],
            "fruit": batch["fruit"],
            "quantity": batch["quantity"],
            "arrival_date": batch["arrival_date"],
            "predicted_remaining_shelf_life_days": remaining,
            "assigned_sensor_id": batch.get("assigned_sensor_id"),
            "latest_reading": latest_reading,
            "active_alerts": alert_count,
            "risk_level": risk_level,
            "last_prediction_update": batch.get("last_predicted_at")
        }

        dashboard_data["batches"].append(batch_data)

    # Sort batches by risk level (critical first)
    risk_order = {"CRITICAL": 0, "WARNING": 1, "SAFE": 2}
    dashboard_data["batches"].sort(key=lambda x: risk_order.get(x["risk_level"], 3))

    return dashboard_data


@router.get("/batch/{batch_id}/details")
def get_batch_details(
    batch_id: str,
    user=Depends(get_current_user)
):
    batch = batches_col.find_one({"batch_id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    check_warehouse_access(user, batch["warehouse_id"])

    sensor = sensors_col.find_one({"current_batch_id": batch_id}, {"_id": 0})

    latest_reading = readings_col.find_one(
        {"batch_id": batch_id},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )

    alerts = list(
        alerts_col.find({"batch_id": batch_id}, {"_id": 0})
        .sort("created_at", -1)
    )

    return {
        "batch": batch,
        "sensor": sensor,
        "latest_reading": latest_reading,
        "alerts": alerts
    }


@router.get("/batch/{batch_id}/trends")
def get_sensor_trends(
    batch_id: str,
    hours: int = 24,
    user=Depends(get_current_user)
):
    batch = batches_col.find_one({"batch_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    check_warehouse_access(user, batch["warehouse_id"])

    since = datetime.utcnow() - timedelta(hours=hours)

    return list(
        readings_col.find(
            {"batch_id": batch_id, "timestamp": {"$gte": since}},
            {"_id": 0}
        ).sort("timestamp", 1)
    )


@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: str,
    user=Depends(get_current_user)
):
    alert = alerts_col.find_one({"_id": ObjectId(alert_id)})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    check_warehouse_access(user, alert["warehouse_id"])

    alerts_col.update_one(
        {"_id": ObjectId(alert_id)},
        {
            "$set": {
                "resolved": True,
                "resolved_at": datetime.utcnow(),
                "resolved_by": user["user_id"],
                "resolution_type": "MANUAL"
            }
        }
    )

    return {"status": "RESOLVED"}
