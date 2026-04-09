import requests
import json

# Test login first
login_r = requests.post('http://localhost:8000/auth/login', 
    json={'email': 'manager@test.com', 'password': 'Manager@123'})
print(f"Login: {login_r.status_code}")

if login_r.ok:
    token = login_r.json()['access_token']
    
    # Test batches endpoint
    batch_r = requests.get('http://localhost:8000/manager/WAREHOUSE-1/batches',
        headers={'Authorization': f'Bearer {token}'})
    print(f"Batches: {batch_r.status_code}")
    print(f"Response:\n{batch_r.text[:500]}")
    
    if batch_r.ok:
        data = batch_r.json()
        print(f"\nFound {len(data)} batches")
        if data:
            print(f"First batch: {json.dumps(data[0], indent=2, default=str)[:300]}")
else:
    print(f"Login failed: {login_r.text}")
