USE `auth_demo`;

-- 1. Xóa dữ liệu cũ của các bảng liên quan đến đơn hàng
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `order_reviews`;
TRUNCATE TABLE `order_transactions`;
TRUNCATE TABLE `order_status_history`;
TRUNCATE TABLE `order_items`;
TRUNCATE TABLE `orders`;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- 2. TẠO 4 ĐƠN HÀNG ĐẠI DIỆN CHO 4 TRẠNG THÁI (user_id = 2)
-- =========================================================================
INSERT INTO `orders` (
  `id`, 
  `order_code`, 
  `user_id`, 
  `customer_name`, 
  `customer_phone`, 
  `customer_email`, 
  `total_amount`, 
  `payment_method`, 
  `payment_status`, 
  `order_status`, 
  `execution_time`, 
  `completed_at`, 
  `cancelled_at`, 
  `cancel_reason`, 
  `event_location`, 
  `note`, 
  `created_at`
) VALUES 
-- [ĐƠN 1]: CHỜ THANH TOÁN (Đối tác đã duyệt, chờ khách quét VietQR)
(
  1, 
  'ORD-2026-001', 
  2, 
  'Nguyễn Văn Khách', 
  '0900000002', 
  'customer@gmail.com', 
  4800000, 
  'bank_transfer', 
  'pending', 
  'pending_payment', 
  '14:00 ngày 28/10/2026', 
  NULL, 
  NULL, 
  NULL, 
  'Tầng 3, TTTM Vincom Thủ Đức, TP. Hồ Chí Minh', 
  'Bố trí không gian tone màu pastel ấm cúng, chuẩn bị đôn bánh kem trước 1 tiếng.', 
  '2026-10-21 10:15:00'
),

-- [ĐƠN 2]: ĐÃ THANH TOÁN / ĐANG THỰC HIỆN THI CÔNG (Đã xác nhận & tiền đã vào)
(
  2, 
  'ORD-2026-002', 
  2, 
  'Nguyễn Văn Khách', 
  '0900000002', 
  'customer@gmail.com', 
  8900000, 
  'bank_transfer', 
  'paid', 
  'processing', 
  '07:30 ngày 26/10/2026', 
  NULL, 
  NULL, 
  NULL, 
  'Tòa nhà Deutsches Haus, 33 Lê Duẩn, Quận 1, TP. Hồ Chí Minh', 
  'Thi công photobooth bạt hiflex xám chống lóa cao cấp, trải thảm đỏ đón đoàn khách VIP.', 
  '2026-10-20 09:00:00'
),

-- [ĐƠN 3]: ĐÃ HOÀN THÀNH (Đã nghiệm thu, trong hạn 30 ngày để đánh giá)
(
  3, 
  'ORD-2026-003', 
  2, 
  'Nguyễn Văn Khách', 
  '0900000002', 
  'customer@gmail.com', 
  12500000, 
  'bank_transfer', 
  'paid', 
  'done', 
  '09:00 ngày 15/10/2026', 
  '2026-10-15 17:30:00', 
  NULL, 
  NULL, 
  'White Palace, 194 Hoàng Văn Thụ, Phường 9, Q. Phú Nhuận, TP. Hồ Chí Minh', 
  'Hôn lễ tổ chức thành công, hoa tươi tone trắng xanh được bàn giao đúng giờ thỏa thuận.', 
  '2026-10-10 08:30:00'
),

-- [ĐƠN 4]: ĐÃ HỦY (Khách đã hủy bỏ đơn)
(
  4, 
  'ORD-2026-004', 
  2, 
  'Nguyễn Văn Khách', 
  '0900000002', 
  'customer@gmail.com', 
  3500000, 
  'bank_transfer', 
  'refunded', 
  'cancelled', 
  '08:00 ngày 18/10/2026', 
  NULL, 
  '2026-10-12 14:20:00', 
  'Gia đình thay đổi thời gian tổ chức tiệc sang tháng sau.', 
  'Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh', 
  'Yêu cầu hủy lịch và hoàn trả cọc theo quy định thỏa thuận.', 
  '2026-10-11 16:00:00'
);

