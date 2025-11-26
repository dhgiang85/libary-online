"""
Tests for News API endpoints (/api/v1/news/*)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from app.models.news import News
from app.models.user import User


class TestNewsListing:
    """Test news listing with pagination"""
    
    @pytest.mark.asyncio
    async def test_get_published_news(
        self,
        client: AsyncClient,
        test_published_news_list: list[News]
    ):
        """Test getting published news"""
        response = await client.get("/api/v1/news/")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 3  # At least 3 published news
        # All returned news should be published
        assert all(item["published"] for item in data["items"])
    
    @pytest.mark.asyncio
    async def test_get_news_pagination(
        self,
        client: AsyncClient,
        test_published_news_list: list[News]
    ):
        """Test news pagination"""
        response = await client.get("/api/v1/news/?page=1&page_size=2")
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["items"]) <= 2
    
    @pytest.mark.asyncio
    async def test_unpublished_news_not_shown(
        self,
        client: AsyncClient,
        test_draft_news: News
    ):
        """Test that unpublished news are not shown to public"""
        response = await client.get("/api/v1/news/")
        
        assert response.status_code == 200
        data = response.json()
        # Draft news should not appear in public list
        assert not any(item["id"] == str(test_draft_news.id) for item in data["items"])


class TestGetNews:
    """Test getting single news article"""
    
    @pytest.mark.asyncio
    async def test_get_published_news(
        self,
        client: AsyncClient,
        test_published_news: News
    ):
        """Test getting a published news article"""
        response = await client.get(f"/api/v1/news/{test_published_news.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_published_news.id)
        assert data["title"] == test_published_news.title
        assert data["published"] is True
    
    @pytest.mark.asyncio
    async def test_get_draft_news_returns_404(
        self,
        client: AsyncClient,
        test_draft_news: News
    ):
        """Test that draft news returns 404 to public"""
        response = await client.get(f"/api/v1/news/{test_draft_news.id}")
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_news(
        self,
        client: AsyncClient
    ):
        """Test getting non-existent news"""
        fake_id = uuid4()
        response = await client.get(f"/api/v1/news/{fake_id}")
        
        assert response.status_code == 404


class TestCreateNews:
    """Test creating news (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_create_news_success(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test successful news creation by librarian"""
        news_data = {
            "title": "New Library Event",
            "content": "We are hosting a book fair next month!",
            "summary": "Book fair announcement",
            "published": False
        }
        
        response = await client.post(
            "/api/v1/news/",
            json=news_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == news_data["title"]
        assert data["content"] == news_data["content"]
        assert data["published"] is False
    
    @pytest.mark.asyncio
    async def test_create_published_news(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test creating news as published"""
        news_data = {
            "title": "Published News",
            "content": "This news is published immediately",
            "published": True
        }
        
        response = await client.post(
            "/api/v1/news/",
            json=news_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["published"] is True
        assert data["published_at"] is not None
    
    @pytest.mark.asyncio
    async def test_create_news_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test that regular users cannot create news"""
        news_data = {
            "title": "Unauthorized News",
            "content": "This should fail"
        }
        
        response = await client.post(
            "/api/v1/news/",
            json=news_data,
            headers=auth_headers
        )
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_create_news_missing_required_fields(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test creating news with missing required fields"""
        news_data = {
            "title": "Missing content"
        }
        
        response = await client.post(
            "/api/v1/news/",
            json=news_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 422


class TestUpdateNews:
    """Test updating news (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_update_news_title(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_draft_news: News
    ):
        """Test updating news title"""
        update_data = {
            "title": "Updated Title"
        }
        
        response = await client.put(
            f"/api/v1/news/{test_draft_news.id}",
            json=update_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
    
    @pytest.mark.asyncio
    async def test_update_nonexistent_news(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test updating non-existent news"""
        fake_id = uuid4()
        update_data = {"title": "Updated"}
        
        response = await client.put(
            f"/api/v1/news/{fake_id}",
            json=update_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_update_news_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_draft_news: News
    ):
        """Test that regular users cannot update news"""
        update_data = {"title": "Unauthorized Update"}
        
        response = await client.put(
            f"/api/v1/news/{test_draft_news.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 403


class TestDeleteNews:
    """Test deleting news (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_delete_news_success(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_draft_news: News
    ):
        """Test successful news deletion"""
        response = await client.delete(
            f"/api/v1/news/{test_draft_news.id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 204
        
        # Verify news is deleted
        get_response = await client.get(f"/api/v1/news/{test_draft_news.id}")
        assert get_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_news(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test deleting non-existent news"""
        fake_id = uuid4()
        response = await client.delete(
            f"/api/v1/news/{fake_id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_news_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_draft_news: News
    ):
        """Test that regular users cannot delete news"""
        response = await client.delete(
            f"/api/v1/news/{test_draft_news.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 403


class TestPublishNews:
    """Test publishing news"""
    
    @pytest.mark.asyncio
    async def test_publish_draft_news(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_draft_news: News
    ):
        """Test publishing a draft news"""
        response = await client.post(
            f"/api/v1/news/{test_draft_news.id}/publish",
            headers=librarian_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["published"] is True
        assert data["published_at"] is not None
    
    @pytest.mark.asyncio
    async def test_publish_already_published_news(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_published_news: News
    ):
        """Test publishing already published news returns error"""
        response = await client.post(
            f"/api/v1/news/{test_published_news.id}/publish",
            headers=librarian_headers
        )
        
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_publish_news_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_draft_news: News
    ):
        """Test that regular users cannot publish news"""
        response = await client.post(
            f"/api/v1/news/{test_draft_news.id}/publish",
            headers=auth_headers
        )
        
        assert response.status_code == 403
