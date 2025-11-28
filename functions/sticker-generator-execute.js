/**
 * 貼圖生成執行端點（長時間運行，最長 15 分鐘）
 * 這個函數會被 fire-and-forget 調用，不需要等待回應
 */

const { executeGeneration, getSupabase } = require('./sticker-generator-worker-background');

exports.handler = async function(event, context) {
  console.log('🔔 貼圖生成執行端點啟動');
  
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

    // 立即寫入資料庫確認執行已開始
    const supabase = getSupabase();
    await supabase
      .from('generation_tasks')
      .update({
        result_json: { execution_started: new Date().toISOString() }
      })
      .eq('task_id', taskId);
    console.log('✅ 執行開始確認已寫入資料庫');

    // 執行生成（會阻塞直到完成，最長 15 分鐘）
    console.log('✅ 開始執行生成任務...');
    const result = await executeGeneration(taskId, setId);
    console.log('✅ 生成完成:', result);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ 執行失敗:', error);
    console.error('❌ 錯誤堆疊:', error.stack);
    
    // 寫入錯誤到資料庫
    if (taskId) {
      try {
        const supabase = getSupabase();
        await supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            error_message: error.message,
            result_json: { error: error.message, stack: error.stack }
          })
          .eq('task_id', taskId);
      } catch (dbError) {
        console.error('❌ 無法更新錯誤狀態:', dbError);
      }
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

