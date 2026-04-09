#!/usr/bin/env python3
"""
ShelfNet Real-World Application Setup Script
This script sets up a complete warehouse environment with multiple batches,
sensors, and demonstrates the real-time monitoring system.
"""

import requests
import time
import json
from datetime import datetime, timedelta
import random

# Configuration
BASE_URL = "http://127.0.0.1:8000"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin@123"

# Sample data
WAREHOUSES = [
    {"warehouse_id": "WH001", "name": "Downtown Warehouse", "location": "Downtown", "capacity_kg": 10000},
    {"warehouse_id": "WH002", "name": "Airport Warehouse", "location": "Airport", "capacity_kg": 15000}
]

MANAGERS = [
    {"name": "John Manager", "email": "john.manager@test.com", "warehouse_id": "WH001"},
    {"name": "Sarah Manager", "email": "sarah.manager@test.com", "warehouse_id": "WH002"}
]

SALES_REPS = [
    {"name": "Mike Sales", "email": "mike.sales@test.com", "warehouse_id": "WH001"},
    {"name": "Lisa Sales", "email": "lisa.sales@test.com", "warehouse_id": "WH002"}
]

FRUITS = ["Apple", "Banana", "Strawberry", "Pear", "Grapes", "Cherry", "Tomato"]

def login_user(email, password):
    """Login and return access token"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"❌ Login failed for {email}: {response.text}")
        return None

def create_warehouse(token, warehouse):
    """Create a warehouse"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/warehouses", json=warehouse, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Created warehouse: {warehouse['name']} (ID: {result['warehouse_id']})")
        return result["warehouse_id"]
    else:
        print(f"❌ Failed to create warehouse {warehouse['name']}: {response.text}")
        return None

def register_user(token, user_data):
    """Register a new user"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/users", json=user_data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Registered user: {user_data['name']} ({user_data['role']})")
        return result.get("user_id")
    else:
        print(f"❌ Failed to register {user_data['name']}: {response.text}")
        return None

def approve_user(token, user_id):
    """Approve a user account"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/users/{user_id}/approve", headers=headers)
    if response.status_code == 200:
        print(f"✅ Approved user: {user_id}")
        return True
    else:
        print(f"❌ Failed to approve user {user_id}: {response.text}")
        return False

