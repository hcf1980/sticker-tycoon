/**
 * 批次加入待上傳佇列 API
 * 一次加入多張貼圖到佇列
 */

const { getSupabaseClient } = require('./supabase-client');

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, stickers } = body;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '缺少 userId 參數' })
      };
    }

    if (!stickers || !Array.isArray(stickers) || stickers.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '請選擇至少一張貼圖' })
      };
    }

    const supabase = getSupabaseClient();

    // 1. 取得目前佇列數量
    const { count: currentCount } = await supabase
      .from('upload_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const available = 40 - (currentCount || 0);
    if (available <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '待上傳佇列已滿（40張）' })
      };
    }

    // 2. 取得已在佇列中的貼圖 ID（避免重複加入）
    const { data: existingItems } = await supabase
      .from('upload_queue')
      .select('sticker_id')
      .eq('user_id', userId);

    const existingIds = new Set((existingItems || []).map(item => item.sticker_id));

    // 3. 過濾掉已存在的，並限制數量
    const toAdd = stickers
      .filter(s => !existingIds.has(s.sticker_id))
      .slice(0, available);

    if (toAdd.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '所選貼圖都已在佇列中' })
      };
    }

    // 4. 批次插入
    const insertData = toAdd.map((s, index) => ({
      user_id: userId,
      sticker_id: s.sticker_id,
      source_set_id: s.set_id,
      image_url: s.image_url,
      expression: s.expression || '',
      queue_order: (currentCount || 0) + index + 1
    }));

    const { data, error } = await supabase
      .from('upload_queue')
      .insert(insertData)
      .select();

    if (error) {
      console.error('批次插入失敗:', error);
      throw error;
    }

    const newCount = (currentCount || 0) + toAdd.length;

    console.log(`✅ 用戶 ${userId} 批次加入 ${toAdd.length} 張貼圖到佇列，目前共 ${newCount} 張`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        addedCount: toAdd.length,
        skippedCount: stickers.length - toAdd.length,
        newCount: newCount,
        isReady: newCount >= 40
      })
    };

  } catch (error) {
    console.error('❌ 批次加入佇列失敗:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '系統錯誤：' + error.message })
    };
  }
};

