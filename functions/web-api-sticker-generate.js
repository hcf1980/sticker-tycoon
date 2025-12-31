/**
 * Web API: 開始生成貼圖（觸發背景任務）
 * 這個 API 會被前端呼叫來啟動生成流程
 */

const { createClient } = require('@supabase/supabase-js');
const { getUserByUnifiedId } = require('./services/user-service');
const { getSupabaseClient } = require('./supabase-client');
const { generateStickersIntelligent } = require('./sticker-generator-enhanced');
const { validateRequest } = require('./middleware/validation-middleware');

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '只支援 POST 方法' })
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

    // 驗證輸入參數
    const { error, data } = validateRequest(event, {
      body: {
        taskId: 'taskId'
      }
    });

    if (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    const userId = authUser.id;
    const { taskId } = data.body;

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

    // 檢查任務狀態
    if (task.status === 'processing') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '任務已在生成中' })
      };
    }

    if (task.status === 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '任務已完成' })
      };
    }

    // 更新任務狀態為處理中
    await supabase
      .from('generation_tasks')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    // 更新貼圖組狀態
    await supabase
      .from('sticker_sets')
      .update({ status: 'generating' })
      .eq('set_id', task.set_id);

    // 解析任務參數
    const expressions = JSON.parse(task.expressions || '[]');
    const sceneConfig = task.scene_config ? JSON.parse(task.scene_config) : null;

    console.log(`🚀 開始生成貼圖: ${taskId}`);
    console.log(`   表情: ${expressions.length} 個`);
    console.log(`   風格: ${task.style}`);

    // 在背景執行生成（不阻塞回應）
    // 注意：Netlify Functions 有時間限制，大型任務可能需要使用 Background Functions
    const generatePromise = generateStickersIntelligent(
      task.photo_data,
      task.style,
      expressions,
      {
        userId,
        setId: task.set_id,
        useGridMode: 'always',
        sceneConfig,
        framingId: task.framing_id,
        characterID: task.character_id
      }
    ).then(async (results) => {
      // 生成完成
      const successCount = results.filter(r => r.status === 'completed').length;
      const totalCount = results.length;

      await supabase
        .from('generation_tasks')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          result_summary: JSON.stringify({
            total: totalCount,
            success: successCount,
            failed: totalCount - successCount
          })
        })
        .eq('task_id', taskId);

      await supabase
        .from('sticker_sets')
        .update({ 
          status: successCount > 0 ? 'completed' : 'failed'
        })
        .eq('set_id', task.set_id);

      console.log(`✅ 任務完成: ${taskId}, 成功: ${successCount}/${totalCount}`);
    }).catch(async (error) => {
      console.error(`❌ 任務失敗: ${taskId}`, error);

      await supabase
        .from('generation_tasks')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('task_id', taskId);

      await supabase
        .from('sticker_sets')
        .update({ status: 'failed' })
        .eq('set_id', task.set_id);
    });

    // 不等待生成完成，立即返回
    // 前端應該輪詢 sticker-status 來取得進度

    return {
      statusCode: 202,  // Accepted
      headers,
      body: JSON.stringify({
        success: true,
        message: '生成已開始',
        taskId,
        status: 'processing',
        statusUrl: `/.netlify/functions/web-api/sticker-status?taskId=${taskId}`
      })
    };

  } catch (error) {
    console.error('啟動生成錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

