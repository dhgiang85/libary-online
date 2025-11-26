# Review Borrow Requirement Configuration

## Trạng thái hiện tại

✅ **Đã tắt** yêu cầu phải mượn sách trước khi đánh giá.

Bất kỳ user đã đăng nhập nào cũng có thể đánh giá sách, không cần mượn trước.

## Cách hoạt động

### File: `backend/app/api/v1/reviews.py`

#### Hiện tại (Borrow check disabled):

```python
@router.post("/books/{book_id}/reviews", ...)
async def create_review(...):
    """
    Create a review for a book (any authenticated user can review)
    """
    # Check if book exists
    book_result = await db.execute(select(Book).where(Book.id == book_id))
    book = book_result.scalar_one_or_none()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    # Note: Removed borrow requirement - any authenticated user can review
    # CODE ĐANG BỊ COMMENT - XEM DƯỚI ĐÂY ĐỂ ENABLE LẠI
    # # Check if user has borrowed this book before
    # borrow_check = await db.execute(...)
    # if borrow_check.scalar() == 0:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="You can only review books you have borrowed"
    #     )

    # Check if user already reviewed this book
    existing_review = await db.execute(...)
    if existing_review.scalar_one_or_none():
        raise HTTPException(...)

    # Create review
    new_review = Review(...)
    ...
```

## Cách bật lại yêu cầu mượn sách (Enable borrow check)

### Bước 1: Uncomment code trong `backend/app/api/v1/reviews.py`

Tìm đoạn code bị comment (lines ~47-70) và bỏ comment:

**From:**
```python
    # Note: Removed borrow requirement - any authenticated user can review
    # # Check if user has borrowed this book before
    # borrow_check = await db.execute(
    #     select(func.count())
    #     .where(BorrowRecord.user_id == current_user.id)
    #     .where(BorrowRecord.copy_id.in_(
    #         select(Book.id).join(Book.copies).where(Book.id == book_id)
    #     ))
    # )
    #
    # # Simplified check: just verify user has any borrow record for this book's copies
    # from app.models.book_copy import BookCopy
    # borrow_check = await db.execute(
    #     select(func.count())
    #     .select_from(BorrowRecord)
    #     .join(BookCopy, BorrowRecord.copy_id == BookCopy.id)
    #     .where(BookCopy.book_id == book_id)
    #     .where(BorrowRecord.user_id == current_user.id)
    # )
    #
    # if borrow_check.scalar() == 0:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="You can only review books you have borrowed"
    #     )
```

**To:**
```python
    # Check if user has borrowed this book before
    from app.models.book_copy import BookCopy
    borrow_check = await db.execute(
        select(func.count())
        .select_from(BorrowRecord)
        .join(BookCopy, BorrowRecord.copy_id == BookCopy.id)
        .where(BookCopy.book_id == book_id)
        .where(BorrowRecord.user_id == current_user.id)
    )

    if borrow_check.scalar() == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review books you have borrowed"
        )
```

### Bước 2: Update docstring

Thay đổi docstring để phản ánh behavior mới:

```python
@router.post("/books/{book_id}/reviews", ...)
async def create_review(...):
    """
    Create a review for a book (user must have borrowed the book before)
    """
```

### Bước 3: Restart backend server

```bash
cd backend
uvicorn app.main:app --reload
```

## So sánh 2 modes

### Mode 1: Borrow Required (Commented out - có thể enable)

**Ưu điểm:**
- ✅ Verified reviews - Chỉ người thực sự mượn sách mới đánh giá
- ✅ Chất lượng cao hơn - Reviews từ người đã đọc sách
- ✅ Giảm spam/fake reviews
- ✅ Tăng độ tin cậy của ratings

**Nhược điểm:**
- ❌ Ít reviews hơn (nhiều người muốn review nhưng chưa mượn)
- ❌ User experience kém hơn (phải mượn mới được review)
- ❌ Không phù hợp với mô hình "browse before borrow"

