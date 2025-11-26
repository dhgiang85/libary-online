import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.book_copy import BorrowRecord
from app.utils.security import hash_password


@pytest.mark.asyncio
async def test_get_users_list(async_client: AsyncClient, admin_token: str, db_session: AsyncSession):
    """Test getting list of users (admin only)"""
    # Create some test users
    users = [
        User(
            email=f"user{i}@test.com",
            username=f"user{i}",
            hashed_password=hash_password("Password123"),
            role="user",
            is_active=True
        )
        for i in range(3)
    ]
    db_session.add_all(users)
    await db_session.commit()
    
    # Get users list
    response = await async_client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 3
    assert "items" in data
    assert "page" in data


@pytest.mark.asyncio
async def test_get_users_with_filters(async_client: AsyncClient, admin_token: str, db_session: AsyncSession):
    """Test getting users with role filter"""
    response = await async_client.get(
        "/api/v1/users/?role=admin",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    # Should have at least the admin user
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_users_unauthorized(async_client: AsyncClient, user_token: str):
    """Test that regular users cannot access user list"""
    response = await async_client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_user_details(async_client: AsyncClient, admin_token: str, test_user: User):
    """Test getting user details with statistics"""
    response = await async_client.get(
        f"/api/v1/users/{test_user.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_user.id)
    assert data["username"] == test_user.username
    assert "total_borrows" in data
    assert "active_borrows" in data
    assert "total_reservations" in data


@pytest.mark.asyncio
async def test_update_user(async_client: AsyncClient, admin_token: str, test_user: User):
    """Test updating user information"""
    update_data = {
        "full_name": "Updated Name",
        "email": "newemail@test.com"
    }
    
    response = await async_client.put(
        f"/api/v1/users/{test_user.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["email"] == "newemail@test.com"


@pytest.mark.asyncio
async def test_update_user_duplicate_email(async_client: AsyncClient, admin_token: str, test_user: User, db_session: AsyncSession):
    """Test that updating to duplicate email fails"""
    # Create another user
    another_user = User(
        email="another@test.com",
        username="another_user",
        hashed_password=hash_password("Password123"),
        role="user"
    )
    db_session.add(another_user)
    await db_session.commit()
    
    # Try to update test_user with another_user's email
    update_data = {"email": "another@test.com"}
    
    response = await async_client.put(
        f"/api/v1/users/{test_user.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_deactivate_user(async_client: AsyncClient, admin_token: str, test_user: User):
    """Test deactivating a user"""
    response = await async_client.delete(
        f"/api/v1/users/{test_user.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_cannot_deactivate_self(async_client: AsyncClient, admin_token: str, admin_user: User):
    """Test that admin cannot deactivate their own account"""
    response = await async_client.delete(
        f"/api/v1/users/{admin_user.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 400
    assert "cannot deactivate your own account" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_update_user_role(async_client: AsyncClient, admin_token: str, test_user: User):
    """Test changing user role"""
    role_data = {"role": "librarian"}
    
    response = await async_client.put(
        f"/api/v1/users/{test_user.id}/role",
        json=role_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "librarian"


@pytest.mark.asyncio
async def test_cannot_change_own_role(async_client: AsyncClient, admin_token: str, admin_user: User):
    """Test that admin cannot change their own role"""
    role_data = {"role": "user"}
    
    response = await async_client.put(
        f"/api/v1/users/{admin_user.id}/role",
        json=role_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 400
    assert "cannot change your own role" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_user_borrow_history(async_client: AsyncClient, admin_token: str, test_user: User):
    """Test getting user's borrow history"""
    response = await async_client.get(
        f"/api/v1/users/{test_user.id}/borrow-history",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
