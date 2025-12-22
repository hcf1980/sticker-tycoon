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

  // 如果是增加代幣，同步更新 token_ledger（含有效期 30 天）
  if (txAmount > 0) {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 天後過期

    await db.from('token_ledger').insert([{
      user_id: lineUserId,
      tokens: txAmount,
      remaining_tokens: txAmount,
      source_type: 'admin',
      source_order_id: null,
      source_description: `管理員調整：${note || '手動增加'}`,
      acquired_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_expired: false
    }]);
  }

  // 如果是扣除代幣，使用 FIFO 邏輯從 token_ledger 扣除
  if (txAmount < 0) {
    await deductFromLedger(db, lineUserId, Math.abs(txAmount));
  }

  // 記錄交易
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db.from('token_transactions').insert([{
    user_id: lineUserId,
    amount: txAmount,
    balance_after: newBalance,
    transaction_type: 'admin_adjust',
    description: `管理員調整：${type === 'add' ? '增加' : type === 'deduct' ? '扣除' : '設定'} ${amount}`,
    admin_note: note || null,
    expires_at: txAmount > 0 ? expiresAt.toISOString() : null
  }]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, newBalance })
  };
}

/**
 * 從 token_ledger 使用 FIFO 扣除代幣
 */
async function deductFromLedger(db, userId, amount) {
  // 查詢所有可用代幣（未過期且有剩餘），按到期時間排序
  const { data: ledgers, error } = await db
    .from('token_ledger')
    .select('*')
    .eq('user_id', userId)
    .gt('remaining_tokens', 0)
    .eq('is_expired', false)
    .order('expires_at', { ascending: true }); // FIFO: 最早到期的優先

  if (error) {
    console.error('查詢 token_ledger 失敗:', error);
    return;
  }

  if (!ledgers || ledgers.length === 0) {
    console.warn(`用戶 ${userId} 沒有可用代幣記錄，跳過 ledger 扣除`);
    return;
  }

  // 從最早到期的代幣開始扣除
  let remaining = amount;

  for (const ledger of ledgers) {
    if (remaining <= 0) break;

    const deduct = Math.min(ledger.remaining_tokens, remaining);
    const newRemaining = ledger.remaining_tokens - deduct;

    await db
      .from('token_ledger')
      .update({
        remaining_tokens: newRemaining,
        updated_at: new Date().toISOString()
      })
      .eq('id', ledger.id);

    remaining -= deduct;
  }

  if (remaining > 0) {
    console.warn(`用戶 ${userId} 代幣不足，還需扣除 ${remaining} 代幣`);
  }
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
