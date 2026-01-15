# 🎨 Quy Trình Thanh Toán - Diagram & Visual Guide

## 📊 Flowchart - Quy Trình Mới

```
                         ┌─────────────────┐
                         │   Ứng Dụng Mở   │
                         └────────┬────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │  Bấm: Mua Thêm Lượt Hỏi   │
                    └────────────┬──────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │  📋 Bước 1: Chọn Gói         │
                 │  ✓ Xem danh sách gói         │
                 │  ✓ Chọn gói phù hợp         │
                 │  ✓ Click chọn               │
                 └───────────────┬───────────────┘
                                 │
    ┌────────────────────────────▼────────────────────────────┐
    │  💳 Bước 2: XEM THÔNG TIN CHUYỂN KHOẢN ⭐ (MỚI)       │
    │                                                          │
    │  ┌───────────────────────────────────────┐              │
    │  │ Thông tin chuyển khoản:               │              │
    │  │ • Ngân hàng: Vietcombank              │              │
    │  │ • Số TK: 1234567890                   │              │
    │  │ • Chủ TK: Nguyễn Văn A                │              │
    │  │                                       │              │
    │  │ • Mã QR: [QR CODE IMAGE]              │              │
    │  │         (Click → Fullscreen)          │              │
    │  └───────────────────────────────────────┘              │
    │                                                          │
    │  ⚠️  Cảnh báo: Chuyển đúng 50.000 VND để dễ xác minh   │
    │                                                          │
    │  [Huỷ]  [Tiếp tục tải bill]                           │
    └────────────────────────┬─────────────────────────────┘
                             │
                             │ (User xác nhận, bấm Tiếp tục)
                             │
                 ┌───────────▼───────────┐
                 │  📸 Bước 3: Tải Bill  │
                 │  ✓ Upload ảnh bill    │
                 │  ✓ Xem trước ảnh      │
                 │  ✓ Chọn ảnh khác      │
                 │                       │
                 │  [Huỷ]  [Tiếp tục]   │
                 └───────────┬───────────┘
                             │
                             │
                 ┌───────────▼──────────────┐
                 │  ✅ Bước 4: Xác Nhận    │
                 │                         │
                 │  Gói: [gói đã chọn]    │
                 │  💳 Ngân hàng           │
                 │  Số TK, Chủ TK         │
                 │  📸 Ảnh bill          │
                 │                        │
                 │  [Quay lại] [Gửi]    │
                 └───────────┬──────────┘
                             │
                    ┌────────▼─────────┐
                    │  📤 Gửi Yêu Cầu  │
                    │  Status: PENDING  │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐         ┌────▼────┐
   │ Hoàn tác │          │ Chờ Duyệt        │ Timeout  │
   │(Cancel)  │          │(30m - 2h)        │(Expired) │
   └─────────┘          └────┬────┘         └────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼──────┐       ┌────▼─────┐       ┌────▼──────┐
   │ ✅ Duyệt   │       │ ❌ Từ Chối │      │ ⏰ Timeout │
   │ +Bonus Q   │       │ +Reason    │      │ Resubmit   │
   │ +Gia Hạn   │       │ Resubmit   │      │            │
   └────────────┘       └────────────┘      └────────────┘
        │
   ✅ Hoàn Tất
   • Nhận câu hỏi bonus
   • Thời gian gia hạn
   • Tiếp tục sử dụng
```

---

## 🖼️ UI Components

### **Modal: Bước 1 - Chọn Gói**

```
┌──────────────────────────────────────────┐
│ 💳 Mua thêm lượt hỏi                    │
│ Chọn gói phù hợp với nhu cầu của bạn    │
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐│
│ │ 📦 Gói Basic                         ││
│ │ 50 câu hỏi                           ││
│ │ Giá: 25.000 VND                      ││
│ │ Hôm nay                              ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌──────────────────────────────────────┐│
│ │ 📦 Gói Standard                      ││
│ │ 100 câu hỏi                          ││
│ │ Giá: 50.000 VND                      ││
│ │ 30 ngày                              ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌──────────────────────────────────────┐│
│ │ 📦 Gói Premium                       ││
│ │ 300 câu hỏi                          ││
│ │ Giá: 120.000 VND                     ││
│ │ 90 ngày                              ││
│ └──────────────────────────────────────┘│
│                                          │
└──────────────────────────────────────────┘
```

