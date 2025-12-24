/**
 * Web API: 查詢貼圖生成狀態
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
    const taskId = event.queryStringParameters?.taskId;

    if (!taskId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '請提供任務 ID' })
      };
    }

    const supabase = getSupabaseClient();

    // 取得任務資料
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .single();

    if (taskError || !task) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '找不到任務或沒有權限' })
      };
    }

    // 取得貼圖組資料
    const { data: stickerSet } = await supabase
      .from('sticker_sets')
      .select('*')
      .eq('set_id', task.set_id)
      .single();

    // 如果已完成，取得貼圖列表
    let stickers = [];
    if (task.status === 'completed') {
      const { data: stickerData } = await supabase
        .from('stickers')
        .select('sticker_id, index_number, expression, image_url, status')
        .eq('set_id', task.set_id)
        .order('index_number', { ascending: true });
      
      stickers = stickerData || [];

      // 如果資料庫沒有貼圖記錄，嘗試從 Storage 取得
      if (stickers.length === 0) {
        const { data: files } = await supabase.storage
          .from('sticker-images')
          .list(task.set_id, { limit: 50 });

        if (files && files.length > 0) {
          stickers = files
            .filter(f => f.name.endsWith('.png'))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((f, i) => {
              const { data: urlData } = supabase.storage
                .from('sticker-images')
                .getPublicUrl(`${task.set_id}/${f.name}`);
              
              return {
                sticker_id: f.id,
                index_number: i + 1,
                expression: `表情 ${i + 1}`,
                image_url: urlData.publicUrl,
                status: 'completed'
              };
            });
        }
      }
    }

    // 解析結果摘要
    let resultSummary = null;
    if (task.result_summary) {
      try {
        resultSummary = JSON.parse(task.result_summary);
      } catch (e) {
        // 忽略解析錯誤
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        task: {
          taskId: task.task_id,
          status: task.status,
          progress: task.progress || 0,
          totalStickers: task.total_stickers,
          createdAt: task.created_at,
          startedAt: task.started_at,
          completedAt: task.completed_at,
          errorMessage: task.error_message,
          resultSummary
        },
        stickerSet: stickerSet ? {
          setId: stickerSet.set_id,
          name: stickerSet.name,
          style: stickerSet.style,
          count: stickerSet.sticker_count,
          status: stickerSet.status
        } : null,
        stickers: stickers.map(s => ({
          id: s.sticker_id,
          index: s.index_number,
          expression: s.expression,
          imageUrl: s.image_url,
          status: s.status
        })),
        // 如果還在處理中，建議的輪詢間隔
        pollInterval: task.status === 'processing' ? 3000 : null
      })
    };

  } catch (error) {
    console.error('查詢狀態錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

