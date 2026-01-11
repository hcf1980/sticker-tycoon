/**
 * Coupons API (User-facing)
 * - 兌換優惠券：輸入 redeem code 後立即加代幣
 *
 * 安全性：
 * - 使用 SUPABASE_SERVICE_ROLE_KEY 執行（server-only）
 * - 防重複：DB unique (campaign_id, user_id)
 */

const { z } = require('zod');
const { getSupabaseClient, addTokens } = require('./supabase-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function json(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function normalizeRedeemCode(code) {
  return String(code || '').trim().toUpperCase();
}

async function redeem(event) {
  const schema = z.object({
    userId: z.string().min(1),
    redeemCode: z.string().min(1)
  });

  const body = schema.parse(JSON.parse(event.body || '{}'));

  const userId = body.userId;
  const redeemCode = normalizeRedeemCode(body.redeemCode);
  const supabase = getSupabaseClient();

  const { data: campaign, error: campaignError } = await supabase
    .from('coupon_campaigns')
    .select('*')
    .eq('redeem_code', redeemCode)
    .single();

  if (campaignError || !campaign) {
    // 不透露是否存在（避免猜碼），統一訊息
    return json(400, { success: false, error: '兌換碼無效或已過期' });
  }

  const now = new Date();
  const claimStart = new Date(campaign.claim_start_at);
  const claimEnd = new Date(campaign.claim_end_at);
  const activateStart = new Date(campaign.activate_start_at);
  const activateEnd = new Date(campaign.activate_end_at);

  const status = (() => {
    if (!campaign.is_active) return 'inactive';
    if (now < claimStart || now > claimEnd) return 'not_in_claim_window';
    if (now < activateStart || now > activateEnd) return 'not_in_activate_window';
    return 'success';
  })();

  // 先 insert redemption：
  // - 成功會保證「每人每活動一次」
  // - 若重複會 23505
  const redemptionPayload = {
    campaign_id: campaign.id,
    user_id: userId,
    redeem_code: redeemCode,
    token_amount: campaign.token_amount,
    status
  };

  const { data: redemption, error: redemptionError } = await supabase
    .from('coupon_redemptions')
    .insert([redemptionPayload])
    .select('*')
    .single();

  if (redemptionError) {
    if (redemptionError.code === '23505') {
      return json(200, {
        success: false,
        error: '你已經使用過此優惠券囉',
        code: 'already_used'
      });
    }

    console.error('coupon_redemptions insert failed:', redemptionError);
    return json(500, { success: false, error: '系統錯誤，請稍後再試' });
  }

  if (status !== 'success') {
    // 記錄已寫入（避免重試），但不發幣
    return json(200, { success: false, error: '兌換碼無效或已過期', code: status });
  }

  // 加代幣：走既有統一 addTokens（會寫 users.sticker_credits + token_ledger(30天) + token_transactions）
  const addRes = await addTokens(
    userId,
    campaign.token_amount,
    'coupon_redeem',
    `優惠券活動：${campaign.name} (${redeemCode})`
  );

  if (!addRes.success) {
    // 這裡的取捨：redemption 已寫入 success，但發幣失敗。
    // 由於系統已經有 token_transactions 可稽核，管理端可補發。
    await supabase
      .from('coupon_redemptions')
      .update({ status: 'token_grant_failed' })
      .eq('id', redemption.id);

    return json(500, { success: false, error: '代幣發放失敗，請聯繫客服', code: 'token_grant_failed' });
  }

  return json(200, {
    success: true,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      tokenAmount: campaign.token_amount,
      redeemCode: campaign.redeem_code,
      imageUrl: campaign.image_url
    },
    balance: addRes.balance
  });
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const action = event.queryStringParameters?.action;
    if (event.httpMethod === 'POST' && action === 'redeem') {
      return await redeem(event);
    }

    return json(400, { error: 'Invalid action' });
  } catch (error) {
    console.error('Coupons API error:', error);
    return json(500, { error: error.message || 'Internal error' });
  }
};
