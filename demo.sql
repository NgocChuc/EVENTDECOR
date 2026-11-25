SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `auth_demo` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `auth_demo`;

DROP TABLE IF EXISTS `order_reviews`;
DROP TABLE IF EXISTS `order_transactions`;
DROP TABLE IF EXISTS `order_status_history`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `partners`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT '0900000002',
  `address` VARCHAR(255) DEFAULT 'TP. Hồ Chí Minh',
  `role` VARCHAR(50) NOT NULL DEFAULT 'customer',
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `email_verified` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `partners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `image` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `address` VARCHAR(255) NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(150) NULL,
  `rating` DECIMAL(2,1) DEFAULT 5.0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `services` (
  `id` VARCHAR(50) PRIMARY KEY,
  `partner_id` INT NULL,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `image` VARCHAR(255) NOT NULL,
  `short_description` VARCHAR(500) NULL,
  `description` LONGTEXT NULL,
  `status` VARCHAR(50) DEFAULT 'available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_code` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `customer_email` VARCHAR(100) NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(50) DEFAULT 'bank_transfer',
  `payment_status` VARCHAR(50) DEFAULT 'pending',
  `order_status` VARCHAR(50) DEFAULT 'pending_payment',
  `execution_time` VARCHAR(100) DEFAULT 'Thỏa thuận sau',
  `completed_at` DATETIME NULL,
  `cancelled_at` DATETIME NULL,
  `cancel_reason` TEXT NULL,
  `event_location` VARCHAR(255) NULL,
  `note` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `service_id` VARCHAR(50) NULL,
  `service_name` VARCHAR(255) NOT NULL,
  `partner_id` INT NULL,
  `partner_name` VARCHAR(255) NULL,
  `price` DECIMAL(12,2) NOT NULL,
  `scale` VARCHAR(100) DEFAULT 'Tiêu chuẩn',
  `event_title` VARCHAR(255) NULL,
  `selected_options` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_status_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `from_status` VARCHAR(50) NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `note` TEXT NULL,
  `changed_by` VARCHAR(50) DEFAULT 'customer',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `transaction_code` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_type` VARCHAR(50) DEFAULT 'bank_transfer',
  `bank_code` VARCHAR(50) DEFAULT 'VIETCOMBANK',
  `status` VARCHAR(50) DEFAULT 'success',
  `paid_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `service_id` VARCHAR(50) NULL,
  `user_id` INT NOT NULL,
  `rating` INT DEFAULT 5,
  `comment` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`id`, `username`, `email`, `password`, `phone`, `address`, `role`, `status`, `email_verified`) VALUES
(1, 'Admin', 'admin@gmail.com', '$2a$10$wTqKxL95v8wT8.Psp2Y66.zUfq/e0R9q9JqLpGqCq1Ym6FkX5vJ4a', '0909999888', 'TP. Hồ Chí Minh', 'admin', 'active', TRUE),
(2, 'Nguyễn Văn Khách', 'user@gmail.com', '$2a$10$wTqKxL95v8wT8.Psp2Y66.zUfq/e0R9q9JqLpGqCq1Ym6FkX5vJ4a', '0900000002', 'Tầng 3, Vincom Thủ Đức, TP. Hồ Chí Minh', 'customer', 'active', TRUE),
(3, 'Nguyễn Đăng Khoa', 'ndk@gmail.com', 'pun', '0901234567', 'TP. Hồ Chí Minh', 'customer', 'active', TRUE);

INSERT INTO `partners` (`id`, `name`, `image`, `description`, `address`, `phone`, `email`) VALUES
(1, 'Công ty TNHH Nghệ Thuật Alpha', '/img/partners/partydesn.png', 'Đơn vị tổ chức tiệc cưới và sự kiện nghệ thuật cao cấp', 'TP. Hồ Chí Minh', '0901112222', 'alpha@eventdecor.vn'),
(2, 'Sự Kiện Sáng Tạo Beta', '/img/partners/hoabinh.png', 'Chuyên gia setup photobooth, bong bóng nghệ thuật và khai trương', 'TP. Hồ Chí Minh', '0903334444', 'beta@eventdecor.vn');

