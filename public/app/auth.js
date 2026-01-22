/**
 * 網頁版認證模組
 * 處理登入、註冊、Token 管理
 */

window.__STICKER_API_BASE__ = window.__STICKER_API_BASE__ || '/.netlify/functions';
const API_BASE = window.__STICKER_API_BASE__;

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
    const response = await fetch(`${API_BASE}/web-api-auth-register`, {
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
    const response = await fetch(`${API_BASE}/web-api-auth-login`, {
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
  const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

  if (!refreshTokenValue) {
    clearAuthData();
    return { ok: false, reason: 'missing_refresh_token' };
  }

  try {
    const response = await fetch(`${API_BASE}/web-api-auth-refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenValue })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      clearAuthData();
      return { ok: false, reason: 'refresh_failed', error: data?.error || 'Refresh 失敗' };
    }

    if (!data?.session?.accessToken) {
      clearAuthData();
      return { ok: false, reason: 'invalid_refresh_response', error: 'Refresh 回傳格式異常' };
    }

    saveAuthData(data.session, null);
    return { ok: true };
  } catch (error) {
    clearAuthData();
    return { ok: false, reason: 'network_error', error: error?.message || 'Network error' };
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
    const response = await fetch(`${API_BASE}/web-api-auth-verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Token 可能過期，嘗試刷新
      const refreshed = await refreshToken();
      if (refreshed.ok) {
        return verifyAndGetUser();  // 重試
      }

      // 永久改善：明確提示並導回登入
      const reasonText = refreshed.error || data?.error || '登入已過期，請重新登入';
      console.warn('驗證失敗，將導回登入:', { reason: refreshed.reason, reasonText });
      clearAuthData();

      // 避免無限迴圈，帶上原因供登入頁顯示
      window.location.href = `/app/login.html?reason=${encodeURIComponent(reasonText)}`;
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
    if (refreshed.ok) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(url, { ...options, headers });
    } else {
      const reasonText = refreshed.error || '登入已過期，請重新登入';
      clearAuthData();
      window.location.href = `/app/login.html?reason=${encodeURIComponent(reasonText)}`;
      throw new Error(reasonText);
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
/**
 * LINE / Mini App 登入（免帳密）
 * 前端需先取得 LINE access token，再呼叫 /api/auth/line-login
 */
async function loginWithLine(lineAccessToken) {
  try {
    const response = await fetch(`/api/auth/line-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineAccessToken}`
      },
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'LINE 登入失敗');
    }

    saveAuthData(data.session, data.user);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

window.StickerAuth = {
  register,
  login,
  loginWithLine,
  logout,
  isLoggedIn,
  getCurrentUser,
  getAccessToken,
  verifyAndGetUser,
  authFetch,
  requireAuth
};

