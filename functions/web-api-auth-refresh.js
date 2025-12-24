/**
 * Web API: 刷新 Token
 */

const { createClient } = require('@supabase/supabase-js');

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
    const { refreshToken } = JSON.parse(event.body || '{}');

    if (!refreshToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '請提供 Refresh Token' })
      };
    }

    const supabase = getSupabaseAuthClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Refresh Token 無效或已過期，請重新登入' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at
        }
      })
    };

  } catch (error) {
    console.error('刷新 Token 錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

