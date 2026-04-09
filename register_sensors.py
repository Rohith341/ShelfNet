#!/usr/bin/env python3
"""
Register sensors for manager warehouses
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Login as admin
admin_login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@test.com",
    "password": "Admin@123"
})
admin_token = admin_login.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}

# Login as john manager
manager_login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "john.manager@test.com",
    "password": "Manager@123"
})
manager_token = manager_login.json()["access_token"]
manager_headers = {"Authorization": f"Bearer {manager_token}"}

# Get manager info from database
from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017')
db = client['shelfnet']

managers = [
    {'email': 'john.manager@test.com', 'headers': manager_headers},
    {'email': 'sarah.manager@test.com', 'headers': manager_headers}  # Reuse token for now
]

# Get managers' warehouses
managers_data = list(db['users'].find({'role': 'MANAGER'}, {'_id': 0}))

print("Registering sensors for managers' warehouses...\n")

for mgr_data in managers_data[:2]:  # Just do the first 2 (john and sarah)
    wh_id = mgr_data.get('warehouse_id')
    email = mgr_data['email']
    
    # Login as this manager to register sensors
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": "Manager@123" if 'john' in email or 'sarah' in email else "Manager@123"
    })
    
    if login_resp.status_code != 200:
        print(f"❌ Failed to login as {email}")
        continue
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Registering sensors for {email} (warehouse: {wh_id})")
    
    # Register 5 sensors
    for i in range(1, 6):
        sensor_data = {
            "sensor_id": f"SENSOR-{wh_id}-{i}",
            "warehouse_id": wh_id,
            "location": f"Zone {i}",
            "sensor_type": "MULTI_GAS"
        }
        
        resp = requests.post(
            f"{BASE_URL}/sensors",
            json=sensor_data,
            headers=headers
        )
        
        if resp.status_code == 200:
            print(f"  ✓ Sensor {i} registered")
        else:
            print(f"  ❌ Sensor {i} failed: {resp.text[:100]}")
    
    print()

print("Sensor registration complete!")

# Verify
print("\nVerifying sensors by warehouse:")
warehouses = db['warehouses'].find({'status': 'ACTIVE'}, {'_id': 0})
for wh in list(warehouses)[:6]:
    sensor_count = db['sensors'].count_documents({'warehouse_id': wh['warehouse_id'], 'status': 'ACTIVE'})
    print(f"  {wh['warehouse_id']}: {sensor_count} active sensors")
