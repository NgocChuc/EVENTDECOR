require("dotenv").config();
const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

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

nunjucks.configure(viewsPath, {
  autoescape: true,
  express: app,
  watch: true,
  noCache: true,
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
// GOOGLE OAUTH 2.0
// =========================================================================
app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
// 2. Cấu hình chiến lược xác thực với Google
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value.toLowerCase();
          const username = profile.displayName || "Khách hàng Google";

          const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);

          let user;
          if (rows.length === 0) {
            const [result] = await pool.query(
              "INSERT INTO users (username, email, password, role, email_verified) VALUES (?, ?, 'oauth_google', 'customer', 1)",
              [username, email]
            );
            user = { id: result.insertId, username, email, role: "customer" };
          } else {
            user = { id: rows[0].id, username: rows[0].username, email: rows[0].email, role: rows[0].role };
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn(">>> [Cảnh báo] Chưa cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong .env");
}
//ROUTE ĐĂNG NHẬP GG
// 1. Khi bấm nút "Đăng nhập với Google" -> Chuyển sang Google
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// 2. Google xử lý xong rồi đẩy về lại đây
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    req.session.user = req.user;
    res.redirect("/");
  }
);

// =========================================================================
// 5. ROUTE ADMIN
// =========================================================================
app.get("/admin", (req, res) => {
  res.redirect("/admin/dashboard");
});

// 1. Route cố định: Dashboard
app.get("/admin/dashboard", requireAdmin, (req, res) => {
  res.render("admin/dashboard.html", {
    currentPage: "dashboard.html",
    adminUser: req.session?.user || { username: "QTV", role: "admin" },
  });
});

