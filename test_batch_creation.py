#!/usr/bin/env python3
"""
Test batch creation to diagnose issues
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000"

# Login as admin to get warehouses
admin_login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@test.com",
    "password": "Admin@123"
})

if admin_login.status_code != 200:
    print(f"Admin login failed: {admin_login.text}")
    exit()

admin_token = admin_login.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}

# Get warehouses as admin
wh_resp = requests.get(f"{BASE_URL}/warehouses", headers=admin_headers)
warehouses = wh_resp.json()
print(f"WAREHOUSES: {len(warehouses)} found")
if not warehouses:
    print("No warehouses found!")
    exit()

# Now login as manager for batch creation
manager_login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "john.manager@test.com",
    "password": "Manager@123"
})

if manager_login.status_code != 200:
    print(f"Manager login failed: {manager_login.text}")
    exit()

manager_token = manager_login.json()["access_token"]
headers = {"Authorization": f"Bearer {manager_token}"}
print("MANAGER LOGIN: SUCCESS")

# Get manager's assigned warehouse from database
from pymongo import MongoClient
mongo_client = MongoClient('mongodb://localhost:27017')
mongo_db = mongo_client['shelfnet']
manager_doc = mongo_db['users'].find_one({'email': 'john.manager@test.com'}, {'_id': 0})
wh_id = manager_doc.get('warehouse_id')
print(f"Manager's warehouse: {wh_id}")

# Create a batch  
batch_data = {
    "fruit": "Apple",
    "quantity_kg": 1000,
    "expected_shelf_life_days": 30,
    "warehouse_id": wh_id,
    "arrival_date": (datetime.utcnow() - timedelta(days=1)).isoformat()
}

print(f"\nCREATING BATCH:")
print(json.dumps(batch_data, indent=2, default=str))

batch_resp = requests.post(
    f"{BASE_URL}/batches",
    json=batch_data,
    headers=headers
)

print(f"\nRESPONSE STATUS: {batch_resp.status_code}")
print(f"RESPONSE:\n{batch_resp.text}")

if batch_resp.status_code == 200:
    batch_id = batch_resp.json()["batch_id"]
    print(f"\nBATCH CREATED: {batch_id}")
