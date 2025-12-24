/**
 * Web API: 用戶資料管理
 */

const { createClient } = require('@supabase/supabase-js');
const { getUserByUnifiedId, updateUserProfile, getUserTokenBalance } = require('../services/user-service');
const { getSupabaseClient } = require('../supabase-client');

function getSupabaseAuthClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

// 驗證用戶 Token
async function verifyUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabaseAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 驗證用戶
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const authUser = await verifyUser(authHeader);

    if (!authUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '請先登入' })
      };
    }

    const userId = authUser.id;

    // GET - 取得用戶資料
    if (event.httpMethod === 'GET') {
      const user = await getUserByUnifiedId(userId, 'web');

      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '用戶不存在' })
        };
      }

      // 取得代幣明細
      const supabase = getSupabaseClient();
      const { data: tokenLedger } = await supabase
        .from('token_ledger')
        .select('*')
        .eq('user_id', userId)
        .gt('remaining_tokens', 0)
        .eq('is_expired', false)
        .order('expires_at', { ascending: true });

      // 取得最近交易
      const { data: transactions } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

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
            referralCount: user.referral_count || 0,
            lineUserId: user.line_user_id,
            isLineBound: !!user.line_user_id,
            createdAt: user.created_at
          },
          tokenDetails: tokenLedger?.map(t => ({
            tokens: t.remaining_tokens,
            expiresAt: t.expires_at,
            source: t.source_type
          })) || [],
          recentTransactions: transactions || []
        })
      };
    }

    // PUT - 更新用戶資料
    if (event.httpMethod === 'PUT') {
      const { displayName, pictureUrl } = JSON.parse(event.body || '{}');

      const updates = {};
      if (displayName) updates.display_name = displayName;
      if (pictureUrl) updates.picture_url = pictureUrl;

      if (Object.keys(updates).length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '請提供要更新的資料' })
        };
      }

      const result = await updateUserProfile(userId, updates);

      if (!result.success) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: result.error })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '更新成功',
          user: {
            displayName: result.user.display_name,
            pictureUrl: result.user.picture_url
          }
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '不支援的方法' })
    };

  } catch (error) {
    console.error('用戶資料 API 錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

