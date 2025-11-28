/**
 * 測試 AI 圖片生成
 */

const axios = require('axios');

exports.handler = async function(event, context) {
  console.log('🧪 測試 AI 圖片生成');
  
  const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
  const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://tbnx.plus7.plus';
  const AI_MODEL = process.env.AI_MODEL || 'gemini-2.0-flash-exp-image-generation';

  if (!AI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'AI_IMAGE_API_KEY 未設定' })
    };
  }

  console.log(`📡 API URL: ${AI_API_URL}`);
  console.log(`🤖 Model: ${AI_MODEL}`);

  try {
    // 簡單測試 prompt
    const prompt = 'A cute cartoon cat sticker with happy expression, transparent background, LINE sticker style';

    console.log('⏳ 開始生成圖片...');
    const startTime = Date.now();

    const response = await axios.post(
      `${AI_API_URL}/v1/images/generations`,
      {
        model: AI_MODEL,
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url'  // 使用 URL 格式較快
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const elapsed = Date.now() - startTime;
    console.log(`✅ 生成完成！耗時: ${elapsed}ms`);
    console.log('Response:', JSON.stringify(response.data).substring(0, 500));

    // 檢查回傳
    if (response.data.data && response.data.data[0]) {
      const imageData = response.data.data[0];
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          elapsed: `${elapsed}ms`,
          hasUrl: !!imageData.url,
          hasBase64: !!imageData.b64_json,
          imageUrl: imageData.url || null
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: '回應格式不正確',
        response: response.data
      })
    };

  } catch (error) {
    console.error('❌ AI 生成失敗:', error.message);
    console.error('Error details:', error.response?.data);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data
      })
    };
  }
};

