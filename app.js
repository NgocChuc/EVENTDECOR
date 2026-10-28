require("dotenv").config();
const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================================
// 1. CẤU HÌNH PARSER & STATIC FILES
// =========================================================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10kb" }));

app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.use("/admin", express.static(path.join(__dirname, "admin")));

// =========================================================================
// 2. CẤU HÌNH SESSION & MIDDLEWARE
// =========================================================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "eventdecor_secret_key_2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session ? req.session.user : null;
  next();
});

// =========================================================================
// 3. CẤU HÌNH NUNJUCKS
// =========================================================================
nunjucks.configure([
  path.join(__dirname),           // HTML gốc: home.html, event.html...
  path.join(__dirname, "admin"),  // Admin pages: admin/*.html
], {
  autoescape: true,
  express: app,
  watch: true,
});
app.set("view engine", "html");
app.set("views", path.join(__dirname));

// =========================================================================
// 4. CƠ SỞ DỮ LIỆU MYSQL
// =========================================================================
let pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "hello",
  database: process.env.DB_NAME || "auth_demo",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function checkDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
    console.log(">>> [MySQL] Kết nối CSDL thành công:", process.env.DB_NAME || "auth_demo");
  } catch (error) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || "root",
        password: "",
        database: process.env.DB_NAME || "auth_demo",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      await pool.query("SELECT 1");
      console.log(">>> [MySQL] Kết nối CSDL thành công:", process.env.DB_NAME || "auth_demo");
    } catch (e) {
      console.warn(">>> [MySQL] Chưa kết nối được MySQL:", e.message);
    }
  }
}
checkDatabaseConnection();

// Middlewares xác thực
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect("/login");
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === "admin") {
    return next();
  }
  // Tùy chọn: nếu đang dev có thể tạm bỏ qua hoặc mock user
  return next(); 
}

// =========================================================================
// 5. ROUTE ADMIN
// =========================================================================
app.get("/admin", (req, res) => {
  res.redirect("/admin/dashboard");
});

app.get("/admin/dashboard", requireAdmin, (req, res) => {
  res.render("admin/dashboard.html", {
    currentPage: "dashboard.html",
    adminUser: req.session?.user || { username: "QTV", role: "admin" },
  });
});

app.get("/admin/:page", requireAdmin, (req, res) => {
  const page = req.params.page.replace(/\.html\$/, "");
  // Chặn traversal đường dẫn
  if (!/^[a-zA-Z0-9_-]+\$/.test(page)) {
    return res.status(400).send("Đường dẫn không hợp lệ!");
  }

  const fileName = `${page}.html`;
  const filePath = path.join(__dirname, "admin", fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Trang quản trị không tồn tại!");
  }

  res.render(fileName, {
    currentPage: fileName,
    adminUser: req.session?.user || { username: "QTV", role: "admin" },
  });
});

// =========================================================================
// 6. ROUTES CLIENT
// =========================================================================
app.get(["/index", "/index.html", "/home", "/home.html"], (req, res) => res.redirect("/"));

app.get("/", async (req, res) => {
  try {
    const [partners] = await pool.query("SELECT * FROM partners LIMIT 6");
    res.render("home.html", { part: partners });
  } catch (error) {
    res.render("home.html", { part: [] });
  }
});

app.get("/event", async (req, res) => {
  try {
    const sql = `
      SELECT s.id, s.name, s.category, s.category_name AS categoryName, 
             s.base_price AS basePrice, s.image, s.rating, s.completed_count AS completedCount, 
             s.has_express AS hasExpress, s.is_new AS isNew, s.description, s.created_at AS createdAt, 
             p.name AS partnerName 
      FROM services s 
      JOIN partners p ON s.partner_id = p.id 
      ORDER BY s.created_at DESC
    `;
    const [services] = await pool.query(sql);
    res.render("event.html", { servicesJson: JSON.stringify(services) });
  } catch (error) {
    console.error(">>> [MySQL] Lỗi đọc danh sách dịch vụ:", error.message);
    res.render("event.html", { servicesJson: "[]" });
  }
});

