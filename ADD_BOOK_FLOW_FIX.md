# Fix: Loại bỏ bước Quản lý bản sao khỏi flow Tạo sách mới

## Vấn đề

Khi tạo sách mới, modal hiển thị bước 4/5 là "Quản lý bản sao", nhưng điều này gây lỗi vì:
- Sách chưa được tạo trong database
- Chưa có `book_id` để tạo copies
- API endpoint yêu cầu `book_id` để tạo copies

## Giải pháp

Tách riêng flow cho **Tạo mới** và **Chỉnh sửa**:

### Tạo sách mới (Add):
- ✅ **3 bước**: Basic Info → Publication Details → Classification
- ✅ Sử dụng field `initial_copies` trong publication step
- ✅ Backend tự động tạo copies khi tạo sách

### Chỉnh sửa sách (Edit):
- ✅ **4 bước**: Basic Info → Publication Details → Classification → **Copy Management**
- ✅ Có thể thêm/xóa copies vì đã có `book_id`
- ✅ Hiển thị danh sách copies hiện tại

## Thay đổi code

### File: `frontend/components/books/AddBookModal.tsx`

#### 1. Thêm biến `totalSteps` (line 177):
```typescript
const totalSteps = isEditMode ? 4 : 3;
```

#### 2. Cập nhật `handleNext()` (line 179):
```typescript
const handleNext = () => {
  if (validateStep(currentStep)) {
    setCurrentStep(prev => Math.min(totalSteps, prev + 1));
  }
};
```

#### 3. Cập nhật `getStepTitle()` (line 247):
```typescript
const getStepTitle = () => {
  if (isEditMode) {
    switch (currentStep) {
      case 1: return 'Thông tin cơ bản';
      case 2: return 'Chi tiết xuất bản';
      case 3: return 'Phân loại & Vị trí';
      case 4: return 'Quản lý bản sao';
      default: return '';
    }
  } else {
    switch (currentStep) {
      case 1: return 'Thông tin cơ bản';
      case 2: return 'Chi tiết xuất bản';
      case 3: return 'Phân loại & Vị trí';
      default: return '';
    }
  }
};
```

#### 4. Cập nhật Progress Bar (line 288):
```typescript
<span className="text-gray-600 dark:text-gray-400">Bước {currentStep}/{totalSteps}</span>
...
style={{ width: `${(currentStep / totalSteps) * 100}%` }}
```

#### 5. Chỉ hiển thị StepCopyManagement khi edit (line 322):
```typescript
{currentStep === 4 && isEditMode && (
  <StepCopyManagement
    data={copyManagement}
    onChange={setCopyManagement}
    bookId={initialData?.id}
    isEditMode={isEditMode}
  />
)}
```

#### 6. Xóa step 5 (confirmation) - không cần nữa (line 331):
```typescript
{currentStep === 5 && isEditMode && (
  // Removed - not needed
)}
```

#### 7. Cập nhật button submit (line 397):
```typescript
<button
  onClick={currentStep === totalSteps ? handleSubmit : handleNext}
  disabled={isPending}
  className="..."
>
  {isPending && <span>...</span>}
  {isPending ? 'Đang xử lý...' :
    currentStep === totalSteps ?
      (isEditMode ? 'Lưu thay đổi' : 'Hoàn thành') :
      'Tiếp theo'}
</button>
```

## Flow Comparison

### Before (Có lỗi):
```
Tạo mới:  1. Basic Info → 2. Publication → 3. Classification → 4. Copy Mgmt ❌ → 5. Confirm
Edit:     1. Basic Info → 2. Publication → 3. Classification → 4. Copy Mgmt ✅ → 5. Confirm
```

### After (Đã fix):
```
Tạo mới:  1. Basic Info → 2. Publication → 3. Classification → [Submit] ✅
Edit:     1. Basic Info → 2. Publication → 3. Classification → 4. Copy Mgmt → [Submit] ✅
```

## Testing

### Test Tạo sách mới:

1. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to Books Management:**
   - Login as librarian/admin
   - Go to "Quản lý Sách"
   - Click "Thêm sách mới"

3. **Verify 3 steps:**
   - ✅ Step 1/3: Thông tin cơ bản
   - ✅ Step 2/3: Chi tiết xuất bản (có field "Số lượng bản sao ban đầu")
   - ✅ Step 3/3: Phân loại & Vị trí
   - ✅ Button "Hoàn thành" xuất hiện ở step 3
   - ✅ Không có step 4 "Quản lý bản sao"

4. **Submit:**
   - Fill all required fields
   - Enter "Số lượng bản sao ban đầu" (e.g., 5)
   - Click "Hoàn thành"
   - ✅ Sách được tạo với 5 copies tự động

### Test Chỉnh sửa sách:

1. **Click edit icon** trên một sách existing

2. **Verify 4 steps:**
   - ✅ Step 1/4: Thông tin cơ bản
   - ✅ Step 2/4: Chi tiết xuất bản
   - ✅ Step 3/4: Phân loại & Vị trí
   - ✅ Step 4/4: Quản lý bản sao ← Có step này!

3. **Step 4 - Copy Management:**
   - ✅ Hiển thị danh sách copies hiện có
   - ✅ Có thể thêm copies mới (nhập barcode)
   - ✅ Có thể xóa copies
   - ✅ Button "Lưu thay đổi" xuất hiện

4. **Submit:**
   - Make changes to copies
   - Click "Lưu thay đổi"
   - ✅ Book và copies được update thành công

## Benefits

1. **No more errors** khi tạo sách mới
2. **Better UX**: Flow logic hơn
3. **Cleaner code**: Separation of concerns
4. **Correct API usage**: Copies chỉ được manage khi có book_id

## Notes

### Tạo sách mới:
- Backend xử lý `initial_copies` parameter
- Tự động generate barcodes theo pattern
- Tất cả copies có status AVAILABLE

### Chỉnh sửa sách:
- Manual management với custom barcodes
- Có thể set status cho từng copy
- Delete và create copies independently

## Progress Bar Display

### Tạo mới (3 steps):
```
Bước 1/3: [████░░░░░░░░] 33%  - Thông tin cơ bản
Bước 2/3: [████████░░░░] 67%  - Chi tiết xuất bản
Bước 3/3: [████████████] 100% - Phân loại & Vị trí
```

### Edit (4 steps):
```
Bước 1/4: [███░░░░░░░░░] 25%  - Thông tin cơ bản
Bước 2/4: [██████░░░░░░] 50%  - Chi tiết xuất bản
Bước 3/4: [█████████░░░] 75%  - Phân loại & Vị trí
Bước 4/4: [████████████] 100% - Quản lý bản sao
```

## Summary

| Mode      | Steps | Copy Management | Submit Text     |
|-----------|-------|-----------------|-----------------|
| Create    | 3     | ❌ (use field)  | "Hoàn thành"    |
| Edit      | 4     | ✅ (full mgmt)  | "Lưu thay đổi"  |

✅ Build thành công - không có errors!
