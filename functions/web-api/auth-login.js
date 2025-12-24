/**
 * Web API: 用戶登入
 * 使用 Supabase Auth
 */

const { createClient } = require('@supabase/supabase-js');
const { getUserByEmail, getUserByUnifiedId } = require('../services/user-service');

function getSupabaseAuthClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 環境變數未設定');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '請提供 Email 和密碼' })
      };
    }

    // 使用 Supabase Auth 登入
    const supabase = getSupabaseAuthClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('登入失敗:', authError);
      
      if (authError.message.includes('Invalid login credentials')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Email 或密碼錯誤' })
        };
      }

      if (authError.message.includes('Email not confirmed')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '請先確認您的 Email' })
        };
      }

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError.message })
      };
    }

    if (!authData.user || !authData.session) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '登入失敗，請稍後再試' })
      };
    }

    // 取得用戶資料
    const user = await getUserByUnifiedId(authData.user.id, 'web');

    if (!user) {
      // 用戶在 auth 存在但 users 表沒有，可能是舊帳號
      console.warn(`用戶存在於 Auth 但不在 users 表: ${email}`);
    }

    console.log(`✅ 用戶登入成功: ${email}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '登入成功',
        user: user ? {
          id: user.id,
          authUserId: user.auth_user_id,
          email: user.email,
          displayName: user.display_name,
          pictureUrl: user.picture_url,
          credits: user.sticker_credits,
          referralCode: user.referral_code,
          lineUserId: user.line_user_id,
          isLineBound: !!user.line_user_id
        } : null,
        session: {
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresAt: authData.session.expires_at
        }
      })
    };

  } catch (error) {
    console.error('登入錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