app.get("/event/detail", async (req, res) => {
  const serviceId = req.query.id || "SRV-101";
  try {
    const serviceSql = `
      SELECT s.id, s.name, s.category, s.category_name AS categoryName, 
             CAST(s.base_price AS SIGNED) AS basePrice, COALESCE(s.image, '') AS image, 
             CAST(s.rating AS DECIMAL(2,1)) AS rating, s.completed_count AS completedCount, 
             IF(s.has_express = 1, true, false) AS hasExpress, 
             CAST(COALESCE(s.express_fee, 500000) AS SIGNED) AS expressFee, 
             s.description, p.name AS partnerName 
      FROM services s 
      JOIN partners p ON s.partner_id = p.id 
      WHERE s.id = ?
    `;
    const [services] = await pool.query(serviceSql, [serviceId]);
    if (services.length === 0) return res.redirect("/event");

    const serviceData = services[0];
    const [galleryRows] = await pool.query(
      "SELECT image_url AS url, caption FROM service_gallery WHERE service_id = ?",
      [serviceId]
    );
    const [optionsRows] = await pool.query(
      "SELECT option_key AS id, name, CAST(price AS SIGNED) AS price FROM service_options WHERE service_id = ?",
      [serviceId]
    );

    serviceData.gallery = galleryRows.length > 0 ? galleryRows : [{ url: serviceData.image, caption: serviceData.name }];
    serviceData.extraOptions = optionsRows;

    res.render("detail-event.html", { serviceDetailJson: JSON.stringify(serviceData) });
  } catch (error) {
    console.error(">>> [MySQL Lỗi chi tiết dịch vụ]:", error.message);
    res.redirect("/event");
  }
});

app.get("/partner", async (req, res) => {
  try {
    const [partners] = await pool.query("SELECT * FROM partners");
    res.render("partner.html", { part: partners });
  } catch (error) {
    res.render("partner.html", { part: [] });
  }
});

app.get("/partner/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).send("Không tìm thấy đối tác");

  try {
    const sql = `
      SELECT p.id, p.name, p.image, p.description, p.address, p.phone, p.email, s.name AS specialty_name 
      FROM partners p 
      LEFT JOIN partner_specialties ps ON ps.partner_id = p.id 
      LEFT JOIN specialties s ON s.id = ps.specialty_id 
      WHERE p.id = ?
    `;
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) return res.status(404).send("Không tìm thấy đối tác");

    const [other] = await pool.query("SELECT id, name FROM partners WHERE id <> ? LIMIT 2", [id]);
    return res.render("detailed-partner.html", {
      parts: rows[0],
      spec: rows.map((r) => r.specialty_name).filter(Boolean),
      other,
    });
  } catch (error) {
    return res.status(500).send("Lỗi truy vấn CSDL đối tác");
  }
});

