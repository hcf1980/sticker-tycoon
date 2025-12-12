const axios = require('axios');

/**
 * Netlify Function: 分析裝飾風格
 * 
 * 使用 AI Vision API 分析圖片的裝飾元素、文字風格等
 * 
 * 輸入: { image: "data:image/jpeg;base64,..." }
 * 輸出: { 
 *   decorationStyle: "風格描述",
 *   decorationElements: ["元素1", "元素2"],
 *   popTextStyle: "文字風格描述",
 *   description: "中文描述"
 * }
 */
exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 處理 OPTIONS 請求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 只接受 POST
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
        body: JSON.stringify({ success: false, error: '缺少圖片數據' })
      };
    }

    // 使用 Netlify 環境變數中的 AI API 設定
    const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
    const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
    // 使用專門的圖片分析模型（AI_MODEL_2）
    const AI_MODEL = process.env.AI_MODEL_2 || 'gpt-4o-mini';

    if (!AI_API_KEY) {
      throw new Error('AI_IMAGE_API_KEY 環境變數未設定');
    }

    console.log('🎨 開始分析裝飾風格...');
    console.log(`🔧 使用 API: ${AI_API_URL}`);
    console.log(`🤖 使用裝飾分析模型: ${AI_MODEL} (來自 AI_MODEL_2)`);

    // 精簡的 Prompt，專注於裝飾元素
    const systemPrompt = `Analyze the decoration style in this image. Focus on:
1. Decorative elements (hearts, stars, sparkles, etc.)
2. Text/POP style (if any)
3. Color scheme and patterns
4. Overall decoration atmosphere

Return ONLY valid JSON:
{
  "decorationStyle": "overall decoration style description",
  "decorationElements": ["element1", "element2", "element3"],
  "popTextStyle": "text/typography style description",
  "description": "簡短中文描述裝飾風格"
}`;

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
                  url: image
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
        timeout: 25000 // 25 秒超時
      }
    );

    console.log('✅ AI API 回應成功');

    const content = aiResponse.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AI 回應內容為空');
    }

    console.log('📝 AI 回應內容:', content);

    // 解析 JSON（移除可能的 markdown 標記）
    let analysisData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('無法找到 JSON 格式');
      }
    } catch (parseError) {
      console.error('JSON 解析失敗:', parseError);
      throw new Error('AI 回應格式錯誤: ' + parseError.message);
    }

    console.log('✅ 解析完成:', analysisData);

    // 回傳結果
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: analysisData
      })
    };

  } catch (error) {
    console.error('❌ 分析裝飾風格失敗:', error);

    // 處理 Axios 錯誤
    if (error.response) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'AI API 錯誤: ' + (error.response.data?.error?.message || error.message),
          details: error.response.data
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

