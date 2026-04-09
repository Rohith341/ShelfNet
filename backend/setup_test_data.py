#!/usr/bin/env python3
"""Setup test data for ShelfNet"""

import sys
sys.path.insert(0, '.')

from database import (
    users_collection, warehouses_collection, batches_collection,
    sensor_readings_collection, alerts_collection
)
from utils.security import hash_password
from datetime import datetime, timedelta
import uuid

def setup_test_data():
    print("🔧 Setting up test data...")
    
    # 1. Create test warehouse
    warehouse_id = "WAREHOUSE-1"
    warehouse = warehouses_collection.find_one({"warehouse_id": warehouse_id})
    
    if not warehouse:
        warehouses_collection.insert_one({
            "warehouse_id": warehouse_id,
            "name": "Main Warehouse",
            "status": "ACTIVE",
            "created_at": datetime.utcnow(),
            "active_batches_count": 0
        })
        print(f"✓ Created warehouse: {warehouse_id}")
    else:
        print(f"✓ Warehouse already exists: {warehouse_id}")
    
    # 2. Create test admin user
    admin_email = "admin@test.com"
    admin = users_collection.find_one({"email": admin_email})
    
    if not admin:
        users_collection.insert_one({
            "user_id": f"USR-{str(uuid.uuid4())[:4].upper()}",
            "email": admin_email,
            "password_hash": hash_password("Admin@123"),
            "role": "ADMIN",
            "status": "ACTIVE",
            "password_set": True,
            "warehouse_id": None,
            "created_at": datetime.utcnow()
        })
        print(f"✓ Created admin: {admin_email}")
    else:
        print(f"✓ Admin already exists: {admin_email}")
    
    # 3. Create test manager user
    manager_email = "manager@test.com"
    manager = users_collection.find_one({"email": manager_email})
    
    if not manager:
        users_collection.insert_one({
            "user_id": f"USR-{str(uuid.uuid4())[:4].upper()}",
            "email": manager_email,
            "password_hash": hash_password("Manager@123"),
            "role": "MANAGER",
            "status": "ACTIVE",
            "password_set": True,
            "warehouse_id": warehouse_id,
            "created_at": datetime.utcnow()
        })
        print(f"✓ Created manager: {manager_email}")
    else:
        print(f"✓ Manager already exists: {manager_email}")
    
    # 4. Create test sales user
    sales_email = "sales@test.com"
    sales_user = users_collection.find_one({"email": sales_email})
    
    if not sales_user:
        users_collection.insert_one({
            "user_id": f"USR-{str(uuid.uuid4())[:4].upper()}",
            "email": sales_email,
            "password_hash": hash_password("Sales@123"),
            "role": "SALES",
            "status": "ACTIVE",
            "password_set": True,
            "warehouse_id": warehouse_id,
            "created_at": datetime.utcnow()
        })
        print(f"✓ Created sales: {sales_email}")
    else:
        print(f"✓ Sales user already exists: {sales_email}")
    
    # 5. Create test batch
    batch_id = "APPLE-001"
    batch = batches_collection.find_one({"batch_id": batch_id})
    
    if not batch:
        batches_collection.insert_one({
            "batch_id": batch_id,
            "fruit": "Apple",
            "quantity_kg": 500,
            "warehouse_id": warehouse_id,
            "arrival_date": datetime.utcnow(),
            "expected_shelf_life_days": 14,
            "status": "ACTIVE",
            "created_at": datetime.utcnow(),
            "created_by_user_id": "system"
        })
        print(f"✓ Created batch: {batch_id}")
    else:
        print(f"✓ Batch already exists: {batch_id}")
    
    # 6. Create sample sensor readings
    readings_count = sensor_readings_collection.count_documents({"batch_id": batch_id})
    if readings_count == 0:
        readings = []
        base_time = datetime.utcnow() - timedelta(hours=15)
        
        for i in range(15):
            readings.append({
                "batch_id": batch_id,
                "warehouse_id": warehouse_id,
                "timestamp": base_time + timedelta(hours=i),
                "temperature": 4.0 + (i * 0.1),
                "humidity": 85.0 - (i * 0.5),
                "ethylene": 0.1 + (i * 0.01),
                "co2": 2.0 + (i * 0.05),
                "o2": 18.0 - (i * 0.05),
                "quantity_monitored": 500
            })
        
        sensor_readings_collection.insert_many(readings)
        print(f"✓ Created 15 sensor readings for batch {batch_id}")
    else:
        print(f"✓ Sensor readings already exist for batch {batch_id}: {readings_count}")
    
    print("\n✅ Test data setup complete!")
    print("\nTest credentials:")
    print("  Admin:    admin@test.com / Admin@123")
    print("  Manager:  manager@test.com / Manager@123")
    print("  Sales:    sales@test.com / Sales@123")

if __name__ == "__main__":
    try:
        setup_test_data()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
