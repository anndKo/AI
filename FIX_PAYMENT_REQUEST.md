# Hướng Dẫn Fix - Lỗi Gửi Yêu Cầu Thanh Toán

## 🐛 Vấn Đề

Khi người dùng gửi yêu cầu thanh toán (payment request), gặp lỗi.

## 🔍 Nguyên Nhân Có Thể

### 1. **Storage Bucket "bills" chưa được tạo**
- Cần tạo bucket "bills" trong Supabase Storage
- Phải có quyền public read
- Kích thước tối đa: 5MB

### 2. **RLS Policy chưa cho phép insert**
- Bảng `payment_requests` có RLS enabled
- Policy "Users can create requests" phải cho phép thêm records

### 3. **Cột `bill_image` không tồn tại**
- Migration `20260115051054_add_bill_fields.sql` phải được apply
- Cần check xem migration có chạy trên Supabase hay không

### 4. **Lỗi Upload ảnh**
- Bucket "bills" không public
- Quyền CORS không hỗ trợ upload
- File quá lớn (>5MB)

## ✅ Cách Fix

### Step 1: Kiểm tra Supabase Dashboard
```
1. Vào https://app.supabase.com/project/YOUR_PROJECT_ID/storage/buckets
2. Kiểm tra xem bucket "bills" có tồn tại không
3. Nếu không, tạo bucket mới:
   - Name: "bills"
   - Make it public: ✓
   - File size limit: 5MB
```

### Step 2: Kiểm tra Database Migrations
```
1. Vào SQL Editor
2. Chạy query để kiểm tra columns:
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'payment_requests';
3. Kết quả phải có: id, user_id, package_id, amount, questions_count, bill_image, status, admin_note, created_at, updated_at
```

### Step 3: Kiểm tra RLS Policies
```
1. Vào Authentication > Policies
2. Tìm table "payment_requests"
3. Phải có policy:
   - "Users can view their own requests" (SELECT)
   - "Users can create requests" (INSERT)
   - "Admins can view all requests" (SELECT)
   - "Admins can update requests" (UPDATE)
```

### Step 4: Kiểm tra Storage Policies
```
1. Vào Storage > Policies
2. Bucket "bills" phải có:
   - "Allow authenticated users to upload bills" (INSERT)
   - "Allow public read access to bills" (SELECT)
```

## 📝 Ghi Chú Kỹ Thuật

### Upload Flow:
```
User select file
  ↓
Validate file (type, size)
  ↓
Upload to storage.bills bucket
  ↓
Get public URL
  ↓
Insert payment_request with bill_image URL
  ↓
Success!
```

### Error Messages (mã lỗi):
- `storage/bucket-not-found` → Bucket chưa được tạo
- `storage/invalid-file-object` → File không hợp lệ
- `storage/object-already-exists` → File đã tồn tại
- `RLS error` → RLS policy không cho phép

## 🧪 Test

1. Tạo test user mới
2. Login
3. Click "Mua thêm lượt hỏi"
4. Chọn gói
5. Upload ảnh bill
6. Click "Gửi yêu cầu"
7. Check browser console (F12) cho error details

## 📌 Liên Quan

- [PaymentModal.tsx](src/components/payment/PaymentModal.tsx)
- [Storage Setup](supabase/migrations/20260115_create_storage_buckets.sql)
- [Database Schema](supabase/migrations/20260115051054_add_bill_fields.sql)
