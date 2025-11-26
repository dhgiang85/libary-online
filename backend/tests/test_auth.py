"""
Tests for authentication endpoints (/auth/*)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from tests.test_helpers import create_expired_token, get_auth_headers


class TestUserRegistration:
    """Test user registration endpoint"""
    
    @pytest.mark.asyncio
    async def test_register_new_user(self, client: AsyncClient):
        """Test successful user registration"""
        user_data = {
            "email": "newuser@test.com",
            "username": "newuser",
            "full_name": "New User",
            "password": "Password123",
            "role": "user"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert data["full_name"] == user_data["full_name"]
        assert data["role"] == user_data["role"]
        assert "id" in data
        assert "hashed_password" not in data  # Should not expose password
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user: User):
        """Test registration with duplicate email"""
        user_data = {
            "email": test_user.email,  # Duplicate email
            "username": "differentuser",
            "full_name": "Different User",
            "password": "Password123",
            "role": "user"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 400
        assert "email already registered" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, client: AsyncClient, test_user: User):
        """Test registration with duplicate username"""
        user_data = {
            "email": "different@test.com",
            "username": test_user.username,  # Duplicate username
            "full_name": "Different User",
            "password": "Password123",
            "role": "user"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 400
        assert "username already taken" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email format"""
        user_data = {
            "email": "not-an-email",
            "username": "newuser",
            "full_name": "New User",
            "password": "Password123",
            "role": "user"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        # Should fail validation
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with password shorter than 8 characters"""
        user_data = {
            "email": "newuser@test.com",
            "username": "newuser",
            "full_name": "New User",
            "password": "short",  # Too short
            "role": "user"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        # Should fail validation
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_register_default_role(self, client: AsyncClient):
        """Test that default role is 'user' if not specified"""
        user_data = {
            "email": "newuser@test.com",
            "username": "newuser",
            "full_name": "New User",
            "password": "Password123"
            # No role specified
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["role"] == "user"


class TestUserLogin:
    """Test user login endpoint"""
    
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login with correct credentials"""
        login_data = {
            "username": test_user.username,
            "password": "Password123"  # From fixture
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login with incorrect password"""
        login_data = {
            "username": test_user.username,
            "password": "wrongpassword"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "incorrect username or password" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent username"""
        login_data = {
            "username": "nonexistent",
            "password": "Password123"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "incorrect username or password" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, inactive_user: User):
        """Test login with inactive user account"""
        login_data = {
            "username": inactive_user.username,
            "password": "Password123"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 403
        assert "inactive" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_login_returns_both_tokens(self, client: AsyncClient, test_user: User):
        """Test that login returns both access and refresh tokens"""
        login_data = {
            "username": test_user.username,
            "password": "Password123"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Both tokens should be present and non-empty
        assert data["access_token"]
        assert data["refresh_token"]
        assert len(data["access_token"]) > 0
        assert len(data["refresh_token"]) > 0
        # Tokens should be different
        assert data["access_token"] != data["refresh_token"]


class TestTokenRefresh:
    """Test token refresh endpoint"""
    
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: AsyncClient, test_user: User):
        """Test successfully refreshing access token"""
        # First login to get refresh token
        login_data = {
            "username": test_user.username,
            "password": "Password123"
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        refresh_token = login_response.json()["refresh_token"]
        
        # Use refresh token to get new access token
        refresh_data = {"refresh_token": refresh_token}
        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    async def test_refresh_with_access_token(self, client: AsyncClient, user_token: str):
        """Test that access token cannot be used in refresh endpoint"""
        refresh_data = {"refresh_token": user_token}  # Using access token
        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_refresh_with_invalid_token(self, client: AsyncClient):
        """Test refresh with invalid token"""
        refresh_data = {"refresh_token": "invalid.token.here"}
        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_refresh_with_expired_token(self, client: AsyncClient, test_user: User):
        """Test refresh with expired token"""
        expired_token = create_expired_token(str(test_user.id), test_user.role)
        refresh_data = {"refresh_token": expired_token}
        
        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_refresh_for_inactive_user(
        self, 
        client: AsyncClient, 
        test_user: User,
        db_session: AsyncSession
    ):
        """Test that refresh fails for inactive user"""
        # First login to get refresh token
        login_data = {
            "username": test_user.username,
            "password": "Password123"
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        refresh_token = login_response.json()["refresh_token"]
        
        # Deactivate user
        test_user.is_active = False
        await db_session.commit()
        
        # Try to refresh
        refresh_data = {"refresh_token": refresh_token}
        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        
        assert response.status_code == 401


class TestGetCurrentUser:
    """Test get current user endpoint"""
    
    @pytest.mark.asyncio
    async def test_get_current_user_success(
        self, 
        client: AsyncClient, 
        test_user: User,
        auth_headers: dict
    ):
        """Test getting user info with valid token"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
        assert data["role"] == test_user.role
        assert "hashed_password" not in data
    
    @pytest.mark.asyncio
    async def test_get_current_user_no_token(self, client: AsyncClient):
        """Test getting user info without token"""
        response = await client.get("/api/v1/auth/me")
        
        assert response.status_code == 403  # FastAPI HTTPBearer returns 403
    
    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test getting user info with invalid token"""
        headers = {"Authorization": "Bearer invalid.token.here"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_current_user_expired_token(
        self, 
        client: AsyncClient,
        test_user: User
    ):
        """Test getting user info with expired token"""
        expired_token = create_expired_token(str(test_user.id), test_user.role)
        headers = get_auth_headers(expired_token)
        
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401
