from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID
import json

from app.database import get_db
from app.models.book import Book
from app.models.user import User
from app.schemas.book import BookResponse, LocationSchema
from app.dependencies import require_librarian
from app.utils.file_handler import save_upload_file, validate_image_file
from app.api.v1.books import get_or_create_author, get_or_create_genre, get_or_create_keyword

router = APIRouter(prefix="/books-with-upload", tags=["Books with Upload"])


@router.post("/", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book_with_cover(
    # Book data as form fields
    title: str = Form(...),
    description: Optional[str] = Form(None),
    authors: str = Form(..., description="JSON array of author names"),
    genres: str = Form(..., description="JSON array of genre names"),
    keywords: str = Form(default="[]", description="JSON array of keywords"),
    floor: str = Form(...),
    shelf: str = Form(...),
    row: str = Form(...),
    isbn: Optional[str] = Form(None),
    publisher: Optional[str] = Form(None),
    publication_year: Optional[int] = Form(None),
    pages: Optional[int] = Form(None),
    deposit_fee: Optional[int] = Form(0),
    initial_copies: Optional[int] = Form(0),
    
    # Cover file (optional)
    cover: Optional[UploadFile] = File(None, description="Book cover image"),
    
    # Dependencies
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new book with optional cover upload in single request (librarian only)
    """
    
    # Parse JSON arrays
    try:
        authors_list = json.loads(authors)
        genres_list = json.loads(genres)
        keywords_list = json.loads(keywords)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="authors, genres, and keywords must be valid JSON arrays"
        )
    
    # Validate arrays
    if not isinstance(authors_list, list) or not authors_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="authors must be a non-empty array"
        )
    
    if not isinstance(genres_list, list) or not genres_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="genres must be a non-empty array"
        )
    
    # Check if ISBN already exists
    if isbn:
        result = await db.execute(select(Book).where(Book.isbn == isbn))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Book with this ISBN already exists"
            )
    
    # Handle cover upload if provided
    cover_url = None
    if cover:
        validate_image_file(cover)
        try:
            cover_url = await save_upload_file(cover, subdirectory="covers")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload cover: {str(e)}"
            )
    
    # Create book
    new_book = Book(
        title=title,
        description=description,
        isbn=isbn,
        publisher=publisher,
        publication_year=publication_year,
        pages=pages,
        deposit_fee=deposit_fee or 0,
        cover_url=cover_url,
        floor=floor,
        shelf=shelf,
        row=row,
        created_by=current_user.id
    )
    
    # Add authors
    for author_name in authors_list:
        author = await get_or_create_author(db, author_name)
        new_book.authors.append(author)
    
    # Add genres
    for genre_name in genres_list:
        genre = await get_or_create_genre(db, genre_name)
        new_book.genres.append(genre)
    
    # Add keywords
    for keyword_name in keywords_list:
        keyword = await get_or_create_keyword(db, keyword_name)
        new_book.keywords.append(keyword)
    
    db.add(new_book)
    await db.commit()
    await db.refresh(new_book, ['authors', 'genres', 'keywords'])

    # Create initial copies if requested
    if initial_copies and initial_copies > 0:
        from app.models.book_copy import BookCopy, CopyStatus
        import uuid

        for i in range(initial_copies):
            # Generate a unique barcode
            # Format: ISBN-SEQ or BOOKID-SEQ or UUID
            barcode = f"{new_book.isbn}-{i+1}" if new_book.isbn else f"LIB-{str(uuid.uuid4())[:8].upper()}-{i+1}"

            # Ensure barcode is unique (simple check, might need more robust handling in production)
            if not new_book.isbn:
                 barcode = f"LIB-{new_book.id.hex[:4].upper()}-{i+1}-{str(uuid.uuid4())[:4].upper()}"

            new_copy = BookCopy(
                book_id=new_book.id,
                barcode=barcode,
                status=CopyStatus.AVAILABLE
            )
            db.add(new_copy)

        await db.commit()
        await db.refresh(new_book, ['copies'])

    # Reload the book with all relationships to avoid lazy loading issues
    query = select(Book).options(
        selectinload(Book.authors),
        selectinload(Book.genres),
        selectinload(Book.keywords),
        selectinload(Book.copies)
    ).where(Book.id == new_book.id)

    result = await db.execute(query)
    new_book = result.scalar_one()

    return BookResponse.model_validate({
        **{k: getattr(new_book, k) for k in ['id', 'title', 'description', 'isbn', 'publisher', 'publication_year', 'pages', 'deposit_fee', 'cover_url', 'created_at', 'updated_at']},
        'authors': new_book.authors,
        'genres': new_book.genres,
        'keywords': new_book.keywords,
        'total_copies': len(new_book.copies),
        'available_copies': sum(1 for c in new_book.copies if c.status == 'AVAILABLE'),
        'location': LocationSchema(
            floor=new_book.floor or '',
            shelf=new_book.shelf or '',
            row=new_book.row or ''
        )
    })


@router.put("/{book_id}", response_model=BookResponse)
async def update_book_with_cover(
    book_id: UUID,
    # Book data as form fields
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    authors: Optional[str] = Form(None, description="JSON array of author names"),
    genres: Optional[str] = Form(None, description="JSON array of genre names"),
    keywords: Optional[str] = Form(None, description="JSON array of keywords"),
    floor: Optional[str] = Form(None),
    shelf: Optional[str] = Form(None),
    row: Optional[str] = Form(None),
    isbn: Optional[str] = Form(None),
    publisher: Optional[str] = Form(None),
    publication_year: Optional[int] = Form(None),
    pages: Optional[int] = Form(None),
    deposit_fee: Optional[int] = Form(None),
    
    # Cover file (optional)
    cover: Optional[UploadFile] = File(None, description="Book cover image"),
    
    # Dependencies
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a book with optional cover upload (librarian only)
    """
    
    # Get book
    query = select(Book).options(
        selectinload(Book.authors),
        selectinload(Book.genres),
        selectinload(Book.keywords),
        selectinload(Book.copies)
    ).where(Book.id == book_id)
    
    result = await db.execute(query)
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    # Parse JSON arrays if provided
    authors_list = None
    genres_list = None
    keywords_list = None

    try:
        if authors is not None:
            authors_list = json.loads(authors)
            if not isinstance(authors_list, list):
                raise HTTPException(status_code=400, detail="authors must be a list")
                
        if genres is not None:
            genres_list = json.loads(genres)
            if not isinstance(genres_list, list):
                raise HTTPException(status_code=400, detail="genres must be a list")
                
        if keywords is not None:
            keywords_list = json.loads(keywords)
            if not isinstance(keywords_list, list):
                raise HTTPException(status_code=400, detail="keywords must be a list")
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="authors, genres, and keywords must be valid JSON arrays"
        )
    
    # Handle cover upload if provided
    if cover:
        validate_image_file(cover)
        try:
            # Optional: Delete old cover if exists
            # if book.cover_url:
            #     await delete_upload_file(book.cover_url)
            
            cover_url = await save_upload_file(cover, subdirectory="covers")
            book.cover_url = cover_url
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload cover: {str(e)}"
            )
    
    # Update fields
    if title is not None: book.title = title
    if description is not None: book.description = description
    if isbn is not None: book.isbn = isbn
    if publisher is not None: book.publisher = publisher
    if publication_year is not None: book.publication_year = publication_year
    if pages is not None: book.pages = pages
    if deposit_fee is not None: book.deposit_fee = deposit_fee
    if floor is not None: book.floor = floor
    if shelf is not None: book.shelf = shelf
    if row is not None: book.row = row
    
    # Update relationships
    if authors_list is not None:
        book.authors.clear()
        for author_name in authors_list:
            author = await get_or_create_author(db, author_name)
            book.authors.append(author)
            
    if genres_list is not None:
        book.genres.clear()
        for genre_name in genres_list:
            genre = await get_or_create_genre(db, genre_name)
            book.genres.append(genre)
            
    if keywords_list is not None:
        book.keywords.clear()
        for keyword_name in keywords_list:
            keyword = await get_or_create_keyword(db, keyword_name)
            book.keywords.append(keyword)
    
    await db.commit()
    await db.refresh(book, ['authors', 'genres', 'keywords', 'copies'])
    
    return BookResponse.model_validate({
        **{k: getattr(book, k) for k in ['id', 'title', 'description', 'isbn', 'publisher', 'publication_year', 'pages', 'deposit_fee', 'cover_url', 'created_at', 'updated_at']},
        'authors': book.authors,
        'genres': book.genres,
        'keywords': book.keywords,
        'total_copies': len(book.copies),
        'available_copies': sum(1 for c in book.copies if c.status == 'AVAILABLE'),
        'location': LocationSchema(
            floor=book.floor or '',
            shelf=book.shelf or '',
            row=book.row or ''
        )
    })
