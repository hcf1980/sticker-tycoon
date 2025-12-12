/**
 * AI 風格圖片分析 API - 貼圖大亨
 * 直接同步執行分析（精簡版，適合 26 秒超時）
 */

const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // 處理 CORS preflight
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
    const { image } = JSON.parse(event.body);

    if (!image) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '請提供圖片' })
      };
    }

    // 使用 Netlify 環境變數中的 AI API 設定
    const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
    const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
    // 使用純文字模型進行分析（更快）
    const AI_MODEL = 'gemini-2.0-flash';

    if (!AI_API_KEY) {
      throw new Error('AI_IMAGE_API_KEY 環境變數未設定');
    }

    console.log('🎨 開始分析圖片風格...');
    console.log(`🔧 使用 API: ${AI_API_URL}`);
    console.log(`🤖 使用模型: ${AI_MODEL}`);

    // 精簡的 Prompt，加速回應
    const systemPrompt = `Analyze image style. Return JSON only:
{"coreStyle":"style name","lighting":"lighting desc","composition":"composition","brushwork":"texture","mood":"atmosphere","colorPalette":"colors","description":"中文描述"}`;

    // 呼叫 AI Vision API
    const aiResponse = await axios.post(
      `${AI_API_URL}/v1/chat/completions`,
      {
        model: AI_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: systemPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'low' // 使用低解析度加速處理
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 25000 // 25 秒超時（留 1 秒餘量）
      }
    );

    console.log('✅ AI 回應接收');

    const content = aiResponse.data.choices[0].message.content.trim();
    console.log('📝 回應內容:', content);

    // 解析 JSON
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('JSON 解析錯誤:', content);
      // 返回預設值
      analysis = {
        coreStyle: content.substring(0, 100),
        lighting: 'natural lighting',
        composition: 'centered',
        brushwork: 'smooth',
        mood: 'neutral',
        colorPalette: 'various colors',
        description: '風格分析完成'
      };
    }

    console.log('🎉 風格分析完成:', analysis);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: analysis,
        usage: aiResponse.data.usage
      })
    };

  } catch (error) {
    console.error('❌ 風格分析錯誤:', error);

    let errorMessage = error.message || '未知錯誤';

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = '分析超時，請使用較小的圖片或稍後再試';
    } else if (error.response) {
      const apiError = error.response.data;
      if (apiError && apiError.error) {
        errorMessage = `AI API 錯誤: ${apiError.error.message || JSON.stringify(apiError.error)}`;
      } else {
        errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(apiError)}`;
      }
    }

    console.error('📋 詳細錯誤:', errorMessage);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        details: error.response?.data || null
      })
    };
  }
};

