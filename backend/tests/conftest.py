"""
Test configuration and fixtures for Library Online backend tests.
"""
import pytest
import asyncio
import os
from typing import AsyncGenerator, Generator
from uuid import uuid4

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.pool import NullPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.utils.security import hash_password, create_access_token

# Test database URL - using file-based SQLite for debugging
TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test.db")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    echo=False,
    connect_args={"check_same_thread": False},
    isolation_level="AUTOCOMMIT"
)

# Create test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function", autouse=True)
async def setup_db():
    """Setup database tables before each test."""
    # Remove existing test database if it exists
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Drop tables and clean up
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    # Remove test database file
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture(scope="function")
async def db_session(setup_db) -> AsyncGenerator[AsyncSession, None]:
    """
    Create a fresh database session for each test.
    Depends on setup_db to ensure tables exist.
    """
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create a test client with database session override.
    """
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


# User fixtures with different roles
@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user with 'user' role."""
    user = User(
        id=uuid4(),
        email="user@test.com",
        username="testuser",
        full_name="Test User",
        hashed_password=hash_password("Password123"),
        role="user",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_librarian(db_session: AsyncSession) -> User:
    """Create a test user with 'librarian' role."""
    user = User(
        id=uuid4(),
        email="librarian@test.com",
        username="testlibrarian",
        full_name="Test Librarian",
        hashed_password=hash_password("Password123"),
        role="librarian",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_admin(db_session: AsyncSession) -> User:
    """Create a test user with 'admin' role."""
    user = User(
        id=uuid4(),
        email="admin@test.com",
        username="testadmin",
        full_name="Test Admin",
        hashed_password=hash_password("Password123"),
        role="admin",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def inactive_user(db_session: AsyncSession) -> User:
    """Create an inactive test user."""
    user = User(
        id=uuid4(),
        email="inactive@test.com",
        username="inactiveuser",
        full_name="Inactive User",
        hashed_password=hash_password("Password123"),
        role="user",
        is_active=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# Authentication helper fixtures
@pytest.fixture
def user_token(test_user: User) -> str:
    """Generate access token for test user."""
    return create_access_token(data={"sub": str(test_user.id), "role": test_user.role})


@pytest.fixture
def librarian_token(test_librarian: User) -> str:
    """Generate access token for test librarian."""
    return create_access_token(data={"sub": str(test_librarian.id), "role": test_librarian.role})


@pytest.fixture
def admin_token(test_admin: User) -> str:
    """Generate access token for test admin."""
    return create_access_token(data={"sub": str(test_admin.id), "role": test_admin.role})


@pytest.fixture
def auth_headers(user_token: str) -> dict:
    """Generate authentication headers for test user."""
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def librarian_headers(librarian_token: str) -> dict:
    """Generate authentication headers for test librarian."""
    return {"Authorization": f"Bearer {librarian_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    """Generate authentication headers for test admin."""
    return {"Authorization": f"Bearer {admin_token}"}


# Aliases for compatibility
@pytest.fixture
async def async_client(client: AsyncClient) -> AsyncClient:
    """Alias for client fixture."""
    return client


@pytest.fixture
async def admin_user(test_admin: User) -> User:
    """Alias for test_admin fixture."""
    return test_admin


# ============================================================================
# Book-related fixtures
# ============================================================================

@pytest.fixture
async def test_author(db_session: AsyncSession):
    """Create a test author."""
    from app.models.book import Author
    author = Author(
        id=uuid4(),
        name="Test Author",
        bio="A test author biography"
    )
    db_session.add(author)
    await db_session.commit()
    await db_session.refresh(author)
    return author


@pytest.fixture
async def test_genre(db_session: AsyncSession):
    """Create a test genre."""
    from app.models.book import Genre
    genre = Genre(
        id=uuid4(),
        name="Test Genre"
    )
    db_session.add(genre)
    await db_session.commit()
    await db_session.refresh(genre)
    return genre


@pytest.fixture
async def test_keyword(db_session: AsyncSession):
    """Create a test keyword."""
    from app.models.book import Keyword
    keyword = Keyword(
        id=uuid4(),
        name="test-keyword"
    )
    db_session.add(keyword)
    await db_session.commit()
    await db_session.refresh(keyword)
    return keyword


@pytest.fixture
async def test_book(
    db_session: AsyncSession,
    test_author,
    test_genre,
    test_librarian
):
    """Create a test book with author and genre."""
    from app.models.book import Book
    book = Book(
        id=uuid4(),
        title="Test Book",
        description="A test book description",
        isbn="978-0-123456-78-9",
        publisher="Test Publisher",
        publication_year=2024,
        pages=300,
        floor="1",
        shelf="A",
        row="1",
        created_by=test_librarian.id
    )
    book.authors.append(test_author)
    book.genres.append(test_genre)
    
    db_session.add(book)
    await db_session.commit()
    await db_session.refresh(book)
    return book


@pytest.fixture
async def test_books_list(
    db_session: AsyncSession,
    test_author,
    test_genre,
    test_librarian
):
    """Create multiple books for pagination testing."""
    from app.models.book import Book, Author, Genre
    
    # Create additional authors and genres
    author2 = Author(id=uuid4(), name="Second Author")
    genre2 = Genre(id=uuid4(), name="Fiction")
    db_session.add(author2)
    db_session.add(genre2)
    await db_session.commit()
    
    books = []
    for i in range(15):
        book = Book(
            id=uuid4(),
            title=f"Book {i+1}",
            description=f"Description for book {i+1}",
            isbn=f"978-0-12345-{i:03d}-9",
            publisher="Test Publisher",
            publication_year=2020 + (i % 5),
            pages=200 + (i * 10),
            created_by=test_librarian.id
        )
        
        # Alternate authors and genres
        if i % 2 == 0:
            book.authors.append(test_author)
            book.genres.append(test_genre)
        else:
            book.authors.append(author2)
            book.genres.append(genre2)
        
        books.append(book)
        db_session.add(book)
    
    await db_session.commit()
    for book in books:
        await db_session.refresh(book)
    
    return books


# ============================================================================
# News-related fixtures
# ============================================================================

@pytest.fixture
async def test_published_news(
    db_session: AsyncSession,
    test_librarian
):
    """Create a published news article."""
    from app.models.news import News
    from datetime import datetime
    
    news = News(
        id=uuid4(),
        title="Published News Article",
        content="This is a published news article for testing",
        summary="Published news summary",
        author_id=test_librarian.id,
        published=True,
        published_at=datetime.utcnow()
    )
    db_session.add(news)
    await db_session.commit()
    await db_session.refresh(news)
    return news


@pytest.fixture
async def test_draft_news(
    db_session: AsyncSession,
    test_librarian
):
    """Create a draft (unpublished) news article."""
    from app.models.news import News
    
    news = News(
        id=uuid4(),
        title="Draft News Article",
        content="This is a draft news article for testing",
        summary="Draft news summary",
        author_id=test_librarian.id,
        published=False,
        published_at=None
    )
    db_session.add(news)
    await db_session.commit()
    await db_session.refresh(news)
    return news


@pytest.fixture
async def test_published_news_list(
    db_session: AsyncSession,
    test_librarian
):
    """Create multiple published news articles for pagination testing."""
    from app.models.news import News
    from datetime import datetime, timedelta
    
    news_list = []
    for i in range(5):
        news = News(
            id=uuid4(),
            title=f"News Article {i+1}",
            content=f"Content for news article {i+1}",
            summary=f"Summary {i+1}",
            author_id=test_librarian.id,
            published=i < 3,  # First 3 are published, last 2 are drafts
            published_at=datetime.utcnow() - timedelta(days=i) if i < 3 else None
        )
        news_list.append(news)
        db_session.add(news)
    
    await db_session.commit()
    for news in news_list:
        await db_session.refresh(news)
    
    return news_list


# ============================================================================
# Book Copy-related fixtures
# ============================================================================

@pytest.fixture
async def test_book_copy(
    db_session: AsyncSession,
    test_book
):
    """Create a test book copy."""
    from app.models.book_copy import BookCopy
    
    copy = BookCopy(
        id=uuid4(),
        book_id=test_book.id,
        barcode="BC-TEST-001",
        status="AVAILABLE"
    )
    db_session.add(copy)
    await db_session.commit()
    await db_session.refresh(copy)
    return copy


@pytest.fixture
async def test_borrowed_copy(
    db_session: AsyncSession,
    test_book,
    test_librarian
):
    """Create a borrowed book copy."""
    from app.models.book_copy import BookCopy, BorrowRecord
    from datetime import datetime, timedelta
    
    copy = BookCopy(
        id=uuid4(),
        book_id=test_book.id,
        barcode="BC-TEST-BORROWED",
        status="BORROWED"
    )
    db_session.add(copy)
    await db_session.commit()
    await db_session.refresh(copy)
    
    # Create borrow record
    borrow = BorrowRecord(
        id=uuid4(),
        copy_id=copy.id,
        user_id=test_librarian.id,
        due_date=datetime.utcnow() + timedelta(days=14),
        status="ACTIVE"
    )
    db_session.add(borrow)
    await db_session.commit()
    
    return copy


@pytest.fixture
async def test_borrowed_copy_by_user(
    db_session: AsyncSession,
    test_book,
    test_user
):
    """Create a book copy borrowed by test_user."""
    from app.models.book_copy import BookCopy, BorrowRecord
    from datetime import datetime, timedelta
    
    copy = BookCopy(
        id=uuid4(),
        book_id=test_book.id,
        barcode="BC-TEST-USER-BORROWED",
        status="BORROWED"
    )
    db_session.add(copy)
    await db_session.commit()
    await db_session.refresh(copy)
    
    # Create borrow record for test_user
    borrow = BorrowRecord(
        id=uuid4(),
        copy_id=copy.id,
        user_id=test_user.id,
        due_date=datetime.utcnow() + timedelta(days=14),
        status="ACTIVE"
    )
    db_session.add(borrow)
    await db_session.commit()
    
    return copy


@pytest.fixture
async def test_book_with_cover(
    db_session: AsyncSession,
    test_author,
    test_genre
):
    """Create a book with a cover URL for testing cover deletion."""
    from app.models.book import Book
    
    book = Book(
        id=uuid4(),
        title="Book With Cover",
        description="A book that has a cover image",
        isbn="978-0-WITH-COVER",
        publisher="Cover Publisher",
        publication_year=2024,
        pages=200,
        floor="1",
        shelf="A",
        row="1",
        cover_url="/uploads/covers/test-cover.jpg"
    )
    book.authors.append(test_author)
    book.genres.append(test_genre)
    
    db_session.add(book)
    await db_session.commit()
    await db_session.refresh(book)
    return book
