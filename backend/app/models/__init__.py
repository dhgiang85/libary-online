# Models package
# Import all models here for Alembic autogenerate to work
from app.models.user import User
from app.models.book import Book, Author, Genre, Keyword, book_authors, book_genres, book_keywords
from app.models.book_copy import BookCopy, BorrowRecord
from app.models.news import News
from app.models.reservation import Reservation
from app.models.review import Review
from app.models.cart import Cart, CartItem

__all__ = [
    "User",
    "Book",
    "Author",
    "Genre",
    "Keyword",
    "BookCopy",
    "BorrowRecord",
    "News",
    "Reservation",
    "Review",
    "Cart",
    "CartItem",
    "book_authors",
    "book_genres",
    "book_keywords"
]
