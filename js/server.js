require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const session = require("express-session");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: "chuoi_bi_mat_rat_an_toan",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.use(express.static(path.join(__dirname, "public")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/img", express.static(path.join(__dirname, "img")));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Bạn thao tác quá nhiều. Vui lòng thử lại sau." },
});
app.use("/api", apiLimiter);

// KẾT NỐI DATABASE
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "node_auth_demo", // Đồng bộ tên database
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// CẤU HÌNH MAIL
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+\$/;

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function saveToken(userId, token, purpose) {
  const tokenHash = hashToken(token);
  await pool.execute(
    `INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
    [userId, tokenHash, purpose]
  );
}

async function sendEmail(to, subject, text) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[Giả lập gửi mail] Tới: ${to} | Nội dung: ${text}`);
    return;
  }
  await mailer.sendMail({
    from: `"EventDecor" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
  });
}

// ---------------- API ĐĂNG KÝ ----------------
app.post("/api/register", async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (!fullName || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin hợp lệ." });
  }

  const name = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!name || name.length > 100 || !emailPattern.test(normalizedEmail)) {
    return res.status(400).json({ message: "Họ tên hoặc email không hợp lệ." });
  }

  if (password.length < 6 || password.length > 72) {
    return res.status(400).json({ message: "Mật khẩu phải từ 6 đến 72 ký tự." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Mật khẩu xác nhận không khớp." });
  }

  let userId;
  try {
    const [existing] = await pool.execute("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email này đã được đăng ký." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Lưu thống nhất: username, email, password
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password, email_verified) VALUES (?, ?, ?, TRUE)`,
      [name, normalizedEmail, passwordHash]
    );

    userId = result.insertId;

    return res.status(201).json({
      message: "Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.",
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({ message: "Không thể đăng ký lúc này. Vui lòng thử lại." });
  }
});

// ---------------- ROUTE ĐĂNG NHẬP (ĐÃ THÊM SO KHỚP BCRYPT) ----------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.send("<script>alert('Vui lòng nhập đầy đủ email và mật khẩu!'); window.history.back();</script>");
  }

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);

    if (rows.length === 0) {
      return res.send("<script>alert('Sai email hoặc mật khẩu.'); window.history.back();</script>");
    }

    const user = rows[0];

    // So khớp mật khẩu đã mã hóa bằng bcrypt
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.send("<script>alert('Sai email hoặc mật khẩu.'); window.history.back();</script>");
    }

    // Đăng nhập thành công -> Lưu session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    return res.redirect("/");
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).send("Lỗi hệ thống server.");
  }
});

// ---------------- CÁC ROUTE CÒN LẠI ----------------
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("Kết nối MySQL thành công!");

    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Không thể khởi động server:", error.message);
    process.exit(1);
  }
}

startServer();