# Tài liệu thay đổi - Hệ thống Thanh toán và Quản lý Admin

## 1. Tính năng Bill Review (Duyệt Bill)

### 1.1 Quy trình thanh toán mới - Thông tin chuyển khoản trước
**File**: `src/components/payment/PaymentModal.tsx`

**Luồng mới (cải tiến)**:
1. ✅ Chọn gói thanh toán
2. ✅ **XEM THÔNG TIN CHUYỂN KHOẢN** (bước mới - step: "transfer_info")
   - Hiển thị rõ: Ngân hàng, Số tài khoản, Chủ tài khoản
   - Hiển thị mã QR code (có thể xem toàn màn hình)
   - Cảnh báo: Chuyển đúng số tiền để dễ xác minh
   - Nút "Tiếp tục tải bill" để sang bước tiếp theo
3. ✅ Tải ảnh bill/chứng chỉ chuyển khoản
   - Kiểm tra loại file (chỉ hình ảnh)
   - Giới hạn kích thước (tối đa 5MB)
   - Xem trước ảnh trước khi xác nhận
4. ✅ Xác nhận toàn bộ thông tin
   - Xem lại: Gói, thông tin chuyển khoản, ảnh bill
   - Nút "Gửi yêu cầu" để gửi cho admin duyệt
5. ✅ Admin duyệt yêu cầu

**Lợi ích**:
- Người dùng xác nhận thông tin chuyển khoản rõ ràng trước khi thực hiện
- Giảm nhầm lẫn với tài khoản ngân hàng sai
- Cảnh báo về số tiền chính xác cần chuyển
- Dễ dàng hỗ trợ/giải thích cho người dùng nếu cần

### 1.2 Yêu cầu thanh toán từ người dùng
- Người dùng tải ảnh bill/chứng chỉ chuyển khoản khi gửi yêu cầu thanh toán
- Ảnh được lưu trữ trong Supabase Storage (`admin-uploads/bills/`)

**File**: `src/components/payment/PaymentModal.tsx`
- Thêm trường `billImage` để lưu trữ URL ảnh
- Thêm tính năng upload ảnh với hỗ trợ:
  - Kiểm tra loại file (chỉ hình ảnh)
  - Giới hạn kích thước (tối đa 5MB)
  - Xóa ảnh nếu muốn thay đổi
  - Disable button "Xác nhận chuyển khoản" nếu chưa tải ảnh

### 1.3 Luồng duyệt bill trong Admin
**File**: `src/components/admin/BillReviewModal.tsx` (tệp mới)
- Component modal để duyệt/từ chối yêu cầu thanh toán
- Chức năng:
  - **Xem ảnh bill**: Hiển thị ảnh và có nút "Xem toàn màn hình"
  - **Duyệt**: 
    - Nhập số ngày gia hạn (vd: 30 ngày)
    - Nhập số lượt hỏi (vd: 100 câu)
    - Tự động thêm câu hỏi vào bonus_questions
    - Cập nhật plan_expires_at cho user
  - **Từ chối**: 
    - Nhập lý do từ chối
    - Lưu rejection_reason vào database

### 1.4 Giao diện Admin - Tab "Yêu cầu"
**File**: `src/pages/Admin.tsx`
- Thêm cột "Bill" để hiển thị thumbnail ảnh bill
- Click vào thumbnail hoặc nút "Duyệt" để mở BillReviewModal
- Trạng thái yêu cầu:
  - **Chờ duyệt** (pending): Vàng
  - **Đã duyệt** (approved): Xanh
  - **Từ chối** (rejected): Đỏ

## 2. Cài đặt Admin - Áp dụng cho tất cả người dùng

### 2.1 Cập nhật giới hạn câu hỏi/ngày
**File**: `src/pages/Admin.tsx`
- Hàm `saveSettings()` cập nhật:
  - Default daily limit trong `app_settings`
  - **ĐẶC BIỆT**: Tự động cập nhật tất cả user_quotas.daily_limit
  - Toast thông báo: "Đã lưu cài đặt và cập nhật tất cả người dùng!"

### 2.2 Hàm cập nhật quota người dùng
**File**: `src/pages/Admin.tsx`
- Hàm `updateUserQuota()` được sửa:
  - Nếu update `daily_limit`: cập nhật cho **TẤT CẢ người dùng**
  - Nếu update các field khác: chỉ cập nhật người dùng đó
  - Điều này đảm bảo tính nhất quán khi admin thay đổi chính sách

## 3. QR Code Fullscreen Viewer