app.get("/admin/test-sidebar", (req, res) => {
  try {
    res.render("admin/test-sidebar.html", {
      currentPage: "test-sidebar.html",
      adminUser: req.session?.user || { username: "QTV Admin", role: "admin" }
    });
  } catch (err) {
    console.error(">>> Render lỗi:", err);
    res.status(500).send("<pre>" + err.message + "\n" + err.stack + "</pre>");
  }
});
// 3. Route động cho các trang admin khác (Đặt Ở CUỐI CÙNG và render đúng thư mục admin/)
app.get("/admin/:page", requireAdmin, (req, res) => {
  const page = req.params.page.replace(/\.html$/, "");
  if (!/^[a-zA-Z0-9_-]+$/.test(page)) {
    return res.status(400).send("Đường dẫn không hợp lệ!");
  }
  
  // Nối thêm "admin/" để nạp đúng file trong thư mục views/admin/
  const fileName = `admin/${page}.html`;
  
  res.render(fileName, {
    currentPage: `${page}.html`,
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

///ROUTE DANH SÁCH DỊCH VỤ SỰ KIỆN (/event)
app.get("/event", async (req, res) => {
  try {
    const sql = `
      SELECT 
        s.id, 
        s.name, 
        s.category, 
        s.category_name AS categoryName, 
        CAST(s.base_price AS SIGNED) AS basePrice, 
        COALESCE(s.image, '') AS image, 
        CAST(COALESCE(s.rating, 5.0) AS DECIMAL(2,1)) AS rating, 
        COALESCE(s.completed_count, 0) AS completedCount, 
        IF(s.has_express = 1, true, false) AS hasExpress, 
        IF(s.is_new = 1, true, false) AS isNew, 
        s.short_description AS shortDescription,
        s.description, 
        s.created_at AS createdAt, 
        p.name AS partnerName,
        p.badge_gradient AS badgeGradient
      FROM services s 
      JOIN partners p ON s.partner_id = p.id 
      WHERE s.is_visible = 1
      ORDER BY s.created_at DESC
    `;
    const [services] = await pool.query(sql);
    res.render("event.html", { 
      servicesJson: JSON.stringify(services) 
    });
  } catch (error) {
    console.error(">>> [MySQL] Lỗi đọc danh sách dịch vụ:", error.message);
    res.render("event.html", { servicesJson: "[]" });
  }
});


// ROUTE CHI TIẾT DỊCH VỤ (/event/detail)
app.get("/event/detail", async (req, res) => {
  const serviceId = req.query.id;
  if (!serviceId) {
    return res.redirect("/event");
  }

  try {
    // 1. Truy vấn thông tin dịch vụ chính + đối tác
    const serviceSql = `
      SELECT 
        s.id, 
        s.name, 
        s.category, 
        s.category_name AS categoryName, 
        CAST(s.base_price AS SIGNED) AS basePrice, 
        COALESCE(s.image, '') AS image, 
        CAST(COALESCE(s.rating, 5.0) AS DECIMAL(2,1)) AS rating, 
        COALESCE(s.completed_count, 0) AS completedCount, 
        IF(s.has_express = 1, true, false) AS hasExpress, 
        CAST(COALESCE(s.express_fee, 500000) AS SIGNED) AS expressFee, 
        s.short_description AS shortDescription,
        s.description, 
        p.id AS partnerId,
        p.name AS partnerName,
        p.phone AS partnerPhone,
        p.email AS partnerEmail,
        p.rating AS partnerRating,
        p.experience AS partnerExperience
      FROM services s 
      JOIN partners p ON s.partner_id = p.id 
      WHERE s.id = ? AND s.is_visible = 1
    `;
    const [services] = await pool.query(serviceSql, [serviceId]);

    if (services.length === 0) {
      console.warn(`>>> [MySQL] Không tìm thấy dịch vụ hoặc dịch vụ bị ẩn: ${serviceId}`);
      return res.redirect("/event");
    }

    const serviceData = services[0];

   // Gallery ảnh
    try {
      const [galleryRows] = await pool.query(
        "SELECT image_url AS url, caption FROM service_gallery WHERE service_id = ?",
        [serviceId]
      );
      serviceData.gallery = galleryRows.length > 0 
        ? galleryRows 
        : [{ url: serviceData.image, caption: serviceData.name }];
    } catch (galleryErr) {
      serviceData.gallery = [{ url: serviceData.image, caption: serviceData.name }];
    }

    // Các tùy chọn Options
    try {
      const [optionsRows] = await pool.query(
        `SELECT 
          id, 
          group_name AS groupName, 
          option_name AS name, 
          CAST(price_adjustment AS SIGNED) AS price, 
          IF(is_default = 1, true, false) AS isDefault 
        FROM service_options 
        WHERE service_id = ?
        ORDER BY group_name ASC, id ASC`,
        [serviceId]
      );
      serviceData.extraOptions = optionsRows;
    } catch (optErr) {
      console.error(">>> [MySQL] Lỗi đọc service_options:", optErr.message);
      serviceData.extraOptions = [];
    }

    // Render template detail-event.html
    res.render("detail-event.html", { 
      serviceDetailJson: JSON.stringify(serviceData) 
    });
  } catch (error) {
    console.error(">>> [MySQL] Lỗi chi tiết dịch vụ:", error.message);
    res.redirect("/event");
  }
});

// ROUTE CHI TIẾT DỊCH VỤ (/event/detail)
app.get("/partner", async (req, res) => {
  try {
    const [partners] = await pool.query(`
      SELECT id, name, image, description, email 
      FROM partners 
      ORDER BY id ASC
    `);
    res.render("partner.html", { part: partners });
  } catch (error) {
    console.error(">>> [MySQL] Lỗi lấy danh sách đối tác:", error.message);
    res.render("partner.html", { part: [] });
  }
});

// ROUTE CHI TIẾT ĐỐI TÁC (/partner/:id)
app.get("/partner/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).redirect("/partner");
  }

  try {
    // 1. Lấy thông tin đối tác
    const [partnerRows] = await pool.query(
      "SELECT id, name, image, description, email FROM partners WHERE id = ?",
      [id]
    );

    if (partnerRows.length === 0) {
      return res.status(404).redirect("/partner");
    }
    const partner = partnerRows[0];

    // 2. Lấy danh sách dịch vụ của đối tác
    const [services] = await pool.query(
      `SELECT id, name, category_name AS categoryName, base_price AS basePrice, 
              image, rating, completed_count AS completedCount, description
       FROM services 
       WHERE partner_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    // 3. Lấy danh sách đánh giá/bình luận (nếu chưa có bảng hoặc lỗi thì fallback rỗng)
    let reviews = [];
    try {
      const [reviewRows] = await pool.query(
        `SELECT r.id, r.user_name AS userName, r.rating, r.comment, r.created_at AS createdAt
         FROM partner_reviews r
         WHERE r.partner_id = ?
         ORDER BY r.created_at DESC`,
        [id]
      );
      reviews = reviewRows;
    } catch (e) {
      reviews = [];
    }

    res.render("detail-partner.html", {
      partner,
      services,
      reviews
    });
  } catch (error) {
    console.error(">>> [MySQL] Lỗi xem chi tiết đối tác:", error.message);
    res.status(500).send("Lỗi truy vấn CSDL chi tiết đối tác.");
  }
});


app.get("/cart", (req, res) => res.render("cart.html"));
app.get("/my-orders", async (req, res) => {
  try {
    // Nếu có đăng nhập thì lọc theo user.id, nếu đang test chưa login thì lấy tất cả đơn
    const userId = req.session?.user?.id;
    let querySql = `
      SELECT 
        o.id,
        o.order_code AS orderCode,
        o.order_status AS status,
        CAST(o.total_amount AS SIGNED) AS price,
        DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date,
        COALESCE(o.execution_time, 'Thỏa thuận') AS event_date,
        DATE_FORMAT(o.completed_at, '%Y-%m-%d') AS completed_at,
        oi.service_name AS service,
        oi.partner_name AS partner,
        COALESCE(s.image, '') AS image
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN services s ON oi.service_id = s.id
    `;
    
    const params = [];
    if (userId) {
      querySql += ` WHERE o.user_id = ? `;
      params.push(userId);
    }
    querySql += ` ORDER BY o.id DESC `;

    const [orders] = await pool.query(querySql, params);

    // Render template my-orders.html với dữ liệu JSON
    res.render("my-orders.html", {
      ordersJson: JSON.stringify(orders)
    });
  } catch (error) {
    console.error(">>> [MySQL] Lỗi lấy danh sách my-orders:", error.message);
    res.render("my-orders.html", { ordersJson: "[]" });
  }
});

// ROUTE CHI TIẾT ĐƠN HÀNG (/order/detail)
app.get("/order/detail", async (req, res) => {
  const queryParam = req.query.id;
  if (!queryParam) {
    return res.redirect("/my-orders");
  }

  try {
    // 1. Lấy thông tin đơn hàng từ MySQL
    const [orderRows] = await pool.query(`
      SELECT 
        o.id,
        o.order_code AS orderCode,
        DATE_FORMAT(o.created_at, '%d/%m/%Y %H:%i') AS createdAt,
        o.order_status AS orderStatus,
        o.payment_method AS paymentMethod,
        o.payment_status AS paymentStatus,
        CAST(o.total_amount AS SIGNED) AS totalAmount,
        o.customer_name AS customerName,
        o.customer_phone AS customerPhone,
        o.customer_email AS customerEmail,
        COALESCE(o.execution_time, 'Thỏa thuận sau') AS executionTime,
        DATE_FORMAT(o.completed_at, '%d/%m/%Y %H:%i') AS completedAt,
        COALESCE(o.event_location, 'Chưa cập nhật địa chỉ') AS eventLocation,
        COALESCE(o.note, '') AS note
      FROM orders o
      WHERE o.order_code = ? OR CAST(o.id AS CHAR) = ?
      LIMIT 1
    `, [queryParam, queryParam]);

    if (orderRows.length === 0) {
      return res.redirect("/my-orders");
    }
    const order = orderRows[0];

    // 2. Lấy thông tin dịch vụ từ order_items và services
    const [itemRows] = await pool.query(`
      SELECT 
        oi.service_name AS serviceName,
        oi.partner_name AS partnerName,
        COALESCE(oi.scale, 'Quy mô tiêu chuẩn') AS scale,
        COALESCE(oi.event_title, 'Chưa đặt tên sự kiện') AS eventTitle,
        COALESCE(oi.selected_options, 'Gói cơ bản') AS selectedOptions,
        COALESCE(s.image, '') AS image,
        COALESCE(s.short_description, s.description, '') AS shortDescription
      FROM order_items oi
      LEFT JOIN services s ON oi.service_id = s.id
      WHERE oi.order_id = ?
      LIMIT 1
    `, [order.id]);

    const item = itemRows.length > 0 ? itemRows[0] : {
      serviceName: "Gói trang trí sự kiện",
      partnerName: "Đối tác EventDecor",
      scale: "Tiêu chuẩn",
      eventTitle: "",
      selectedOptions: "",
      image: "",
      shortDescription: "Thông tin dịch vụ theo thỏa thuận hợp đồng."
    };

    // 3. Lấy các mốc thời gian từ lịch sử đơn hàng và giao dịch
    let partnerConfirmedTime = null;
    let paymentSuccessTime = null;

    try {
      const [histRows] = await pool.query(`
        SELECT to_status, DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS action_time
        FROM order_status_history
        WHERE order_id = ?
      `, [order.id]);

      histRows.forEach(h => {
        if (h.to_status === 'pending_payment' || h.to_status === 'processing') {
          partnerConfirmedTime = h.action_time;
        }
      });
    } catch (e) {}

    try {
      const [transRows] = await pool.query(`
        SELECT DATE_FORMAT(paid_at, '%d/%m/%Y %H:%i') AS paid_time
        FROM order_transactions
        WHERE order_id = ? AND status = 'success'
        ORDER BY id DESC LIMIT 1
      `, [order.id]);

      if (transRows.length > 0) {
        paymentSuccessTime = transRows[0].paid_time;
      }
    } catch (e) {}

    // Việt hóa tên phương thức thanh toán
    let viPaymentMethod = "Chuyển khoản trực tuyến qua mã VietQR";
    if (order.paymentMethod === 'cod') viPaymentMethod = "Thanh toán trực tiếp khi bàn giao (COD)";
    else if (order.paymentMethod === 'momo') viPaymentMethod = "Ví điện tử MoMo";
    else if (order.paymentMethod === 'vnpay') viPaymentMethod = "Cổng thanh toán VNPAY";

    const payload = {
      ...order,
      paymentMethod: viPaymentMethod,
      partnerConfirmedTime: partnerConfirmedTime || (order.orderStatus !== 'pending_partner' ? order.createdAt : null),
      paymentSuccessTime: paymentSuccessTime || (order.paymentStatus === 'paid' ? order.createdAt : null),
      item
    };

    res.render("order-detail.html", {
      orderDetailJson: JSON.stringify(payload)
    });

  } catch (error) {
    console.error(">>> [MySQL] Lỗi chi tiết đơn:", error.message);
    res.redirect("/my-orders");
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
// 7. ROUTES AUTH
// =========================================================================
app.get("/register", (req, res) => res.render("register.html"));
app.get("/login", (req, res) => res.render("login.html"));


app.post("/api/register", async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu." });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+\$/;
  const normalizedEmail = email.trim().toLowerCase();
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: "Địa chỉ email không đúng định dạng." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Mật khẩu phải có độ dài từ 6 ký tự trở lên." });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ message: "Mật khẩu xác nhận không khớp." });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Email này đã được đăng ký tài khoản." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, email, password, role, status, email_verified) 
       VALUES (?, ?, ?, 'customer', 'active', TRUE)`,
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công! Đang chuyển hướng..."
    });

  } catch (error) {
    console.error(">>> [MySQL Lỗi đăng ký]:", error);
    return res.status(500).json({
      message: "Lỗi hệ thống khi lưu tài khoản: " + (error.sqlMessage || error.message)
    });
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

    req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role || "customer" };
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
