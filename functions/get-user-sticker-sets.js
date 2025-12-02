/**
 * 取得用戶的所有貼圖組 API
 * 包含每組的所有貼圖
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '缺少 userId 參數' })
      };
    }

    const supabase = getSupabaseClient();

    // 1. 取得用戶的所有貼圖組（已完成的）
    const { data: sets, error: setsError } = await supabase
      .from('sticker_sets')
      .select('set_id, name, style, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (setsError) {
      console.error('取得貼圖組失敗:', setsError);
      throw setsError;
    }

    if (!sets || sets.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, sets: [], totalStickers: 0 })
      };
    }

    // 2. 取得每組的貼圖
    const setIds = sets.map(s => s.set_id);
    const { data: stickers, error: stickersError } = await supabase
      .from('stickers')
      .select('sticker_id, set_id, image_url, expression, index_number')
      .in('set_id', setIds)
      .order('index_number', { ascending: true });

    if (stickersError) {
      console.error('取得貼圖失敗:', stickersError);
      throw stickersError;
    }

    // 3. 整理資料：將貼圖分配到對應的組
    const stickersBySet = {};
    (stickers || []).forEach(sticker => {
      if (!stickersBySet[sticker.set_id]) {
        stickersBySet[sticker.set_id] = [];
      }
      stickersBySet[sticker.set_id].push(sticker);
    });

    const result = sets.map(set => ({
      ...set,
      stickers: stickersBySet[set.set_id] || []
    }));

    const totalStickers = stickers?.length || 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sets: result,
        totalSets: sets.length,
        totalStickers: totalStickers
      })
    };

  } catch (error) {
    console.error('❌ 取得用戶貼圖組失敗:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '系統錯誤' })
    };
  }
};

