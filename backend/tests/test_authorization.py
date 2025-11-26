"""
Tests for authorization and role-based access control
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from app.models.user import User
from tests.test_helpers import create_expired_token, get_auth_headers


class TestRoleBasedAccess:
    """Test role-based access control"""
    
    @pytest.mark.asyncio
    async def test_user_can_access_own_profile(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict
    ):
        """Test that user can access their own profile"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
    
    @pytest.mark.asyncio
    async def test_librarian_can_access_own_profile(
        self,
        client: AsyncClient,
        test_librarian: User,
        librarian_headers: dict
    ):
        """Test that librarian can access their own profile"""
        response = await client.get("/api/v1/auth/me", headers=librarian_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "librarian"
    
    @pytest.mark.asyncio
    async def test_admin_can_access_own_profile(
        self,
        client: AsyncClient,
        test_admin: User,
        admin_headers: dict
    ):
        """Test that admin can access their own profile"""
        response = await client.get("/api/v1/auth/me", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"
    
    @pytest.mark.asyncio
    async def test_different_roles_have_different_tokens(
        self,
        user_token: str,
        librarian_token: str,
        admin_token: str
    ):
        """Test that different roles generate different tokens"""
        # All tokens should be different
        assert user_token != librarian_token
        assert user_token != admin_token
        assert librarian_token != admin_token


class TestActiveUserValidation:
    """Test active user validation"""
    
    @pytest.mark.asyncio
    async def test_inactive_user_cannot_login(
        self,
        client: AsyncClient,
        inactive_user: User
    ):
        """Test that inactive users cannot log in"""
        login_data = {
            "username": inactive_user.username,
            "password": "Password123"  # Match fixture password
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 403  # Inactive user should get 403 Forbidden
        assert "inactive" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_inactive_user_cannot_access_protected_endpoints(
        self,
        client: AsyncClient,
        test_user: User,
        db_session: AsyncSession,
        user_token: str
    ):
        """Test that deactivated users cannot access protected endpoints"""
        # First verify user can access with active account
        headers = get_auth_headers(user_token)
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        
        # Deactivate user
        test_user.is_active = False
        await db_session.commit()
        
        # Try to access protected endpoint
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        # Should be forbidden
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_active_user_can_access_endpoints(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict
    ):
        """Test that active users can access protected endpoints"""
        assert test_user.is_active is True
        
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        
        assert response.status_code == 200


class TestTokenValidation:
    """Test token validation and security"""
    
    @pytest.mark.asyncio
    async def test_missing_authorization_header(self, client: AsyncClient):
        """Test request without Authorization header"""
        response = await client.get("/api/v1/auth/me")
        
        # HTTPBearer returns 403 when no credentials provided
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_malformed_authorization_header(self, client: AsyncClient):
        """Test request with malformed Authorization header"""
        # Missing "Bearer" prefix
        headers = {"Authorization": "InvalidToken"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_invalid_token_format(self, client: AsyncClient):
        """Test request with invalid token format"""
        headers = {"Authorization": "Bearer invalid.token.format"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_expired_token_rejected(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test that expired tokens are rejected"""
        expired_token = create_expired_token(str(test_user.id), test_user.role)
        headers = get_auth_headers(expired_token)
        
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_token_with_nonexistent_user(
        self,
        client: AsyncClient
    ):
        """Test that valid token for non-existent user is rejected"""
        from app.utils.security import create_access_token
        
        # Create token for non-existent user
        fake_user_id = str(uuid4())
        token = create_access_token(data={"sub": fake_user_id, "role": "user"})
        headers = get_auth_headers(token)
        
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_refresh_token_cannot_access_protected_endpoints(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test that refresh tokens cannot be used for protected endpoints"""
        from app.utils.security import create_refresh_token
        
        # Create refresh token
        refresh_token = create_refresh_token(data={"sub": str(test_user.id)})
        headers = get_auth_headers(refresh_token)
        
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        # Should be rejected because token type is "refresh" not "access"
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_token_reuse_after_password_change(
        self,
        client: AsyncClient,
        test_user: User,
        db_session: AsyncSession,
        user_token: str
    ):
        """Test that old tokens still work after password change (no token invalidation)"""
        from app.utils.security import hash_password
        
        # Get user info with current token
        headers = get_auth_headers(user_token)
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        
        # Change password
        test_user.hashed_password = hash_password("newpassword123")
        await db_session.commit()
        
        # Old token should still work (no token invalidation mechanism)
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        
        # Note: In production, you might want to implement token invalidation
        # This test documents current behavior


class TestCrossRoleAccess:
    """Test that roles cannot access each other's resources inappropriately"""
    
    @pytest.mark.asyncio
    async def test_users_have_unique_tokens(
        self,
        test_user: User,
        test_librarian: User,
        test_admin: User,
        user_token: str,
        librarian_token: str,
        admin_token: str
    ):
        """Test that each user has a unique token"""
        from app.utils.security import decode_token
        
        user_payload = decode_token(user_token)
        librarian_payload = decode_token(librarian_token)
        admin_payload = decode_token(admin_token)
        
        # Each token should have different user ID
        assert user_payload["sub"] == str(test_user.id)
        assert librarian_payload["sub"] == str(test_librarian.id)
        assert admin_payload["sub"] == str(test_admin.id)
        
        # Each token should have correct role
        assert user_payload["role"] == "user"
        assert librarian_payload["role"] == "librarian"
        assert admin_payload["role"] == "admin"
    
    @pytest.mark.asyncio
    async def test_token_contains_correct_user_data(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict
    ):
        """Test that token returns correct user data"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Returned data should match the user who owns the token
        assert data["id"] == str(test_user.id)
        assert data["username"] == test_user.username
        assert data["email"] == test_user.email
        assert data["role"] == test_user.role
