/**
 * 清空待上傳佇列 API
 */

const { clearUploadQueue } = require('./supabase-client');

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
    const { userId } = body;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '缺少 userId 參數' })
      };
    }

    const result = await clearUploadQueue(userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ 清空失敗:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '系統錯誤' })
    };
  }
};

