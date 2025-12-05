/**
 * YouTuber 推廣計畫 - 審核申請 API
 * 批准或拒絕申請，並發放前期代幣（50 代幣）
 */

const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('缺少 Supabase 環境變數');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: '只允許 POST 請求' })
    };
  }

  try {
    const { applicationId, approved, reason } = JSON.parse(event.body);

    if (!applicationId || approved === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '缺少必要參數' })
      };
    }

    const sb = getSupabase();

    // 取得申請資訊
    const { data: application, error: fetchError } = await sb
      .from('youtuber_promotions')
      .select('*')
      .eq('application_id', applicationId)
      .single();

    if (fetchError || !application) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: '找不到申請記錄' })
      };
    }

    // 檢查狀態
    if (application.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '此申請已被處理過' })
      };
    }

    const now = new Date().toISOString();
    const newStatus = approved ? 'approved' : 'rejected';

    // 更新申請狀態
    const { error: updateError } = await sb
      .from('youtuber_promotions')
      .update({
        status: newStatus,
        approval_reason: reason || null,
        approved_at: approved ? now : null,
        updated_at: now
      })
      .eq('application_id', applicationId);

    if (updateError) {
      console.error('❌ 更新失敗:', updateError);
      throw updateError;
    }

    // 如果批准，發放前期代幣 50 枚
    if (approved) {
      const initialTokens = 50;
      
      // 根據 line_id 查找用戶
      const { data: user, error: userError } = await sb
        .from('users')
        .select('line_user_id, sticker_credits, display_name')
        .eq('line_user_id', application.line_id)
        .maybeSingle();

      if (userError) {
        console.error('❌ 查找用戶失敗:', userError);
      }

      if (user) {
        // 用戶存在，發放代幣
        const currentBalance = user.sticker_credits || 0;
        const newBalance = currentBalance + initialTokens;

        // 更新用戶代幣
        const { error: tokenUpdateError } = await sb
          .from('users')
          .update({
            sticker_credits: newBalance,
            updated_at: now
          })
          .eq('line_user_id', application.line_id);

        if (tokenUpdateError) {
          console.error('❌ 更新代幣失敗:', tokenUpdateError);
        } else {
          // 記錄交易
          await sb.from('token_transactions').insert([{
            user_id: application.line_id,
            amount: initialTokens,
            balance_after: newBalance,
            transaction_type: 'youtuber_promotion',
            description: `YouTuber 推廣計畫 - 申請通過獎勵`,
            admin_note: `頻道：${application.channel_name}`
          }]);

          console.log(`✅ 已發放 ${initialTokens} 代幣給 ${user.display_name || application.line_id}`);
        }
      } else {
        console.warn(`⚠️ 找不到用戶 ${application.line_id}，代幣將在用戶首次使用時發放`);
        // 可以在這裡記錄待發放代幣，等用戶首次登入時補發
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: approved ? '✅ 已批准申請並發放 50 代幣' : '✅ 已拒絕申請'
      })
    };

  } catch (error) {
    console.error('❌ 伺服器錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: '審核失敗',
        error: error.message
      })
    };
  }
};

