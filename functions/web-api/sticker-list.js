/**
 * Web API: 取得用戶的貼圖組列表
 */

const { createClient } = require('@supabase/supabase-js');
const { getSupabaseClient } = require('../supabase-client');

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '只支援 GET 方法' })
    };
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
    const supabase = getSupabaseClient();

    // 取得分頁參數
    const page = parseInt(event.queryStringParameters?.page || '1', 10);
    const limit = parseInt(event.queryStringParameters?.limit || '10', 10);
    const offset = (page - 1) * limit;

    // 取得貼圖組列表
    const { data: stickerSets, error: setError, count } = await supabase
      .from('sticker_sets')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (setError) {
      throw setError;
    }

    // 為每個貼圖組取得封面圖（第一張貼圖）
    const setsWithCovers = await Promise.all(
      (stickerSets || []).map(async (set) => {
        let coverUrl = null;

        // 嘗試從 stickers 表取得
        const { data: firstSticker } = await supabase
          .from('stickers')
          .select('image_url')
          .eq('set_id', set.set_id)
          .eq('index_number', 1)
          .single();

        if (firstSticker?.image_url) {
          coverUrl = firstSticker.image_url;
        } else {
          // 嘗試從 Storage 直接取得
          const { data: urlData } = supabase.storage
            .from('sticker-images')
            .getPublicUrl(`${set.set_id}/1.png`);
          
          if (urlData?.publicUrl) {
            coverUrl = urlData.publicUrl;
          }
        }

        return {
          id: set.id,
          setId: set.set_id,
          name: set.name,
          style: set.style,
          count: set.sticker_count,
          status: set.status,
          coverUrl,
          createdAt: set.created_at,
          source: set.source || 'line'
        };
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stickerSets: setsWithCovers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })
    };

  } catch (error) {
    console.error('取得貼圖組列表錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

