import pytest
from httpx import AsyncClient
from app.models.book import Author

@pytest.mark.asyncio
async def test_create_author(client: AsyncClient, librarian_headers):
    response = await client.post(
        "/api/v1/authors/",
        json={"name": "Test Author", "bio": "Test Bio"},
        headers=librarian_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Author"
    assert data["bio"] == "Test Bio"
    assert "id" in data

@pytest.mark.asyncio
async def test_get_authors(client: AsyncClient, librarian_headers):
    # Create author
    await client.post(
        "/api/v1/authors/",
        json={"name": "List Author"},
        headers=librarian_headers
    )
    
    response = await client.get("/api/v1/authors/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(a["name"] == "List Author" for a in data)

@pytest.mark.asyncio
async def test_update_author(client: AsyncClient, librarian_headers):
    # Create author
    create_res = await client.post(
        "/api/v1/authors/",
        json={"name": "Update Author"},
        headers=librarian_headers
    )
    author_id = create_res.json()["id"]
    
    # Update
    response = await client.put(
        f"/api/v1/authors/{author_id}",
        json={"name": "Updated Author Name", "bio": "Updated Bio"},
        headers=librarian_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Author Name"
    assert data["bio"] == "Updated Bio"

@pytest.mark.asyncio
async def test_delete_author(client: AsyncClient, librarian_headers):
    # Create author
    create_res = await client.post(
        "/api/v1/authors/",
        json={"name": "Delete Author"},
        headers=librarian_headers
    )
    author_id = create_res.json()["id"]
    
    # Delete
    response = await client.delete(
        f"/api/v1/authors/{author_id}",
        headers=librarian_headers
    )
    assert response.status_code == 204
    
    # Verify deleted
    get_res = await client.get(f"/api/v1/authors/{author_id}")
    assert get_res.status_code == 404
