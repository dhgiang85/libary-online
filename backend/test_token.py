"""
Test token với endpoint /me
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Token từ user
access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMTE0ZTU1MS00Yzg3LTQyYjItOTRmOS1mOWRjOTU0ZmI1OTciLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3NjM5NTAxOTYsImlhdCI6MTc2Mzk0OTI5NiwidHlwZSI6ImFjY2VzcyJ9.MWTvB64ujgNKMV1gyUL4H5HV8Wt9cGK2qya3Hn4G1hU"

print("=" * 70)
print("KIỂM TRA TOKEN VỚI ENDPOINT /me")
print("=" * 70)

# Test 1: Không có Authorization header
print("\n❌ Test 1: KHÔNG có Authorization header")
try:
    response = requests.get(f"{BASE_URL}/auth/me")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"   Lỗi: {e}")

# Test 2: SAI format - thiếu "Bearer "
print("\n❌ Test 2: SAI format - thiếu 'Bearer '")
try:
    headers = {"Authorization": access_token}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"   Headers: {{'Authorization': '{access_token[:40]}...'}}")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"   Lỗi: {e}")

# Test 3: ĐÚNG format - có "Bearer "
print("\n✅ Test 3: ĐÚNG format - có 'Bearer '")
try:
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"   Headers: {{'Authorization': 'Bearer {access_token[:40]}...'}}")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        user_data = response.json()
        print(f"   ✅ THÀNH CÔNG!")
        print(f"   Response:")
        print(json.dumps(user_data, indent=6))
    else:
        print(f"   ❌ THẤT BẠI!")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"   Lỗi: {e}")

print("\n" + "=" * 70)
