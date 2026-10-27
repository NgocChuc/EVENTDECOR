/**
 * js/admin/breadcrumb.js
 * Tự động render Breadcrumb dựa trên URL hoặc Route hiện tại
 * Đồng bộ phong cách Light Frosted Glass - EventDecor
 */
(function initBreadcrumb() {
  // Bản đồ định nghĩa cấu trúc phân cấp cho toàn bộ hệ thống
  const routeMap = {
    // ==========================================
    // 1. NHÓM ADMIN & QUẢN TRỊ
    // ==========================================
    'dashboard.html': [
      { name: 'Dashboard', url: null }
    ],
    'accounts.html': [
      { name: 'Quản lý Tài khoản', url: null }
    ],
    'accounts-customers.html': [
      { name: 'Quản lý Tài khoản', url: '/admin/accounts' },
      { name: 'Tài khoản Khách hàng', url: null }
    ],
    'accounts-partners.html': [
      { name: 'Quản lý Tài khoản', url: '/admin/accounts' },
      { name: 'Tài khoản Đối tác', url: null }
    ],
    'accounts-admins.html': [
      { name: 'Quản lý Tài khoản', url: '/admin/accounts' },
      { name: 'Tài khoản Admin', url: null }
    ],
    'services-approval.html': [
      { name: 'Quản lý Dịch vụ', url: '/services' },
      { name: 'Duyệt dịch vụ', url: null }
    ],
    'orders.html': [
      { name: 'Quản lý Đơn hàng', url: null }
    ],
    'reviews.html': [
      { name: 'Quản lý Nhận xét', url: null }
    ],
    'income.html': [
      { name: 'Quản lý Thu nhập', url: null }
    ],
    'salaries.html': [
      { name: 'Quản lý Lương', url: null }
    ],
    'settings.html': [
      { name: 'Cài đặt', url: null }
    ],

    // ==========================================
    // 2. NHÓM CLIENT / KHÁCH HÀNG (EVENTDECOR)
    // ==========================================
    'home.html': [],
    '': [],
    
    // Dịch vụ
    'event.html': [
      { name: 'Khám phá dịch vụ', url: null }
    ],
    'services': [
      { name: 'Khám phá dịch vụ', url: null }
    ],
    
    // Chi tiết dịch vụ
    'detail-event.html': [
      { name: 'Khám phá dịch vụ', url: '/services' },
      { name: 'Chi tiết dịch vụ', url: null }
    ],
    'services/detail': [
      { name: 'Khám phá dịch vụ', url: '/services' },
      { name: 'Chi tiết dịch vụ', url: null }
    ],

    // Giỏ hàng & Thanh toán
    'cart.html': [
      { name: 'Khám phá dịch vụ', url: '/services' },
      { name: 'Giỏ hàng của bạn', url: null }
    ],
    'cart': [
      { name: 'Khám phá dịch vụ', url: '/services' },
      { name: 'Giỏ hàng của bạn', url: null }
    ],
    'payment.html': [
      { name: 'Khám phá dịch vụ', url: '/services' },
      { name: 'Giỏ hàng', url: '/cart' },
      { name: 'Thanh toán đơn dịch vụ', url: null }
    ],
    'payment': [
      { name: 'Khám phá dịch vụ', url: '/services' },
      { name: 'Giỏ hàng', url: '/cart' },
      { name: 'Thanh toán đơn dịch vụ', url: null }
    ],

    // Đối tác
    'partner.html': [
      { name: 'Mạng lưới đối tác', url: null }
    ],
    'partner': [
      { name: 'Mạng lưới đối tác', url: null }
    ],

    // Về chúng tôi & Liên hệ
    'about.html': [
      { name: 'Về chúng tôi', url: null }
    ],
    'about': [
      { name: 'Về chúng tôi', url: null }
    ],
    'aboutus.html': [
      { name: 'Về chúng tôi', url: null }
    ],
    'contact.html': [
      { name: 'Liên hệ tư vấn', url: null }
    ],
    'contact': [
      { name: 'Liên hệ tư vấn', url: null }
    ],

    // Auth
    'login.html': [
      { name: 'Đăng nhập', url: null }
    ],
    'login': [
      { name: 'Đăng nhập', url: null }
    ],
    'register.html': [
      { name: 'Đăng ký', url: null }
    ],
    'register': [
      { name: 'Đăng ký', url: null }
    ],
    'reset-password.html': [
      { name: 'Đặt lại mật khẩu', url: null }
    ],
    'reset-password': [
      { name: 'Đặt lại mật khẩu', url: null }
    ]
  };

  document.addEventListener('DOMContentLoaded', () => {
    const breadcrumbContainer = document.getElementById('breadcrumb');
    if (!breadcrumbContainer) return;

    // Chuẩn hóa pathname: loại bỏ sạch các dấu gạch chéo đầu và cuối
    const pathname = window.location.pathname.replace(/^\/+|\/+\$/g, '');
    const filename = pathname.split('/').pop() || '';

    // Xác định admin hay client
    const isAdmin = window.location.pathname.includes('/admin') || filename.startsWith('dashboard');
    const homeUrl = isAdmin ? '/admin/dashboard' : '/';
    const homeText = 'Trang chủ';

    // Tìm crumbs khớp theo route hoặc filename
    const crumbs = routeMap[pathname] || routeMap[filename] || [];

    // Nếu ở trang chủ (không có cấp con)
    if (crumbs.length === 0) {
      breadcrumbContainer.innerHTML = `
        <ol class="inline-flex items-center text-xs font-medium text-slate-400 select-none">
          <li class="inline-flex items-center" aria-current="page">
            <span class="text-slate-700 font-bold">${homeText}</span>
          </li>
        </ol>
      `;
      return;
    }

    // Bắt đầu chuỗi Breadcrumb
    let html = `
      <ol class="inline-flex items-center text-xs font-medium text-slate-400 select-none">
        <li class="inline-flex items-center">
          <a href="${homeUrl}" class="hover:text-[#790d16] transition-colors">${homeText}</a>
        </li>
    `;

    // Render các cấp con
    crumbs.forEach((crumb, index) => {
      const isLast = index === crumbs.length - 1;

      html += `
        <li class="inline-flex items-center">
          <span class="text-slate-300 mx-2">&rsaquo;</span>
        </li>
      `;

      if (isLast) {
        html += `
          <li aria-current="page">
            <span class="text-slate-700 font-bold">${crumb.name}</span>
          </li>
        `;
      } else {
        html += `
          <li>
            ${
              crumb.url 
                ? `<a href="${crumb.url}" class="hover:text-[#790d16] transition-colors">${crumb.name}</a>` 
                : `<span class="hover:text-[#790d16] cursor-pointer transition-colors">\${crumb.name}</span>`
            }
          </li>
        `;
      }
    });

    html += `</ol>`;
    breadcrumbContainer.innerHTML = html;
  });
})();