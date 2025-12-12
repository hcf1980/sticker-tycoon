/**
 * AI 風格圖片分析 API - 貼圖大亨
 * 使用 OpenAI Vision API 分析圖片並提取風格參數
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

    console.log('🎨 開始分析圖片風格...');

    // 呼叫 OpenAI Vision API
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a professional art style analyzer. Analyze the provided image and extract detailed style parameters in English for AI image generation prompts.

Return ONLY a valid JSON object with these exact keys (no markdown, no code blocks):
{
  "coreStyle": "Main artistic style description (e.g., ANIME STYLE, WATERCOLOR PAINTING, etc.)",
  "lighting": "Lighting description (e.g., soft diffused lighting, dramatic shadows)",
  "composition": "Composition and framing details",
  "brushwork": "Brush technique or texture details",
  "mood": "Overall mood and atmosphere",
  "colorPalette": "Color scheme (comma-separated, e.g., pastel pink, mint green, soft yellow)",
  "description": "Brief 1-2 sentence Chinese description of the style"
}

Be specific and use terminology suitable for Stable Diffusion prompts. Focus on visual characteristics that can be replicated.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this image and extract its artistic style parameters in the JSON format specified.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ OpenAI 回應接收');

    const content = openaiResponse.data.choices[0].message.content.trim();
    console.log('📝 回應內容:', content);

    // 解析 JSON（移除可能的 markdown 代碼塊）
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
      throw new Error('AI 回應格式錯誤，請重試');
    }

    console.log('🎉 風格分析完成:', analysis);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: analysis,
        usage: openaiResponse.data.usage
      })
    };

  } catch (error) {
    console.error('❌ 風格分析錯誤:', error);

    let errorMessage = error.message || '未知錯誤';

    if (error.response) {
      const apiError = error.response.data;
      if (apiError && apiError.error) {
        errorMessage = `OpenAI API 錯誤: ${apiError.error.message || JSON.stringify(apiError.error)}`;
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

