# 🔴 Lỗi: "Upload failed: Bucket not found" - Hướng Dẫn Sửa

## 📍 Tình Hình
Khi người dùng hoặc admin cố gắng upload ảnh trong payment flow, hệ thống báo lỗi:
```
Upload failed: Bucket not found
```

## 🎯 Vấn Đề Gốc Rễ
Supabase Storage cần 2 **buckets** (thư mục lưu trữ) để hoạt động:

| Bucket | Mục Đích | Nơi Dùng |
|--------|----------|---------|
| **bills** | Lưu ảnh bill/chứng chỉ từ user | `src/components/payment/PaymentModal.tsx` (line 162) |
| **admin-uploads** | Lưu ảnh QR code từ admin | `src/components/admin/QrImageUploader.tsx` (line 37) |

**Hiện tại:** Hai bucket này chưa được tạo trong Supabase → Lỗi "Bucket not found"

---

## ⚡ Giải Pháp Nhanh

### 🔧 Cách 1: Tạo Bucket Manual (Khuyến Nghị)

#### Bước 1: Đăng Nhập Supabase
```
https://app.supabase.com/project/mlxzfwfxhertxgscudbf/storage/buckets
```

#### Bước 2: Tạo Bucket "bills"
1. Click **"New bucket"**
2. Tên: `bills`
3. ✅ Đánh dấu **"Public bucket"**
4. Click **"Create"**

#### Bước 3: Tạo Bucket "admin-uploads"  
1. Click **"New bucket"**
2. Tên: `admin-uploads`
3. ✅ Đánh dấu **"Public bucket"**
4. Click **"Create"**

#### Bước 4: Xác Nhận & Test
```bash
cd "e:\Web AI\annndk-main"
npm run verify-buckets
```

---

### 🔧 Cách 2: Tạo Qua SQL Migration

**File:** `supabase/migrations/20260115_create_storage_buckets.sql`

Migration này sẽ:
- ✅ Tạo bucket `bills`
- ✅ Tạo bucket `admin-uploads`
- ✅ Thiết lập RLS policies
- ✅ Cho phép public read/upload

**Chạy migration:**
```bash
supabase migration up
```

---

## 📝 File Liên Quan & Thay Đổi

### 1️⃣ Storage Uploader (PaymentModal)
**File:** [src/components/payment/PaymentModal.tsx](src/components/payment/PaymentModal.tsx#L162)

```typescript
// ❌ Lỗi ở đây:
const { data, error } = await supabase.storage
  .from("bills")  // ← Bucket phải tồn tại!
  .upload(filePath, file)
```

**Fix:** Tạo bucket "bills" trong Supabase ✅

---

### 2️⃣ QR Uploader (Admin)
**File:** [src/components/admin/QrImageUploader.tsx](src/components/admin/QrImageUploader.tsx#L37)

```typescript
// ❌ Lỗi ở đây:
const { error: uploadError } = await supabase.storage
  .from("admin-uploads")  // ← Bucket phải tồn tại!
  .upload(filePath, file)
```

**Fix:** Tạo bucket "admin-uploads" trong Supabase ✅

---

### 3️⃣ Setup Script (Hỗ Trợ)
**File mới:** [setup-buckets.js](setup-buckets.js)

Hiển thị hướng dẫn tạo bucket:
```bash
npm run setup-buckets
```

**File mới:** [verify-buckets.js](verify-buckets.js)

Kiểm tra bucket đã tạo chưa:
```bash
npm run verify-buckets
```

---

### 4️⃣ Migration File (Tự Động)
**File mới:** [supabase/migrations/20260115_create_storage_buckets.sql](supabase/migrations/20260115_create_storage_buckets.sql)

Tạo bucket tự động qua SQL:
- Thêm `bills` bucket
- Thêm `admin-uploads` bucket  
- RLS policies cho phép public read
- Policies cho phép authenticated upload

---

## ✅ Checklist Kiểm Tra

- [ ] **Bucket "bills"** đã tạo trong Supabase
- [ ] **Bucket "admin-uploads"** đã tạo trong Supabase
- [ ] Cả 2 bucket là **Public**
- [ ] Có thể xem buckets trong Dashboard
- [ ] Chạy test: `npm run verify-buckets`
- [ ] Refresh app: F5
- [ ] Test upload ảnh trong Payment Modal
- [ ] Test upload QR trong Admin

---

## 🧪 Các Test Sau Khi Fix

### Test 1: User Upload Bill
1. Mở Payment Modal
2. Chọn gói thanh toán
3. Click "Tiếp tục tải bill"
4. Upload ảnh → **Phải thành công** ✅

### Test 2: Admin Upload QR
1. Vào Admin page
2. Tab "Settings"
3. Upload ảnh QR → **Phải thành công** ✅

### Test 3: Kiểm Tra Ảnh Đã Lưu
1. Vào Supabase Dashboard
2. Storage → `bills` → Xem ảnh user upload
3. Storage → `admin-uploads` → Xem ảnh QR

---

## 🚨 Nếu Vẫn Báo Lỗi

### 1. Làm mới cache
```bash
# Trên Windows
Del "%APPDATA%\..\Local\AppData\Local\Temp\*"
# Hoặc: Ctrl + Shift + Delete trong browser
```

### 2. Restart dev server
```bash
npm run dev
```

### 3. Kiểm tra Supabase status
- [https://status.supabase.com](https://status.supabase.com)

### 4. Kiểm tra CORS settings
- Supabase → Project Settings → API → CORS

### 5. Xoá browser cache & cookies
- DevTools → Application → Clear site data

---

## 📊 Tóm Tắt

| Vấn Đề | Giải Pháp |
|--------|----------|
| Bucket "bills" không tồn tại | Tạo bucket "bills" |
| Bucket "admin-uploads" không tồn tại | Tạo bucket "admin-uploads" |
| Upload thất bại | Đảm bảo bucket public |
| Không thấy ảnh đã upload | Check RLS policies |
| Lỗi CORS | Cấu hình CORS trong Supabase |

---

## 📚 Tài Liệu Liên Quan

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Payment Modal Component](src/components/payment/PaymentModal.tsx)
- [QR Uploader Component](src/components/admin/QrImageUploader.tsx)

---

**Ngày update:** 15/01/2026  
**Status:** ✅ Ready to implement
