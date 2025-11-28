/**
 * Sticker Generator Worker（長時間運行，最長 15 分鐘）
 * Netlify Function，需於 netlify.toml 設定 timeout = 900
 */

const { executeGeneration, getSupabase } = require('./sticker-generator-worker-background');

exports.handler = async function(event, context) {
  console.log('🔔 Sticker Generator Worker 啟動');

  let taskId, setId;

  try {
    const body = JSON.parse(event.body || '{}');
    taskId = body.taskId;
    setId = body.setId;

    console.log(`📋 收到任務: taskId=${taskId}, setId=${setId}`);

    if (!taskId || !setId) {
      console.error('❌ 缺少必要參數');
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing taskId or setId' }) };
    }

    // --- 寫入 DB：Worker 已成功啟動 ---
    const supabase = getSupabase();
    await supabase
      .from('generation_tasks')
      .update({
        status: 'processing',
        progress: 5,
        result_json: {
          worker_started: new Date().toISOString(),
          invoked_from: 'worker-direct'
        }
      })
      .eq('task_id', taskId);

    console.log('✅ Worker 啟動狀態已寫入資料庫');

    // --- 執行主流程（阻塞最多 15 分鐘） ---
    console.log('🚀 正在執行貼圖生成任務...');
    const result = await executeGeneration(taskId, setId);
    console.log('🎉 生成完成:', result);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Worker 執行失敗:', error);

    // --- 回寫錯誤到資料庫 ---
    try {
      if (taskId) {
        const supabase = getSupabase();
        await supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            error_message: error.message,
            result_json: {
              error: error.message,
              stack: error.stack
            }
          })
          .eq('task_id', taskId);
      }
    } catch (dbError) {
      console.error('❌ 無法更新錯誤狀態:', dbError);
    }

    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: error.message, 
        stack: error.stack 
      }) 
    };
  }
};

