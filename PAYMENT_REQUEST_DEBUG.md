# 🔧 Payment Request Error Debug Checklist

## Quick Diagnosis Steps

### 1. Check Browser Console (F12)
```
Open your browser's Developer Tools → Console tab
Try sending payment request and look for error message:
- Storage errors: "bucket-not-found"
- RLS errors: "policy violation"
- Column errors: "column does not exist"
```

### 2. Check Supabase Dashboard
```
URL: https://app.supabase.com/project/[YOUR_PROJECT_ID]
```

#### A. Storage Buckets
- [ ] Vào **Storage** → **Buckets**
- [ ] Kiểm tra bucket **"bills"** có tồn tại?
  - Nếu không: Click "New bucket" → tạo "bills"
  - Visibility: **Public**
  - File size limit: **5MB**
- [ ] Kiểm tra bucket **"admin-uploads"** có tồn tại?
  - Nếu không: Click "New bucket" → tạo "admin-uploads"
  - Visibility: **Public**
  - File size limit: **5MB**

#### B. Database Schema
- [ ] Vào **SQL Editor**
- [ ] Chạy query này:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_requests' 
ORDER BY ordinal_position;
```
- Kết quả phải có cột:
  - `id` (uuid)
  - `user_id` (uuid)
  - `package_id` (uuid)
  - `amount` (numeric)
  - `questions_count` (integer)
  - `bill_image` (text) ← **QUAN TRỌNG**
  - `status` (text)
  - `admin_note` (text)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `approved_at` (timestamp)
  - `approved_days` (integer)
  - `approved_questions` (integer)
  - `rejection_reason` (text)

#### C. RLS Policies
- [ ] Vào **Authentication** → **Policies**
- [ ] Tìm table **"payment_requests"**
- [ ] Phải có 4 policies:
  1. "Users can view their own requests" (SELECT)
  2. "Users can create requests" (INSERT)
  3. "Admins can view all requests" (SELECT)
  4. "Admins can update requests" (UPDATE)

#### D. Storage Policies
- [ ] Vào **Storage** → **Policies**
- [ ] Bucket "bills" phải có:
  1. "Allow authenticated users to upload bills" (INSERT)
  2. "Allow public read access to bills" (SELECT)

### 3. Test Payment Flow

```
Step 1: Login with test user
Step 2: Click "Mua thêm lượt hỏi" button
Step 3: Select a package
Step 4: Confirm payment info
Step 5: Upload an image (test.jpg)
Step 6: Click "Gửi yêu cầu"
Step 7: Check for error in:
  - Browser console (F12)
  - Browser Network tab (check API requests)
  - Supabase logs (dashboard)
```

### 4. Manual Test SQL

```sql
-- Test 1: Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'payment_requests';

-- Test 2: Check column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'payment_requests' AND column_name = 'bill_image';

-- Test 3: Check RLS is enabled
SELECT oid, relname, relrowsecurity FROM pg_class 
WHERE relname = 'payment_requests';

-- Test 4: Check policies
SELECT policyname, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'payment_requests';

-- Test 5: Insert test record (if policies allow)
INSERT INTO payment_requests (user_id, amount, questions_count, bill_image, status)
VALUES (auth.uid(), 50000, 100, 'https://example.com/test.jpg', 'pending');
```

### 5. Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "bucket-not-found" | Storage bucket "bills" không tồn tại | Tạo bucket "bills" trong Storage |
| "policy violation" | RLS policy không cho phép | Kiểm tra/cập nhật RLS policy |
| "column does not exist: bill_image" | Migration chưa apply | Chạy migration 20260115051054 |
| "object-already-exists" | File đã upload rồi | Thay đổi tên file (random) |
| "Request entity too large" | File > 5MB | Compress ảnh hoặc giảm kích thước |

## 📝 Environment Variables Check

```
File: .env
```

Phải có:
- [ ] `VITE_SUPABASE_URL` - URL Supabase project
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` - Public anon key
- [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY` (optional, cho script)

## 🧪 Test Script

Nếu muốn kiểm tra programmatically:

```bash
npm run verify-buckets
```

## 📋 Status Check

Sau khi thực hiện các bước trên, đánh dấu:
- [ ] Bucket "bills" tồn tại
- [ ] Bucket "admin-uploads" tồn tại
- [ ] Cột "bill_image" tồn tại
- [ ] RLS policies có đầy đủ
- [ ] Storage policies có đầy đủ
- [ ] Test upload thành công
- [ ] Test payment request thành công
- [ ] Admin có thể thấy payment requests

## 🆘 Nếu vẫn có lỗi

1. Kiểm tra Supabase Activity logs
2. Kiểm tra browser Network tab (F12)
3. Kiểm tra console logs
4. Contact Supabase support với error message cụ thể
