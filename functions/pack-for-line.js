/**
 * Pack for LINE Market - 啟動打包任務
 *
 * 流程：
 * 1. 前端呼叫此 API 啟動打包
 * 2. 此 API 觸發 Background Function 進行打包
 * 3. Background Function 完成後上傳到 Supabase Storage
 * 4. 前端輪詢檢查狀態並取得下載連結
 */

const { v4: uuidv4 } = require('uuid');
const { getUploadQueue, supabase, getUserTokenBalance, deductTokens } = require('./supabase-client');

const DOWNLOAD_COST = 40;  // 下載/上架所需代幣

/**
 * 檢查打包狀態
 */
async function checkPackStatus(userId) {
  const { data } = await supabase
    .from('line_pack_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

/**
 * 建立打包任務
 */
async function createPackTask(userId, mainIndex) {
  const taskId = uuidv4();

  // 先檢查是否已有進行中的任務
  const existing = await checkPackStatus(userId);
  if (existing && existing.status === 'processing') {
    return { taskId: existing.task_id, existing: true };
  }

  // 建立新任務
  await supabase.from('line_pack_tasks').insert({
    task_id: taskId,
    user_id: userId,
    main_index: mainIndex,
    status: 'pending',
    created_at: new Date().toISOString()
  });

  return { taskId, existing: false };
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.httpMethod === 'GET'
      ? event.queryStringParameters
      : JSON.parse(event.body || '{}');

    const { userId, mainIndex, action } = params;

    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少 userId' }) };
    }

    // 檢查狀態
    if (action === 'status') {
      const task = await checkPackStatus(userId);
      if (!task) {
        return { statusCode: 200, headers, body: JSON.stringify({ status: 'none' }) };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: task.status,
          downloadUrl: task.download_url,
          error: task.error_message,
          progress: task.progress
        })
      };
    }

    // 檢查佇列數量
    const queue = await getUploadQueue(userId);
    if (queue.length !== 40) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `需要 40 張貼圖，目前只有 ${queue.length} 張` })
      };
    }

    // 檢查代幣餘額
    const balance = await getUserTokenBalance(userId);
    if (balance < DOWNLOAD_COST) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `代幣不足！需要 ${DOWNLOAD_COST} 枚，您只有 ${balance} 枚`,
          needTokens: DOWNLOAD_COST,
          currentTokens: balance
        })
      };
    }

    // 扣除代幣（deductTokens 內部會記錄交易）
    const deductResult = await deductTokens(userId, DOWNLOAD_COST, '下載 LINE 貼圖包', null);
    if (!deductResult.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '代幣扣除失敗：' + deductResult.error })
      };
    }
    console.log(`💰 用戶 ${userId} 扣除 ${DOWNLOAD_COST} 代幣，剩餘 ${deductResult.balance}`);

    // 建立任務
    const { taskId, existing } = await createPackTask(userId, parseInt(mainIndex) || 0);

    if (existing) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, taskId, message: '任務已在處理中' })
      };
    }

    // 觸發 Background Worker
    const workerUrl = `${process.env.URL || 'https://sticker-tycoon.netlify.app'}/.netlify/functions/pack-for-line-background`;
    console.log(`🚀 觸發打包 Worker: ${workerUrl}`);

    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, userId, mainIndex: parseInt(mainIndex) || 0 })
    }).catch(err => console.error('Worker 調用失敗:', err.message));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, taskId, message: '打包任務已啟動' })
    };

  } catch (error) {
    console.error('❌ 錯誤:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

