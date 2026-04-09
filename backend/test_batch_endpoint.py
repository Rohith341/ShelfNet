import requests

r=requests.post('http://localhost:8000/auth/login',json={'email':'manager@test.com','password':'Manager@123'})
print('login',r.status_code)
token=r.json().get('access_token','') if r.ok else ''
r2=requests.get('http://localhost:8000/manager/WAREHOUSE-1/batches',headers={'Authorization':f'Bearer {token}'})
print('batches',r2.status_code)
if r2.ok:
    import json
    data = r2.json()
    print("First batch:", json.dumps(data[0] if data else {}, indent=2))
else:
    print(r2.text[:400])
