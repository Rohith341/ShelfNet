#!/usr/bin/env python3
"""Test API endpoints"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

# Step 1: Login
print("🔐 Attempting login...")
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "manager@test.com",
    "password": "Manager@123"
})

if resp.status_code != 200:
    print(f"❌ Login failed: {resp.status_code}")
    print(resp.text)
    sys.exit(1)

data = resp.json()
token = data.get("access_token")
user = data.get("user", {})
warehouse_id = user.get("warehouse_id")

print(f"✓ Login successful")
print(f"  Token: {token[:20]}...")
print(f"  User: {user}")
print(f"  Warehouse ID: {warehouse_id}")

# Step 2: Fetch batches
if warehouse_id:
    print(f"\n📦 Fetching batches for warehouse {warehouse_id}...")
    resp = requests.get(
        f"{BASE_URL}/manager/{warehouse_id}/batches",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if resp.status_code != 200:
        print(f"❌ Fetch failed: {resp.status_code}")
        print(resp.text)
        sys.exit(1)
    
    batches = resp.json()
    print(f"✓ Got {len(batches)} batches")
    for b in batches[:2]:
        print(f"  - {b.get('batch_id')}: {b.get('fruit')} ({b.get('quantity_kg')}kg)")
        pred = b.get("predicted_remaining_shelf_life_days")
        risk = b.get("risk_level")
        print(f"    Prediction: {pred} days, Risk: {risk}")
else:
    print("❌ No warehouse_id in user response")
    sys.exit(1)
