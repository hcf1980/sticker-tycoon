/**
 * Netlify Identity Admin Auth Helper
 * 統一管理後台的登入、登出與權限檢查
 */

// 檢查使用者是否已登入且具備 'admin' 權限
// 如果未通過，則自動跳轉到登入頁面
function protectPage() {
  if (!window.netlifyIdentity) {
    console.error('Netlify Identity widget not loaded.');
    return;
  }

  // 初始化 Netlify Identity
  window.netlifyIdentity.init();

  const user = window.netlifyIdentity.currentUser();

  // 如果是登入頁，但使用者已登入，則跳轉到管理首頁
  if (window.location.pathname.includes('/admin/login.html')) {
    if (user) {
      window.location.href = '/admin/';
    }
    return; // 在登入頁不執行後續權限檢查
  }

  // 在其他管理頁面，檢查是否登入
  if (!user) {
    window.location.href = '/admin/login.html';
    return;
  }

  // 檢查是否有 admin 權限
  const roles = user.app_metadata?.roles || [];
  if (!roles.includes('admin')) {
    alert('權限不足，需要 admin 角色。請聯繫管理員。');
    window.netlifyIdentity.logout();
    window.location.href = '/admin/login.html';
    return;
  }
}

// 設定導覽列的登入/登出按鈕狀態與事件
function setupAuthUI() {
  const loginBtn = document.querySelector('[data-identity-login]');
  const logoutBtn = document.querySelector('[data-identity-logout]');
  const userDisplay = document.querySelector('[data-identity-user]');

  const user = window.netlifyIdentity?.currentUser();

  if (user) {
    loginBtn?.classList.add('hidden');
    logoutBtn?.classList.remove('hidden');
    if (userDisplay) {
      userDisplay.textContent = user.email;
      userDisplay.classList.remove('hidden');
    }
  } else {
    loginBtn?.classList.remove('hidden');
    logoutBtn?.classList.add('hidden');
    userDisplay?.classList.add('hidden');
  }

  loginBtn?.addEventListener('click', () => window.netlifyIdentity.open('login'));
  logoutBtn?.addEventListener('click', () => window.netlifyIdentity.logout());

  // 監聽登入/登出事件，確保頁面狀態同步
  window.netlifyIdentity.on('login', () => {
    window.location.href = '/admin/';
  });

  window.netlifyIdentity.on('logout', () => {
    window.location.href = '/admin/login.html';
  });
}

// 頁面載入時自動執行保護與 UI 設定
document.addEventListener('DOMContentLoaded', () => {
  protectPage();
  setupAuthUI();
});
