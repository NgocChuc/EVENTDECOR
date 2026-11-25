SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `node_auth_demo` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `node_auth_demo`;

DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `cart_items`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `partner_specialties`;
DROP TABLE IF EXISTS `specialties`;
DROP TABLE IF EXISTS `employee_rated`;
DROP TABLE IF EXISTS `partners`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NULL,
    `avatar` VARCHAR(255) DEFAULT '/img/default-avatar.png',
    `role` ENUM('customer', 'partner', 'admin') DEFAULT 'customer',
    `status` ENUM('active', 'locked') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `partners` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `name` VARCHAR(150) NOT NULL,
    `image` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `address` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(150) NULL,
    `rating` DECIMAL(2,1) DEFAULT 5.0,
    `status` ENUM('active', 'pending', 'hidden') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_partners_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `specialties` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `partner_specialties` (
    `partner_id` INT NOT NULL,
    `specialty_id` INT NOT NULL,
    PRIMARY KEY (`partner_id`, `specialty_id`),
    CONSTRAINT `fk_ps_partner` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ps_specialty` FOREIGN KEY (`specialty_id`) REFERENCES `specialties`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `partner_id` INT NOT NULL,
    `specialty_id` INT NULL,
    `name` VARCHAR(255) NOT NULL,
    `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_price` DECIMAL(12,2) NULL,
    `image` VARCHAR(255) NOT NULL,
    `short_desc` VARCHAR(500) NULL,
    `detail_desc` LONGTEXT NULL,
    `status` ENUM('available', 'unavailable') DEFAULT 'available',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_services_partner` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_services_specialty` FOREIGN KEY (`specialty_id`) REFERENCES `specialties`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `cart_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `service_id` INT NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `event_date` DATE NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_user_service` (`user_id`, `service_id`),
    CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cart_service` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_code` VARCHAR(30) NOT NULL UNIQUE,
    `user_id` INT NOT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `customer_email` VARCHAR(100) NOT NULL,
    `event_address` VARCHAR(255) NOT NULL,
    `event_date` DATE NOT NULL,
    `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `service_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `note` TEXT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `service_id` INT NOT NULL,
    `service_name` VARCHAR(255) NOT NULL,
    `price` DECIMAL(12,2) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `total_price` DECIMAL(12,2) NOT NULL,
    CONSTRAINT `fk_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_items_service` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `payment_method` ENUM('COD', 'VNPAY', 'MOMO', 'BANKING') DEFAULT 'COD',
    `transaction_code` VARCHAR(100) NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_status` ENUM('UNPAID', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'UNPAID',
    `paid_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `employee_rated` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `image` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`id`, `username`, `email`, `password`, `full_name`, `phone`, `role`) VALUES
(1, 'User', 'user@gmail.com', 'user', 'Nguyễn Văn Khách', '0901112233', 'customer'),
(2, 'Admin', 'admin@gmail.com', 'admin', 'Hệ Thống Quản Trị', '0909999888', 'admin'),
(3, 'partydesign', 'contact@partydesign.com', '123456', 'PartyDesign Manager', '0901234567', 'partner'),
(4, 'hoabinh', 'info@hoabinh-events.com', '123456', 'HoaBinh Manager', '0912345678', 'partner'),
(5, 'achauevent', 'contact@achauevent.com', '123456', 'Á Châu Manager', '0923456789', 'partner'),
(6, 'tranminh', 'tranminh@gmail.com', '123456', 'Trần Văn Minh', '0933221100', 'customer'),
(7, 'lethao', 'lethao@gmail.com', '123456', 'Lê Phương Thảo', '0977889900', 'customer');

INSERT INTO `specialties` (`id`, `name`) VALUES
(1, 'Sinh Nhật'),
(2, 'Tiệc Cưới'),
(3, 'Year Party'),
(4, 'Khai Trương'),
(5, 'Thôi Nôi'),
(6, 'Hội Nghị'),
(7, 'Team Building');

INSERT INTO `partners` (`id`, `user_id`, `name`, `image`, `description`, `address`, `phone`, `email`, `rating`) VALUES
(1, 3, 'PartyDesign VN', '/img/partners/partydesn.png', 'Đối tác tin cậy của nhiều thương hiệu lớn như Acer, Vietcombank, Pepsico', 'TP. Hồ Chí Minh', '0901234567', 'contact@partydesign.com', 4.9),
(2, 4, 'HoaBinh Events', '/img/partners/hoabinh.png', 'Đơn vị tổ chức hội nghị, sự kiện và du lịch (MICE) quy mô lớn trên toàn quốc.', 'TP. Hồ Chí Minh', '0912345678', 'info@hoabinh-events.com', 5.0),
(3, 5, 'Á Châu Event', '/img/partners/achauevent.png', 'Mạnh về tổ chức teambuilding, tiệc cuối năm (YEP) và sự kiện doanh nghiệp.', 'Bình Dương', '0923456789', 'contact@achauevent.com', 4.8);

INSERT INTO `partner_specialties` (`partner_id`, `specialty_id`) VALUES
(1, 1), (1, 3), (1, 5),
(2, 2), (2, 4), (2, 6),
(3, 3), (3, 4), (3, 7);

INSERT INTO `services` (`id`, `partner_id`, `specialty_id`, `name`, `price`, `discount_price`, `image`, `short_desc`, `status`) VALUES
(1, 2, 2, 'Gói trang trí tiệc cưới Luxury Romance', 5000000.00, 4800000.00, '/img/wedding.png', 'Gói trang trí hoa tươi nhập khẩu cao cấp, backdrop chụp hình lãng mạn.', 'available'),
(2, 1, 1, 'Gói sinh nhật phong cách Pastel Sweet', 2000000.00, 1800000.00, '/img/birthday.png', 'Trang trí bóng bay nghệ thuật, bàn gallery chủ đề công chúa hoặc hoàng tử.', 'available'),
(3, 3, 3, 'Gói tiệc cuối năm Doanh Nghiệp Gala Night', 3500000.00, 3200000.00, '/img/endYear.png', 'Setup sân khấu, âm thanh ánh sáng và background tiệc tri ân cuối năm.', 'available'),
(4, 2, 4, 'Gói sự kiện khai trương Hồng Phát', 4000000.00, NULL, '/img/HBGevent.png', 'Cổng bong bóng, thảm đỏ, bộ kéo băng khánh thành và bàn tiệc teabreak.', 'available'),
(5, 1, 1, 'Gói chụp ảnh & quay phim sự kiện', 2500000.00, NULL, '/img/quayPhim.png', 'Ekip 2 thợ chụp + 1 quay phóng sự chuyên nghiệp trong suốt buổi tiệc.', 'available'),
(6, 2, 2, 'Gói trang trí tiệc cưới Rustic Vintage', 6500000.00, 6000000.00, '/img/wedding.png', 'Phong cách mộc mạc cổ điển với gỗ sồi tự nhiên và hoa khô trang nhã.', 'available'),
(7, 2, 2, 'Gói trang trí tiệc cưới Outdoor Garden', 8000000.00, 7500000.00, '/img/wedding.png', 'Không gian tiệc ngoài trời lung linh với dải đèn led fairy light và cổng hoa.', 'available'),
(8, 1, 1, 'Gói thôi nôi bé yêu Happy Baby', 1800000.00, NULL, '/img/birthday.png', 'Trang trí chibi tên bé, bảng thông tin thôi nôi và tiểu cảnh chụp ảnh.', 'available'),
(9, 1, 5, 'Gói thôi nôi hoàng tử Prince Theme', 2200000.00, 2000000.00, '/img/birthday.png', 'Tone xanh hoàng gia, vương miện và backdrop bong bóng nghệ thuật nổi bật.', 'available'),
(10, 3, 3, 'Gói tiệc tất niên Doanh Nghiệp Silver Star', 4500000.00, NULL, '/img/endYear.png', 'Trang trí sảnh đón khách sang trọng, photobooth check-in 3D sắc nét.', 'available'),
(11, 3, 3, 'Gói Year End Party Golden Retro', 5500000.00, 5000000.00, '/img/endYear.png', 'Ý tưởng sàn disco cổ điển thập niên 90 kết hợp tiệc cocktail hiện đại.', 'available'),
(12, 2, 4, 'Gói khai trương chi nhánh Standard', 3000000.00, NULL, '/img/HBGevent.png', 'Gồm cổng hơi 6m, 2 thảm đỏ dẫn lối và 2 trụ inox khánh thành.', 'available'),
(13, 2, 4, 'Gói khai trương Grand Opening VIP', 7000000.00, 6500000.00, '/img/HBGevent.png', 'Trọn gói dàn múa lân sư rồng khai lộc, MC sự kiện và pháo điện chúc mừng.', 'available'),
(14, 2, 6, 'Gói setup hội nghị & hội thảo quốc tế', 6000000.00, NULL, '/img/HBGevent.png', 'Bàn ghế đại biểu phủ khăn sang trọng, bục phát biểu và màn chiếu LED.', 'available'),
(15, 3, 7, 'Gói Teambuilding bãi biển gắn kết', 4800000.00, 4500000.00, '/img/endYear.png', 'Bộ dụng cụ game bãi biển cỡ lớn, cờ đội, áo team và loa kéo công suất lớn.', 'available'),
(16, 1, 1, 'Gói tiệc sinh nhật người lớn Modern Black & Gold', 2800000.00, NULL, '/img/birthday.png', 'Thiết kế tone đen vàng gold quý phái, đèn neon sign phát sáng ấn tượng.', 'available'),
(17, 2, 2, 'Gói trang trí xe hoa đón dâu cao cấp', 1500000.00, 1300000.00, '/img/wedding.png', 'Cụm hoa tươi mui trước, nơ lụa 4 cánh cửa và dải ruy băng mui sau.', 'available'),
(18, 3, 3, 'Gói tiệc Giáng Sinh & Chào Năm Mới', 3800000.00, NULL, '/img/endYear.png', 'Cây thông khổng lồ, hộp quà trang trí tuyết nhân tạo và ánh đèn ấm cúng.', 'available'),
(19, 1, 1, 'Gói bàn tiệc ngọt Teabreak & Finger Food', 2000000.00, 1900000.00, '/img/birthday.png', 'Trưng bày 8 loại bánh mặn ngọt, hoa quả theo mùa và nước ép thanh mát.', 'available'),
(20, 2, 6, 'Gói âm thanh ánh sáng hội trường mini', 3200000.00, NULL, '/img/quayPhim.png', '2 loa full bass 40, mixer bàn, 4 đèn par led 54 và 2 micro không dây.', 'available'),
(21, 3, 7, 'Gói trò chơi sinh hoạt dã ngoại Amazing Race', 4200000.00, 3900000.00, '/img/endYear.png', 'Kịch bản thiết kế riêng, bản đồ mật thư, trạm thử thách và trọng tài.', 'available'),
(22, 1, 2, 'Gói trang trí phòng tân hôn Honeymoon', 1200000.00, 1000000.00, '/img/wedding.png', 'Thiết kế thiên nga gấp khăn tắm, rải cánh hoa hồng và nến thơm tinh dầu.', 'available');

INSERT INTO `cart_items` (`user_id`, `service_id`, `quantity`, `event_date`) VALUES
(1, 1, 1, '2026-12-15'),
(1, 5, 1, '2026-12-15'),
(6, 2, 1, '2026-12-20'),
(7, 3, 1, '2026-12-31');

INSERT INTO `orders` (`id`, `order_code`, `user_id`, `customer_name`, `customer_phone`, `customer_email`, `event_address`, `event_date`, `subtotal`, `service_fee`, `total_amount`, `status`) VALUES
(1, 'ORD-20261101-001', 1, 'Nguyễn Văn Khách', '0901112233', 'user@gmail.com', 'Trung tâm tiệc cưới White Palace, Q. Phú Nhuận', '2026-11-05', 7500000.00, 375000.00, 7875000.00, 'COMPLETED'),
(2, 'ORD-20261110-002', 6, 'Trần Văn Minh', '0933221100', 'tranminh@gmail.com', 'Nhà hàng Riverside, Q. 7', '2026-11-15', 2000000.00, 100000.00, 2100000.00, 'COMPLETED'),
(3, 'ORD-20261120-003', 7, 'Lê Phương Thảo', '0977889900', 'lethao@gmail.com', 'Khu nghỉ dưỡng Lan Rừng, Vũng Tàu', '2026-11-28', 4800000.00, 240000.00, 5040000.00, 'PROCESSING'),
(4, 'ORD-20261124-004', 1, 'Nguyễn Văn Khách', '0901112233', 'user@gmail.com', 'Tòa nhà Landmark 81, Q. Bình Thạnh', '2026-12-01', 4000000.00, 200000.00, 4200000.00, 'CONFIRMED'),
(5, 'ORD-20261125-005', 6, 'Trần Văn Minh', '0933221100', 'tranminh@gmail.com', 'Biệt thự Thảo Điền, TP. Thủ Đức', '2026-12-10', 5000000.00, 250000.00, 5250000.00, 'PENDING'),
(6, 'ORD-20261125-006', 7, 'Lê Phương Thảo', '0977889900', 'lethao@gmail.com', 'Khách sạn Caravelle, Q. 1', '2026-12-05', 3500000.00, 175000.00, 3675000.00, 'CANCELLED');

INSERT INTO `order_items` (`order_id`, `service_id`, `service_name`, `price`, `quantity`, `total_price`) VALUES
(1, 1, 'Gói trang trí tiệc cưới Luxury Romance', 5000000.00, 1, 5000000.00),
(1, 5, 'Gói chụp ảnh & quay phim sự kiện', 2500000.00, 1, 2500000.00),
(2, 2, 'Gói sinh nhật phong cách Pastel Sweet', 2000000.00, 1, 2000000.00),
(3, 15, 'Gói Teambuilding bãi biển gắn kết', 4800000.00, 1, 4800000.00),
(4, 4, 'Gói sự kiện khai trương Hồng Phát', 4000000.00, 1, 4000000.00),
(5, 1, 'Gói trang trí tiệc cưới Luxury Romance', 5000000.00, 1, 5000000.00),
(6, 3, 'Gói tiệc cuối năm Doanh Nghiệp Gala Night', 3500000.00, 1, 3500000.00);

INSERT INTO `payments` (`order_id`, `payment_method`, `transaction_code`, `amount`, `payment_status`, `paid_at`) VALUES
(1, 'BANKING', 'VNP20261101987654', 7875000.00, 'PAID', '2026-11-01 10:30:00'),
(2, 'MOMO', 'MOM20261110112233', 2100000.00, 'PAID', '2026-11-10 14:15:00'),
(3, 'VNPAY', 'VNP20261120445566', 5040000.00, 'PAID', '2026-11-20 09:00:00'),
(4, 'BANKING', 'VNP20261124778899', 4200000.00, 'PAID', '2026-11-24 16:45:00'),
(5, 'COD', NULL, 5250000.00, 'UNPAID', NULL),
(6, 'BANKING', 'REF20261125000111', 3675000.00, 'REFUNDED', '2026-11-25 11:20:00');

INSERT INTO `employee_rated` (`name`, `image`, `description`) VALUES
('Taylor Swift', '/img/people_employee/avatar1.png', 'Môi trường làm việc vô cùng chuyên nghiệp và sáng tạo, đáp ứng hoàn hảo mọi quy mô sự kiện. Đội ngũ hỗ trợ nhiệt tình, giúp mọi khâu tổ chức diễn ra suôn sẻ.'),
('Sơn Tùng', '/img/people_employee/avatar2.png', 'Dịch vụ tổ chức sự kiện rất ấn tượng, từ khâu lên ý tưởng đến trang trí đều được thực hiện chỉn chu. Tôi hoàn toàn hài lòng với chất lượng và sự chuyên nghiệp của đội ngũ.'),
('Thanh Hải', '/img/people_employee/avatar3.png', 'Đội ngũ làm việc tận tâm, tư vấn rõ ràng và đáp ứng tốt các yêu cầu của khách hàng. Không gian sự kiện được trang trí đẹp mắt, chi phí hợp lý và đúng với mong đợi.');

SET FOREIGN_KEY_CHECKS = 1;