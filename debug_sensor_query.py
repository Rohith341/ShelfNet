from pymongo import MongoClient
import json

mongo_client = MongoClient('mongodb://localhost:27017')
mongo_db = mongo_client['shelfnet']

wh_id = 'WH-2A65'

# Get raw sensor doc
sensor = mongo_db['sensors'].find_one({'warehouse_id': wh_id})

print("Raw sensor document:")
print(json.dumps(sensor, indent=2, default=str))

# Test the query
result = mongo_db['sensors'].find_one({
    "warehouse_id": wh_id,
    "status": "ACTIVE",
    "current_batch_id": {"$exists": False}
})

print(f"\nQuery result with '$exists': False")
print(f"Found: {result is not None}")

# Also test alternative query
result2 = mongo_db['sensors'].find_one({
    "warehouse_id": wh_id,
    "status": "ACTIVE",
    "current_batch_id": None
})

print(f"\nQuery result with 'current_batch_id': None")
print(f"Found: {result2 is not None}")

# Test without current_batch_id filter
result3 = mongo_db['sensors'].find_one({
    "warehouse_id": wh_id,
    "status": "ACTIVE"
})

print(f"\nQuery result without current_batch_id filter")
print(f"Found: {result3 is not None}")
