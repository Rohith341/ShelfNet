#!/usr/bin/env python3
"""
Test script to verify live predictions for newly created batches
Tests the complete flow: batch creation → sensor generation → LSTM prediction
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Test credentials
MANAGER_TOKEN = None
WAREHOUSE_ID = None

def get_manager_token():
    """Login as manager to get auth token"""
    print("\n🔐 Logging in as manager...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "manager@example.com",
            "password": "Password@123"
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return None
    
    data = response.json()
    token = data.get("access_token")
    warehouse_id = data.get("user", {}).get("warehouse_id")
    
    if token:
        print(f"✅ Manager logged in successfully")
        print(f"   Token: {token[:20]}...")
        print(f"   Warehouse ID: {warehouse_id}")
    
    return token, warehouse_id

def create_batch(token, warehouse_id, fruit="Apple", quantity=500, shelf_life=30):
    """Create a new batch"""
    print(f"\n📦 Creating batch: {fruit} - {quantity}kg")
    
    response = requests.post(
        f"{BASE_URL}/batches",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "fruit": fruit,
            "quantity_kg": quantity,
            "arrival_date": datetime.utcnow().isoformat(),
            "expected_shelf_life_days": shelf_life,
            "warehouse_id": warehouse_id
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Batch creation failed: {response.text}")
        return None
    
    data = response.json()
    batch_id = data.get("batch_id")
    prediction = data.get("predicted_remaining_shelf_life_days")
    risk_level = data.get("risk_level")
    readings_count = data.get("sensor_readings_generated")
    
    print(f"✅ Batch created successfully!")
    print(f"   Batch ID: {batch_id}")
    print(f"   Sensor readings generated: {readings_count}")
    print(f"   Initial prediction: {prediction} days")
    print(f"   Risk level: {risk_level}")
    
    return batch_id, prediction, risk_level

def get_batch_details(token, batch_id):
    """Fetch batch details with current predictions"""
    response = requests.get(
        f"{BASE_URL}/batches",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch batches: {response.text}")
        return None
    
    batches = response.json()
    batch = next((b for b in batches if b.get("batch_id") == batch_id), None)
    
    if not batch:
        print(f"❌ Batch {batch_id} not found in list")
        return None
    
    return batch

def monitor_predictions(token, batch_id, duration_seconds=30, refresh_interval=5):
    """Monitor predictions over time"""
    print(f"\n📊 Monitoring predictions for {duration_seconds} seconds...")
    print(f"   Refresh interval: {refresh_interval} seconds")
    
    start_time = time.time()
    predictions_history = []
    
    while time.time() - start_time < duration_seconds:
        batch = get_batch_details(token, batch_id)
        
        if batch:
            prediction = batch.get("predicted_remaining_shelf_life_days")
            risk_level = batch.get("risk_level", "UNKNOWN")
            timestamp = datetime.now().strftime("%H:%M:%S")
            
            predictions_history.append({
                "time": timestamp,
                "prediction": prediction,
                "risk_level": risk_level
            })
            
            print(f"   [{timestamp}] Prediction: {prediction} days | Risk: {risk_level}")
        
        elapsed = time.time() - start_time
        remaining = duration_seconds - elapsed
        
        if remaining > 0:
            time.sleep(min(refresh_interval, remaining))
    
    return predictions_history

def verify_sensor_readings(batch_id):
    """Verify sensor readings were created"""
    print(f"\n📡 Verifying sensor readings for {batch_id}...")
    
    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017")
    db = client["shelfnet"]
    
    readings_count = db["sensor_readings"].count_documents({"batch_id": batch_id})
    print(f"✅ Found {readings_count} sensor readings for {batch_id}")
    
    if readings_count > 0:
        sample = db["sensor_readings"].find_one({"batch_id": batch_id})
        if sample:
            print(f"   Sample reading:")
            print(f"     Temperature: {sample.get('temperature')}°C")
            print(f"     Humidity: {sample.get('humidity')}%")
            print(f"     Ethylene: {sample.get('ethylene')} ppm")
            print(f"     CO₂: {sample.get('co2')} ppm")
            print(f"     O₂: {sample.get('o2')}%")
    
    return readings_count

def main():
    print("=" * 60)
    print("🚀 LIVE PREDICTIONS TEST")
    print("=" * 60)
    
    # Step 1: Login
    result = get_manager_token()
    if not result:
        print("❌ Failed to authenticate")
        return
    
    token, warehouse_id = result
    
    # Step 2: Create batch
    print("\n" + "=" * 60)
    batch_result = create_batch(token, warehouse_id, fruit="Banana", quantity=300, shelf_life=7)
    if not batch_result:
        print("❌ Failed to create batch")
        return
    
    batch_id, initial_prediction, initial_risk = batch_result
    
    # Step 3: Verify sensor readings
    print("\n" + "=" * 60)
    readings_count = verify_sensor_readings(batch_id)
    
    if readings_count == 0:
        print("❌ No sensor readings found!")
        return
    
    # Step 4: Monitor predictions over time
    print("\n" + "=" * 60)
    predictions_history = monitor_predictions(token, batch_id, duration_seconds=20, refresh_interval=5)
    
    # Step 5: Summary
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    
    print(f"\n✅ Batch ID: {batch_id}")
    print(f"✅ Initial Prediction: {initial_prediction} days")
    print(f"✅ Initial Risk Level: {initial_risk}")
    print(f"✅ Sensor Readings: {readings_count}")
    print(f"✅ Predictions monitored: {len(predictions_history)}")
    
    if predictions_history:
        final_batch = get_batch_details(token, batch_id)
        if final_batch:
            final_prediction = final_batch.get("predicted_remaining_shelf_life_days")
            final_risk = final_batch.get("risk_level")
            print(f"✅ Final Prediction: {final_prediction} days")
            print(f"✅ Final Risk Level: {final_risk}")
            
            if initial_prediction and final_prediction:
                change = final_prediction - initial_prediction
                print(f"\n📊 Prediction Change: {change:+.2f} days")
    
    print("\n" + "=" * 60)
    print("🎉 TEST COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
