from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.book import Book
from app.models.book_copy import BookCopy, BorrowRecord, BorrowStatus, CopyStatus
from app.models.cart import Cart, CartItem
from app.schemas.cart import (
    CartItemCreate,
    CartItemResponse,
    CartResponse,
    CheckoutRequest,
    CheckoutResponse
)
from app.schemas.book_copy import BorrowRecordResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("/", response_model=CartResponse)
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's cart with all items and book details
    """
    # Get or create cart for user
    result = await db.execute(
        select(Cart)
        .where(Cart.user_id == current_user.id)
        .options(
            selectinload(Cart.items).selectinload(CartItem.book).selectinload(Book.authors),
            selectinload(Cart.items).selectinload(CartItem.book).selectinload(Book.genres),
            selectinload(Cart.items).selectinload(CartItem.book).selectinload(Book.keywords),
            selectinload(Cart.items).selectinload(CartItem.book).selectinload(Book.copies)
        )
    )
    cart = result.scalar_one_or_none()
    
    if not cart:
        # Create new cart if doesn't exist
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        await db.commit()
        await db.refresh(cart, ['items'])
    
    # Manually construct response with book details
    cart_items = []
    for item in cart.items:
        if item.book:
            from app.schemas.book import BookResponse, LocationSchema
            book_response = BookResponse.model_validate({
                **{k: getattr(item.book, k) for k in ['id', 'title', 'description', 'isbn', 'publisher', 'publication_year', 'pages', 'deposit_fee', 'cover_url', 'created_at', 'updated_at', 'average_rating', 'total_reviews']},
                'authors': item.book.authors,
                'genres': item.book.genres,
                'keywords': item.book.keywords,
                'total_copies': len(item.book.copies),
                'available_copies': sum(1 for c in item.book.copies if c.status == 'AVAILABLE'),
                'location': LocationSchema(
                    floor=item.book.floor or '',
                    shelf=item.book.shelf or '',
                    row=item.book.row or ''
                )
            })
            cart_items.append(CartItemResponse(
                id=item.id,
                cart_id=item.cart_id,
                book_id=item.book_id,
                added_at=item.added_at,
                book=book_response
            ))
        else:
            cart_items.append(CartItemResponse.model_validate(item))
    
    return CartResponse(
        id=cart.id,
        user_id=cart.user_id,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
        items=cart_items
    )


@router.post("/items", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    item_data: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a book to cart
    
    Business rules:
    - Cannot add same book twice
    - Cannot add book if user already has active borrow for it
    - Book must exist
    - Book must have at least one available copy
    """
    # Check if book exists
    book_result = await db.execute(
        select(Book).where(Book.id == item_data.book_id)
    )
    book = book_result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check if book has available copies
    available_copies = await db.execute(
        select(func.count())
        .where(
            and_(
                BookCopy.book_id == item_data.book_id,
                BookCopy.status == CopyStatus.AVAILABLE
            )
        )
    )
    if available_copies.scalar() == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No available copies of this book"
        )
    
    # Check if user already has active or pending borrow for this book
    active_borrow = await db.execute(
        select(BorrowRecord)
        .join(BookCopy)
        .where(
            and_(
                BookCopy.book_id == item_data.book_id,
                BorrowRecord.user_id == current_user.id,
                or_(
                    BorrowRecord.status == BorrowStatus.ACTIVE,
                    BorrowRecord.status == BorrowStatus.PENDING
                )
            )
        )
    )
    if active_borrow.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active or pending borrow for this book"
        )
    
    # Get or create cart
    cart_result = await db.execute(
        select(Cart).where(Cart.user_id == current_user.id)
    )
    cart = cart_result.scalar_one_or_none()
    
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        await db.flush()
    
    # Check if book already in cart
    existing_item = await db.execute(
        select(CartItem).where(
            and_(
                CartItem.cart_id == cart.id,
                CartItem.book_id == item_data.book_id
            )
        )
    )
    if existing_item.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book already in cart"
        )
    
    # Add item to cart
    cart_item = CartItem(
        cart_id=cart.id,
        book_id=item_data.book_id
    )
    db.add(cart_item)
    
    # Update cart timestamp
    cart.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(cart_item)
    
    # Return simple response without book details to avoid lazy loading issues
    return CartItemResponse(
        id=cart_item.id,
        cart_id=cart_item.cart_id,
        book_id=cart_item.book_id,
        added_at=cart_item.added_at,
        book=None  # Book details will be loaded when fetching full cart
    )


