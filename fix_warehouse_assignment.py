#!/usr/bin/env python3
"""
Fix warehouse assignment for managers
"""
from pymongo import MongoClient
import json

client = MongoClient('mongodb://localhost:27017')
db = client['shelfnet']

# Get all warehouses
warehouses = list(db['warehouses'].find({'status': 'ACTIVE'}, {'_id': 0}))
print(f"Found {len(warehouses)} warehouses:")
for wh in warehouses:
    print(f"  - {wh['warehouse_id']}: {wh.get('name', 'Unknown')}")

# Get all users
managers = list(db['users'].find({'role': 'MANAGER'}, {'_id': 0}))
print(f"\nFound {len(managers)} managers:")
for mgr in managers:
    print(f"  - {mgr['email']}: assigned to {mgr.get('warehouse_id', 'None')}")

# Assign managers to warehouses
if warehouses and managers:
    print(f"\nAssigning managers to warehouses...")
    for i, mgr in enumerate(managers[:len(warehouses)]):
        wh_id = warehouses[i]['warehouse_id']
        email = mgr['email']
        
        result = db['users'].update_one(
            {'email': email},
            {'$set': {'warehouse_id': wh_id}}
        )
        
        print(f"  ✓ {email} -> {wh_id}")
    
    print("\nManager assignments updated!")