INSERT INTO `services` (`id`, `partner_id`, `name`, `price`, `image`, `short_description`) VALUES
('SRV-101', 1, 'Gói Trang Trí Tiệc Cưới Phong Cách Tối Giản VIP', 12500000.00, '/img/wedding.png', 'Tone Trắng Tinh Khôi - Xanh Pastel kết hợp 50% hoa tươi theo mùa.'),
('SRV-102', 1, 'Lễ Ăn Hỏi Gia Tiên Truyền Thống Tone Pastel', 3500000.00, '/img/wedding.png', 'Ghế Tiffany thắt nơ lụa, bộ khay pha lê cao cấp dán chữ song hỷ.'),
('SRV-103', 2, 'Sân Khấu Bong Bóng Nghệ Thuật & Neon LED Sinh Nhật', 4800000.00, '/img/birthday.png', 'Uốn chữ Neon theo tên bé, máy thổi bong bóng tự động.'),
('SRV-104', 2, 'Sự Kiện Doanh Nghiệp: Photobooth & Khai Trương Trọn Gói', 8900000.00, '/img/HBGevent.png', 'Bảng Formex dán decal cán màng mờ tạo khối 3D, 4 đèn Par LED sân khấu.');

INSERT INTO `orders` (
  `id`, `order_code`, `user_id`, `customer_name`, `customer_phone`, `customer_email`,
  `total_amount`, `payment_method`, `payment_status`, `order_status`, `execution_time`,
  `completed_at`, `cancelled_at`, `cancel_reason`, `event_location`, `note`, `created_at`
) VALUES 
(
  1, 'ORD-2026-001', 2, 'Nguyễn Văn Khách', '0900000002', 'user@gmail.com',
  4800000.00, 'bank_transfer', 'pending', 'pending_payment', '14:00 ngày 28/11/2026',
  NULL, NULL, NULL, 'Tầng 3, TTTM Vincom Thủ Đức, TP. Hồ Chí Minh',
  'Bố trí không gian tone màu pastel ấm cúng, chuẩn bị đôn bánh kem trước 1 tiếng.', '2026-11-20 10:15:00'
),
(
  2, 'ORD-2026-002', 2, 'Nguyễn Văn Khách', '0900000002', 'user@gmail.com',
  8900000.00, 'bank_transfer', 'paid', 'processing', '07:30 ngày 29/11/2026',
  NULL, NULL, NULL, 'Tòa nhà Deutsches Haus, 33 Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
  'Thi công photobooth bạt hiflex xám chống lóa cao cấp, trải thảm đỏ đón khách VIP.', '2026-11-21 09:00:00'
),
(
  3, 'ORD-2026-003', 2, 'Nguyễn Văn Khách', '0900000002', 'user@gmail.com',
  12500000.00, 'bank_transfer', 'paid', 'done', '09:00 ngày 15/11/2026',
  '2026-11-15 17:30:00', NULL, NULL, 'White Palace, 194 Hoàng Văn Thụ, Phường 9, Q. Phú Nhuận',
  'Hôn lễ tổ chức thành công, hoa tươi tone trắng xanh được bàn giao đúng giờ thỏa thuận.', '2026-11-10 08:30:00'
),
(
  4, 'ORD-2026-004', 2, 'Nguyễn Văn Khách', '0900000002', 'user@gmail.com',
  3500000.00, 'bank_transfer', 'refunded', 'cancelled', '08:00 ngày 18/11/2026',
  NULL, '2026-11-12 14:20:00', 'Gia đình thay đổi thời gian tổ chức tiệc sang tháng sau.',
  'Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
  'Yêu cầu hủy lịch và hoàn trả cọc theo quy định thỏa thuận.', '2026-11-11 16:00:00'
);

