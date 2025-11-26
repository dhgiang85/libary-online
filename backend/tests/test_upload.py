"""
Tests for File Upload API endpoints (/api/v1/upload/*)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4
from io import BytesIO
from pathlib import Path

from app.models.book import Book
from app.models.news import News
from app.models.user import User


class TestUploadBookCover:
    """Test uploading book cover images"""
    
    @pytest.mark.asyncio
    async def test_upload_book_cover_success(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test successful book cover upload"""
        # Create a fake image file
        image_data = b"fake image content"
        files = {
            "file": ("test_cover.jpg", BytesIO(image_data), "image/jpeg")
        }
        
        response = await client.post(
            f"/api/v1/upload/book-cover/{test_book.id}",
            files=files,
            headers=librarian_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_book.id)
        assert data["cover_url"] is not None
        assert "covers" in data["cover_url"]
    
    @pytest.mark.asyncio
    async def test_upload_book_cover_png(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test uploading PNG book cover"""
        image_data = b"fake png image"
        files = {
            "file": ("test_cover.png", BytesIO(image_data), "image/png")
        }
        
        response = await client.post(
            f"/api/v1/upload/book-cover/{test_book.id}",
            files=files,
            headers=librarian_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["cover_url"].endswith(".png")
    
    @pytest.mark.asyncio
    async def test_upload_book_cover_nonexistent_book(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test uploading cover for non-existent book"""
        fake_id = uuid4()
        image_data = b"fake image"
        files = {
            "file": ("test.jpg", BytesIO(image_data), "image/jpeg")
        }
        
        response = await client.post(
            f"/api/v1/upload/book-cover/{fake_id}",
            files=files,
            headers=librarian_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_upload_book_cover_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_book: Book
    ):
        """Test that regular users cannot upload covers"""
        image_data = b"fake image"
        files = {
            "file": ("test.jpg", BytesIO(image_data), "image/jpeg")
        }
        
        response = await client.post(
            f"/api/v1/upload/book-cover/{test_book.id}",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_upload_book_cover_invalid_file_type(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test uploading non-image file"""
        file_data = b"not an image"
        files = {
            "file": ("test.txt", BytesIO(file_data), "text/plain")
        }
        
        response = await client.post(
            f"/api/v1/upload/book-cover/{test_book.id}",
            files=files,
            headers=librarian_headers
        )
        
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_upload_book_cover_replaces_old(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test that uploading new cover replaces old one"""
        # Upload first cover
        files1 = {
            "file": ("cover1.jpg", BytesIO(b"first image"), "image/jpeg")
        }
        response1 = await client.post(
            f"/api/v1/upload/book-cover/{test_book.id}",
            files=files1,
            headers=librarian_headers
        )
        assert response1.status_code == 200
        old_cover_url = response1.json()["cover_url"]
        
        # Upload second cover
        files2 = {
            "file": ("cover2.jpg", BytesIO(b"second image"), "image/jpeg")
        }
        response2 = await client.post(
            f"/api/v1/upload/book-cover/{test_book.id}",
            files=files2,
            headers=librarian_headers
        )
        assert response2.status_code == 200
        new_cover_url = response2.json()["cover_url"]
        
        # URLs should be different
        assert old_cover_url != new_cover_url


class TestDeleteBookCover:
    """Test deleting book cover images"""
    
    @pytest.mark.asyncio
    async def test_delete_book_cover_success(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book_with_cover: Book
    ):
        """Test successful book cover deletion"""
        response = await client.delete(
            f"/api/v1/upload/book-cover/{test_book_with_cover.id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 204
    
    @pytest.mark.asyncio
    async def test_delete_book_cover_no_cover(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test deleting cover when book has no cover"""
        response = await client.delete(
            f"/api/v1/upload/book-cover/{test_book.id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_delete_book_cover_nonexistent_book(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test deleting cover for non-existent book"""
        fake_id = uuid4()
        response = await client.delete(
            f"/api/v1/upload/book-cover/{fake_id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_book_cover_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_book_with_cover: Book
    ):
        """Test that regular users cannot delete covers"""
        response = await client.delete(
            f"/api/v1/upload/book-cover/{test_book_with_cover.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 403


class TestUploadNewsCover:
    """Test uploading news cover images"""
    
    @pytest.mark.asyncio
    async def test_upload_news_cover_success(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_published_news: News
    ):
        """Test successful news cover upload"""
        image_data = b"fake news image"
        files = {
            "file": ("news_cover.jpg", BytesIO(image_data), "image/jpeg")
        }
        
        response = await client.post(
            f"/api/v1/upload/news-cover/{test_published_news.id}",
            files=files,
            headers=librarian_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_published_news.id)
        assert data["cover_image"] is not None
        assert "news" in data["cover_image"]
    
    @pytest.mark.asyncio
    async def test_upload_news_cover_nonexistent_news(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test uploading cover for non-existent news"""
        fake_id = uuid4()
        files = {
            "file": ("test.jpg", BytesIO(b"fake"), "image/jpeg")
        }
        
        response = await client.post(
            f"/api/v1/upload/news-cover/{fake_id}",
            files=files,
            headers=librarian_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_upload_news_cover_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_published_news: News
    ):
        """Test that regular users cannot upload news covers"""
        files = {
            "file": ("test.jpg", BytesIO(b"fake"), "image/jpeg")
        }
        
        response = await client.post(
            f"/api/v1/upload/news-cover/{test_published_news.id}",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 403


class TestFileValidation:
    """Test file validation utilities"""
    
    @pytest.mark.asyncio
    async def test_upload_webp_format(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test uploading WebP format"""
        files = {
            "file": ("test.webp", BytesIO(b"fake webp"), "image/webp")
        }
        
        response = await client.post(
            f"/api/v1/upload/book-cover/{test_book.id}",
            files=files,
            headers=librarian_headers
        )
        
        assert response.status_code == 200
        assert response.json()["cover_url"].endswith(".webp")
    
    @pytest.mark.asyncio
    async def test_upload_svg_rejected(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test that SVG files are rejected"""
        files = {
            "file": ("test.svg", BytesIO(b"<svg></svg>"), "image/svg+xml")
        }
        
        response = await client.post(
            f"/api/v1/upload/book-cover/{test_book.id}",
            files=files,
            headers=librarian_headers
        )
        
        # Should be rejected (400) because SVG is not in allowed extensions
        assert response.status_code == 400
