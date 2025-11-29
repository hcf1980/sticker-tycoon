/**
 * 從待上傳佇列移除貼圖 API
 */

const { removeFromUploadQueue } = require('./supabase-client');

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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, stickerId } = body;

    if (!userId || !stickerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '缺少必要參數' })
      };
    }

    const result = await removeFromUploadQueue(userId, stickerId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ 移除失敗:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '系統錯誤' })
    };
  }
};

