/**
 * 提交 LINE 貼圖上架申請
 * 由 Sticker Tycoon 協助統一上架
 */

const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient, getUploadQueue } = require('./supabase-client');

exports.handler = async function(event) {
  // CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { userId, nameEn, nameZh, price, coverIndex, stickerCount } = JSON.parse(event.body || '{}');

    if (!userId || !nameEn) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: '缺少必要參數' })
      };
    }

    // 驗證售價
    const validPrices = [30, 60, 90, 120, 150];
    const finalPrice = validPrices.includes(price) ? price : 30;

    // 取得佇列
    const queue = await getUploadQueue(userId);
    if (queue.length < 40) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: '需要 40 張貼圖才能申請上架' })
      };
    }

    // 產生申請編號
    const applicationId = `ST${Date.now().toString(36).toUpperCase()}`;

    // 取得封面圖片 URL
    const coverImage = queue[coverIndex] || queue[0];

    // 儲存所有貼圖 URL（JSON 格式）
    const stickerUrls = queue.map((item, i) => ({
      index: i + 1,
      url: item.image_url,
      expression: item.expression || ''
    }));

    const supabase = getSupabaseClient();

    // 儲存上架申請
    const { data, error } = await supabase
      .from('listing_applications')
      .insert({
        application_id: applicationId,
        user_id: userId,
        name_en: nameEn,
        name_zh: nameZh || '',
        price: finalPrice,
        cover_index: coverIndex || 0,
        cover_url: coverImage.image_url,
        sticker_count: queue.length,
        sticker_urls: JSON.stringify(stickerUrls),
        status: 'pending',  // pending, processing, submitted, approved, rejected
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ 儲存申請失敗:', error);
      throw error;
    }

    console.log(`✅ 上架申請已建立: ${applicationId}`);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        applicationId,
        message: '上架申請已提交，預計 3-7 個工作天完成'
      })
    };

  } catch (error) {
    console.error('❌ 提交上架申請失敗:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: error.message || '系統錯誤' })
    };
  }
};

