/**
 * 查詢用戶代幣餘額
 */

const { getUserTokenBalance } = require('./supabase-client');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '缺少 userId' })
      };
    }

    const balance = await getUserTokenBalance(userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        balance: balance || 0
      })
    };

  } catch (error) {
    console.error('❌ 查詢代幣失敗:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '系統錯誤' })
    };
  }
};