@router.delete("/items/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_cart(
    book_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a book from cart
    """
    # Get user's cart
    cart_result = await db.execute(
        select(Cart).where(Cart.user_id == current_user.id)
    )
    cart = cart_result.scalar_one_or_none()
    
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found"
        )
    
    # Find and delete cart item
    item_result = await db.execute(
        select(CartItem).where(
            and_(
                CartItem.cart_id == cart.id,
                CartItem.book_id == book_id
            )
        )
    )
    item = item_result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found in cart"
        )
    
    await db.delete(item)
    
    # Update cart timestamp
    cart.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # Clear session cache to prevent stale data
    db.expire_all()
    
    return None


@router.delete("/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Clear all items from cart
    """
    # Get user's cart
    cart_result = await db.execute(
        select(Cart).where(Cart.user_id == current_user.id)
    )
    cart = cart_result.scalar_one_or_none()
    
    if not cart:
        return None
    
    # Delete all cart items using delete statement
    from sqlalchemy import delete
    await db.execute(
        delete(CartItem).where(CartItem.cart_id == cart.id)
    )
    
    cart.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return None


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout_cart(
    checkout_data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Checkout cart - borrow all books in cart
    
    This is an atomic operation - either all books are borrowed or none are.
    If any book fails (e.g., no available copy), the entire checkout fails.
    """
    # Get user's cart with items
    cart_result = await db.execute(
        select(Cart)
        .where(Cart.user_id == current_user.id)
        .options(selectinload(Cart.items))
        .with_for_update()
    )
    cart = cart_result.scalar_one_or_none()
    
    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty"
        )
    
    # Set default due date if not provided (14 days from now)
    due_date = checkout_data.due_date or (datetime.utcnow() + timedelta(days=14))
    
    borrow_records = []
    failed_books = []
    
    # Process each item in cart
    for cart_item in cart.items:
        try:
            # Find an available copy for this book with locking
            # Eager load book to ensure it's available for response
            copy_result = await db.execute(
                select(BookCopy)
                .where(
                    and_(
                        BookCopy.book_id == cart_item.book_id,
                        BookCopy.status == CopyStatus.AVAILABLE
                    )
                )
                .options(selectinload(BookCopy.book).selectinload(Book.authors))
                .limit(1)
                .with_for_update()
            )
            copy = copy_result.scalar_one_or_none()
            
            if not copy:
                # Get book title
                book_result = await db.execute(select(Book).where(Book.id == cart_item.book_id))
                book = book_result.scalar_one_or_none()
                failed_books.append({
                    "book_id": str(cart_item.book_id),
                    "book_title": book.title if book else "Unknown",
                    "reason": "No available copies"
                })
                continue
            
            # Create borrow record
            borrow_record = BorrowRecord(
                copy_id=copy.id,
                user_id=current_user.id,
                due_date=due_date,
                status=BorrowStatus.PENDING
            )
            
            # Update copy status
            copy.status = CopyStatus.BORROWED
            
            # Manually attach copy to borrow record so it's available for response without reload
            borrow_record.copy = copy
            
            db.add(borrow_record)
            borrow_records.append(borrow_record)
            
        except Exception as e:
            # Get book title
            book_result = await db.execute(select(Book).where(Book.id == cart_item.book_id))
            book = book_result.scalar_one_or_none()
            failed_books.append({
                "book_id": str(cart_item.book_id),
                "book_title": book.title if book else "Unknown",
                "reason": str(e)
            })
    
    # If any book failed, rollback everything
    if failed_books:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Checkout failed - some books are not available",
                "failed_books": failed_books
            }
        )
    
    # Clear cart after successful checkout using delete statement
    from sqlalchemy import delete
    await db.execute(
        delete(CartItem).where(CartItem.cart_id == cart.id)
    )
    
    cart.updated_at = datetime.utcnow()
    
    # Commit all changes
    await db.commit()
    
    # Expire all to ensure fresh data on next query
    # db.expire_all() # Commented out to keep objects attached
    
    # Refresh borrow records
    for record in borrow_records:
        await db.refresh(record)
        # Ensure copy and book are attached
        if not record.copy:
             # This shouldn't happen if we didn't expire, but if we did, we'd need to reload
             pass
    
    # We need to import BorrowRecordDetailResponse here to avoid circular imports if any
    from app.schemas.book_copy import BorrowRecordDetailResponse
    from app.schemas.book import BookResponse
    
    response_records = []
    for r in borrow_records:
        item = BorrowRecordDetailResponse.model_validate(r)
        if r.copy and r.copy.book:
            item.book = BookResponse.model_validate(r.copy.book)
        response_records.append(item)
    
    return CheckoutResponse(
        success=True,
        message=f"Successfully borrowed {len(borrow_records)} book(s)",
        borrow_records=response_records,
        failed_books=[]
    )