def set_user_password(email, password):
    """Set password for approved user"""
    response = requests.post(f"{BASE_URL}/auth/set-password", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        print(f"✅ Set password for: {email}")
        return True
    else:
        print(f"❌ Failed to set password for {email}: {response.text}")
        return False

def register_sensor(token, sensor_data):
    """Register a sensor"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/sensors", json=sensor_data, headers=headers)
    if response.status_code == 200:
        print(f"✅ Registered sensor: {sensor_data['sensor_id']}")
        return True
    else:
        print(f"❌ Failed to register sensor {sensor_data['sensor_id']}: {response.text}")
        return False

def create_batch(token, batch_data):
    """Create a batch"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/batches", json=batch_data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Created batch: {result['batch_id']} ({batch_data['fruit']}) - Sensor: {result.get('assigned_sensor_id', 'None')}")
        return result
    else:
        print(f"❌ Failed to create batch: {response.text}")
        return None

def get_pending_users(token):
    """Get list of pending users"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users/pending", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get pending users: {response.text}")
        return []

def approve_all_pending_users(token):
    """Approve all pending users"""
    pending_users = get_pending_users(token)
    for user in pending_users:
        if approve_user(token, user["user_id"]):
            # Set password if not set
            if not user.get("password_set", False):
                set_user_password(user["email"], "TempPass123!")  # Default password, they can change

def get_dashboard_data(token, warehouse_id):
    """Get real-time dashboard data"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/manager/{warehouse_id}/realtime-dashboard", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get dashboard: {response.text}")
        return None

def setup_real_world_application():
    """Main setup function"""
    print("🏭 Setting up ShelfNet Real-World Application")
    print("=" * 60)

    # Step 1: Login as admin
    print("\n🔐 Step 1: Admin Login")
    admin_token = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print("❌ Cannot proceed without admin access")
        return False

    # Step 2: Create warehouses
    print("\n🏢 Step 2: Creating Warehouses")
    created_warehouses = {}
    for warehouse in WAREHOUSES:
        wh_id = create_warehouse(admin_token, warehouse)
        if wh_id:
            created_warehouses[warehouse["warehouse_id"]] = wh_id

    # Step 3: Register managers
    print("\n👥 Step 3: Registering Managers")
    manager_tokens = {}
    for manager in MANAGERS:
        user_data = {
            "name": manager["name"],
            "email": manager["email"],
            "role": "MANAGER",
            "password": "Manager@123",
            "warehouse_id": created_warehouses.get(manager["warehouse_id"], manager["warehouse_id"])
        }

        user_id = register_user(admin_token, user_data)
        if user_id:
            # Approve the manager
            if approve_user(admin_token, user_id):
                # Set password
                set_user_password(manager["email"], "Manager@123")
                print(f"   Manager {manager['name']} approved and ready")

                # Login as manager
                manager_token = login_user(manager["email"], "Manager@123")
                if manager_token:
                    manager_tokens[manager["warehouse_id"]] = manager_token
        else:
            # User might already exist, try to login
            manager_token = login_user(manager["email"], "Manager@123")
            if manager_token:
                manager_tokens[manager["warehouse_id"]] = manager_token
                print(f"   Manager {manager['name']} already exists and logged in")
            else:
                print(f"   Manager {manager['name']} exists but cannot login (might need approval)")

    # Step 4: Register sales reps
    print("\n💼 Step 4: Registering Sales Representatives")
    for sales in SALES_REPS:
        user_data = {
            "name": sales["name"],
            "email": sales["email"],
            "role": "SALES",
            "password": "Sales@123",
            "warehouse_id": created_warehouses.get(sales["warehouse_id"], sales["warehouse_id"])
        }
        user_id = register_user(admin_token, user_data)
        if user_id:
            approve_user(admin_token, user_id)
            set_user_password(sales["email"], "Sales@123")
        else:
            # User might already exist
            print(f"   Sales {sales['name']} already exists")

    # Approve any remaining pending users
    print("\n🔓 Approving any pending users")
    approve_all_pending_users(admin_token)

    # Step 5: Register sensors for each warehouse
    print("\n📡 Step 5: Registering Sensors")
    sensor_count = 5  # 5 sensors per warehouse
    for wh_key, wh_id in created_warehouses.items():
        if wh_id in manager_tokens:
            token = manager_tokens[wh_id]

            for i in range(1, sensor_count + 1):
                sensor_data = {
                    "sensor_id": f"SNS-{wh_key}-{i:03d}",
                    "warehouse_id": wh_id,
                    "location": f"Zone {i}",
                    "sensor_type": "MULTI_GAS"
                }
                register_sensor(token, sensor_data)

    # Step 6: Create multiple batches per warehouse
    print("\n📦 Step 6: Creating Multiple Batches per Warehouse")
    for wh_key, wh_id in created_warehouses.items():
        if wh_id in manager_tokens:
            token = manager_tokens[wh_id]

            # Create 3-5 batches per warehouse with different fruits
            batch_count = random.randint(3, 5)
            created_fruits = set()

            for i in range(batch_count):
                # Ensure variety of fruits
                available_fruits = [f for f in FRUITS if f not in created_fruits]
                if not available_fruits:
                    available_fruits = FRUITS

                fruit = random.choice(available_fruits)
                created_fruits.add(fruit)

                batch_data = {
                    "fruit": fruit,
                    "quantity_kg": random.randint(500, 2000),
                    "expected_shelf_life_days": random.randint(5, 30),
                    "warehouse_id": wh_id,
                    "arrival_date": (datetime.utcnow() - timedelta(days=random.randint(0, 3))).isoformat()
                }

                create_batch(token, batch_data)

    # Step 7: Display real-time dashboard
    print("\n📊 Step 7: Real-Time Dashboard Status")
    print("-" * 40)

    for wh_key, wh_id in created_warehouses.items():
        warehouse_name = next((w["name"] for w in WAREHOUSES if w["warehouse_id"] == wh_key), wh_key)
        if wh_id in manager_tokens:
            token = manager_tokens[wh_id]
            dashboard = get_dashboard_data(token, wh_id)

            if dashboard:
                print(f"\n🏭 {warehouse_name} ({wh_id})")
                print(f"   Total Batches: {dashboard['summary']['total_batches']}")
                print(f"   Critical: {dashboard['summary']['critical_batches']} | Warning: {dashboard['summary']['warning_batches']} | Safe: {dashboard['summary']['safe_batches']}")
                print(f"   Total Alerts: {dashboard['summary']['total_alerts']}")

                print("   Active Batches:")
                for batch in dashboard['batches'][:3]:  # Show first 3
                    remaining = batch.get('predicted_remaining_shelf_life_days', 'N/A')
                    if isinstance(remaining, (int, float)):
                        remaining = f"{remaining:.1f}d"
                    print(f"     • {batch['batch_id']} ({batch['fruit']}) - {remaining} - {batch['risk_level']}")

    print("\n🎉 Real-World Application Setup Complete!")
    print("\n📋 User Credentials:")
    print(f"   Admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    for manager in MANAGERS:
        print(f"   Manager: {manager['email']} / Manager@123")
    for sales in SALES_REPS:
        print(f"   Sales: {sales['email']} / Sales@123")

    print("\n🚀 The real-time sensor simulator is now running!")
    print("   - Sensors generate readings every 30 minutes")
    print("   - Predictions update every 3 hours")
    print("   - Alerts process every hour")
    print("   - Multiple batches monitored simultaneously")

    return True

if __name__ == "__main__":
    print("⏳ Waiting for backend to start...")
    time.sleep(5)  # Give backend time to start

    max_retries = 5
    for attempt in range(max_retries):
        try:
            response = requests.get(f"{BASE_URL}/docs")
            if response.status_code == 200:
                print("✅ Backend is running")
                break
        except:
            print(f"⏳ Waiting for backend... (attempt {attempt + 1}/{max_retries})")
            time.sleep(3)
    else:
        print("❌ Backend not accessible. Please start the backend first.")
        exit(1)

    setup_real_world_application()