# Fix: SQLAlchemy MissingGreenlet Error khi tạo sách

## Vấn đề

Khi tạo sách mới, backend trả về lỗi:
```
sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here
```

Sách vẫn được tạo thành công trong database nhưng frontend nhận error response.

## Nguyên nhân

**Root Cause**: Sử dụng `lazy='selectin'` trong relationship definitions

File: `backend/app/models/book.py` (lines 65, 68)
```python
copies = relationship('BookCopy', back_populates='book', cascade='all, delete-orphan', lazy='selectin')
reviews = relationship('Review', back_populates='book', cascade='all, delete-orphan', lazy='selectin')
```

**Tại sao gây lỗi?**
- `lazy='selectin'` là synchronous loading strategy
- Khi sử dụng với `AsyncSession`, SQLAlchemy cố gắng load relationships một cách synchronous
- Điều này gây ra MissingGreenlet error trong async context

**Khi nào lỗi xảy ra?**
File: `backend/app/api/v1/books_with_upload.py` (lines 157-158)
```python
'total_copies': len(new_book.copies),
'available_copies': sum(1 for c in new_book.copies if c.status == 'AVAILABLE'),
```

Sau khi `commit()`, khi code cố gắng access `new_book.copies`, SQLAlchemy trigger lazy load → crash!

## Giải pháp

### 1. Xóa `lazy='selectin'` khỏi model definitions

**File**: `backend/app/models/book.py`

**Before**:
```python
copies = relationship('BookCopy', back_populates='book', cascade='all, delete-orphan', lazy='selectin')
reviews = relationship('Review', back_populates='book', cascade='all, delete-orphan', lazy='selectin')
```

**After**:
```python
copies = relationship('BookCopy', back_populates='book', cascade='all, delete-orphan')
reviews = relationship('Review', back_populates='book', cascade='all, delete-orphan')
```

### 2. Xóa `lazy='selectin'` khỏi BookCopy model

**File**: `backend/app/models/book_copy.py` (line 35)

**Before**:
```python
borrow_records = relationship('BorrowRecord', back_populates='copy', cascade='all, delete-orphan', lazy='selectin')
```

**After**:
```python
borrow_records = relationship('BorrowRecord', back_populates='copy', cascade='all, delete-orphan')
```

### 3. Sử dụng explicit `selectinload()` trong queries

**File**: `backend/app/api/v1/books_with_upload.py`

**Before** (lines 124-164):
```python
db.add(new_book)
await db.commit()
await db.refresh(new_book, ['authors', 'genres', 'keywords'])

# Create initial copies...
if initial_copies and initial_copies > 0:
    # ... create copies ...
    await db.commit()

return BookResponse.model_validate({
    # ... access new_book.copies here ❌ LAZY LOAD ERROR
    'total_copies': len(new_book.copies),
})
```

**After**:
```python
db.add(new_book)
await db.commit()
await db.refresh(new_book, ['authors', 'genres', 'keywords'])

# Create initial copies if requested
if initial_copies and initial_copies > 0:
    from app.models.book_copy import BookCopy, CopyStatus
    import uuid

    for i in range(initial_copies):
        barcode = f"{new_book.isbn}-{i+1}" if new_book.isbn else f"LIB-{str(uuid.uuid4())[:8].upper()}-{i+1}"

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

# ✅ Reload the book with all relationships to avoid lazy loading issues
query = select(Book).options(
    selectinload(Book.authors),
    selectinload(Book.genres),
    selectinload(Book.keywords),
    selectinload(Book.copies)
).where(Book.id == new_book.id)

result = await db.execute(query)
new_book = result.scalar_one()

# Now safe to access new_book.copies ✅
return BookResponse.model_validate({
    **{k: getattr(new_book, k) for k in ['id', 'title', 'description', 'isbn', 'publisher', 'publication_year', 'pages', 'cover_url', 'created_at', 'updated_at']},
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
```

## Tại sao giải pháp này hoạt động?

1. **Remove lazy='selectin'**: Ngăn SQLAlchemy tự động load relationships với sync strategy
2. **Explicit selectinload()**: Sử dụng async-compatible loading strategy trong queries
3. **Reload after commit**: Sau khi tạo copies, reload book object với tất cả relationships đã được eager-loaded

## Files Changed

### backend/app/models/book.py
- Line 65: Removed `lazy='selectin'` from `copies` relationship
- Line 68: Removed `lazy='selectin'` from `reviews` relationship

### backend/app/models/book_copy.py
- Line 35: Removed `lazy='selectin'` from `borrow_records` relationship

### backend/app/api/v1/books_with_upload.py
- Lines 153-162: Added explicit reload with selectinload after creating copies

## Testing

### Test Tạo sách mới:

1. **Start backend:**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Create a book:**
   - Login as librarian/admin
   - Go to "Quản lý Sách"
   - Click "Thêm sách mới"
   - Fill in all 3 steps:
     - Step 1: Thông tin cơ bản (title, authors, cover)
     - Step 2: Chi tiết xuất bản (year, publisher, **initial_copies**)
     - Step 3: Phân loại & Vị trí (genres, location)
   - Click "Hoàn thành"

4. **Expected Result:**
   - ✅ Success toast: "Thêm sách thành công!"
   - ✅ Book appears in table
   - ✅ No MissingGreenlet error
   - ✅ Copies are created (can verify in Copy Management when editing)

### Test Chỉnh sửa sách:

1. Click edit icon on existing book
2. Navigate to Step 4: "Quản lý bản sao"
3. Verify existing copies are displayed
4. Make changes and click "Lưu thay đổi"
5. ✅ No errors should occur

## Benefits

1. **No more MissingGreenlet errors** ✅
2. **Async/await consistency** throughout the codebase
3. **Better performance** with explicit eager loading
4. **More predictable behavior** - no hidden lazy loads
5. **Follows SQLAlchemy async best practices**

## Technical Details

### What is `lazy='selectin'`?

- A loading strategy that issues a SELECT IN query to load related objects
- **Synchronous by default** - doesn't work well with AsyncSession
- Should be replaced with explicit `selectinload()` in async code

### What is `selectinload()`?

- A query option that eager-loads relationships
- **Async-compatible** when used with AsyncSession
- Explicitly tells SQLAlchemy to load relationships in the initial query

### Async Best Practices

When using SQLAlchemy with AsyncSession:
1. ❌ Don't use `lazy='selectin'` in model definitions
2. ✅ Use explicit `selectinload()` in queries where you need relationships
3. ✅ Always reload objects after creating/updating related objects
4. ✅ Be explicit about what relationships you need - no implicit lazy loading

## Notes

- The book creation still succeeds in the database even when the error occurs
- The error only happens when trying to serialize the response (accessing relationships)
- This is a common pitfall when migrating from sync to async SQLAlchemy

## References

- SQLAlchemy Async documentation: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- Relationship Loading Techniques: https://docs.sqlalchemy.org/en/20/orm/loading_relationships.html
