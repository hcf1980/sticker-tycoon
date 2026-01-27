/**
 * Admin Coupons API
 * - 建立/列出/更新/切換啟用狀態/重新生成券圖
 *
 * 安全性：
 * - 使用 SUPABASE_SERVICE_ROLE_KEY
 * - 另外以 ADMIN_API_KEY（環境變數）做最小化保護
 */

const { z } = require('zod');
const { getSupabaseClient } = require('./supabase-client');
const { generateImage } = require('./utils/ai-api-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Api-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

function requireAdmin(event) {
  const required = process.env.ADMIN_API_KEY;
  if (!required) {
    console.warn('⚠️ ADMIN_API_KEY 未設定：管理 API 將缺少額外保護');
    return;
  }

  const key = event.headers?.['x-admin-api-key'] || event.headers?.['X-Admin-Api-Key'];
  if (!key || key !== required) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
}

function json(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function randomRedeemCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = Math.floor(Math.random() * 3) + 5; // 5~7
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function generateUniqueRedeemCode(supabase, maxAttempts = 8) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const code = randomRedeemCode();
    const { data, error } = await supabase
      .from('coupon_campaigns')
      .select('id')
      .eq('redeem_code', code)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return code;
  }

  throw new Error('Redeem code generation failed');
}

function buildCouponPosterPrompt({
  name,
  slogan,
  tokenAmount,
  redeemCode,
  activateStartAt,
  activateEndAt
}) {
  const safeSlogan = slogan || '貼圖大亨 Sticker Tycoon';

  return `Design a coupon poster that looks like an official LINE promotional banner.

Overall style:
- strict official LINE style, clean and minimal
- dominant LINE green (#06C755) + white background, high contrast
- rounded rectangles, chat-bubble motifs, simple sticker-like badges
- flat design, no heavy neon, no complex textures
- modern, clear, high readability, consistent spacing and grid

Layout requirements (must be big, clear, highly readable, no misspelling):
- Top area: Title: ${name}
- Middle highlight badge: +${tokenAmount} 張 (make it prominent)
- Redeem code block: ${redeemCode} (monospace-like, very readable)
- Validity: ${activateStartAt} ~ ${activateEndAt}
- Brand slogan: ${safeSlogan}

Other constraints:
- no watermark
- no characters, no faces
- size: 1024x768 (4:3 poster)
`;
}

function isDataUrl(url) {
  return typeof url === 'string' && url.startsWith('data:image');
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data url');
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  return { buffer };
}

