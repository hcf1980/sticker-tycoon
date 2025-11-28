/**
 * 測試 AI 圖片生成（Chat Completions 格式）
 */

const axios = require('axios');

exports.handler = async function(event, context) {
  console.log('🧪 測試 AI 圖片生成 (Chat Completions)');

  const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
  const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
  const AI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash-image';

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
    const prompt = 'Generate a cute cartoon cat sticker with happy expression, transparent background, LINE sticker style. Please generate the image directly.';

    console.log('⏳ 開始生成圖片...');
    const startTime = Date.now();

    const response = await axios.post(
      `${AI_API_URL}/v1/chat/completions`,
      {
        model: AI_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4096
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    const elapsed = Date.now() - startTime;
    console.log(`✅ 生成完成！耗時: ${elapsed}ms`);
    console.log('Response:', JSON.stringify(response.data).substring(0, 1000));

    // 檢查回傳
    const choices = response.data.choices;
    if (choices && choices[0] && choices[0].message) {
      const content = choices[0].message.content;

      // 檢查是否有圖片
      let hasImage = false;
      let imageInfo = null;

      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'image_url' || item.type === 'image' || item.inline_data || item.inlineData) {
            hasImage = true;
            imageInfo = item;
            break;
          }
        }
      } else if (typeof content === 'string') {
        hasImage = content.startsWith('data:image') || content.includes('http');
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          elapsed: `${elapsed}ms`,
          model: AI_MODEL,
          hasImage: hasImage,
          contentType: Array.isArray(content) ? 'array' : typeof content,
          contentPreview: Array.isArray(content)
            ? content.map(c => ({ type: c.type }))
            : (typeof content === 'string' ? content.substring(0, 200) : content),
          imageInfo: imageInfo ? { type: imageInfo.type } : null
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data
      })
    };
  }
};