app.get("/cart", (req, res) => res.render("cart.html"));
// =========================================================================
// ROUTE & API ĐƠN HÀNG CỦA TÔI (MY ORDERS)
// =========================================================================
app.get("/my-orders", async (req, res) => {
  const userId = req.session?.user?.id || 2; // Mặc định tài khoản demo id = 2 nếu chưa đăng nhập
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.id,
        o.order_code AS orderCode,
        o.user_id AS userId,
        o.customer_name AS customerName,
        o.customer_phone AS customerPhone,
        o.customer_email AS customerEmail,
        CAST(o.total_amount AS SIGNED) AS totalAmount,
        o.payment_method AS paymentMethod,
        o.payment_status AS paymentStatus,
        o.order_status AS orderStatus,
        COALESCE(o.execution_time, 'Thỏa thuận sau') AS executionTime,
        DATE_FORMAT(o.completed_at, '%d/%m/%Y %H:%i') AS completedAt,
        DATE_FORMAT(o.cancelled_at, '%d/%m/%Y %H:%i') AS cancelledAt,
        COALESCE(o.cancel_reason, '') AS cancelReason,
        DATE_FORMAT(o.created_at, '%d/%m/%Y %H:%i') AS createdAt,
        COALESCE(oi.service_name, 'Dịch vụ trang trí sự kiện') AS serviceName,
        COALESCE(oi.partner_name, 'Đối tác EventDecor') AS partnerName
      FROM orders o
      LEFT JOIN (
        SELECT order_id, MAX(service_name) AS service_name, MAX(partner_name) AS partner_name 
        FROM order_items 
        GROUP BY order_id
      ) oi ON oi.order_id = o.id
      WHERE o.user_id = ? OR ? = 0 OR ? = 1
      ORDER BY o.id DESC
    `, [userId, userId === 1 ? 1 : 0, req.session?.user?.role === 'admin' ? 1 : 0]);

    res.render("my-orders.html", {
      ordersJson: JSON.stringify(rows)
    });
  } catch (error) {
    console.error(">>> [MySQL] Lỗi lấy danh sách đơn hàng:", error.message);
    res.render("my-orders.html", { ordersJson: "[]" });
  }
});

app.get("/api/orders", async (req, res) => {
  const userId = req.session?.user?.id || 2;
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.id,
        o.order_code AS orderCode,
        o.user_id AS userId,
        o.customer_name AS customerName,
        o.customer_phone AS customerPhone,
        o.customer_email AS customerEmail,
        CAST(o.total_amount AS SIGNED) AS totalAmount,
        o.payment_method AS paymentMethod,
        o.payment_status AS paymentStatus,
        o.order_status AS orderStatus,
        COALESCE(o.execution_time, 'Thỏa thuận sau') AS executionTime,
        DATE_FORMAT(o.completed_at, '%d/%m/%Y %H:%i') AS completedAt,
        DATE_FORMAT(o.cancelled_at, '%d/%m/%Y %H:%i') AS cancelledAt,
        COALESCE(o.cancel_reason, '') AS cancelReason,
        DATE_FORMAT(o.created_at, '%d/%m/%Y %H:%i') AS createdAt,
        COALESCE(oi.service_name, 'Dịch vụ trang trí sự kiện') AS serviceName,
        COALESCE(oi.partner_name, 'Đối tác EventDecor') AS partnerName
      FROM orders o
      LEFT JOIN (
        SELECT order_id, MAX(service_name) AS service_name, MAX(partner_name) AS partner_name 
        FROM order_items 
        GROUP BY order_id
      ) oi ON oi.order_id = o.id
      WHERE o.user_id = ? OR ? = 0 OR ? = 1
      ORDER BY o.id DESC
    `, [userId, userId === 1 ? 1 : 0, req.session?.user?.role === 'admin' ? 1 : 0]);

    res.json(rows);
  } catch (error) {
    console.error(">>> [MySQL API] Lỗi lấy danh sách đơn:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// API HỦY ĐƠN HÀNG THEO ĐÚNG QUY TRÌNH NGHIỆP VỤ
// (Giai đoạn 1 & 2 được hủy; Giai đoạn 3 & 4 không được hủy)
// =========================================================================
app.post("/api/orders/cancel", async (req, res) => {
  const { orderCode, cancelReason } = req.body;
  if (!orderCode) {
    return res.status(400).json({ success: false, message: "Mã đơn hàng không hợp lệ." });
  }

  const reason = (cancelReason && cancelReason.trim()) || "Khách hàng yêu cầu hủy đơn";

  try {
    const [rows] = await pool.query(
      "SELECT id, order_code, order_status, payment_status, total_amount FROM orders WHERE order_code = ? OR CAST(id AS CHAR) = ? LIMIT 1",
      [orderCode, orderCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy mã đơn hàng cần hủy." });
    }

    const order = rows[0];

    // Kiểm tra quy trình: Giai đoạn 3 (processing) & Giai đoạn 4 (done) không được hủy
    if (['processing', 'done'].includes(order.order_status)) {
      return res.status(400).json({
        success: false,
        message: "Theo quy trình vận hành EventDecor, đơn hàng đã bước vào giai đoạn thi công mặt bằng hoặc đã hoàn thành. Bạn không thể hủy đơn trực tiếp. Vui lòng liên hệ hotline/đối tác."
      });
    }

    if (order.order_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng này đã được hủy bỏ trước đó."
      });
    }

    // Cập nhật trạng thái đơn thành cancelled
    await pool.query(
      `UPDATE orders 
       SET order_status = 'cancelled', 
           cancel_reason = ?, 
           cancelled_at = NOW(),
           payment_status = IF(payment_status = 'paid', 'refunded', payment_status)
       WHERE id = ?`,
      [reason, order.id]
    );

    // Ghi lịch sử chuyển trạng thái
    try {
      await pool.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, note, changed_by, created_at)
         VALUES (?, ?, 'cancelled', ?, 'customer', NOW())`,
        [order.id, order.order_status, reason]
      );
    } catch (histErr) {}

    // Nếu đã thanh toán: ghi nhận hoàn tiền
    if (order.payment_status === 'paid') {
      try {
        const refundTxnCode = `REF-${Date.now()}`;
        await pool.query(
          `INSERT INTO order_transactions (order_id, transaction_code, amount, payment_type, bank_code, status, paid_at, created_at)
           VALUES (?, ?, ?, 'refund', 'VIETCOMBANK', 'success', NOW(), NOW())`,
          [order.id, refundTxnCode, order.total_amount]
        );
      } catch (transErr) {}
    }

    return res.json({
      success: true,
      message: "Hủy đơn hàng thành công theo quy trình EventDecor."
    });

  } catch (err) {
    console.error(">>> [MySQL] Lỗi khi hủy đơn CSDL:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống khi hủy đơn hàng: " + err.message });
  }
});

// =========================================================================
// ROUTE & API THÔNG TIN CÁ NHÂN (USER PROFILE)
// =========================================================================
app.get("/profile", requireAuth, async (req, res) => {
  const sessionUser = req.session.user;
  let currentUser = {
    phone: '0900000002',
    address: 'TP. Hồ Chí Minh',
    ...sessionUser
  };

  let stats = {
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0
  };

  try {
    const [userRows] = await pool.query(
      "SELECT id, username, email, phone, address, role, status FROM users WHERE id = ? OR email = ? LIMIT 1",
      [sessionUser.id, sessionUser.email]
    );
    if (userRows.length > 0) {
      currentUser = {
        ...currentUser,
        ...userRows[0],
        phone: userRows[0].phone || currentUser.phone,
        address: userRows[0].address || currentUser.address
      };
    }

    const [orderStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN order_status IN ('pending_partner', 'pending_payment') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN order_status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN order_status = 'done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM orders
      WHERE user_id = ? OR ? = 1
    `, [currentUser.id, currentUser.role === 'admin' ? 1 : 0]);

    if (orderStats.length > 0) {
      stats = {
        totalOrders: Number(orderStats[0].total) || 0,
        pendingOrders: Number(orderStats[0].pending) || 0,
        processingOrders: Number(orderStats[0].processing) || 0,
        completedOrders: Number(orderStats[0].completed) || 0,
        cancelledOrders: Number(orderStats[0].cancelled) || 0
      };
    }
  } catch (e) {
    console.warn(">>> [MySQL] Lỗi lấy thông tin cá nhân:", e.message);
  }

  res.render("profile.html", {
    user: currentUser,
    stats
  });
});

