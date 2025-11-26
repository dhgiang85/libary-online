"""
Tests for Book Copies API endpoints (/api/v1/book-copies/*)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4
from datetime import datetime, timedelta

from app.models.book_copy import BookCopy, BorrowRecord
from app.models.book import Book
from app.models.user import User


class TestCreateBookCopy:
    """Test creating book copies (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_create_copy_success(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test successful book copy creation"""
        copy_data = {
            "book_id": str(test_book.id),
            "barcode": "BC-001-2024"
        }
        
        response = await client.post(
            "/api/v1/book-copies/",
            json=copy_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["barcode"] == copy_data["barcode"]
        assert data["book_id"] == str(test_book.id)
        assert data["status"] == "AVAILABLE"
    
    @pytest.mark.asyncio
    async def test_create_copy_duplicate_barcode(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book_copy: BookCopy
    ):
        """Test creating copy with duplicate barcode"""
        copy_data = {
            "book_id": str(test_book_copy.book_id),
            "barcode": test_book_copy.barcode  # Duplicate
        }
        
        response = await client.post(
            "/api/v1/book-copies/",
            json=copy_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_create_copy_nonexistent_book(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test creating copy for non-existent book"""
        fake_book_id = uuid4()
        copy_data = {
            "book_id": str(fake_book_id),
            "barcode": "BC-999-2024"
        }
        
        response = await client.post(
            "/api/v1/book-copies/",
            json=copy_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_create_copy_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_book: Book
    ):
        """Test that regular users cannot create copies"""
        copy_data = {
            "book_id": str(test_book.id),
            "barcode": "BC-002-2024"
        }
        
        response = await client.post(
            "/api/v1/book-copies/",
            json=copy_data,
            headers=auth_headers
        )
        
        assert response.status_code == 403


class TestGetBookCopy:
    """Test getting book copy (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_get_copy_success(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book_copy: BookCopy
    ):
        """Test getting a book copy"""
        response = await client.get(
            f"/api/v1/book-copies/{test_book_copy.id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_book_copy.id)
        assert data["barcode"] == test_book_copy.barcode
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_copy(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test getting non-existent copy"""
        fake_id = uuid4()
        response = await client.get(
            f"/api/v1/book-copies/{fake_id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_get_copy_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_book_copy: BookCopy
    ):
        """Test that regular users cannot get copy details"""
        response = await client.get(
            f"/api/v1/book-copies/{test_book_copy.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 403


class TestUpdateBookCopy:
    """Test updating book copies (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_update_copy_status(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book_copy: BookCopy
    ):
        """Test updating copy status"""
        update_data = {
            "status": "LOST"
        }
        
        response = await client.put(
            f"/api/v1/book-copies/{test_book_copy.id}",
            json=update_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "LOST"
    
    @pytest.mark.asyncio
    async def test_update_nonexistent_copy(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test updating non-existent copy"""
        fake_id = uuid4()
        update_data = {"status": "LOST"}
        
        response = await client.put(
            f"/api/v1/book-copies/{fake_id}",
            json=update_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 404


class TestDeleteBookCopy:
    """Test deleting book copies (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_delete_copy_success(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book_copy: BookCopy
    ):
        """Test successful copy deletion"""
        response = await client.delete(
            f"/api/v1/book-copies/{test_book_copy.id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 204
    
    @pytest.mark.asyncio
    async def test_delete_borrowed_copy_fails(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_borrowed_copy: BookCopy
    ):
        """Test that borrowed copies cannot be deleted"""
        response = await client.delete(
            f"/api/v1/book-copies/{test_borrowed_copy.id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_copy(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test deleting non-existent copy"""
        fake_id = uuid4()
        response = await client.delete(
            f"/api/v1/book-copies/{fake_id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 404


class TestBorrowBook:
    """Test borrowing books"""
    
    @pytest.mark.asyncio
    async def test_borrow_book_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_book_copy: BookCopy
    ):
        """Test successful book borrowing"""
        due_date = (datetime.utcnow() + timedelta(days=14)).isoformat()
        borrow_data = {
            "copy_id": str(test_book_copy.id),
            "due_date": due_date
        }
        
        response = await client.post(
            f"/api/v1/book-copies/{test_book_copy.id}/borrow",
            json=borrow_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["copy_id"] == str(test_book_copy.id)
        assert data["status"] == "ACTIVE"
        assert data["returned_at"] is None
    
    @pytest.mark.asyncio
    async def test_borrow_already_borrowed_book(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_borrowed_copy: BookCopy
    ):
        """Test borrowing already borrowed book fails"""
        due_date = (datetime.utcnow() + timedelta(days=14)).isoformat()
        borrow_data = {
            "copy_id": str(test_borrowed_copy.id),
            "due_date": due_date
        }
        
        response = await client.post(
            f"/api/v1/book-copies/{test_borrowed_copy.id}/borrow",
            json=borrow_data,
            headers=auth_headers
        )
        
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_borrow_nonexistent_copy(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test borrowing non-existent copy"""
        fake_id = uuid4()
        due_date = (datetime.utcnow() + timedelta(days=14)).isoformat()
        borrow_data = {
            "copy_id": str(fake_id),
            "due_date": due_date
        }
        
        response = await client.post(
            f"/api/v1/book-copies/{fake_id}/borrow",
            json=borrow_data,
            headers=auth_headers
        )
        
        assert response.status_code == 404


class TestReturnBook:
    """Test returning books"""
    
    @pytest.mark.asyncio
    async def test_return_book_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_user: User,
        test_borrowed_copy_by_user: BookCopy
    ):
        """Test successful book return"""
        response = await client.post(
            f"/api/v1/book-copies/{test_borrowed_copy_by_user.id}/return",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "RETURNED"
        assert data["returned_at"] is not None
    
    @pytest.mark.asyncio
    async def test_return_not_borrowed_book(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_book_copy: BookCopy
    ):
        """Test returning a book that wasn't borrowed"""
        response = await client.post(
            f"/api/v1/book-copies/{test_book_copy.id}/return",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_return_nonexistent_copy(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test returning non-existent copy"""
        fake_id = uuid4()
        response = await client.post(
            f"/api/v1/book-copies/{fake_id}/return",
            headers=auth_headers
        )
        
        assert response.status_code == 404
