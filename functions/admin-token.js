/**
 * Admin Token Management API
 * 代幣管理 API
 */

const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const action = event.queryStringParameters?.action;
  const db = getSupabase();

  try {
    switch (action) {
      case 'users':
        return await getUsers(db);
      case 'adjust':
        if (event.httpMethod !== 'POST') {
          return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
        }
        return await adjustTokens(db, JSON.parse(event.body));
      case 'update-user':
        if (event.httpMethod !== 'POST') {
          return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
        }
        return await updateUserInfo(db, JSON.parse(event.body));
      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }
  } catch (error) {
    console.error('Admin Token API error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

async function getUsers(db) {
  // 取得所有用戶及其貼圖組數量
  const { data: users, error: userError } = await db
    .from('users')
    .select('line_user_id, display_name, picture_url, sticker_credits, admin_nickname, transfer_code, created_at')
    .order('created_at', { ascending: false });

  if (userError) throw userError;

  // 取得每個用戶的貼圖組數量
  const { data: stickerCounts } = await db
    .from('sticker_sets')
    .select('user_id');

  const countMap = {};
  (stickerCounts || []).forEach(s => {
    countMap[s.user_id] = (countMap[s.user_id] || 0) + 1;
  });

  const enrichedUsers = (users || []).map(u => ({
    ...u,
    sticker_count: countMap[u.line_user_id] || 0
  }));

  // 計算統計
  const totalTokens = enrichedUsers.reduce((sum, u) => sum + (u.sticker_credits || 0), 0);

  // 今日交易統計
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: todayTx } = await db
    .from('token_transactions')
    .select('amount, transaction_type')
    .gte('created_at', today.toISOString());

  let todaySpent = 0, todayAdded = 0;
  (todayTx || []).forEach(tx => {
    if (tx.amount < 0) todaySpent += Math.abs(tx.amount);
    else if (tx.transaction_type === 'purchase' || tx.transaction_type === 'admin_adjust') {
      todayAdded += tx.amount;
    }
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      users: enrichedUsers,
      stats: {
        totalUsers: enrichedUsers.length,
        totalTokens,
        todaySpent,
        todayAdded
      }
    })
  };
}

async function adjustTokens(db, body) {
  const { lineUserId, type, amount, note } = body;

  if (!lineUserId || !type || !amount) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing parameters' }) };
  }

  // 取得目前餘額
  const { data: user, error: userError } = await db
    .from('users')
    .select('sticker_credits')
    .eq('line_user_id', lineUserId)
    .single();

  if (userError) throw userError;
  if (!user) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
  }

  const currentBalance = user.sticker_credits || 0;
  let newBalance;
  let txAmount;

  switch (type) {
    case 'add':
      newBalance = currentBalance + amount;
      txAmount = amount;
      break;
    case 'deduct':
      newBalance = Math.max(0, currentBalance - amount);
      txAmount = -Math.min(amount, currentBalance);
      break;
    case 'set':
      newBalance = amount;
      txAmount = amount - currentBalance;
      break;
    default:
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type' }) };
  }

  // 更新餘額
  const { error: updateError } = await db
    .from('users')
    .update({ sticker_credits: newBalance, updated_at: new Date().toISOString() })
    .eq('line_user_id', lineUserId);

  if (updateError) throw updateError;

  // 記錄交易
  await db.from('token_transactions').insert([{
    user_id: lineUserId,
    amount: txAmount,
    balance_after: newBalance,
    transaction_type: 'admin_adjust',
    description: `管理員調整：${type === 'add' ? '增加' : type === 'deduct' ? '扣除' : '設定'} ${amount}`,
    admin_note: note || null
  }]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, newBalance })
  };
}

async function updateUserInfo(db, body) {
  const { lineUserId, adminNickname, transferCode } = body;

  if (!lineUserId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing lineUserId' }) };
  }

  const updateData = { updated_at: new Date().toISOString() };
  if (adminNickname !== undefined) updateData.admin_nickname = adminNickname || null;
  if (transferCode !== undefined) updateData.transfer_code = transferCode || null;

  const { error: updateError } = await db
    .from('users')
    .update(updateData)
    .eq('line_user_id', lineUserId);

  if (updateError) throw updateError;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}
