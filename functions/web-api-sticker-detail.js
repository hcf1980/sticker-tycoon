/**
 * Web API: 取得貼圖組詳情
 */

const { createClient } = require('@supabase/supabase-js');
const { getSupabaseClient, getStickerImages } = require('./supabase-client');

function getSupabaseAuthClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

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
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
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
    const setId = event.queryStringParameters?.setId;

    if (!setId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '請提供貼圖組 ID' })
      };
    }

    const supabase = getSupabaseClient();

    // GET - 取得詳情
    if (event.httpMethod === 'GET') {
      // 取得貼圖組
      const { data: stickerSet, error: setError } = await supabase
        .from('sticker_sets')
        .select('*')
        .eq('set_id', setId)
        .eq('user_id', userId)
        .single();

      if (setError || !stickerSet) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '找不到貼圖組或沒有權限' })
        };
      }

      // 取得所有貼圖
      const stickers = await getStickerImages(setId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          stickerSet: {
            id: stickerSet.id,
            setId: stickerSet.set_id,
            name: stickerSet.name,
            style: stickerSet.style,
            count: stickerSet.sticker_count,
            status: stickerSet.status,
            framingId: stickerSet.framing_id,
            sceneId: stickerSet.scene_id,
            createdAt: stickerSet.created_at,
            source: stickerSet.source || 'line'
          },
          stickers: stickers.map(s => ({
            id: s.sticker_id,
            index: s.index_number,
            expression: s.expression,
            imageUrl: s.image_url,
            status: s.status
          }))
        })
      };
    }

    // DELETE - 刪除貼圖組
    if (event.httpMethod === 'DELETE') {
      // 確認是用戶自己的貼圖組
      const { data: stickerSet } = await supabase
        .from('sticker_sets')
        .select('id, set_id')
        .eq('set_id', setId)
        .eq('user_id', userId)
        .single();

      if (!stickerSet) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '找不到貼圖組或沒有權限' })
        };
      }

      // 刪除相關任務
      await supabase
        .from('generation_tasks')
        .delete()
        .eq('set_id', setId);

      // 刪除貼圖記錄
      await supabase
        .from('stickers')
        .delete()
        .eq('set_id', setId);

      // 刪除 Storage 中的圖片
      const { data: files } = await supabase.storage
        .from('sticker-images')
        .list(setId);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${setId}/${f.name}`);
        await supabase.storage
          .from('sticker-images')
          .remove(filePaths);
      }

      // 刪除貼圖組
      await supabase
        .from('sticker_sets')
        .delete()
        .eq('id', stickerSet.id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '貼圖組已刪除'
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '不支援的方法' })
    };

  } catch (error) {
    console.error('貼圖組詳情 API 錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

