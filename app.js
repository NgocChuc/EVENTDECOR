
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
const viewsPath = path.join(__dirname, "views");
nunjucks.configure([
  viewsPath,
  path.join(viewsPath, "admin"),
  path.join(__dirname, "admin")
], {
  autoescape: true,
  express: app,
  watch: true,
  noCache: true
});

app.set("view engine", "html");
app.set("views", viewsPath);

// =========================================================================
// 4. CƠ SỞ DỮ LIỆU MYSQL
// =========================================================================
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "auth_demo",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function checkDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
    console.log(">>> [MySQL] Kết nối CSDL thành công:", process.env.DB_NAME || "node_auth_demo");
  } catch (error) {
    console.warn(">>> [MySQL] Chưa kết nối được MySQL. Web dùng dữ liệu fallback.");
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
app.get("/my-orders", (req, res) => res.render("my-orders.html"));
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
// 7. ROUTES AUTH
// =========================================================================
app.get("/register", (req, res) => res.render("register.html"));
app.get("/login", (req, res) => res.render("login.html"));

app.post("/api/register", async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;
  if (!fullName || !email || !password) return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
  if (confirmPassword && password !== confirmPassword) return res.status(400).json({ message: "Mật khẩu xác nhận không khớp." });

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existing.length > 0) return res.status(409).json({ message: "Email này đã được sử dụng." });

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, email, password, email_verified) VALUES (?, ?, ?, TRUE)", [
      fullName.trim(),
      normalizedEmail,
      passwordHash,
    ]);
    return res.status(201).json({ message: "Đăng ký thành công! Hãy đăng nhập." });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi lưu CSDL: " + (error.sqlMessage || error.message) });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.send("<script>alert('Vui lòng nhập đầy đủ email và mật khẩu!'); window.history.back();</script>");

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
    if (rows.length === 0) return res.send("<script>alert('Sai email hoặc mật khẩu.'); window.history.back();</script>");

    const user = rows[0];
    const dbPassword = user.password || user.password_hash;
    const isMatch = dbPassword.startsWith("$2a$") || dbPassword.startsWith("$2b$")
      ? await bcrypt.compare(password, dbPassword)
      : password === dbPassword;

    if (!isMatch) return res.send("<script>alert('Sai email hoặc mật khẩu.'); window.history.back();</script>");

    req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role || "user" };
    return res.redirect(user.role === "admin" ? "/admin/dashboard" : "/");
  } catch (error) {
    return res.status(500).send("Lỗi xử lý đăng nhập hệ thống.");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  EventDecor Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`====================================================`);
});