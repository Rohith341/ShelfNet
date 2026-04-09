from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['shelfnet']

mgr = db['users'].find_one({'email': 'john.manager@test.com'}, {'_id': 0})
wh_id = mgr.get('warehouse_id', 'Not set')
print(f'John Manager warehouse_id: {wh_id}')

# Also check sensors in that warehouse
if wh_id != 'Not set':
    sensors = db['sensors'].count_documents({'warehouse_id': wh_id, 'status': 'ACTIVE'})
    print(f'Active sensors in {wh_id}: {sensors}')