app.post("/api/user/profile", requireAuth, async (req, res) => {
  const { username, phone, address } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ success: false, message: "Họ và tên không được để trống." });
  }

  const sessionUser = req.session.user;
  const cleanName = username.trim();
  const cleanPhone = (phone || "").trim();
  const cleanAddress = (address || "").trim();

  try {
    await pool.query(
      "UPDATE users SET username = ?, phone = ?, address = ? WHERE id = ? OR email = ?",
      [cleanName, cleanPhone, cleanAddress, sessionUser.id, sessionUser.email]
    );

    req.session.user = {
      ...sessionUser,
      username: cleanName,
      phone: cleanPhone,
      address: cleanAddress
    };

    return res.json({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công!",
      user: req.session.user
    });
  } catch (err) {
    console.error(">>> [MySQL] Lỗi cập nhật hồ sơ:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi cập nhật CSDL: " + err.message });
  }
});

app.post("/api/user/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Mật khẩu mới phải có tối thiểu 6 ký tự." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Mật khẩu xác nhận không khớp." });
  }

  const sessionUser = req.session.user;

  try {
    const [rows] = await pool.query(
      "SELECT id, password FROM users WHERE id = ? OR email = ? LIMIT 1",
      [sessionUser.id, sessionUser.email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    }

    const dbPassword = rows[0].password;
    const isMatch = (dbPassword && (dbPassword.startsWith("$2a$") || dbPassword.startsWith("$2b$")))
      ? await bcrypt.compare(currentPassword, dbPassword)
      : (currentPassword === dbPassword);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không đúng." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [newHash, rows[0].id]);
    return res.json({ success: true, message: "Đổi mật khẩu tài khoản thành công!" });
  } catch (err) {
    console.error(">>> [MySQL] Lỗi đổi mật khẩu CSDL:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống khi đổi mật khẩu." });
  }
});

