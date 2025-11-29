/**
 * 取得用戶的待上傳佇列 API
 */

const { getUploadQueue } = require('./supabase-client');

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

    const queue = await getUploadQueue(userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        queue: queue,
        count: queue.length,
        isReady: queue.length >= 40
      })
    };

  } catch (error) {
    console.error('❌ 取得佇列失敗:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '系統錯誤' })
    };
  }
};

