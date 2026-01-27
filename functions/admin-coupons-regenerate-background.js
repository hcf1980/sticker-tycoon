/**
 * Background: Generate coupon image for a campaign
 *
 * Triggered by admin-coupons (regenerate-image) as a background function.
 *
 * Payload:
 * { campaignId: string(uuid), extraPrompt?: string | null }
 */

const { z } = require('zod');
const { getSupabaseClient } = require('./supabase-client');
const { generateImage } = require('./utils/ai-api-client');
const sharp = require('sharp');
const path = require('path');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Api-Key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function json(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
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

function extractUrlFromText(text) {
  const markdownMatch = text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
  if (markdownMatch) return markdownMatch[1];

  const urlMatch = text.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|webp|gif))/i);
  if (urlMatch) return urlMatch[1];

  const anyUrlMatch = text.match(/(https?:\/\/[^\s\)\]"']+)/);
  if (anyUrlMatch) return anyUrlMatch[1];

  return null;
}

function isHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

async function imageUrlToPngBuffer(imageUrl) {
  if (isDataUrl(imageUrl)) {
    return parseDataUrl(imageUrl).buffer;
  }

  if (isHttpUrl(imageUrl)) {
    const res = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        // 避免部分 CDN 擋預設 UA
        'User-Agent': 'sticker-tycoon/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`下載圖片失敗 (HTTP ${res.status})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer || buffer.length === 0) {
      throw new Error('下載到的圖片內容為空');
    }

    return buffer;
  }

  // 某些模型可能回傳一段文字內含 URL
  const maybeUrl = typeof imageUrl === 'string' ? extractUrlFromText(imageUrl) : null;
  if (maybeUrl && isHttpUrl(maybeUrl)) {
    return await imageUrlToPngBuffer(maybeUrl);
  }

  throw new Error('AI 圖片回傳非 data URL/HTTP URL，無法處理');
}

async function overlayQrOnPoster(posterBuffer) {
  const qrPath = path.resolve(__dirname, '../public/line-qr.png');
  const qrSize = 200;
  const margin = 24;

  try {
    const qrBuffer = await sharp(qrPath).resize(qrSize, qrSize).toBuffer();
    return await sharp(posterBuffer)
      .composite([
        {
          input: qrBuffer,
          top: 768 - qrSize - margin,
          left: 1024 - qrSize - margin
        }
      ])
      .png()
      .toBuffer();
  } catch (e) {
    console.error('❌ QR Code 合成失敗（將使用原圖）:', e.message);
    return posterBuffer;
  }
}

async function persistCouponImageAndUpdateCampaign(supabase, campaignId, imageUrl) {
  const baseBuffer = await imageUrlToPngBuffer(imageUrl);
  if (!baseBuffer || baseBuffer.length === 0) {
    throw new Error('無法取得圖片 buffer');
  }

  const buffer = await overlayQrOnPoster(baseBuffer);

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
    .update({
      image_url: publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
    .select('*')
    .single();

  if (updateError) throw updateError;
  return updated;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const schema = z.object({
      campaignId: z.string().uuid(),
      extraPrompt: z.string().optional().nullable()
    });

    const body = schema.parse(JSON.parse(event.body || '{}'));

    const supabase = getSupabaseClient();

    const { data: campaign, error: campaignError } = await supabase
      .from('coupon_campaigns')
      .select('*')
      .eq('id', body.campaignId)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) return json(404, { success: false, error: 'Campaign not found' });

    const promptBase = buildCouponPosterPrompt({
      name: campaign.name,
      slogan: campaign.slogan,
      tokenAmount: campaign.token_amount,
      redeemCode: campaign.redeem_code,
      activateStartAt: new Date(campaign.activate_start_at).toISOString().slice(0, 10),
      activateEndAt: new Date(campaign.activate_end_at).toISOString().slice(0, 10)
    });

    const prompt = body.extraPrompt
      ? `${promptBase}\nExtra constraints from admin:\n${body.extraPrompt}\n`
      : promptBase;

    const imageUrl = await generateImage(prompt, { size: '1024x768' });
    const updated = await persistCouponImageAndUpdateCampaign(supabase, campaign.id, imageUrl);

    return json(200, { success: true, campaign: updated });
  } catch (error) {
    console.error('Admin Coupons Regenerate Background error:', error);

    try {
      const parsed = (() => {
        try {
          return JSON.parse(event.body || '{}');
        } catch {
          return {};
        }
      })();

      const campaignId = parsed?.campaignId;
      if (campaignId) {
        const supabase = getSupabaseClient();
        await supabase
          .from('coupon_campaigns')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId);
      }
    } catch (e) {
      console.error('Failed to persist background error status:', e.message);
    }

    return json(500, { success: false, error: error.message || 'Internal error' });
  }
};