### **Modal: Bước 2 - Thông Tin Chuyển Khoản** ⭐ NEW

```
┌──────────────────────────────────────────────┐
│ 💳 Thông tin chuyển khoản                   │
│ Vui lòng xác nhận thông tin chuyển khoản    │
├──────────────────────────────────────────────┤
│                                              │
│ ┌────────────────────────────────────────┐  │
│ │ Gói đã chọn: Gói Standard              │  │
│ │ Số câu hỏi: 100                        │  │
│ │ Số tiền: 50.000 VND                    │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │  💳 THÔNG TIN CHUYỂN KHOẢN              │ │
│ │  ───────────────────────────────────    │ │
│ │  Ngân hàng:        Vietcombank          │ │
│ │  Số tài khoản:     1234567890           │ │
│ │  Chủ tài khoản:    Nguyễn Văn A         │ │
│ │                                         │ │
│ │  ┌─────────────────────────────────┐   │ │
│ │  │                                 │   │ │
│ │  │         [  QR CODE IMAGE  ]     │   │ │
│ │  │    (Click để xem toàn màn hình) │   │ │
│ │  │                                 │   │ │
│ │  └─────────────────────────────────┘   │ │
│ │                                         │ │
│ │  ⚠️  Lưu ý: Vui lòng chuyển khoản      │ │
│ │     chính xác số tiền 50.000 VND        │ │
│ │     để dễ dàng xác minh                 │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ [Huỷ]                [Tiếp tục tải bill]   │
│                                              │
└──────────────────────────────────────────────┘
```

### **Modal: Bước 3 - Tải Bill**

```
┌──────────────────────────────────────────┐
│ 📸 Tải ảnh bill                         │
│ Tải ảnh bill/chứng chỉ chuyển khoản     │
├──────────────────────────────────────────┤
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Gói đã chọn: Gói Standard          │  │
│ │ Số câu hỏi: 100                    │  │
│ │ Số tiền: 50.000 VND                │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Tải ảnh bill/Chứng chỉ chuyển khoản     │
│ Tải ảnh screenshot hoặc ảnh bill...     │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │   📁                               │  │
│ │   Bấm để chọn ảnh                 │  │
│ │                                    │  │
│ │   Hỗ trợ JPG, PNG. Tối đa 5MB    │  │
│ └────────────────────────────────────┘  │
│                                          │
│ [Huỷ]                          [Tiếp tục] │
│                                          │
└──────────────────────────────────────────┘

                    ↓ (sau khi upload)

┌──────────────────────────────────────────┐
│ 📸 Tải ảnh bill                         │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ ┌─ [Ảnh Bill Preview]          ──┐ │  │
│ │ │  [████████████████]            │ │  │
│ │ │  Chứng chỉ chuyển khoản        │ │  │
│ │ │  Số tiền: 50.000 VND          │ │  │
│ │ └────────────────────────────────┘ │  │
│ │                                     │  │
│ │      [Chọn ảnh khác]               │  │
│ └────────────────────────────────────┘  │
│                                          │
│ [Huỷ]                          [Tiếp tục] │
│                                          │
└──────────────────────────────────────────┘
```

### **Modal: Bước 4 - Xác Nhận** ✅

