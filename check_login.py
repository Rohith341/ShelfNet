#!/usr/bin/env python3
"""Check database users and test login"""

import sys
sys.path.insert(0, '.')

from database import users_collection
import requests

print("=" * 60)
print("🔐 LOGIN VERIFICATION CHECK")
print("=" * 60)

# 1. Check database users
print("\n📋 DATABASE USERS:")
users = list(users_collection.find({}, {'_id': 0, 'password_hash': 0}))

if users:
    print(f"\nFound {len(users)} users:\n")
    for u in users:
        email = u.get("email")
        role = u.get("role") 
        status = u.get("status")
        warehouse = u.get("warehouse_id")
        
        print(f"  Email: {email}")
        print(f"  Role: {role}")
        print(f"  Status: {status}")
        print(f"  Warehouse: {warehouse}")
        print()
else:
    print("❌ NO USERS FOUND IN DATABASE!")
    sys.exit(1)

# 2. Test each user login
print("\n" + "=" * 60)
print("🧪 TESTING LOGIN WITH EACH USER")
print("=" * 60)

test_creds = [
    ("admin@test.com", "Admin@123", "ADMIN"),
    ("manager@test.com", "Manager@123", "MANAGER"),
    ("sales@test.com", "Sales@123", "SALES"),
]

for email, password, expected_role in test_creds:
    print(f"\nTesting {email}...")
    
    try:
        resp = requests.post("http://localhost:8000/auth/login", json={
            "email": email,
            "password": password
        }, timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            user = data.get("user", {})
            role = user.get("role")
            token = data.get("access_token")
            
            if role == expected_role:
                print(f"  ✓ Login successful")
                print(f"  ✓ Role matches: {role}")
                print(f"  ✓ Token generated: {token[:20]}...")
            else:
                print(f"  ✗ Role mismatch! Expected {expected_role}, got {role}")
        else:
            print(f"  ✗ Login failed with status {resp.status_code}")
            print(f"  Response: {resp.text[:100]}")
            
    except requests.exceptions.ConnectionError:
        print("  ✗ Cannot connect to backend on localhost:8000")
        print("  Make sure backend is running: python main.py")
        break
    except Exception as e:
        print(f"  ✗ Error: {str(e)}")

print("\n" + "=" * 60)
print("✅ LOGIN CHECK COMPLETE")
print("=" * 60)
