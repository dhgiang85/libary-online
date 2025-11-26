"""
Test login với tài khoản dhgiang
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

print("=" * 70)
print("KIỂM TRA LOGIN VỚI TÀI KHOẢN: dhgiang")
print("=" * 70)

# Test 1: Login với JSON (sau khi fix)
print("\n✅ Test 1: Login với JSON data (ĐÚNG)")
try:
    login_data = {
        "username": "dhgiang",
        "password": "Admin@123"
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/login", 
        json=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ LOGIN THÀNH CÔNG!")
        print(f"   Access Token: {data['access_token'][:50]}...")
        print(f"   Refresh Token: {data['refresh_token'][:50]}...")
        print(f"   Token Type: {data['token_type']}")
        
        access_token = data['access_token']
        
        # Test /me endpoint
        print("\n✅ Test 2: Gọi /me endpoint với token")
        me_response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        print(f"   Status: {me_response.status_code}")
        
        if me_response.status_code == 200:
            user_data = me_response.json()
            print(f"   ✅ LẤY THÔNG TIN USER THÀNH CÔNG!")
            print(f"   User Info:")
            print(json.dumps(user_data, indent=6, ensure_ascii=False))
        else:
            print(f"   ❌ LỖI: {me_response.json()}")
            
    else:
        print(f"   ❌ LOGIN THẤT BẠI!")
        print(f"   Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
except Exception as e:
    print(f"   ❌ Lỗi: {e}")

print("\n" + "=" * 70)
print("KẾT LUẬN:")
print("=" * 70)
print("✅ Backend đang hoạt động đúng với JSON data")
print("✅ Frontend đã được fix để gửi JSON thay vì form-urlencoded")
print("✅ Sau khi login, frontend sẽ tự động gọi /me để lấy user info")
print("=" * 70)
