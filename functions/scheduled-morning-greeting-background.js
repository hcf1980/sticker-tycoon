/**
 * 排程生成早安圖
 * 此函數設計為由 Netlify Scheduled Functions 或外部 Cron 服務調用
 * 建議設定為每日凌晨 2:00 (台灣時間) 執行
 *
 * Netlify 設定方式：
 * 在 netlify.toml 中加入：
 * [functions."scheduled-morning-greeting"]
 * schedule = "0 18 * * *"  # UTC 18:00 = 台灣時間 02:00
 */

const { scheduledGenerateMorningGreeting } = require('./morning-greeting');
const { getCurrentSolarTerm } = require('./solar-terms');

exports.handler = async function(event, context) {
  console.log('⏰ 排程任務啟動：生成每日早安圖');
  console.log(`📅 執行時間: ${new Date().toISOString()}`);

  // 顯示今日節氣資訊
  const solarTerm = getCurrentSolarTerm();
  console.log(`🌅 今日主題: ${solarTerm.name} (${solarTerm.isSolarTermDay ? '節氣當天' : '一般日子'})`);
  
  try {
    // 檢查是否為排程調用或手動觸發
    const isScheduled = event.headers?.['x-netlify-event'] === 'schedule';
    const isManual = event.httpMethod === 'POST' || event.httpMethod === 'GET';
    
    // 驗證 API Key（手動調用時需要）
    if (isManual && !isScheduled) {
      const apiKey = event.headers?.['x-api-key'] || event.queryStringParameters?.apiKey;
      const expectedKey = process.env.SCHEDULED_API_KEY;
      
      if (expectedKey && apiKey !== expectedKey) {
        console.log('❌ API Key 驗證失敗');
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }
    }
    
    // 執行生成
    const result = await scheduledGenerateMorningGreeting();
    
    console.log(`📊 生成結果: ${JSON.stringify(result)}`);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: result.success,
        message: result.message,
        imageUrl: result.imageUrl,
        solarTerm: result.solarTerm,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('❌ 排程任務失敗:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

