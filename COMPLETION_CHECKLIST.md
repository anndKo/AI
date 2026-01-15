# Danh Sách Kiểm Tra Các Tính Năng Hoàn Thành

## ✅ 1. Người dùng gửi yêu cầu thanh toán với ảnh bill
- [x] Người dùng chọn gói thanh toán
- [x] Người dùng tải ảnh bill/chứng chỉ chuyển khoản
- [x] Kiểm tra loại file và kích thước ảnh
- [x] Yêu cầu ảnh bắt buộc trước khi gửi
- [x] Lưu ảnh vào Supabase Storage
- [x] Gửi yêu cầu với bill_image URL

**File**: `src/components/payment/PaymentModal.tsx`

## ✅ 2. Admin duyệt bill với luồng xác nhận/từ chối
- [x] Xem ảnh bill trong Admin panel
- [x] Click vào ảnh để xem toàn màn hình
- [x] Nhập số ngày gia hạn (để hạn sử dụng)
- [x] Nhập số lượt hỏi (câu hỏi được cấp)
- [x] Nút "Duyệt" tự động:
  - [x] Cập nhật status = "approved"
  - [x] Thêm bonus_questions cho user
  - [x] Cập nhật plan_expires_at
- [x] Nút "Từ chối" với lý do
- [x] Xem thông tin thanh toán (số tiền, số câu, ngày gửi)

**File**: `src/components/admin/BillReviewModal.tsx`

## ✅ 3. Admin cài đặt số câu hỏi/ngày áp dụng cho tất cả
- [x] Tab "Settings" - Cài đặt chung
- [x] Nhập giới hạn câu hỏi/ngày mặc định
- [x] Khi lưu, tự động cập nhật ALL users:
  - [x] Cập nhật app_settings
  - [x] Cập nhật user_quotas.daily_limit cho tất cả user
  - [x] Toast thông báo kết quả
- [x] Hàm `updateUserQuota()` xử lý properly:
  - [x] Nếu update daily_limit → cập nhật tất cả
  - [x] Nếu update field khác → chỉ update user đó

**File**: `src/pages/Admin.tsx` - Function `saveSettings()` và `updateUserQuota()`

## ✅ 4. Người dùng bấm vào ảnh QR → fullscreen + download
- [x] Click vào QR code mở fullscreen viewer
- [x] Hiển thị toàn màn hình (95vh)
- [x] Nút "Tải về" để download QR
- [x] Nút "X" để đóng
- [x] Nền đen để dễ quan sát
- [x] Tích hợp vào PaymentModal

**File**: 
- `src/components/chat/QrFullscreenViewer.tsx` (component mới)
- `src/components/payment/PaymentModal.tsx` (tích hợp)

## ✅ 5. Tab "Người dùng" (Users) hiển thị danh sách chính xác
- [x] Cột "Email": Email của user
- [x] Cột "Giới hạn/ngày": Daily limit hiện tại
- [x] Cột "Số lượt hỏi còn lại": 
  - [x] Tính toán: daily_limit - questions_used_today + bonus_questions
  - [x] Hiển thị màu đỏ nếu ≤ 0
- [x] Cột "Hôm nay": questions_used_today/daily_limit
- [x] Nút "Reset": Reset counter hôm nay

**File**: `src/pages/Admin.tsx` - TabsContent "users"

## ✅ 6. Database migrations
- [x] Thêm column `bill_image` vào payment_requests
- [x] Thêm column `approved_at` vào payment_requests
- [x] Thêm column `approved_days` vào payment_requests
- [x] Thêm column `approved_questions` vào payment_requests
- [x] Thêm column `rejection_reason` vào payment_requests
- [x] Tạo index cho status và user_id

**File**: `supabase/migrations/20260115051054_add_bill_fields.sql`

## ✅ 7. Không có lỗi TypeScript
- [x] Tất cả imports đúng
- [x] Props types định nghĩa chính xác
- [x] Không có undefined errors
- [x] Build sạch không có warning

## ✅ 8. Components được tạo/chỉnh sửa
### Tạo mới:
- [x] `src/components/admin/BillReviewModal.tsx`
- [x] `src/components/chat/QrFullscreenViewer.tsx`
- [x] `supabase/migrations/20260115051054_add_bill_fields.sql`
- [x] `IMPLEMENTATION_GUIDE.md`

### Chỉnh sửa:
- [x] `src/components/payment/PaymentModal.tsx`
  - [x] Thêm upload ảnh bill
  - [x] Tích hợp QrFullscreenViewer
  - [x] Update request data structure
- [x] `src/pages/Admin.tsx`
  - [x] Import BillReviewModal
  - [x] Tab requests hiển thị bill
  - [x] Tab users hiển thị chính xác
  - [x] Update saveSettings() để apply cho tất cả
  - [x] Update updateUserQuota() logic
  - [x] Thêm openBillReview() function
  - [x] Thêm handleBillApprovalComplete() function

## Hướng dẫn Test

### Từ phía Người dùng:
1. Vào tab "Mua thêm lượt hỏi"
2. Chọn gói → Chuyển khoản → Tải ảnh bill
3. Click vào QR code → Fullscreen + tải về
4. Gửi yêu cầu

### Từ phía Admin:
1. Vào Admin → Tab "Yêu cầu"
2. Click ảnh bill hoặc nút "Duyệt"
3. Xem chi tiết → Nhập ngày + câu hỏi → Duyệt
4. Hoặc từ chối với lý do
5. Kiểm tra Tab "Người dùng" → Xem danh sách chính xác
6. Tab "Cài đặt" → Thay đổi giới hạn → Tất cả users được update

## Trạng thái cuối cùng
✅ Tất cả yêu cầu đã được hoàn thành
✅ Không có lỗi TypeScript
✅ Các components được tích hợp đúng
✅ Database schema được chuẩn bị
