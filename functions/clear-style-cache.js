/**
 * 清除風格設定快取 API
 * 當 Admin 更新設定後呼叫此 API 清除快取
 */

const { clearStyleSettingsCache } = require('./style-settings-loader');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // 處理 CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 只允許 POST 請求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 清除快取
    clearStyleSettingsCache();
    
    console.log('✅ 風格設定快取已清除');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '快取已清除，新設定將在下次請求時生效'
      })
    };
  } catch (error) {
    console.error('清除快取失敗:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

