from sqlalchemy import Column, String, Integer, Text, ForeignKey, Table, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.guid import GUID
import uuid
from datetime import datetime


# Association tables for many-to-many relationships
book_authors = Table(
    'book_authors',
    Base.metadata,
    Column('book_id', GUID(), ForeignKey('books.id', ondelete='CASCADE'), primary_key=True),
    Column('author_id', GUID(), ForeignKey('authors.id', ondelete='CASCADE'), primary_key=True)
)

book_genres = Table(
    'book_genres',
    Base.metadata,
    Column('book_id', GUID(), ForeignKey('books.id', ondelete='CASCADE'), primary_key=True),
    Column('genre_id', GUID(), ForeignKey('genres.id', ondelete='CASCADE'), primary_key=True)
)

book_keywords = Table(
    'book_keywords',
    Base.metadata,
    Column('book_id', GUID(), ForeignKey('books.id', ondelete='CASCADE'), primary_key=True),
    Column('keyword_id', GUID(), ForeignKey('keywords.id', ondelete='CASCADE'), primary_key=True)
)


class Book(Base):
    """Book model representing a book in the library"""
    
    __tablename__ = 'books'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False, index=True)
    description = Column(Text)
    cover_url = Column(String(1000))
    isbn = Column(String(20), unique=True, index=True)
    publisher = Column(String(255))
    publication_year = Column(Integer)
    pages = Column(Integer)
    deposit_fee = Column(Integer, default=0)  # Phí đặt cọc (VND)
    
    # Location information
    floor = Column(String(10))
    shelf = Column(String(10))
    row = Column(String(10))
    
    # Metadata
    created_by = Column(GUID(), ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Rating fields
    average_rating = Column(Integer, nullable=True)  # Cached average rating (1-5)
    total_reviews = Column(Integer, default=0)
    
    # Relationships
    authors = relationship('Author', secondary=book_authors, back_populates='books')
    genres = relationship('Genre', secondary=book_genres, back_populates='books')
    keywords = relationship('Keyword', secondary=book_keywords, back_populates='books')
    copies = relationship('BookCopy', back_populates='book', cascade='all, delete-orphan')
    creator = relationship('User', back_populates='created_books', foreign_keys=[created_by])
    reservations = relationship('Reservation', back_populates='book', cascade='all, delete-orphan')
    reviews = relationship('Review', back_populates='book', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<Book {self.title}>"


class Author(Base):
    """Author model"""
    
    __tablename__ = 'authors'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True, index=True)
    bio = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    books = relationship('Book', secondary=book_authors, back_populates='authors')
    
    def __repr__(self):
        return f"<Author {self.name}>"


class Genre(Base):
    """Genre model for book categorization"""
    
    __tablename__ = 'genres'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    books = relationship('Book', secondary=book_genres, back_populates='genres')
    
    def __repr__(self):
        return f"<Genre {self.name}>"


class Keyword(Base):
    """Keyword model for book tagging"""
    
    __tablename__ = 'keywords'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    books = relationship('Book', secondary=book_keywords, back_populates='keywords')
    
    def __repr__(self):
        return f"<Keyword {self.name}>"