**Use case:**
- Thư viện muốn đảm bảo chất lượng reviews
- Chống fake reviews, spam
- Library có nhiều người dùng active

### Mode 2: No Borrow Required (✅ Current)

**Ưu điểm:**
- ✅ Nhiều reviews hơn
- ✅ User experience tốt hơn
- ✅ Cho phép "preview" reviews trước khi mượn
- ✅ Tăng engagement
- ✅ Phù hợp với mô hình công cộng

**Nhược điểm:**
- ❌ Có thể có fake reviews
- ❌ Người chưa đọc sách có thể review
- ❌ Chất lượng reviews có thể thấp hơn

**Use case:**
- Thư viện mới, muốn tăng số lượng reviews
- Ưu tiên user engagement
- Public library với nhiều người dùng không thường xuyên

## Business Logic

### Với Borrow Check Enabled:

```
User muốn review
    ↓
Check: Đã đăng nhập? → No → Error: "Vui lòng đăng nhập"
    ↓ Yes
Check: Đã mượn sách này? → No → Error: "You can only review books you have borrowed"
    ↓ Yes
Check: Đã review rồi? → Yes → Error: "You have already reviewed this book"
    ↓ No
✅ Cho phép tạo review
```

### Với Borrow Check Disabled (Current):

```
User muốn review
    ↓
Check: Đã đăng nhập? → No → Error: "Vui lòng đăng nhập"
    ↓ Yes
Check: Đã review rồi? → Yes → Error: "You have already reviewed this book"
    ↓ No
✅ Cho phép tạo review
```

## Testing

### Test với Borrow Check Disabled (Current):

1. Login as any user
2. Go to any book detail page
3. Click "Đánh giá" tab
4. Click "Viết đánh giá của bạn"
5. Submit review
6. ✅ Should succeed even if never borrowed

### Test với Borrow Check Enabled (After uncommenting):

1. Login as user who has NOT borrowed the book
2. Go to book detail page
3. Try to submit review
4. ❌ Should fail with error: "You can only review books you have borrowed"

5. Login as user who HAS borrowed the book
6. Go to same book detail page
7. Submit review
8. ✅ Should succeed

## Code Location

**Backend validation**:
- File: `backend/app/api/v1/reviews.py`
- Function: `create_review()`
- Lines: ~47-70 (commented out)

**Database check**:
```python
from app.models.book_copy import BookCopy, BorrowRecord

# Check if user has any borrow records for this book's copies
borrow_check = await db.execute(
    select(func.count())
    .select_from(BorrowRecord)
    .join(BookCopy, BorrowRecord.copy_id == BookCopy.id)
    .where(BookCopy.book_id == book_id)
    .where(BorrowRecord.user_id == current_user.id)
)

if borrow_check.scalar() == 0:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="You can only review books you have borrowed"
    )
```

## Frontend Behavior

Frontend không cần thay đổi gì. Error message từ backend sẽ được hiển thị qua toast notification:

```typescript
// frontend/components/reviews/ReviewForm.tsx
const mutation = useMutation({
  mutationFn: (data: ReviewForm) => {
    return reviewsApi.createReview(bookId, data);
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.detail || 'Có lỗi xảy ra');
  },
});
```

Nếu backend trả về error "You can only review books you have borrowed", frontend sẽ hiển thị toast error với message đó.

## Recommendation

**Cho thư viện mới / public library:**
→ Giữ nguyên **disabled** (current state)

**Cho thư viện đã có nhiều users active:**
→ **Enable** borrow check để đảm bảo chất lượng

**Cho thư viện muốn cả hai:**
→ Có thể thêm badge "Verified Reviewer" cho người đã mượn sách

## Summary

✅ **Hiện tại**: Borrow check **DISABLED** - Ai cũng có thể review

🔄 **Để enable lại**: Uncomment code trong `backend/app/api/v1/reviews.py` lines ~47-70

📝 **Note**: Code đã được giữ lại (commented) để dễ dàng enable lại sau này
