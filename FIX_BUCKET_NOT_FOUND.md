# 🔧 Khắc Phục Lỗi "Bucket Not Found"

## 📋 Vấn Đề
Khi gửi yêu cầu thanh toán, hệ thống báo lỗi:
```
Upload failed: Bucket not found
```

## 🎯 Nguyên Nhân
Ứng dụng cần 2 storage buckets trong Supabase nhưng chúng chưa được tạo:
- **`bills`** - để lưu ảnh bill/chứng chỉ chuyển khoản từ người dùng
- **`admin-uploads`** - để lưu ảnh QR code thanh toán từ admin

## ✅ Cách Sửa

### Bước 1: Truy cập Supabase Dashboard
Mở link sau trong trình duyệt:
```
https://app.supabase.com/project/mlxzfwfxhertxgscudbf/storage/buckets
```

### Bước 2: Tạo Bucket "bills"
1. Click nút **"New bucket"** (hoặc **"+ New bucket"**)
2. Nhập tên: **`bills`** (chữ thường, không dấu)
3. Đánh dấu **"Public bucket"** (công khai)
4. Click **"Create bucket"**
5. Chọn tab **"Policies"** và thêm policy cho phép upload/download:
   - Click **"New policy"**
   - Chọn **"For INSERT"** → **"Create policy"**
   - Tên: `Allow users to upload`
   - Thêm điều kiện: `(bucket_id = 'bills')`
   - Click **"Review"** → **"Save policy"**

### Bước 3: Tạo Bucket "admin-uploads"
Lặp lại Bước 2 nhưng với tên: **`admin-uploads`**

### Bước 4: Cấu Hình Kích Thước File (Tuỳ chọn)
Nếu muốn giới hạn kích thước file tối đa:
1. Vào settings bucket
2. Đặt **"Max file upload size"** = **5 MB**

## 🧪 Kiểm Tra Lại
1. Quay lại ứng dụng
2. Mở Payment Modal
3. Chọn gói thanh toán
4. Thử upload ảnh bill

Nếu vẫn báo lỗi, thử:
- Làm mới trang (F5)
- Đóng trình duyệt hoàn toàn rồi mở lại
- Xoá cache: `Ctrl + Shift + Delete`

## 📱 Cách Nhanh (nếu sử dụng Supabase CLI)
Nếu có Supabase CLI cài đặt, có thể chạy script:
```bash
npm run setup-buckets
```

Hoặc tạo buckets qua SQL migration bằng cách chạy:
```bash
supabase migration up
```

## 🔗 Liên Quan
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [File là chi tiết](../src/components/payment/PaymentModal.tsx#L162) nơi xảy ra lỗi
- [QR Uploader](../src/components/admin/QrImageUploader.tsx#L37)

---

**Hỏi đáp:**
- **Q:** Bucket phải public không?  
  **A:** Vâng, phải public để frontend có thể đọc ảnh

- **Q:** Có thể đổi tên bucket không?  
  **A:** Có, nhưng phải sửa code trong PaymentModal.tsx và QrImageUploader.tsx

- **Q:** Giới hạn dung lượng?  
  **A:** 5MB cho ảnh là đủ, được cấu hình trong code
