/**
 * 貼圖生成 Worker（長時間運行，最長 15 分鐘）
 * 這是一個普通的 Netlify Function，但配置了 900 秒 timeout
 */

const { executeGeneration } = require('./sticker-generator-worker-background');

exports.handler = async function(event, context) {
  console.log('🔔 Sticker Generator Worker 啟動');
  console.log('📦 Event body:', event.body);

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

    // 直接執行生成（會阻塞直到完成，最長 15 分鐘）
    console.log('✅ 開始執行生成任務...');
    const result = await executeGeneration(taskId, setId);
    console.log('✅ 生成完成:', result);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Worker 執行失敗:', error);
    console.error('❌ 錯誤堆疊:', error.stack);
    
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: error.message, 
        stack: error.stack 
      }) 
    };
  }
};

