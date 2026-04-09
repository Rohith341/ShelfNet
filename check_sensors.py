from pymongo import MongoClient

mongo_client = MongoClient('mongodb://localhost:27017')
mongo_db = mongo_client['shelfnet']

wh_id = 'WH-2A65'
sensors = list(mongo_db['sensors'].find({'warehouse_id': wh_id}, {'_id': 0}))

print(f"Sensors in {wh_id}:")
print(f"Total: {len(sensors)}")

for sensor in sensors:
    print(f"\n{sensor['sensor_id']}")
    print(f"  Status: {sensor.get('status', 'Unknown')}")
    print(f"  Current batch: {sensor.get('current_batch_id', 'None')}")
