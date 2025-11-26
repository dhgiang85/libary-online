

# Books API fixtures
@pytest.fixture
async def test_author(db_session: AsyncSession) -> Author:
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
async def test_genre(db_session: AsyncSession) -> Genre:
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
async def test_keyword(db_session: AsyncSession) -> Keyword:
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
    test_author: Author,
    test_genre: Genre,
    test_librarian: User
) -> Book:
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
    test_author: Author,
    test_genre: Genre,
    test_librarian: User
) -> list[Book]:
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
