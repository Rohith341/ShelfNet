#!/usr/bin/env python3
"""
Simple prediction pipeline status checker
"""
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['shelfnet']

batches = list(db['batches'].find({'status': 'ACTIVE'}, {'_id': 0}))
sensors = db['sensors'].count_documents({'status': 'ACTIVE'})
readings = db['sensor_readings'].count_documents({})

print("\nPREDICTION PIPELINE STATUS")
print("=" * 70)
print(f"Active Batches: {len(batches)}")
print(f"Active Sensors: {sensors}")
print(f"Total Sensor Readings: {readings}")

if batches:
    print(f"\nBATCH DETAILS:")
    print("-" * 70)
    for batch in batches[:10]:
        batch_id = batch['batch_id']
        batch_readings = db['sensor_readings'].count_documents({'batch_id': batch_id})
        prediction = batch.get('predicted_remaining_shelf_life_days', 'No prediction yet')
        sensor = batch.get('assigned_sensor_id', 'Not assigned')
        ready = "YES" if batch_readings >= 10 else "NO"
        print(f"\n{batch_id} ({batch['fruit']})")
        print(f"  Sensor Readings: {batch_readings}/10 (ready: {ready})")
        print(f"  Prediction: {prediction}")
        print(f"  Sensor ID: {sensor}")

print(f"\nSUMMARY:")
print("-" * 70)
with_predictions = sum(1 for b in batches if 'predicted_remaining_shelf_life_days' in b)
ready_to_predict = sum(1 for b in batches if db['sensor_readings'].count_documents({'batch_id': b['batch_id']}) >= 10)

print(f"Batches with predictions: {with_predictions}/{len(batches)}")
print(f"Batches ready to predict: {ready_to_predict}/{len(batches)}")

if ready_to_predict > 0 and with_predictions == 0:
    print("\nRECOMMENDATION:")
    print("  POST /api/v1/diagnostics/trigger-predictions")
    print("  This will generate predictions for all ready batches.")
elif with_predictions == len(batches):
    print("\nSTATUS: All batches have predictions! Dashboard is ready.")
else:
    print("\nSTATUS: Waiting for simulator to generate sensor readings...")
    avg_readings = sum(db['sensor_readings'].count_documents({'batch_id': b['batch_id']}) for b in batches) / len(batches) if batches else 0
    print(f"Average readings per batch: {int(avg_readings)}/10")
    hours_needed = (10 - int(avg_readings)) * 30 / 60
    print(f"ETA for first predictions: ~{hours_needed:.1f} hours")
