/**
 * Web API: 用戶註冊
 * 使用 Supabase Auth
 */

const { createClient } = require('@supabase/supabase-js');
const { createWebUser, getUserByEmail } = require('./services/user-service');
const { validateRequest } = require('./middleware/validation-middleware');

// 初始化 Supabase Client（使用 anon key 給前端認證用）
function getSupabaseAuthClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 環境變數未設定');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

exports.handler = async (event, context) => {
  // 設定 CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // 處理 CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '只支援 POST 方法' })
    };
  }

  try {
    // 使用驗證中間件驗證輸入
    const { error, data } = validateRequest(event, {
      body: {
        email: 'email',
        password: 'password'
      }
    });

    if (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    const { email, password } = data.body;
    const { displayName } = JSON.parse(event.body || '{}');
    // 檢查 Email 是否已存在
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: '此 Email 已被註冊' })
      };
    }

    // 使用 Supabase Auth 註冊
    const supabase = getSupabaseAuthClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0]
        }
      }
    });

    if (authError) {
      console.error('Supabase Auth 註冊失敗:', authError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: authError.message })
      };
    }

    if (!authData.user) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '註冊失敗，請稍後再試' })
      };
    }

    // 在 users 表建立用戶資料
    const user = await createWebUser(
      authData.user.id,
      email,
      displayName || email.split('@')[0]
    );

    console.log(`✅ 新用戶註冊成功: ${email}`);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: '註冊成功！請查看信箱確認帳號',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          credits: user.sticker_credits,
          referralCode: user.referral_code
        },
        // 如果 Supabase 設定為不需要 email 確認，直接返回 session
        session: authData.session
      })
    };

  } catch (error) {
    console.error('註冊錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

