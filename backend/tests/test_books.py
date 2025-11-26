"""
Tests for Books API endpoints (/api/v1/books/*)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from app.models.user import User
from app.models.book import Book, Author, Genre, Keyword


class TestBooksListing:
    """Test books listing with pagination and filtering"""
    
    @pytest.mark.asyncio
    async def test_get_books_default_pagination(
        self,
        client: AsyncClient,
        test_books_list: list[Book]
    ):
        """Test getting books with default pagination"""
        response = await client.get("/api/v1/books/")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert data["page"] == 1
        assert data["page_size"] == 20
        assert data["total"] == 15  # From test_books_list fixture
        assert len(data["items"]) == 15
    
    @pytest.mark.asyncio
    async def test_get_books_custom_page_size(
        self,
        client: AsyncClient,
        test_books_list: list[Book]
    ):
        """Test getting books with custom page size"""
        response = await client.get("/api/v1/books/?page_size=5")
        
        assert response.status_code == 200
        data = response.json()
        assert data["page_size"] == 5
        assert len(data["items"]) == 5
    
    @pytest.mark.asyncio
    async def test_get_books_specific_page(
        self,
        client: AsyncClient,
        test_books_list: list[Book]
    ):
        """Test navigating to specific page"""
        response = await client.get("/api/v1/books/?page=2&page_size=10")
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert len(data["items"]) == 5  # 15 total, page 2 has remaining 5
    
    @pytest.mark.asyncio
    async def test_search_books_by_title(
        self,
        client: AsyncClient,
        test_books_list: list[Book]
    ):
        """Test searching books by title"""
        response = await client.get("/api/v1/books/?search=Book 1")
        
        assert response.status_code == 200
        data = response.json()
        # Should match "Book 1", "Book 10", "Book 11", etc.
        assert data["total"] >= 1
        assert any("Book 1" in item["title"] for item in data["items"])
    
    @pytest.mark.asyncio
    async def test_search_books_by_isbn(
        self,
        client: AsyncClient,
        test_book: Book
    ):
        """Test searching books by ISBN"""
        response = await client.get(f"/api/v1/books/?search={test_book.isbn}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert any(item["isbn"] == test_book.isbn for item in data["items"])
    
    @pytest.mark.asyncio
    async def test_filter_books_by_genre(
        self,
        client: AsyncClient,
        test_books_list: list[Book],
        test_genre: Genre
    ):
        """Test filtering books by genre"""
        response = await client.get(f"/api/v1/books/?genre={test_genre.name}")
        
        assert response.status_code == 200
        data = response.json()
        # Half of the books have test_genre
        assert data["total"] >= 1
    
    @pytest.mark.asyncio
    async def test_filter_books_by_author(
        self,
        client: AsyncClient,
        test_books_list: list[Book],
        test_author: Author
    ):
        """Test filtering books by author"""
        response = await client.get(f"/api/v1/books/?author={test_author.name}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
    
    @pytest.mark.asyncio
    async def test_combined_search_and_filter(
        self,
        client: AsyncClient,
        test_books_list: list[Book],
        test_genre: Genre
    ):
        """Test combined search and filter"""
        response = await client.get(f"/api/v1/books/?search=Book&genre={test_genre.name}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 0  # May or may not have results
    
    @pytest.mark.asyncio
    async def test_empty_results(
        self,
        client: AsyncClient
    ):
        """Test search with no results"""
        response = await client.get("/api/v1/books/?search=NonexistentBook12345")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert len(data["items"]) == 0
    
    @pytest.mark.asyncio
    async def test_invalid_page_number(
        self,
        client: AsyncClient,
        test_books_list: list[Book]
    ):
        """Test invalid page number"""
        response = await client.get("/api/v1/books/?page=999")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 0  # No items on page 999


class TestGetBook:
    """Test getting single book"""
    
    @pytest.mark.asyncio
    async def test_get_existing_book(
        self,
        client: AsyncClient,
        test_book: Book
    ):
        """Test getting an existing book by ID"""
        response = await client.get(f"/api/v1/books/{test_book.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_book.id)
        assert data["title"] == test_book.title
        assert data["isbn"] == test_book.isbn
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_book(
        self,
        client: AsyncClient
    ):
        """Test getting a non-existent book"""
        fake_id = uuid4()
        response = await client.get(f"/api/v1/books/{fake_id}")
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_get_book_with_relationships(
        self,
        client: AsyncClient,
        test_book: Book
    ):
        """Test that book includes authors and genres"""
        response = await client.get(f"/api/v1/books/{test_book.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "authors" in data
        assert "genres" in data
        assert len(data["authors"]) > 0
        assert len(data["genres"]) > 0


class TestCreateBook:
    """Test creating books (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_create_book_success(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_author: Author,
        test_genre: Genre
    ):
        """Test successful book creation by librarian"""
        book_data = {
            "title": "New Test Book",
            "description": "A new book for testing",
            "isbn": "978-0-987654-32-1",
            "publisher": "New Publisher",
            "publication_year": 2024,
            "pages": 250,
            "authors": [test_author.name],
            "genres": [test_genre.name],
            "keywords": [],
            "location": {
                "floor": "1",
                "shelf": "A",
                "row": "1"
            }
        }
        
        response = await client.post(
            "/api/v1/books/",
            json=book_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == book_data["title"]
        assert data["isbn"] == book_data["isbn"]
    
    @pytest.mark.asyncio
    async def test_create_book_with_new_author(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test creating book with new author"""
        book_data = {
            "title": "Book with New Author",
            "isbn": "978-0-111111-11-1",
            "authors": ["Brand New Author"],
            "genres": ["Fiction"],
            "keywords": [],
            "location": {
                "floor": "1",
                "shelf": "B",
                "row": "2"
            }
        }
        
        response = await client.post(
            "/api/v1/books/",
            json=book_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert any(author["name"] == "Brand New Author" for author in data["authors"])
    
    @pytest.mark.asyncio
    async def test_create_book_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test that regular users cannot create books"""
        book_data = {
            "title": "Unauthorized Book",
            "isbn": "978-0-222222-22-2"
        }
        
        response = await client.post(
            "/api/v1/books/",
            json=book_data,
            headers=auth_headers
        )
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_create_book_missing_required_fields(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test creating book with missing required fields"""
        book_data = {
            "description": "Missing title"
        }
        
        response = await client.post(
            "/api/v1/books/",
            json=book_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_create_book_duplicate_isbn(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test creating book with duplicate ISBN"""
        book_data = {
            "title": "Duplicate ISBN Book",
            "isbn": test_book.isbn,  # Duplicate
            "authors": ["Test Author"],
            "genres": ["Test Genre"],
            "keywords": [],
            "location": {
                "floor": "1",
                "shelf": "C",
                "row": "3"
            }
        }
        
        response = await client.post(
            "/api/v1/books/",
            json=book_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 400


class TestUpdateBook:
    """Test updating books (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_update_book_title(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test updating book title"""
        update_data = {
            "title": "Updated Title"
        }
        
        response = await client.put(
            f"/api/v1/books/{test_book.id}",
            json=update_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
    
    @pytest.mark.asyncio
    async def test_update_nonexistent_book(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test updating non-existent book"""
        fake_id = uuid4()
        update_data = {"title": "Updated"}
        
        response = await client.put(
            f"/api/v1/books/{fake_id}",
            json=update_data,
            headers=librarian_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_update_book_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_book: Book
    ):
        """Test that regular users cannot update books"""
        update_data = {"title": "Unauthorized Update"}
        
        response = await client.put(
            f"/api/v1/books/{test_book.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 403


class TestDeleteBook:
    """Test deleting books (librarian only)"""
    
    @pytest.mark.asyncio
    async def test_delete_book_success(
        self,
        client: AsyncClient,
        librarian_headers: dict,
        test_book: Book
    ):
        """Test successful book deletion"""
        response = await client.delete(
            f"/api/v1/books/{test_book.id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 204  # DELETE returns 204 No Content
        
        # Verify book is deleted
        get_response = await client.get(f"/api/v1/books/{test_book.id}")
        assert get_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_book(
        self,
        client: AsyncClient,
        librarian_headers: dict
    ):
        """Test deleting non-existent book"""
        fake_id = uuid4()
        response = await client.delete(
            f"/api/v1/books/{fake_id}",
            headers=librarian_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_book_unauthorized(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_book: Book
    ):
        """Test that regular users cannot delete books"""
        response = await client.delete(
            f"/api/v1/books/{test_book.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 403


class TestBookStats:
    """Test book statistics endpoint"""
    
    @pytest.mark.asyncio
    async def test_get_book_stats(
        self,
        client: AsyncClient,
        test_book: Book
    ):
        """Test getting stats for a book"""
        response = await client.get(f"/api/v1/books/{test_book.id}/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_copies" in data
        assert "available" in data  # Field name is 'available', not 'available_copies'
        assert "borrowed" in data  # Field name is 'borrowed', not 'borrowed_copies'
        assert "lost" in data
    
    @pytest.mark.asyncio
    async def test_get_stats_nonexistent_book(
        self,
        client: AsyncClient
    ):
        """Test getting stats for non-existent book"""
        fake_id = uuid4()
        response = await client.get(f"/api/v1/books/{fake_id}/stats")
        
        assert response.status_code == 404
