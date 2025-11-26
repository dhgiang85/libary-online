# Library Online Backend - Complete Documentation

> **Last Updated**: 2025-11-23  
> **Version**: 1.0  
> **Tech Stack**: FastAPI + PostgreSQL + SQLAlchemy + Elasticsearch (optional)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Setup & Installation](#setup--installation)
7. [Project Structure](#project-structure)
8. [Development Guidelines](#development-guidelines)
9. [Testing](#testing)
10. [Deployment](#deployment)

---

## Overview

Library Online là hệ thống quản lý thư viện hiện đại với đầy đủ tính năng:
- Quản lý sách, tác giả, thể loại
- Mượn/trả sách
- Đặt trước sách (reservations)
- Đánh giá & review sách
- Tìm kiếm full-text với Elasticsearch
- Quản lý người dùng (admin)
- Tin tức thư viện
- Upload file (ảnh bìa sách, tin tức)

---

## Architecture

### Tech Stack

**Backend Framework**:
- FastAPI (async web framework)
- Uvicorn (ASGI server)

**Database**:
- PostgreSQL (primary database)
- SQLAlchemy (ORM)
- Alembic (migrations)
- AsyncPG (async PostgreSQL driver)

**Authentication**:
- JWT (JSON Web Tokens)
- Bcrypt (password hashing)

**Search** (Optional):
- Elasticsearch 8.x

**File Storage**:
- Local filesystem
- Pillow (image processing)

### Architecture Pattern

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│      FastAPI Application        │
│  ┌──────────────────────────┐  │
│  │   API Routes (v1)        │  │
│  └──────────┬───────────────┘  │
│             │                   │
│  ┌──────────▼───────────────┐  │
│  │   Dependencies           │  │
│  │   (Auth, DB Session)     │  │
│  └──────────┬───────────────┘  │
│             │                   │
│  ┌──────────▼───────────────┐  │
│  │   Business Logic         │  │
│  │   (Services, Utils)      │  │
│  └──────────┬───────────────┘  │
│             │                   │
│  ┌──────────▼───────────────┐  │
│  │   Data Layer             │  │
│  │   (SQLAlchemy Models)    │  │
│  └──────────┬───────────────┘  │
└─────────────┼───────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌──────────┐    ┌──────────────┐
│PostgreSQL│    │Elasticsearch │
└──────────┘    └──────────────┘
```

---

## Features

### ✅ Implemented Features

#### 1. Authentication & Authorization
- User registration với validation
- Login với JWT tokens (access + refresh)
- Role-based access control (User, Librarian, Admin)
- Password hashing với bcrypt

#### 2. Book Management
- CRUD operations (Librarian)
- Tác giả, thể loại, keywords
- Upload ảnh bìa
- Thống kê sách
- Tìm kiếm, lọc, phân trang

#### 3. Book Copies & Borrowing
- Quản lý bản sao vật lý (barcode)
- Mượn/trả sách
- Tracking borrow records
- Due dates & overdue status

#### 4. Reservations (Đặt trước)
- FIFO queue system
- Auto-fulfill khi sách được trả
- 48-hour expiry
- User & Librarian endpoints

#### 5. Reviews & Ratings
- 1-5 star ratings
- Review text (optional)
- Borrow validation (chỉ review sách đã mượn)
- Auto-calculate average rating
- Rating distribution statistics

#### 6. User Management (Admin)
- List, view, update users
- Deactivate users (soft delete)
- Change user roles
- View borrow history

#### 7. News Management
- CRUD news articles
- Publish/unpublish
- Upload cover images
- Public & draft news

#### 8. Search (Elasticsearch)
- Full-text search với fuzzy matching
- Advanced filters (genre, author, rating, year)
- Autocomplete suggestions
- Database fallback

#### 9. File Upload
- Book covers
- News images
- Image validation & processing
- File size limits

---

## Database Schema

### Core Tables

#### `users`
```sql
- id: UUID (PK)
- email: VARCHAR(255) UNIQUE
- username: VARCHAR(100) UNIQUE
- hashed_password: VARCHAR(255)
- full_name: VARCHAR(255)
- role: VARCHAR(20) -- user, librarian, admin
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `books`
```sql
- id: UUID (PK)
- title: VARCHAR(500)
- description: TEXT
- cover_url: VARCHAR(1000)
- isbn: VARCHAR(20) UNIQUE
- publisher: VARCHAR(255)
- publication_year: INTEGER
- pages: INTEGER
- floor, shelf, row: VARCHAR(10)
- average_rating: INTEGER (1-5)
- total_reviews: INTEGER
- created_by: UUID (FK -> users)
- created_at, updated_at: TIMESTAMP
```

#### `authors`
```sql
- id: UUID (PK)
- name: VARCHAR(255) UNIQUE
- bio: TEXT
```

#### `genres`
```sql
- id: UUID (PK)
- name: VARCHAR(100) UNIQUE
- description: TEXT
```

#### `book_copies`
```sql
- id: UUID (PK)
- book_id: UUID (FK -> books)
- barcode: VARCHAR(50) UNIQUE
- status: VARCHAR(20) -- AVAILABLE, BORROWED, LOST
- created_at, updated_at: TIMESTAMP
```

#### `borrow_records`
```sql
- id: UUID (PK)
- copy_id: UUID (FK -> book_copies)
- user_id: UUID (FK -> users)
- borrowed_at: TIMESTAMP
- due_date: TIMESTAMP
- returned_at: TIMESTAMP
- status: VARCHAR(20) -- ACTIVE, RETURNED, OVERDUE
```

#### `reservations`
```sql
- id: UUID (PK)
- user_id: UUID (FK -> users)
- book_id: UUID (FK -> books)
- status: VARCHAR(20) -- PENDING, FULFILLED, CANCELLED, EXPIRED
- reserved_at: TIMESTAMP
- expires_at: TIMESTAMP
- fulfilled_at: TIMESTAMP
- created_at: TIMESTAMP
```

#### `reviews`
```sql
- id: UUID (PK)
- user_id: UUID (FK -> users)
- book_id: UUID (FK -> books)
- rating: INTEGER (1-5) CHECK
- review_text: TEXT
- created_at, updated_at: TIMESTAMP
- UNIQUE(user_id, book_id)
```

#### `news`
```sql
- id: UUID (PK)
- title: VARCHAR(500)
- content: TEXT
- summary: TEXT
- cover_image: VARCHAR(1000)
- author_id: UUID (FK -> users)
- published: BOOLEAN
- published_at: TIMESTAMP
- created_at, updated_at: TIMESTAMP
```

### Relationships

```
users (1) ──── (N) books (created_by)
users (1) ──── (N) borrow_records
users (1) ──── (N) reservations
users (1) ──── (N) reviews
users (1) ──── (N) news (author)

books (N) ──── (N) authors (book_authors)
books (N) ──── (N) genres (book_genres)
books (N) ──── (N) keywords (book_keywords)
books (1) ──── (N) book_copies
books (1) ──── (N) reservations
books (1) ──── (N) reviews

book_copies (1) ──── (N) borrow_records
```

---

## API Endpoints Summary

**Total Endpoints**: 50+

- Authentication: 4 endpoints
- Books: 6 endpoints
- Book Copies: 6 endpoints
- Reservations: 5 endpoints
- Reviews: 6 endpoints
- Users (Admin): 6 endpoints
- News: 6 endpoints
- Search: 2 endpoints
- Upload: 2 endpoints

See full documentation in README.md

---

## Setup & Installation

### Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Setup .env file
cp .env.example .env
# Edit .env with your settings

# 3. Run migrations
alembic upgrade head

# 4. Start server
uvicorn app.main:app --reload
```

### Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/library_db
SECRET_KEY=your-secret-key
ELASTICSEARCH_ENABLED=false
```

---

## Project Structure

```
backend/
├── app/
│   ├── api/v1/          # API endpoints
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   ├── config.py
│   ├── database.py
│   └── main.py
├── tests/               # Test suite
├── alembic/             # Migrations
└── requirements.txt
```

---

## Testing

```bash
# Run all tests
pytest tests/ -v

# Current status: 165 tests passing ✅
```

---

## Key Features Summary

✅ **Complete Authentication** - JWT, role-based access  
✅ **Book Management** - CRUD, search, filters  
✅ **Borrow System** - Track borrowing, due dates  
✅ **Reservations** - FIFO queue, auto-fulfill  
✅ **Reviews & Ratings** - 1-5 stars, statistics  
✅ **User Management** - Admin controls  
✅ **Search** - Elasticsearch + fallback  
✅ **File Upload** - Images with validation  

---

## Next Steps

- [ ] Write tests for reviews
- [ ] Setup Elasticsearch in production
- [ ] Add email notifications
- [ ] Implement statistics dashboard
- [ ] Add Docker support
- [ ] Setup CI/CD

---

**For detailed documentation, see README.md**
