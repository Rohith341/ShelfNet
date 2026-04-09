#!/usr/bin/env python3
"""
Complete prediction pipeline demo:
1. Create multiple batches
2. Generate initial sensor readings
3. Trigger predictions
4. Show prediction results
"""
import requests
import json
from datetime import datetime, timedelta
import time

BASE_URL = "http://127.0.0.1:8000"

# Login as manager
print("LOGGING IN...")
manager_login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "john.manager@test.com",
    "password": "Manager@123"
})
manager_token = manager_login.json()["access_token"]
headers = {"Authorization": f"Bearer {manager_token}"}

# Get manager's warehouse
from pymongo import MongoClient
mongo_client = MongoClient('mongodb://localhost:27017')
mongo_db = mongo_client['shelfnet']
manager_doc = mongo_db['users'].find_one({'email': 'john.manager@test.com'}, {'_id': 0})
wh_id = manager_doc.get('warehouse_id')

print(f"Manager's warehouse: {wh_id}\n")

# Step 1: Create multiple batches
print("STEP 1: CREATING BATCHES...")
print("-" * 60)

fruits = ["Apple", "Banana", "Strawberry", "Pear"]
batch_ids = []

for i, fruit in enumerate(fruits):
    batch_data = {
        "fruit": fruit,
        "quantity_kg": 500 + (i * 100),
        "expected_shelf_life_days": 15 + (i * 5),
        "warehouse_id": wh_id,
        "arrival_date": (datetime.utcnow() - timedelta(days=i+1)).isoformat()
    }
    
    resp = requests.post(f"{BASE_URL}/batches", json=batch_data, headers=headers)
    
    if resp.status_code == 200:
        batch = resp.json()
        batch_id = batch['batch_id']
        batch_ids.append(batch_id)
        print(f"✓ Batch created: {batch_id} ({fruit})")
        print(f"  Sensor: {batch.get('assigned_sensor_id')}")
    else:
        print(f"✗ Failed to create {fruit} batch: {resp.text[:100]}")

print(f"\nTotal batches created: {len(batch_ids)}\n")

# Step 2: Generate initial readings by calling the diagnostic endpoint
print("STEP 2: GENERATING INITIAL SENSOR READINGS...")
print("-" * 60)

admin_login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@test.com",
    "password": "Admin@123"
})
admin_token = admin_login.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}

for batch_id in batch_ids:
    # Call the generate-initial-readings endpoint
    resp = requests.post(
        f"{BASE_URL}/api/v1/diagnostics/generate-initial-readings/{batch_id}",
        headers=admin_headers,
        json={"days": 2}  # Generate 2 days worth of readings
    )
    
    if resp.status_code == 200:
        result = resp.json()
        print(f"✓ Generated {result['readings_generated']} readings for {batch_id}")
    else:
        print(f"✗ Failed to generate readings: {resp.text[:100]}")

print()

# Step 3: Trigger predictions
print("STEP 3: TRIGGERING PREDICTIONS...")
print("-" * 60)

resp = requests.post(
    f"{BASE_URL}/api/v1/diagnostics/trigger-predictions",
    headers=admin_headers
)

if resp.status_code == 200:
    results = resp.json()
    print(f"Predictions triggered for {results['successful']} batches")
    print()
    for pred in results['predictions']:
        if pred['status'] == "✅ SUCCESS":
            print(f"✓ {pred['batch_id']} ({pred['fruit']}): {pred['prediction_days']} days remaining")
        else:
            print(f"✗ {pred['batch_id']}: {pred.get('error', 'Unknown error')}")
else:
    print(f"Failed to trigger predictions: {resp.text}")

print()

# Step 4: Show prediction pipeline status
print("STEP 4: PREDICTION PIPELINE STATUS")
print("-" * 60)

resp = requests.get(
    f"{BASE_URL}/api/v1/diagnostics/health/prediction-pipeline",
    headers=admin_headers
)

if resp.status_code == 200:
    data = resp.json()
    db = data['database']
    
    print(f"Active Batches: {db['active_batches']}")
    print(f"Batches with Predictions: {db['batches_with_predictions']}/{db['active_batches']}")
    print(f"Total Sensor Readings: {db['total_sensor_readings']}")
    print()
    print(f"Recommendation: {data['recommendation']}")
    print()
    
    # Show batch details
    print("BATCH DETAILS:")
    for batch in data['batch_readiness'][:5]:
        print(f"\n  {batch['batch_id']} ({batch['fruit']})")
        print(f"    Readings: {batch['readings_count']}/10")
        print(f"    Prediction: {batch['prediction_value']}")
        print(f"    Status: {'✓ Ready' if batch['has_prediction'] else '⏳ Processing'}")
else:
    print(f"Failed to get status: {resp.text}")

print("\n" + "=" * 60)
print("REAL-TIME PREDICTION PIPELINE DEMO COMPLETE!")
print("=" * 60)
print("\nYou can now:")
print("1. View predictions in Manager Dashboard: GET /manager/{warehouse_id}/realtime-dashboard")
print("2. View predictions in Sales Dashboard: GET /sales/{warehouse_id}/dashboard")
print("3. Check batch prediction status: GET /predict/{batch_id}")
