import sys
sys.path.insert(0, r'r:\Major_NO\temp1\ShelfNet\backend')

from database import users_collection
from utils.security import hash_password
from datetime import datetime
import uuid

manager = users_collection.find_one({'email': 'manager@example.com'})
if manager:
    print('Manager exists', manager['user_id'], manager['status'])
else:
    user_id = f"USR-{str(uuid.uuid4())[:4].upper()}"
    users_collection.insert_one({
        'user_id': user_id,
        'name': 'Manager User',
        'email': 'manager@example.com',
        'role': 'MANAGER',
        'warehouse_id': 'WAREHOUSE-1',
        'status': 'ACTIVE',
        'created_at': datetime.utcnow(),
        'password_hash': hash_password('Password@123'),
        'password_set': True
    })
    print('Created manager', user_id)

admin = users_collection.find_one({'email': 'admin@test.com'})
if admin:
    print('Admin exists', admin['user_id'], admin['status'])
else:
    user_id = f"USR-{str(uuid.uuid4())[:4].upper()}"
    users_collection.insert_one({
        'user_id': user_id,
        'name': 'Admin User',
        'email': 'admin@test.com',
        'role': 'ADMIN',
        'warehouse_id': None,
        'status': 'ACTIVE',
        'created_at': datetime.utcnow(),
        'password_hash': hash_password('Admin@123'),
        'password_set': True
    })
    print('Created admin', user_id)
