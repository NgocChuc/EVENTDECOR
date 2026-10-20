async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data };
}

// 1. XỬ LÝ ĐĂNG KÝ
const registerForm = document.querySelector("#registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.querySelector("#fullName").value.trim();
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const confirmPassword = document.querySelector("#confirmPassword").value;
    const message = document.querySelector("#message");
    const button = registerForm.querySelector("button");

    if (password !== confirmPassword) {
      message.textContent = "Mật khẩu xác nhận không khớp.";
      message.className = "mb-3 font-semibold text-danger";
      return;
    }

    button.disabled = true;
    message.textContent = "Đang đăng ký...";
    message.className = "mb-3 font-semibold text-primary";

    try {
      // ĐÃ BỔ SUNG confirmPassword VÀO ĐÂY
      const { response, data } = await postJson("/api/register", {
        fullName,
        email,
        password,
        confirmPassword,
      });

      message.textContent = data.message;

      if (response.ok) {
        message.className = "mb-3 font-semibold text-success";
        registerForm.reset();
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        message.className = "mb-3 font-semibold text-danger";
      }
    } catch (error) {
      message.textContent = "Không thể kết nối máy chủ.";
      message.className = "mb-3 font-semibold text-danger";
    } finally {
      button.disabled = false;
    }
  });
}

// 2. XỬ LÝ QUÊN MẬT KHẨU
const forgotForm = document.querySelector("#forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#email").value.trim();
    const message = document.querySelector("#message");
    const button = forgotForm.querySelector("button");

    button.disabled = true;
    message.textContent = "Đang xử lý yêu cầu...";

    try {
      const { response, data } = await postJson("/api/forgot-password", { email });
      message.textContent = data.message;
      if (response.ok) forgotForm.reset();
    } catch (error) {
      message.textContent = "Không thể kết nối máy chủ.";
    } finally {
      button.disabled = false;
    }
  });
}

// 3. XỬ LÝ ĐẶT LẠI MẬT KHẨU
const resetForm = document.querySelector("#resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.querySelector("#password").value;
    const confirmPassword = document.querySelector("#confirmPassword").value;
    const message = document.querySelector("#message");
    const button = resetForm.querySelector("button");

    if (password !== confirmPassword) {
      message.textContent = "Hai mật khẩu không khớp.";
      return;
    }

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      message.textContent = "Liên kết đặt lại mật khẩu không hợp lệ.";
      return;
    }

    button.disabled = true;
    message.textContent = "Đang cập nhật mật khẩu...";

    try {
      const { response, data } = await postJson("/api/reset-password", {
        token,
        password,
        confirmPassword,
      });

      message.textContent = data.message;
      if (response.ok) {
        resetForm.reset();
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    } catch (error) {
      message.textContent = "Không thể kết nối máy chủ.";
    } finally {
      button.disabled = false;
    }
  });
}