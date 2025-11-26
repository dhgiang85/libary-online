from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.database import get_db
from app.models.book import Book
from app.models.user import User
from app.schemas.book import BookResponse, LocationSchema
from app.dependencies import require_librarian
from app.utils.file_handler import save_upload_file, delete_upload_file, validate_image_file

router = APIRouter(prefix="/upload", tags=["File Upload"])


@router.post("/image", response_model=dict)
async def upload_image(
    file: UploadFile = File(..., description="Image file (jpg, jpeg, png, webp)"),
    current_user: User = Depends(require_librarian),
):
    """
    Upload generic image (librarian only)
    
    Returns:
        dict: {"url": "path/to/image"}
    """
    # Validate file is an image
    validate_image_file(file)
    
    try:
        # Save file
        file_path = await save_upload_file(file, subdirectory="covers")
        return {"url": file_path}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.post("/book-cover/{book_id}", response_model=BookResponse)
async def upload_book_cover(
    book_id: UUID,
    file: UploadFile = File(..., description="Book cover image (jpg, jpeg, png, webp)"),
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload book cover image (librarian only)
    
    - **book_id**: ID of the book to update
    - **file**: Image file (max 5MB, formats: jpg, jpeg, png, webp)
    
    Returns updated book with new cover URL
    """
    # Validate file is an image
    validate_image_file(file)
    
    # Get book
    query = select(Book).options(
        selectinload(Book.authors),
        selectinload(Book.genres),
        selectinload(Book.keywords)
    ).where(Book.id == book_id)
    
    result = await db.execute(query)
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Delete old cover if exists
    if book.cover_url:
        await delete_upload_file(book.cover_url)
    
    # Save new cover
    try:
        cover_path = await save_upload_file(file, subdirectory="covers")
        book.cover_url = cover_path
        
        await db.commit()
        await db.refresh(book, ['authors', 'genres', 'keywords'])
        
        return BookResponse.model_validate({
            **{k: getattr(book, k) for k in ['id', 'title', 'description', 'isbn', 'publisher', 'publication_year', 'pages', 'cover_url', 'created_at', 'updated_at']},
            'authors': book.authors,
            'genres': book.genres,
            'keywords': book.keywords,
            'location': LocationSchema(
                floor=book.floor or '',
                shelf=book.shelf or '',
                row=book.row or ''
            )
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload cover: {str(e)}"
        )


@router.delete("/book-cover/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book_cover(
    book_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete book cover image (librarian only)
    
    - **book_id**: ID of the book
    """
    # Get book
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    if not book.cover_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book has no cover image"
        )
    
    # Delete file
    await delete_upload_file(book.cover_url)
    
    # Update database
    book.cover_url = None
    await db.commit()
    
    return None


@router.post("/news-cover/{news_id}")
async def upload_news_cover(
    news_id: UUID,
    file: UploadFile = File(..., description="News cover image"),
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload news cover image (librarian only)
    
    Similar to book cover upload but for news articles
    """
    from app.models.news import News
    from app.schemas.news import NewsResponse
    
    # Validate file is an image
    validate_image_file(file)
    
    # Get news
    result = await db.execute(select(News).where(News.id == news_id))
    news = result.scalar_one_or_none()
    
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found"
        )
    
    # Delete old cover if exists
    if news.cover_image:
        await delete_upload_file(news.cover_image)
    
    # Save new cover
    try:
        cover_path = await save_upload_file(file, subdirectory="news")
        news.cover_image = cover_path
        
        await db.commit()
        await db.refresh(news)
        
        return NewsResponse.model_validate(news)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload cover: {str(e)}"
        )