-- =========================================================================
-- 3. CHI TIẾT DỊCH VỤ ĐƠN HÀNG (ORDER_ITEMS)
-- =========================================================================
INSERT INTO `order_items` (
  `order_id`, 
  `service_id`, 
  `service_name`, 
  `partner_id`, 
  `partner_name`, 
  `price`, 
  `scale`, 
  `event_title`, 
  `selected_options`
) VALUES 
(
  1, 
  'SRV-103', 
  'Sân Khấu Bong Bóng Nghệ Thuật & Neon LED Sinh Nhật', 
  2, 
  'Sự Kiện Sáng Tạo Beta', 
  4800000, 
  'Quy mô vừa (100 - 250 khách)', 
  'Thôi Nôi Bé Bảo Nam (1 Tuổi)', 
  'Uốn chữ Neon theo tên riêng của bé, Gói máy thổi bong bóng xà phòng tự động'
),
(
  2, 
  'SRV-104', 
  'Sự Kiện Doanh Nghiệp: Photobooth & Khai Trương Trọn Gói', 
  2, 
  'Sự Kiện Sáng Tạo Beta', 
  8900000, 
  'Quy mô tiêu chuẩn (Dưới 100 khách)', 
  'Lễ Ra Mắt Giải Pháp Công Nghệ 2026', 
  'Bảng Formex dán decal cán màng mờ tạo khối 3D, Hệ thống 4 đèn Par LED sân khấu'
),
(
  3, 
  'SRV-101', 
  'Gói Trang Trí Tiệc Cưới Phong Cách Tối Giản VIP', 
  1, 
  'Công ty TNHH Nghệ Thuật Alpha', 
  12500000, 
  'Quy mô lớn (Trên 250 khách)', 
  'Hôn Lễ: Minh Quân & Nhã Trúc', 
  'Tone Trắng Tinh Khôi - Xanh Pastel (Cơ bản), Nâng cấp kết hợp 50% hoa tươi theo mùa, Bàn đón khách Gallery pha lê'
),
(
  4, 
  'SRV-102', 
  'Lễ Ăn Hỏi Gia Tiên Truyền Thống Tone Pastel', 
  1, 
  'Công ty TNHH Nghệ Thuật Alpha', 
  3500000, 
  'Quy mô nhỏ (Dưới 100 khách)', 
  'Lễ Vu Quy: Thanh Tùng & Thu Thảo', 
  'Ghế Tiffany thắt nơ lụa tiêu chuẩn, Bộ khay pha lê cao cấp dát vàng Hoàng Gia'
);

-- =========================================================================
-- 4. LỊCH SỬ TIẾN TRÌNH 4 GIAI ĐOẠN (ORDER_STATUS_HISTORY)
-- =========================================================================
INSERT INTO `order_status_history` (
  `order_id`, 
  `from_status`, 
  `to_status`, 
  `note`, 
  `changed_by`, 
  `created_at`
) VALUES 
-- Tiến trình Đơn 1 (Chờ thanh toán)
(1, NULL, 'pending_partner', 'Khách hàng xác thực OTP và gửi đơn đặt chỗ', 'customer', '2026-10-21 10:15:00'),
(1, 'pending_partner', 'pending_payment', 'Đối tác Beta duyệt lịch thành công, đang chờ khách quét mã VietQR', 'partner', '2026-10-21 11:00:00'),

-- Tiến trình Đơn 2 (Đang thực hiện thi công)
(2, NULL, 'pending_partner', 'Khách hàng xác thực OTP và gửi đơn đặt chỗ', 'customer', '2026-10-20 09:00:00'),
(2, 'pending_partner', 'pending_payment', 'Đối tác Beta duyệt tiếp nhận hợp đồng', 'partner', '2026-10-20 09:30:00'),
(2, 'pending_payment', 'processing', 'Hệ thống xác thực chuyển khoản VietQR thành công, kích hoạt thi công', 'system', '2026-10-20 09:45:00'),

-- Tiến trình Đơn 3 (Đã hoàn thành)
(3, NULL, 'pending_partner', 'Khách hàng xác thực OTP và gửi đơn đặt chỗ', 'customer', '2026-10-10 08:30:00'),
(3, 'pending_partner', 'pending_payment', 'Đối tác Alpha duyệt lịch thi công', 'partner', '2026-10-10 09:00:00'),
(3, 'pending_payment', 'processing', 'Khách thanh toán 100% hợp đồng qua VietQR', 'system', '2026-10-10 09:15:00'),
(3, 'processing', 'done', 'Bàn giao nghiệm thu sảnh tiệc hoàn tất trước giờ khai tiệc', 'partner', '2026-10-15 17:30:00'),

-- Tiến trình Đơn 4 (Đã hủy)
(4, NULL, 'pending_partner', 'Khách hàng xác thực OTP và gửi đơn đặt chỗ', 'customer', '2026-10-11 16:00:00'),
(4, 'pending_partner', 'cancelled', 'Gia đình thay đổi thời gian tổ chức tiệc sang tháng sau.', 'customer', '2026-10-12 14:20:00');

-- =========================================================================
-- 5. LỊCH SỬ GIAO DỊCH VIETQR (ORDER_TRANSACTIONS)
-- =========================================================================
INSERT INTO `order_transactions` (
  `order_id`, 
  `transaction_code`, 
  `amount`, 
  `payment_type`, 
  `bank_code`, 
  `status`, 
  `paid_at`, 
  `created_at`
) VALUES 
-- Giao dịch Đơn 2 (Đã trả)
(2, 'TXN-20261020-002', 8900000, 'full', 'MBBANK', 'success', '2026-10-20 09:45:00', '2026-10-20 09:40:00'),

-- Giao dịch Đơn 3 (Đã trả)
(3, 'TXN-20261010-003', 12500000, 'full', 'VIETCOMBANK', 'success', '2026-10-10 09:15:00', '2026-10-10 09:10:00'),

-- Giao dịch Đơn 4 (Đã hoàn tiền sau khi hủy)
(4, 'REF-20261012-004', 3500000, 'refund', 'TECHCOMBANK', 'success', '2026-10-13 10:00:00', '2026-10-12 15:00:00');
