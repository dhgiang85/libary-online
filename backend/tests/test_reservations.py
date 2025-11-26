import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from app.models.user import User
from app.models.book import Book
from app.models.book_copy import BookCopy, BorrowRecord
from app.models.reservation import Reservation


@pytest.mark.asyncio
async def test_create_reservation(
    async_client: AsyncClient,
    user_token: str,
    test_book: Book,
    db_session: AsyncSession
):
    """Test creating a reservation when all copies are borrowed"""
    # Create a book copy and borrow it
    copy = BookCopy(
        book_id=test_book.id,
        barcode="TEST-RESERVE-001",
        status="BORROWED"
    )
    db_session.add(copy)
    await db_session.commit()
    
    # Create reservation
    reservation_data = {"book_id": str(test_book.id)}
    
    response = await async_client.post(
        "/api/v1/reservations/",
        json=reservation_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["book_id"] == str(test_book.id)
    assert data["status"] == "PENDING"
    assert "expires_at" in data


@pytest.mark.asyncio
async def test_cannot_reserve_available_book(
    async_client: AsyncClient,
    user_token: str,
    test_book: Book,
    db_session: AsyncSession
):
    """Test that user cannot reserve a book with available copies"""
    # Create an available copy
    copy = BookCopy(
        book_id=test_book.id,
        barcode="TEST-AVAILABLE-001",
        status="AVAILABLE"
    )
    db_session.add(copy)
    await db_session.commit()
    
    reservation_data = {"book_id": str(test_book.id)}
    
    response = await async_client.post(
        "/api/v1/reservations/",
        json=reservation_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 400
    assert "available copies" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cannot_duplicate_reservation(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    test_book: Book,
    db_session: AsyncSession
):
    """Test that user cannot have multiple active reservations for same book"""
    # Create borrowed copy
    copy = BookCopy(
        book_id=test_book.id,
        barcode="TEST-DUP-001",
        status="BORROWED"
    )
    db_session.add(copy)
    
    # Create existing reservation
    existing_reservation = Reservation(
        user_id=test_user.id,
        book_id=test_book.id,
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(hours=48)
    )
    db_session.add(existing_reservation)
    await db_session.commit()
    
    # Try to create another reservation
    reservation_data = {"book_id": str(test_book.id)}
    
    response = await async_client.post(
        "/api/v1/reservations/",
        json=reservation_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 400
    assert "already have an active reservation" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_user_reservations(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    test_book: Book,
    db_session: AsyncSession
):
    """Test getting user's reservations"""
    # Create reservation
    reservation = Reservation(
        user_id=test_user.id,
        book_id=test_book.id,
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(hours=48)
    )
    db_session.add(reservation)
    await db_session.commit()
    
    response = await async_client.get(
        "/api/v1/reservations/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert "items" in data


@pytest.mark.asyncio
async def test_cancel_reservation(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    test_book: Book,
    db_session: AsyncSession
):
    """Test canceling own reservation"""
    # Create reservation
    reservation = Reservation(
        user_id=test_user.id,
        book_id=test_book.id,
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(hours=48)
    )
    db_session.add(reservation)
    await db_session.commit()
    await db_session.refresh(reservation)
    
    response = await async_client.delete(
        f"/api/v1/reservations/{reservation.id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_cannot_cancel_others_reservation(
    async_client: AsyncClient,
    user_token: str,
    test_book: Book,
    db_session: AsyncSession
):
    """Test that user cannot cancel someone else's reservation"""
    # Create another user
    from app.utils.security import hash_password
    another_user = User(
        email="another@test.com",
        username="another_user",
        hashed_password=hash_password("Password123"),
        role="user"
    )
    db_session.add(another_user)
    await db_session.flush()
    
    # Create reservation for another user
    reservation = Reservation(
        user_id=another_user.id,
        book_id=test_book.id,
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(hours=48)
    )
    db_session.add(reservation)
    await db_session.commit()
    await db_session.refresh(reservation)
    
    response = await async_client.delete(
        f"/api/v1/reservations/{reservation.id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_book_reservations_queue(
    async_client: AsyncClient,
    librarian_token: str,
    test_book: Book,
    db_session: AsyncSession
):
    """Test getting book's reservation queue (librarian only)"""
    # Create multiple reservations
    from app.utils.security import hash_password
    for i in range(3):
        user = User(
            email=f"queue{i}@test.com",
            username=f"queue_user{i}",
            hashed_password=hash_password("Password123"),
            role="user"
        )
        db_session.add(user)
        await db_session.flush()
        
        reservation = Reservation(
            user_id=user.id,
            book_id=test_book.id,
            status="PENDING",
            reserved_at=datetime.utcnow() + timedelta(minutes=i),  # Different times
            expires_at=datetime.utcnow() + timedelta(hours=48)
        )
        db_session.add(reservation)
    
    await db_session.commit()
    
    response = await async_client.get(
        f"/api/v1/reservations/book/{test_book.id}",
        headers={"Authorization": f"Bearer {librarian_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 3
    # Check FIFO order (earliest reservation first)
    items = data["items"]
    if len(items) >= 2:
        assert items[0]["reserved_at"] <= items[1]["reserved_at"]


@pytest.mark.asyncio
async def test_fulfill_reservation(
    async_client: AsyncClient,
    librarian_token: str,
    test_user: User,
    test_book: Book,
    db_session: AsyncSession
):
    """Test fulfilling a reservation (librarian only)"""
    # Create reservation
    reservation = Reservation(
        user_id=test_user.id,
        book_id=test_book.id,
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(hours=48)
    )
    db_session.add(reservation)
    await db_session.commit()
    await db_session.refresh(reservation)
    
    response = await async_client.post(
        f"/api/v1/reservations/{reservation.id}/fulfill",
        headers={"Authorization": f"Bearer {librarian_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "FULFILLED"
    assert data["fulfilled_at"] is not None


@pytest.mark.asyncio
async def test_auto_fulfill_on_return(
    async_client: AsyncClient,
    user_token: str,
    test_user: User,
    test_book: Book,
    db_session: AsyncSession
):
    """Test that returning a book automatically fulfills pending reservations"""
    # Create another user for reservation
    from app.utils.security import hash_password
    reserver = User(
        email="reserver@test.com",
        username="reserver",
        hashed_password=hash_password("Password123"),
        role="user"
    )
    db_session.add(reserver)
    await db_session.flush()
    
    # Create book copy and borrow it
    copy = BookCopy(
        book_id=test_book.id,
        barcode="TEST-AUTO-001",
        status="BORROWED"
    )
    db_session.add(copy)
    await db_session.flush()
    
    borrow_record = BorrowRecord(
        copy_id=copy.id,
        user_id=test_user.id,
        due_date=datetime.utcnow() + timedelta(days=14),
        status="ACTIVE"
    )
    db_session.add(borrow_record)
    
    # Create reservation
    reservation = Reservation(
        user_id=reserver.id,
        book_id=test_book.id,
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(hours=48)
    )
    db_session.add(reservation)
    await db_session.commit()
    await db_session.refresh(reservation)
    
    # Return the book
    response = await async_client.post(
        f"/api/v1/book-copies/{copy.id}/return",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == 200
    
    # Check that reservation was fulfilled
    await db_session.refresh(reservation)
    assert reservation.status == "FULFILLED"
    assert reservation.fulfilled_at is not None
