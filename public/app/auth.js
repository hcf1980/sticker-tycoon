/**
 * 網頁版認證模組
 * 處理登入、註冊、Token 管理
 */

const API_BASE = '/.netlify/functions/web-api';

// Token 儲存鍵
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sticker_access_token',
  REFRESH_TOKEN: 'sticker_refresh_token',
  USER: 'sticker_user',
  EXPIRES_AT: 'sticker_expires_at'
};

/**
 * 儲存登入資訊
 */
function saveAuthData(session, user) {
  if (session) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refreshToken);
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, session.expiresAt);
  }
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
}

/**
 * 清除登入資訊
 */
function clearAuthData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * 取得存取 Token
 */
function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * 取得當前用戶
 */
function getCurrentUser() {
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * 檢查是否已登入
 */
function isLoggedIn() {
  const token = getAccessToken();
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  
  if (!token) return false;
  
  // 檢查是否過期
  if (expiresAt) {
    const expiresTime = new Date(expiresAt * 1000).getTime();
    if (Date.now() > expiresTime - 60000) {  // 提前 1 分鐘視為過期
      return false;
    }
  }
  
  return true;
}

/**
 * 註冊
 */
async function register(email, password, displayName = null) {
  try {
    const response = await fetch(`${API_BASE}/auth-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '註冊失敗');
    }

    // 如果有 session，自動登入
    if (data.session) {
      saveAuthData(data.session, data.user);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 登入
 */
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '登入失敗');
    }

    saveAuthData(data.session, data.user);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 登出
 */
function logout() {
  clearAuthData();
  window.location.href = '/app/login.html';
}

/**
 * 刷新 Token
 */
async function refreshToken() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  
  if (!refreshToken) {
    clearAuthData();
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/auth-refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();

    if (!response.ok) {
      clearAuthData();
      return false;
    }

    saveAuthData(data.session, null);
    return true;
  } catch (error) {
    clearAuthData();
    return false;
  }
}

/**
 * 驗證並取得用戶資料
 */
async function verifyAndGetUser() {
  const token = getAccessToken();
  
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/auth-verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Token 可能過期，嘗試刷新
      const refreshed = await refreshToken();
      if (refreshed) {
        return verifyAndGetUser();  // 重試
      }
      clearAuthData();
      return null;
    }

    // 更新本地用戶資料
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    return data.user;
  } catch (error) {
    console.error('驗證失敗:', error);
    return null;
  }
}

/**
 * 發送需要認證的 API 請求
 */
async function authFetch(url, options = {}) {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('請先登入');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  let response = await fetch(url, { ...options, headers });

  // 如果 401，嘗試刷新 Token
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(url, { ...options, headers });
    } else {
      clearAuthData();
      window.location.href = '/app/login.html';
      throw new Error('登入已過期，請重新登入');
    }
  }

  return response;
}

/**
 * 要求登入（用於保護頁面）
 */
async function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/app/login.html';
    return null;
  }

  const user = await verifyAndGetUser();
  if (!user) {
    window.location.href = '/app/login.html';
    return null;
  }

  return user;
}

// 導出到全域
window.StickerAuth = {
  register,
  login,
  logout,
  isLoggedIn,
  getCurrentUser,
  getAccessToken,
  verifyAndGetUser,
  authFetch,
  requireAuth
};