app.get("/cart.html", (req, res) => res.redirect("/cart"));
app.get("/payment", requireAuth, (req, res) => res.render("payment.html"));
app.get("/payment.html", (req, res) => res.redirect("/payment"));
app.get("/contact", (req, res) => res.render("contact.html"));
app.get("/contact.html", (req, res) => res.redirect("/contact"));
app.post("/contact", (req, res) => {
  res.send("<script>alert('Cảm ơn bạn! Thông tin liên hệ đã được gửi thành công.'); window.location.href = '/contact';</script>");
});
app.get("/reset-password", (req, res) => res.render("reset-password.html"));

// =========================================================================
// 7. ROUTES AUTH (HỖ TRỢ CẢ FORM POST VÀ FETCH API)
// =========================================================================
app.get("/register", (req, res) => res.render("register.html"));
app.get("/login", (req, res) => res.render("login.html"));

async function handleRegister(req, res) {
  const fullName = req.body.name || req.body.fullName;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirm_password || req.body.confirmPassword;
  const isAjax = req.xhr || req.headers.accept?.includes("application/json");

  if (!fullName || !email || !password) {
    const msg = "Vui lòng nhập đầy đủ họ tên, email và mật khẩu.";
    return isAjax ? res.status(400).json({ message: msg }) : res.send(`<script>alert('${msg}'); window.history.back();</script>`);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.trim().toLowerCase();
  if (!emailRegex.test(normalizedEmail)) {
    const msg = "Địa chỉ email không đúng định dạng.";
    return isAjax ? res.status(400).json({ message: msg }) : res.send(`<script>alert('${msg}'); window.history.back();</script>`);
  }

  if (password.length < 6) {
    const msg = "Mật khẩu phải có độ dài từ 6 ký tự trở lên.";
    return isAjax ? res.status(400).json({ message: msg }) : res.send(`<script>alert('${msg}'); window.history.back();</script>`);
  }

  if (confirmPassword && password !== confirmPassword) {
    const msg = "Mật khẩu xác nhận không khớp.";
    return isAjax ? res.status(400).json({ message: msg }) : res.send(`<script>alert('${msg}'); window.history.back();</script>`);
  }

  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      const msg = "Email này đã được đăng ký tài khoản.";
      return isAjax ? res.status(409).json({ message: msg }) : res.send(`<script>alert('${msg}'); window.history.back();</script>`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [insertResult] = await pool.query(
      `INSERT INTO users (username, email, password, phone, address, role, status, email_verified)
       VALUES (?, ?, ?, '0900000002', 'TP. Hồ Chí Minh', 'customer', 'active', TRUE)`,
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    req.session.user = {
      id: insertResult.insertId,
      username: fullName.trim(),
      email: normalizedEmail,
      phone: '0900000002',
      address: 'TP. Hồ Chí Minh',
      role: 'customer'
    };

    if (isAjax) {
      return res.status(201).json({ success: true, message: "Đăng ký tài khoản thành công! Đang chuyển hướng..." });
    }
    return res.redirect("/");

  } catch (error) {
    console.error(">>> [MySQL Lỗi đăng ký]:", error);
    const msg = "Lỗi hệ thống khi lưu tài khoản: " + (error.sqlMessage || error.message);
    return isAjax ? res.status(500).json({ message: msg }) : res.send(`<script>alert('${msg}'); window.history.back();</script>`);
  }
}

app.post("/register", handleRegister);
app.post("/api/register", handleRegister);

// Xử lý đăng nhập tài khoản
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.send("<script>alert('Vui lòng nhập đầy đủ email và mật khẩu!'); window.history.back();</script>");
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);

    if (rows.length > 0) {
      const user = rows[0];
      const dbPassword = user.password || user.password_hash;
      const isMatch = (dbPassword && (dbPassword.startsWith("$2a$") || dbPassword.startsWith("$2b$")))
        ? await bcrypt.compare(password, dbPassword)
        : password === dbPassword;

      if (isMatch) {
        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone || '0900000002',
          address: user.address || 'TP. Hồ Chí Minh',
          role: user.role || "customer"
        };
        return res.redirect(user.role === "admin" ? "/admin/dashboard" : "/");
      }
    }
  } catch (error) {
    console.error(">>> [MySQL] Lỗi kết nối CSDL đăng nhập:", error.message);
    return res.status(500).send("Lỗi xử lý kết nối CSDL khi đăng nhập: " + error.message);
  }

  return res.send("<script>alert('Sai email hoặc mật khẩu. Vui lòng kiểm tra lại!'); window.history.back();</script>");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  EventDecor Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`====================================================`);
});