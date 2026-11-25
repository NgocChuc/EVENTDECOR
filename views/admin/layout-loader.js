/**
 * layout-loader.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Lấy đường dẫn thư mục hiện tại của trang đang mở
  const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);

  async function loadComponent(containerId, fileName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      // Đảm bảo fetch đúng URL theo thư mục hiện tại
      const targetUrl = new URL(fileName, window.location.href).href;
      const res = await fetch(targetUrl);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - Không tìm thấy file tại ${targetUrl}`);
      }
      container.innerHTML = await res.text();
    } catch (err) {
      console.error(`[Layout Loader] Lỗi tải ${fileName}:`, err);
    }
  }

  // Tải đồng thời cả 2 component
  await Promise.all([
    loadComponent('sidebar-container', 'sidebar-admin.html'),
    loadComponent('header-container', 'header-admin.html')
  ]);

  // Sau khi tải xong thì khởi tạo tương tác
  initSidebarBehavior();
});

function initSidebarBehavior() {
  function setActiveItem(element) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('bg-[#1e3a5f]', 'text-[#60a5fa]');
      link.classList.add('text-[#94a3b8]');
      const oldIndicator = link.querySelector('.active-indicator');
      if (oldIndicator) oldIndicator.remove();
    });

    element.classList.add('bg-[#1e3a5f]', 'text-[#60a5fa]');
    element.classList.remove('text-[#94a3b8]');

    if (!element.querySelector('.active-indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'active-indicator';
      element.prepend(indicator);
    }
  }

  const currentPath = window.location.pathname.split('/').pop();
  const allNavLinks = document.querySelectorAll('.nav-link');
  let matched = false;

  allNavLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath && href.endsWith(currentPath)) {
      setActiveItem(link);
      matched = true;
    }
  });

  if (!matched || currentPath === '' || currentPath === 'index.html' || currentPath === 'dashboard.html') {
    const dashboardLink = document.getElementById('nav-dashboard');
    if (dashboardLink) setActiveItem(dashboardLink);
  }

  function setupAccordion(btnId, menuId, arrowId, urlKeywords) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    const arrow = document.getElementById(arrowId);
    if (!btn || !menu || !arrow) return;

    btn.addEventListener('click', () => {
      const isExpanded = !menu.classList.contains('hidden');
      if (isExpanded) {
        menu.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
        btn.classList.remove('bg-[#15223c]');
      } else {
        menu.classList.remove('hidden');
        arrow.style.transform = 'rotate(90deg)';
        btn.classList.add('bg-[#15223c]');
      }
    });

    const path = window.location.pathname;
    if (urlKeywords.some(kw => path.includes(kw))) {
      menu.classList.remove('hidden');
      arrow.style.transform = 'rotate(90deg)';
      btn.classList.add('bg-[#15223c]');
    }
  }

  setupAccordion('btn-account-toggle', 'account-submenu', 'account-arrow', ['accounts-']);
  setupAccordion('btn-service-toggle', 'service-submenu', 'service-arrow', ['service', 'dich-vu']);
}