INSERT INTO `order_items` (`order_id`, `service_id`, `service_name`, `partner_id`, `partner_name`, `price`, `scale`, `event_title`, `selected_options`) VALUES
(1, 'SRV-103', 'Sân Khấu Bong Bóng Nghệ Thuật & Neon LED Sinh Nhật', 2, 'Sự Kiện Sáng Tạo Beta', 4800000.00, 'Quy mô vừa (100 - 250 khách)', 'Thôi Nôi Bé Bảo Nam (1 Tuổi)', 'Uốn chữ Neon theo tên bé, Gói máy thổi bong bóng xà phòng tự động'),
(2, 'SRV-104', 'Sự Kiện Doanh Nghiệp: Photobooth & Khai Trương Trọn Gói', 2, 'Sự Kiện Sáng Tạo Beta', 8900000.00, 'Quy mô tiêu chuẩn (Dưới 100 khách)', 'Lễ Ra Mắt Giải Pháp Công Nghệ 2026', 'Bảng Formex dán decal cán màng mờ tạo khối 3D, Hệ thống 4 đèn Par LED sân khấu'),
(3, 'SRV-101', 'Gói Trang Trí Tiệc Cưới Phong Cách Tối Giản VIP', 1, 'Công ty TNHH Nghệ Thuật Alpha', 12500000.00, 'Quy mô lớn (Trên 250 khách)', 'Hôn Lễ: Minh Quân & Nhã Trúc', 'Tone Trắng Tinh Khôi - Xanh Pastel kết hợp 50% hoa tươi theo mùa, Bàn đón khách Gallery pha lê'),
(4, 'SRV-102', 'Lễ Ăn Hỏi Gia Tiên Truyền Thống Tone Pastel', 1, 'Công ty TNHH Nghệ Thuật Alpha', 3500000.00, 'Quy mô nhỏ (Dưới 100 khách)', 'Lễ Vu Quy: Thanh Tùng & Thu Thảo', 'Ghế Tiffany thắt nơ lụa tiêu chuẩn, Bộ khay pha lê cao cấp dát vàng Hoàng Gia');

INSERT INTO `order_status_history` (`order_id`, `from_status`, `to_status`, `note`, `changed_by`, `created_at`) VALUES
(1, 'pending_partner', 'pending_payment', 'Đối tác đã xác nhận nhận lịch và thống nhất chi phí thi công.', 'partner', '2026-11-20 11:00:00'),
(2, 'pending_payment', 'processing', 'Hệ thống đã nhận thanh toán 100% qua VietQR. Ekip đang chuẩn bị vật tư thi công.', 'system', '2026-11-21 09:30:00'),
(3, 'processing', 'done', 'Bàn giao mặt bằng hoàn thiện và ký biên bản nghiệm thu sự kiện.', 'partner', '2026-11-15 17:30:00'),
(4, 'pending_payment', 'cancelled', 'Gia đình thay đổi thời gian tổ chức tiệc sang tháng sau.', 'customer', '2026-11-12 14:20:00');

INSERT INTO `order_transactions` (`order_id`, `transaction_code`, `amount`, `payment_type`, `bank_code`, `status`, `paid_at`, `created_at`) VALUES
(2, 'TXN-2026-002', 8900000.00, 'vietqr', 'VIETCOMBANK', 'success', '2026-11-21 09:30:00', '2026-11-21 09:30:00'),
(3, 'TXN-2026-003', 12500000.00, 'vietqr', 'MBBANK', 'success', '2026-11-10 10:15:00', '2026-11-10 10:15:00'),
(4, 'REF-1731406800', 3500000.00, 'refund', 'VIETCOMBANK', 'success', '2026-11-12 14:25:00', '2026-11-12 14:20:00');

SET FOREIGN_KEY_CHECKS = 1;
