# ✅ Hướng Dẫn Sửa Lỗi "Bucket Not Found"

## 📌 Tóm Tắt Vấn Đề
```
❌ Lỗi: "Upload failed: Bucket not found"
🎯 Nguyên nhân: 2 storage buckets chưa được tạo trong Supabase
✅ Giải pháp: Tạo buckets hoặc chạy migration
```

---

## 🚀 Hướng Dẫn Nhanh (5 Phút)

### Step 1: Mở Supabase Dashboard
Truy cập: https://app.supabase.com/project/mlxzfwfxhertxgscudbf/storage/buckets

### Step 2: Tạo Bucket "bills"
```
New bucket → Name: bills → Mark as Public → Create
```

### Step 3: Tạo Bucket "admin-uploads"  
```
New bucket → Name: admin-uploads → Mark as Public → Create
```

### Step 4: Verify (Optional)
```bash
cd "e:\Web AI\annndk-main"
npm run verify-buckets
```

### Step 5: Test
- Refresh ứng dụng (F5)
- Mở Payment Modal
- Upload ảnh bill → **Thành công!** ✅

---

## 📦 Các File Được Thêm

| File | Mục Đích |
|------|----------|
| [setup-buckets.js](setup-buckets.js) | Script hướng dẫn tạo bucket |
| [verify-buckets.js](verify-buckets.js) | Script kiểm tra bucket tồn tại |
| [FIX_BUCKET_NOT_FOUND.md](FIX_BUCKET_NOT_FOUND.md) | Hướng dẫn chi tiết |
| [BUCKET_SETUP_GUIDE.md](BUCKET_SETUP_GUIDE.md) | Tài liệu toàn bộ |
| [supabase/migrations/20260115_create_storage_buckets.sql](supabase/migrations/20260115_create_storage_buckets.sql) | Migration tạo bucket tự động |

---

## 🔧 Lệnh NPM Mới

```bash
# Hướng dẫn tạo bucket
npm run setup-buckets

# Kiểm tra bucket đã tạo
npm run verify-buckets
```

---

## 💡 Nguyên Nhân Chi Tiết

### Bucket "bills"
- **Dùng ở:** [PaymentModal.tsx](src/components/payment/PaymentModal.tsx#L162)
- **Mục đích:** Lưu ảnh bill từ user khi thanh toán
- **Yêu cầu:** Public (công khai để hiển thị ảnh)

### Bucket "admin-uploads"
- **Dùng ở:** [QrImageUploader.tsx](src/components/admin/QrImageUploader.tsx#L37)
- **Mục đích:** Lưu ảnh QR code từ admin
- **Yêu cầu:** Public (công khai để hiển thị QR)

---

## ✅ Kiểm Tra Sau Khi Fix

```bash
# 1. Chạy verify script
npm run verify-buckets

# Output mong đợi:
# ✅ All required buckets exist!
```

```bash
# 2. Test trong app
npm run dev
# - Mở Payment Modal
# - Chọn gói → Upload ảnh → Phải thành công ✅
# - Vào Admin → Upload QR → Phải thành công ✅
```

---

## 🎯 Điều Gì Xảy Ra Khi Fix

### Trước Fix ❌
```
User click Upload → Error "Bucket not found"
```

### Sau Fix ✅
```
User click Upload → Ảnh được lưu vào bucket "bills"
                 → Hiển thị trong payment request
                 → Admin có thể review
```

---

## 📚 Tài Liệu Thêm

Xem chi tiết:
- [FIX_BUCKET_NOT_FOUND.md](FIX_BUCKET_NOT_FOUND.md) - Hướng dẫn từng bước
- [BUCKET_SETUP_GUIDE.md](BUCKET_SETUP_GUIDE.md) - Tài liệu toàn bộ

---

**Status:** ✅ Sẵn sàng triển khai
**Ngày:** 15/01/2026
