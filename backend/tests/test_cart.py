"""
Tests for Cart API endpoints (/api/v1/cart/*)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4
from datetime import datetime, timedelta

from app.models.cart import Cart, CartItem
from app.models.book import Book
from app.models.book_copy import BookCopy, BorrowRecord, CopyStatus, BorrowStatus
from app.models.user import User


@pytest.mark.asyncio
async def test_get_empty_cart(
    async_client: AsyncClient,
    user_token: str,
    test_user: User
):
    """Test getting cart when user has no cart - should create one"""
    response = await async_client.get(
        "/api/v1/cart/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(test_user.id)
    assert data["items"] == []


@pytest.mark.asyncio
async def test_add_book_to_cart_success(
    async_client: AsyncClient,
    user_token: str,
    test_book: Book,
    db_session: AsyncSession
):
    """Test successfully adding book to cart"""
    # Create available copy
    copy = BookCopy(
        book_id=test_book.id,
        barcode="CART-TEST-001",
        status=CopyStatus.AVAILABLE
    )
    db_session.add(copy)
    await db_session.commit()
    
    add_data = {"book_id": str(test_book.id)}
    
    response = await async_client.post(
        "/api/v1/cart/items",
        json=add_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["book_id"] == str(test_book.id)
    assert "added_at" in data


@pytest.mark.asyncio
async def test_add_duplicate_book_fails(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    test_book: Book,
    db_session: AsyncSession
):
    """Test that adding same book twice fails"""
    # Create available copy
    copy = BookCopy(
        book_id=test_book.id,
        barcode="DUP-TEST-001",
        status=CopyStatus.AVAILABLE
    )
    db_session.add(copy)
    await db_session.flush()
    
    # Add book first time
    cart = Cart(user_id=test_user.id)
    db_session.add(cart)
    await db_session.flush()
    
    cart_item = CartItem(cart_id=cart.id, book_id=test_book.id)
    db_session.add(cart_item)
    await db_session.commit()
    
    # Try to add same book again
    add_data = {"book_id": str(test_book.id)}
    
    response = await async_client.post(
        "/api/v1/cart/items",
        json=add_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 400
    assert "already in cart" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_add_book_no_available_copies_fails(
    async_client: AsyncClient,
    user_token: str,
    test_book: Book,
    db_session: AsyncSession
):
    """Test adding book with no available copies fails"""
    # Create a borrowed copy (no available copies)
    copy = BookCopy(
        book_id=test_book.id,
        barcode="BORROWED-001",
        status=CopyStatus.BORROWED
    )
    db_session.add(copy)
    await db_session.commit()
    
    add_data = {"book_id": str(test_book.id)}
    
    response = await async_client.post(
        "/api/v1/cart/items",
        json=add_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 400
    assert "no available copies" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_remove_book_from_cart_success(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    test_book: Book,
    db_session: AsyncSession
):
    """Test successfully removing book from cart"""
    # Create cart with item
    cart = Cart(user_id=test_user.id)
    db_session.add(cart)
    await db_session.flush()
    
    cart_item = CartItem(cart_id=cart.id, book_id=test_book.id)
    db_session.add(cart_item)
    await db_session.commit()
    
    response = await async_client.delete(
        f"/api/v1/cart/items/{test_book.id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_clear_cart_success(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    db_session: AsyncSession
):
    """Test successfully clearing cart"""
    # Create cart with multiple items
    cart = Cart(user_id=test_user.id)
    db_session.add(cart)
    await db_session.flush()
    
    for i in range(3):
        book = Book(
            title=f"Clear Test Book {i}",
            isbn=f"CLEAR-ISBN-{i}-{uuid4()}",
            created_by=test_user.id
        )
        db_session.add(book)
        await db_session.flush()
        
        cart_item = CartItem(cart_id=cart.id, book_id=book.id)
        db_session.add(cart_item)
    
    await db_session.commit()
    
    response = await async_client.delete(
        "/api/v1/cart/clear",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 204
    
    # Verify cart is empty
    get_response = await async_client.get(
        "/api/v1/cart/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert len(get_response.json()["items"]) == 0


@pytest.mark.asyncio
async def test_checkout_success(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    db_session: AsyncSession
):
    """Test successful checkout with multiple books"""
    # Create cart with multiple books
    cart = Cart(user_id=test_user.id)
    db_session.add(cart)
    await db_session.flush()
    
    for i in range(3):
        book = Book(
            title=f"Checkout Book {i}",
            isbn=f"CHECKOUT-ISBN-{i}-{uuid4()}",
            created_by=test_user.id
        )
        db_session.add(book)
        await db_session.flush()
        
        copy = BookCopy(
            book_id=book.id,
            barcode=f"CHECKOUT-COPY-{i}-{uuid4()}",
            status=CopyStatus.AVAILABLE
        )
        db_session.add(copy)
        await db_session.flush()
        
        cart_item = CartItem(cart_id=cart.id, book_id=book.id)
        db_session.add(cart_item)
    
    await db_session.commit()
    
    # Checkout
    due_date = (datetime.utcnow() + timedelta(days=14)).isoformat()
    checkout_data = {"due_date": due_date}
    
    response = await async_client.post(
        "/api/v1/cart/checkout",
        json=checkout_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["borrow_records"]) == 3
    assert data["failed_books"] == []
    
    # Verify cart is empty
    get_response = await async_client.get(
        "/api/v1/cart/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert len(get_response.json()["items"]) == 0


@pytest.mark.asyncio
async def test_checkout_empty_cart_fails(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    db_session: AsyncSession
):
    """Test checkout with empty cart fails"""
    # Create empty cart
    cart = Cart(user_id=test_user.id)
    db_session.add(cart)
    await db_session.commit()
    
    checkout_data = {}
    
    response = await async_client.post(
        "/api/v1/cart/checkout",
        json=checkout_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_checkout_no_available_copy_fails(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    db_session: AsyncSession
):
    """Test checkout fails if book becomes unavailable"""
    # Create cart with book
    cart = Cart(user_id=test_user.id)
    db_session.add(cart)
    await db_session.flush()
    
    book = Book(
        title="Unavailable Book",
        isbn=f"UNAVAIL-{uuid4()}",
        created_by=test_user.id
    )
    db_session.add(book)
    await db_session.flush()
    
    # Create borrowed copy (no available copies)
    copy = BookCopy(
        book_id=book.id,
        barcode=f"UNAVAIL-COPY-{uuid4()}",
        status=CopyStatus.BORROWED
    )
    db_session.add(copy)
    
    cart_item = CartItem(cart_id=cart.id, book_id=book.id)
    db_session.add(cart_item)
    await db_session.commit()
    
    checkout_data = {}
    
    response = await async_client.post(
        "/api/v1/cart/checkout",
        json=checkout_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "not available" in str(detail).lower()
