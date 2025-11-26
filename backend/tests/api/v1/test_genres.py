import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.book import Genre
from app.main import app

@pytest.mark.asyncio
async def test_create_genre(client: AsyncClient, librarian_headers):
    response = await client.post(
        "/api/v1/genres/",
        json={"name": "Test Genre"},
        headers=librarian_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Genre"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_duplicate_genre(client: AsyncClient, librarian_headers):
    # Create first time
    await client.post(
        "/api/v1/genres/",
        json={"name": "Duplicate Genre"},
        headers=librarian_headers
    )
    
    # Create second time
    response = await client.post(
        "/api/v1/genres/",
        json={"name": "Duplicate Genre"},
        headers=librarian_headers
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_get_genres(client: AsyncClient, librarian_headers):
    # Create some genres
    await client.post("/api/v1/genres/", json={"name": "Genre 1"}, headers=librarian_headers)
    await client.post("/api/v1/genres/", json={"name": "Genre 2"}, headers=librarian_headers)
    
    response = await client.get("/api/v1/genres/")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 2
    assert data["total"] >= 2

@pytest.mark.asyncio
async def test_update_genre(client: AsyncClient, librarian_headers):
    # Create genre
    create_res = await client.post(
        "/api/v1/genres/",
        json={"name": "Old Name"},
        headers=librarian_headers
    )
    genre_id = create_res.json()["id"]
    
    # Update
    response = await client.put(
        f"/api/v1/genres/{genre_id}",
        json={"name": "New Name"},
        headers=librarian_headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"

@pytest.mark.asyncio
async def test_delete_genre(client: AsyncClient, librarian_headers):
    # Create genre
    create_res = await client.post(
        "/api/v1/genres/",
        json={"name": "Delete Me"},
        headers=librarian_headers
    )
    genre_id = create_res.json()["id"]
    
    # Delete
    response = await client.delete(
        f"/api/v1/genres/{genre_id}",
        headers=librarian_headers
    )
    assert response.status_code == 204
    
    # Verify deleted
    get_res = await client.get("/api/v1/genres/")
    items = get_res.json()["items"]
    assert not any(g["id"] == genre_id for g in items)
