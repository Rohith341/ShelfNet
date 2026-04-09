from datetime import datetime, timedelta
import os
import numpy as np
import joblib
from pymongo import MongoClient

from ml.dataset import FEATURES, SEQUENCE_LENGTH
from services.alert_service import evaluate_alerts

# Lazy load TensorFlow to avoid dependency conflicts
_model = None
_scaler = None

def _load_model():
    global _model, _scaler
    if _model is None:
        try:
            from tensorflow.keras.models import load_model as tf_load_model
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            MODEL_PATH = os.path.join(BASE_DIR, "ml", "trained_model.h5")
            SCALER_PATH = os.path.join(BASE_DIR, "ml", "scaler.pkl")
            _model = tf_load_model(MODEL_PATH, compile=False)
            _scaler = joblib.load(SCALER_PATH)
        except Exception as e:
            print(f"Warning: Could not load ML model: {e}")
    return _model, _scaler

# DB
client = MongoClient("mongodb://localhost:27017")
db = client["shelfnet"]
sensor_collection = db["sensor_readings"]
batches_col = db["batches"]

# PREDICTION
def predict_for_batch(batch_id: str, force: bool = False):
    model, scaler = _load_model()
    if model is None or scaler is None:
        print(f"❌ Model/Scaler not initialized for {batch_id}")
        raise RuntimeError("ML model not initialized")

    batch = batches_col.find_one({"batch_id": batch_id})
    if not batch:
        print(f"❌ Batch not found: {batch_id}")
        raise ValueError("Batch not found")

    # ✅ TTL reuse (30 min)
    if (
        not force and
        batch.get("predicted_remaining_shelf_life_days") is not None and
        batch.get("last_predicted_at") and
        datetime.utcnow() - batch["last_predicted_at"] < timedelta(minutes=30)
    ):
        print(f"💾 Using cached prediction for {batch_id}: {batch['predicted_remaining_shelf_life_days']} days")
        return batch["predicted_remaining_shelf_life_days"]

    # 🔹 Fetch sensor readings
    readings = list(
        sensor_collection.find(
            {"batch_id": batch_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(SEQUENCE_LENGTH)
    )

    print(f"📊 Found {len(readings)} sensor readings for {batch_id} (need: {SEQUENCE_LENGTH})")

    if len(readings) < SEQUENCE_LENGTH:
        print(f"⚠️ Not enough sensor data for {batch_id}: {len(readings)}/{SEQUENCE_LENGTH}")
        raise ValueError(f"Not enough sensor data for prediction ({len(readings)}/{SEQUENCE_LENGTH})")

    latest = readings[0]
    warehouse_id = latest["warehouse_id"]

    # Oldest → newest
    readings = list(reversed(readings))

    # 🔹 Build model input X
    X = np.array([
        [r[f] for f in FEATURES]
        for r in readings
    ])

    X = scaler.transform(X)
    X = X.reshape(1, SEQUENCE_LENGTH, len(FEATURES))

    # 🔮 Predict
    prediction = round(float(model.predict(X, verbose=0)[0][0]), 2)
    print(f"🎯 Prediction for {batch_id}: {prediction} days")

    # 🔔 Alert evaluation
    history = list(
        sensor_collection.find(
            {"batch_id": batch_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(6)
    )

    evaluate_alerts(
        batch_id=batch_id,
        warehouse_id=warehouse_id,
        fruit=batch.get("fruit"),
        prediction=prediction,
        latest=latest,
        history=list(reversed(history))
    )

    # 💾 Persist prediction
    batches_col.update_one(
        {"batch_id": batch_id},
        {
            "$set": {
                "predicted_remaining_shelf_life_days": prediction,
                "last_predicted_at": datetime.utcnow()
            }
        }
    )

    return prediction
