/**
 * Web API: 驗證 Token 並取得用戶資料
 * 使用 Supabase Auth JWT 驗證
 */

const { createClient } = require('@supabase/supabase-js');
const { getUserByUnifiedId } = require('./services/user-service');

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 從 Header 取得 Token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '未提供認證 Token' })
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // 驗證 Token
    const supabase = getSupabaseAuthClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token 無效或已過期' })
      };
    }

    // 取得用戶資料
    const user = await getUserByUnifiedId(authUser.id, 'web');

    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '用戶資料不存在' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          authUserId: user.auth_user_id,
          email: user.email,
          displayName: user.display_name,
          pictureUrl: user.picture_url,
          credits: user.sticker_credits,
          referralCode: user.referral_code,
          lineUserId: user.line_user_id,
          isLineBound: !!user.line_user_id,
          userType: user.user_type,
          createdAt: user.created_at
        }
      })
    };

  } catch (error) {
    console.error('驗證錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