```
┌────────────────────────────────────────────┐
│ ✅ Xác nhận thông tin                      │
│ Chuyển khoản và xác nhận để được duyệt    │
├────────────────────────────────────────────┤
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ ✅ Xác nhận thông tin               │  │
│ │ Gói: Gói Standard                   │  │
│ │ Số câu hỏi: 100                     │  │
│ │ Số tiền: 50.000 VND                 │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ 💳 Đã xác nhận chuyển khoản tới:    │  │
│ │ Ngân hàng: Vietcombank              │  │
│ │ Số TK: 1234567890                   │  │
│ │ Chủ TK: Nguyễn Văn A                │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ 📸 Ảnh bill đã tải:                 │  │
│ │  [████ Thumbnail ảnh bill ████]    │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ ✓ Tất cả thông tin đã sẵn sàng.     │  │
│ │   Bấm "Gửi yêu cầu" để hoàn tất.   │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ [Quay lại]                  [Gửi yêu cầu] │
│                                            │
└────────────────────────────────────────────┘
```

---

## 📱 Mobile View

```
┌──────────────────┐
│ ← | Mua thêm   │
├──────────────────┤
│                  │
│  💳 THÔNG TIN    │
│  CHUYỂN KHOẢN    │
│                  │
│  Ngân hàng:      │
│  Vietcombank     │
│                  │
│  Số TK:          │
│  1234567890      │
│                  │
│  Chủ TK:         │
│  Nguyễn Văn A    │
│                  │
│  ┌────────────┐  │
│  │            │  │
│  │ [QR Code]  │  │
│  │            │  │
│  └────────────┘  │
│  (Click fullscreen)
│                  │
│  ⚠️  Chuyển      │
│  50.000 VND      │
│                  │
│ [Huỷ] [Tiếp tục]│
│                  │
└──────────────────┘
```

---

## 🎯 Color Scheme

### **Transfer Info Step**
- **Background**: `bg-blue-50` / `dark:bg-blue-950/30`
- **Border**: `border-blue-200` / `dark:border-blue-800`
- **Text**: `text-blue-900` / `dark:text-blue-100`
- **Icon**: 💳 (Credit Card)

### **Confirm Step**
- **Background**: `bg-green-50` / `dark:bg-green-950/30`
- **Border**: `border-green-200` / `dark:border-green-800`
- **Text**: `text-green-800` / `dark:text-green-200`
- **Icon**: ✅ (Check Mark)

### **Warning**
- **Background**: `bg-amber-100` / `dark:bg-amber-950/30`
- **Border**: `border-amber-300` / `dark:border-amber-700`
- **Text**: `text-amber-900` / `dark:text-amber-200`
- **Icon**: ⚠️ (Warning)

---

## 🔐 Data Flow

```
User Input
   ↓
┌──────────────────┐
│ Transfer Info    │ ← Fetch từ app_settings
│ (bank_name,      │   payment_info key
│  account_number, │
│  account_name,   │
│  qr_image)       │
└────────┬─────────┘
         │
      Hiển thị
         │
      Xác nhận
         │
    Upload ảnh bill
         │
    Confirm + Gửi yêu cầu
         │
    Tạo payment_request
    + bill_image URL
    + status: 'pending'
         │
      Admin duyệt
         │
    Update status
    + bonus_questions
    + plan_expires_at
         │
      Hoàn tất
```

---

## ✨ Key Features

| Tính năng | Mô tả | Status |
|-----------|-------|--------|
| Hiển thị ngân hàng | Tên ngân hàng nhận tiền | ✅ |
| Hiển thị số TK | Số tài khoản chính xác | ✅ |
| Hiển thị chủ TK | Tên chủ tài khoản | ✅ |
| Mã QR Code | Scan hoặc download | ✅ |
| Fullscreen QR | Click QR → Xem toàn màn hình | ✅ |
| Cảnh báo số tiền | Nhắc nhở số tiền chính xác | ✅ |
| Xác nhận lại | Hiển thị lại ở step confirm | ✅ |
| Responsive | Hoạt động trên mobile/desktop | ✅ |
| Dark mode | Hỗ trợ dark mode | ✅ |

---

**Cập nhật**: 15/01/2026
**Version**: 2.0