### 3.1 Component mới
**File**: `src/components/chat/QrFullscreenViewer.tsx`
- Hiển thị ảnh QR ở toàn màn hình
- Nút "Tải về" để download QR code
- Nút đóng (X) ở góc trên phải
- Nền đen để dễ quan sát

### 3.2 Tích hợp vào Payment Modal
**File**: `src/components/payment/PaymentModal.tsx`
- Click vào ảnh QR sẽ mở fullscreen viewer
- Người dùng có thể:
  - Xem ảnh lớn hơn
  - Tải ảnh QR về máy
  - Dễ dàng scan QR từ điện thoại

## 4. Quản lí Người dùng - Tab "Users"

### 4.1 Cột dữ liệu chính xác
**File**: `src/pages/Admin.tsx`
**Cột hiển thị**:
1. **Email**: Email của người dùng
2. **Giới hạn/ngày**: Daily limit hiện tại
3. **Số lượt hỏi còn lại**: 
   - Tính: `daily_limit - questions_used_today + bonus_questions`
   - Màu đỏ nếu ≤ 0
4. **Hôm nay**: Hiển thị `questions_used_today/daily_limit`
5. **Action**: Nút Reset để reset counter hôm nay

### 4.2 Tính năng quản lí
- Xem danh sách người dùng chính xác
- Reset counter hàng ngày cho từng người dùng
- Hiển thị rõ ràng người dùng nào hết lượt hỏi

## 5. Database Schema Changes

### 5.1 Thêm cột trong payment_requests
**File**: `supabase/migrations/20260115_add_bill_image_to_payment_requests.sql`
```sql
ALTER TABLE public.payment_requests 
ADD COLUMN bill_image TEXT,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_days INTEGER,
ADD COLUMN approved_questions INTEGER,
ADD COLUMN rejection_reason TEXT;
```

## 6. Luồng hoàn chỉnh

### Luồng Thanh toán (Cải tiến):
1. **User tạo yêu cầu thanh toán**
   - Bấm nút "Mua thêm lượt hỏi"
   
2. **Chọn gói thanh toán**
   - Xem danh sách các gói
   - Click chọn gói muốn mua

3. **XEM THÔNG TIN CHUYỂN KHOẢN** (BẬC MỚI - TRỊ)
   - Hiển thị đầy đủ: Ngân hàng, Số tài khoản, Chủ tài khoản
   - Hiển thị mã QR code
   - Cảnh báo: Chuyển đúng số tiền
   - Nút "Tiếp tục tải bill"

4. **Tải ảnh bill/chứng chỉ chuyển khoản**
   - Upload ảnh chứng chỉ chuyển khoản
   - Xem trước ảnh

5. **Xác nhận toàn bộ thông tin**
   - Xem lại: Gói, thông tin chuyển khoản, ảnh bill
   - Nút "Gửi yêu cầu"

6. **Admin duyệt yêu cầu**
   - Xem ảnh bill (fullscreen + download)
   - Nhập số ngày + số câu hỏi
   - Xác nhận duyệt → Tự động:
     - Cộng bonus_questions
     - Set plan_expires_at
     - Cập nhật status = "approved"

7. **User nhận được câu hỏi bonus + gia hạn plan**

### Luồng Cài đặt Admin:
1. Admin đặt giới hạn câu hỏi/ngày mặc định
2. Nhấn "Lưu cài đặt"
3. Tự động cập nhật tất cả người dùng (cũ + mới)

## 7. Tệp thay đổi

### Files được tạo mới:
- `src/components/admin/BillReviewModal.tsx`
- `src/components/chat/QrFullscreenViewer.tsx`
- `supabase/migrations/20260115_add_bill_image_to_payment_requests.sql`

### Files được chỉnh sửa:
- `src/components/payment/PaymentModal.tsx`
- `src/pages/Admin.tsx`

## 8. Hướng dẫn sử dụng

### Cho User:
1. Mua lượt hỏi → Tải ảnh bill chuyển khoản → Gửi yêu cầu
2. Xem QR code: Click vào ảnh QR để fullscreen + download

### Cho Admin:
1. **Tab Settings**: Đặt giới hạn câu hỏi/ngày → Tất cả users sẽ được cập nhật
2. **Tab Requests**: 
   - Click thumbnail bill để xem chi tiết
   - Nhập số ngày + số câu hỏi
   - Duyệt hoặc từ chối
3. **Tab Users**: Xem danh sách chính xác (email, limit, remaining)
