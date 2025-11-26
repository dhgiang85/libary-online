"""
Script để debug endpoint /me
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

print("=" * 70)
print("KIỂM TRA ENDPOINT /me")
print("=" * 70)

# Bước 1: Đăng ký user mới
print("\n1️⃣  Đăng ký user mới...")
register_data = {
    "email": "debug@example.com",
    "username": "debuguser",
    "password": "Debug@123",
    "full_name": "Debug User"
}

try:
    response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    print(f"   Status: {response.status_code}")
    if response.status_code == 201:
        print("   ✅ Đăng ký thành công!")
    elif response.status_code == 400:
        print("   ℹ️  User đã tồn tại, tiếp tục login...")
    else:
        print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   ❌ Lỗi: {e}")

# Bước 2: Login để lấy token
print("\n2️⃣  Login để lấy access token...")
login_data = {
    "username": "debuguser",
    "password": "Debug@123"
}

try:
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data.get("access_token")
        print(f"   ✅ Login thành công!")
        print(f"   Token: {access_token[:50]}...")
    else:
        print(f"   ❌ Login thất bại: {response.json()}")
        exit(1)
except Exception as e:
    print(f"   ❌ Lỗi: {e}")
    exit(1)

# Bước 3: Test /me KHÔNG có Authorization header
print("\n3️⃣  Test /me KHÔNG có Authorization header...")
try:
    response = requests.get(f"{BASE_URL}/auth/me")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    if response.status_code == 403:
        print("   ✅ Đúng! Trả về lỗi khi không có token")
except Exception as e:
    print(f"   Lỗi: {e}")

# Bước 4: Test /me với Authorization SAI FORMAT
print("\n4️⃣  Test /me với Authorization SAI FORMAT (thiếu 'Bearer ')...")
try:
    headers = {"Authorization": access_token}  # ❌ SAI
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"   Headers: Authorization: {access_token[:30]}...")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    if response.status_code == 403:
        print("   ✅ Đúng! Trả về lỗi khi format sai")
except Exception as e:
    print(f"   Lỗi: {e}")

# Bước 5: Test /me với Authorization ĐÚNG FORMAT
print("\n5️⃣  Test /me với Authorization ĐÚNG FORMAT...")
try:
    headers = {"Authorization": f"Bearer {access_token}"}  # ✅ ĐÚNG
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"   Headers: Authorization: Bearer {access_token[:30]}...")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        user_data = response.json()
        print(f"   ✅ THÀNH CÔNG!")
        print(f"   User info:")
        print(f"      - Username: {user_data.get('username')}")
        print(f"      - Email: {user_data.get('email')}")
        print(f"      - Full name: {user_data.get('full_name')}")
        print(f"      - Role: {user_data.get('role')}")
    else:
        print(f"   ❌ THẤT BẠI: {response.json()}")
except Exception as e:
    print(f"   ❌ Lỗi: {e}")

# Tóm tắt
print("\n" + "=" * 70)
print("📋 TÓM TẮT - CÁC LỖI THƯỜNG GẶP:")
print("=" * 70)
print("❌ 1. Thiếu Authorization header")
print("❌ 2. Sai format: 'Authorization: <token>'")
print("✅ 3. Đúng format: 'Authorization: Bearer <token>'")
print("❌ 4. Token đã hết hạn (expired)")
print("❌ 5. Token không hợp lệ (invalid)")
print("❌ 6. User không active (is_active = False)")
print("=" * 70)
