/**
 * Supabase 管理員認證客戶端
 * 用於登入、驗證和管理管理員帳號密碼
 */

// 從 HTML 中獲取 Supabase 配置（如果存在）
function getSupabaseConfig() {
  const configEl = document.getElementById('supabase-config');
  if (configEl) {
    try {
      return JSON.parse(configEl.textContent);
    } catch (e) {
      console.error('Failed to parse Supabase config:', e);
    }
  }
  return null;
}

// 初始化 Supabase 客戶端
let supabaseClient = null;

async function initSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const config = getSupabaseConfig();
  if (!config || !config.url || !config.anonKey) {
    console.error('Supabase configuration not found');
    return null;
  }

  // 等待 Supabase 庫載入
  if (typeof window.supabase === 'undefined') {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (typeof window.supabase !== 'undefined') {
          clearInterval(checkInterval);
          supabaseClient = window.supabase.createClient(config.url, config.anonKey);
          resolve(supabaseClient);
        }
      }, 100);

      // 5 秒後超時
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(null);
      }, 5000);
    });
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  return supabaseClient;
}

/**
 * 驗證管理員帳號密碼
 * @param {string} username - 帳號
 * @param {string} password - 密碼
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function verifyAdminCredentials(username, password) {
  try {
    const client = await initSupabaseClient();
    if (!client) {
      return { success: false, error: '無法連接到 Supabase' };
    }

    // 查詢管理員帳號
    const { data, error } = await client
      .from('admin_credentials')
      .select('id, username, password_hash')
      .eq('username', username)
      .single();

    if (error || !data) {
      return { success: false, error: '帳號不存在' };
    }

    // 驗證密碼（使用 Supabase 的 RPC 函數進行驗證）
    const { data: verifyResult, error: verifyError } = await client
      .rpc('verify_admin_password', {
        p_username: username,
        p_password: password
      });

    if (verifyError || !verifyResult) {
      return { success: false, error: '帳號或密碼錯誤' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 變更管理員密碼
 * @param {string} username - 帳號
 * @param {string} currentPassword - 目前密碼
 * @param {string} newPassword - 新密碼
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function changeAdminPassword(username, currentPassword, newPassword) {
  try {
    const client = await initSupabaseClient();
    if (!client) {
      return { success: false, error: '無法連接到 Supabase' };
    }

    // 先驗證目前密碼
    const verifyResult = await verifyAdminCredentials(username, currentPassword);
    if (!verifyResult.success) {
      return { success: false, error: '目前密碼不正確' };
    }

    // 使用 RPC 函數更新密碼
    const { data, error } = await client
      .rpc('update_admin_password', {
        p_username: username,
        p_new_password: newPassword
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 設定登入狀態
 * @param {boolean} loggedIn - 登入狀態
 * @param {number} expiryHours - 過期時間（小時）
 */
function setAdminAuthStatus(loggedIn, expiryHours = 24) {
  const expiry = Date.now() + (expiryHours * 60 * 60 * 1000);
  localStorage.setItem('adminAuth', JSON.stringify({ loggedIn, expiry }));
}

/**
 * 取得登入狀態
 * @returns {boolean}
 */
function getAdminAuthStatus() {
  try {
    const auth = JSON.parse(localStorage.getItem('adminAuth') || '{}');
    return auth.loggedIn && auth.expiry > Date.now();
  } catch {
    return false;
  }
}

/**
 * 清除登入狀態
 */
function clearAdminAuthStatus() {
  localStorage.removeItem('adminAuth');
}

/**
 * 檢查並重定向到登入頁面（如果未登入）
 * @returns {boolean}
 */
function checkAdminAuth() {
  if (!getAdminAuthStatus()) {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