async function persistCouponImageAndUpdateCampaign(supabase, campaignId, imageUrl) {
  if (!isDataUrl(imageUrl)) {
    console.warn('⚠️ 圖片非 data URL（目前不處理 URL 下載），將回報錯誤');
    throw new Error('AI 圖片回傳非 data URL，無法處理');
  }

  const { buffer } = parseDataUrl(imageUrl);
  if (!buffer || buffer.length === 0) {
    throw new Error('無法取得圖片 buffer');
  }

  const bucket = 'coupons';
  const filePath = `campaigns/${campaignId}.png`;

  try {
    await supabase.storage.createBucket(bucket, { public: true });
  } catch (_) {
    // bucket already exists
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  const { data: updated, error: updateError } = await supabase
    .from('coupon_campaigns')
    .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .select('*')
    .single();

  if (updateError) throw updateError;
  return updated;
}

  const bucket = 'coupons';
  const filePath = `campaigns/${campaignId}.png`;

  try {
    await supabase.storage.createBucket(bucket, { public: true });
  } catch (_) {
    // bucket already exists
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, finalImageBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  const { data: updated, error: updateError } = await supabase
    .from('coupon_campaigns')
    .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .select('*')
    .single();

  if (updateError) throw updateError;
  return updated;
}


async function createCampaign(event) {
  requireAdmin(event);

  const schema = z.object({
    name: z.string().min(1),
    slogan: z.string().optional().nullable(),
    tokenAmount: z.number().int().positive(),
    claimStartAt: z.string().min(1),
    claimEndAt: z.string().min(1),
    activateStartAt: z.string().min(1),
    activateEndAt: z.string().min(1)
  });

  const body = schema.parse(JSON.parse(event.body || '{}'));

  const supabase = getSupabaseClient();
  const redeemCode = await generateUniqueRedeemCode(supabase);

  const insertPayload = {
    name: body.name,
    slogan: body.slogan || null,
    token_amount: body.tokenAmount,
    redeem_code: redeemCode,
    claim_start_at: body.claimStartAt,
    claim_end_at: body.claimEndAt,
    activate_start_at: body.activateStartAt,
    activate_end_at: body.activateEndAt,
    is_active: true
  };

  const { data: created, error: insertError } = await supabase
    .from('coupon_campaigns')
    .insert([insertPayload])
    .select('*')
    .single();

  if (insertError) throw insertError;

  const prompt = buildCouponPosterPrompt({
    name: created.name,
    slogan: created.slogan,
    tokenAmount: created.token_amount,
    redeemCode: created.redeem_code,
    activateStartAt: new Date(created.activate_start_at).toISOString().slice(0, 10),
    activateEndAt: new Date(created.activate_end_at).toISOString().slice(0, 10)
  });

  let imageUrl = null;
  try {
    imageUrl = await generateImage(prompt, { size: '1024x768' });
  } catch (e) {
    console.error('❌ 生成優惠券圖失敗:', e.message);
  }

  if (imageUrl) {
    const updated = await persistCouponImageAndUpdateCampaign(supabase, created.id, imageUrl);
    return json(200, { success: true, campaign: updated });
  }

  return json(200, { success: true, campaign: created, imageWarning: 'image_generation_failed' });
}

async function regenerateImage(event) {
  requireAdmin(event);

  const schema = z.object({
    campaignId: z.string().uuid(),
    extraPrompt: z.string().optional().nullable()
  });

  const body = schema.parse(JSON.parse(event.body || '{}'));
  const supabase = getSupabaseClient();

  const { data: campaign, error } = await supabase
    .from('coupon_campaigns')
    .select('*')
    .eq('id', body.campaignId)
    .single();

  if (error) throw error;
  if (!campaign) return json(404, { error: 'Campaign not found' });

  let prompt = buildCouponPosterPrompt({
    name: campaign.name,
    slogan: campaign.slogan,
    tokenAmount: campaign.token_amount,
    redeemCode: campaign.redeem_code,
    activateStartAt: new Date(campaign.activate_start_at).toISOString().slice(0, 10),
    activateEndAt: new Date(campaign.activate_end_at).toISOString().slice(0, 10)
  });

  if (body.extraPrompt) {
    prompt += `\nExtra constraints from admin:\n${body.extraPrompt}\n`;
  }

  const imageUrl = await generateImage(prompt, { size: '1024x768' });
  const updated = await persistCouponImageAndUpdateCampaign(supabase, campaign.id, imageUrl);

  return json(200, { success: true, campaign: updated });
}

async function listCampaigns(event) {
  requireAdmin(event);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('coupon_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return json(200, { success: true, campaigns: data || [] });
}

async function setActive(event) {
  requireAdmin(event);

  const schema = z.object({
    campaignId: z.string().uuid(),
    isActive: z.boolean()
  });

  const body = schema.parse(JSON.parse(event.body || '{}'));
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('coupon_campaigns')
    .update({ is_active: body.isActive, updated_at: new Date().toISOString() })
    .eq('id', body.campaignId)
    .select('*')
    .single();

  if (error) throw error;
  return json(200, { success: true, campaign: data });
}

async function updateCampaign(event) {
  requireAdmin(event);

  const schema = z.object({
    campaignId: z.string().uuid(),
    name: z.string().min(1),
    slogan: z.string().optional().nullable(),
    tokenAmount: z.number().int().positive(),
    claimStartAt: z.string().min(1),
    claimEndAt: z.string().min(1),
    activateStartAt: z.string().min(1),
    activateEndAt: z.string().min(1),
    isActive: z.boolean()
  });

  const body = schema.parse(JSON.parse(event.body || '{}'));
  const supabase = getSupabaseClient();

  const updatePayload = {
    name: body.name,
    slogan: body.slogan || null,
    token_amount: body.tokenAmount,
    claim_start_at: body.claimStartAt,
    claim_end_at: body.claimEndAt,
    activate_start_at: body.activateStartAt,
    activate_end_at: body.activateEndAt,
    is_active: body.isActive,
    updated_at: new Date().toISOString()
  };

  const { data: updated, error: updateError } = await supabase
    .from('coupon_campaigns')
    .update(updatePayload)
    .eq('id', body.campaignId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  return json(200, { success: true, campaign: updated });
}

async function deleteCampaign(event) {
  requireAdmin(event);

  const schema = z.object({
    campaignId: z.string().uuid()
  });

  const body = schema.parse(JSON.parse(event.body || '{}'));
  const supabase = getSupabaseClient();

  // 策略 A：若已有兌換紀錄，禁止刪除（改用停用）
  const { count, error: countError } = await supabase
    .from('coupon_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', body.campaignId);

  if (countError) throw countError;

  if ((count || 0) > 0) {
    return json(400, {
      success: false,
      code: 'HAS_REDEMPTIONS',
      error: '此活動已有使用紀錄，為保留歷史資料，無法刪除。請改用停用。'
    });
  }

  // 刪除 storage 券圖（忽略不存在）
  try {
    await supabase.storage.from('coupons').remove([`campaigns/${body.campaignId}.png`]);
  } catch (_) {
    // ignore
  }

  const { error: deleteError } = await supabase
    .from('coupon_campaigns')
    .delete()
    .eq('id', body.campaignId);

  if (deleteError) throw deleteError;

  return json(200, { success: true });
}

async function campaignStats(event) {
  requireAdmin(event);

  const campaignId = event.queryStringParameters?.campaignId;
  if (!campaignId) return json(400, { error: 'Missing campaignId' });

  const supabase = getSupabaseClient();

  const { data: campaign, error: campaignError } = await supabase
    .from('coupon_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError) throw campaignError;

  const { data: redemptions, error: redemptionsError } = await supabase
    .from('coupon_redemptions')
    .select('id, user_id, token_amount, status, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (redemptionsError) throw redemptionsError;

  const userIds = Array.from(new Set((redemptions || []).map(r => r.user_id).filter(Boolean)));

  let users = [];
  if (userIds.length > 0) {
    const [lineRes, webRes] = await Promise.all([
      supabase
        .from('users')
        .select('line_user_id, display_name, picture_url')
        .in('line_user_id', userIds),
      supabase
        .from('users')
        .select('auth_user_id, display_name, picture_url')
        .in('auth_user_id', userIds)
    ]);

    users = [
      ...(lineRes.data || []).map(u => ({ user_id: u.line_user_id, display_name: u.display_name, picture_url: u.picture_url })),
      ...(webRes.data || []).map(u => ({ user_id: u.auth_user_id, display_name: u.display_name, picture_url: u.picture_url }))
    ];
  }

  const userMap = new Map(users.map(u => [u.user_id, u]));

  const enriched = (redemptions || []).map(r => ({
    ...r,
    user: userMap.get(r.user_id) || null
  }));

  const total = enriched.length;
  const byStatus = enriched.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return json(200, {
    success: true,
    campaign,
    stats: {
      total,
      byStatus
    },
    redemptions: enriched
  });
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const action = event.queryStringParameters?.action;

    if (event.httpMethod === 'POST' && action === 'create-campaign') {
      return await createCampaign(event);
    }

    if (event.httpMethod === 'POST' && action === 'regenerate-image') {
      return await regenerateImage(event);
    }

    if (event.httpMethod === 'POST' && action === 'set-active') {
      return await setActive(event);
    }

    if (event.httpMethod === 'POST' && action === 'update-campaign') {
      return await updateCampaign(event);
    }

    if (event.httpMethod === 'GET' && action === 'list-campaigns') {
      return await listCampaigns(event);
    }

    if (event.httpMethod === 'GET' && action === 'campaign-stats') {
      return await campaignStats(event);
    }

    if (event.httpMethod === 'POST' && action === 'delete-campaign') {
      return await deleteCampaign(event);
    }

    return json(400, { error: 'Invalid action' });
  } catch (error) {
    console.error('Admin Coupons API error:', error);
    const statusCode = error.statusCode || 500;

    const details = (() => {
      const original = error?.originalError;
      if (original && typeof original === 'object') {
        return {
          code: original.code,
          details: original.details,
          hint: original.hint,
          message: original.message
        };
      }
      return null;
    })();

    return json(statusCode, {
      success: false,
      error: error.message || 'Internal error',
      statusCode,
      details
    });
  }
};
