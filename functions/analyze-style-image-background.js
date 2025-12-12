/**
 * AI 風格圖片分析 - Background Worker
 * 異步執行圖片分析，避免超時問題
 */

const axios = require('axios');
const { getSupabaseClient } = require('./supabase-client');

/**
 * 執行圖片風格分析
 */
async function executeAnalysis(taskId, imageData) {
  const supabase = getSupabaseClient();
  
  try {
    console.log(`🎨 [${taskId}] 開始分析圖片風格...`);
    
    // 更新狀態為處理中
    await supabase
      .from('style_analysis_tasks')
      .update({ 
        status: 'processing',
        progress: 10,
        updated_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    // 使用 Netlify 環境變數中的 AI API 設定
    const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
    const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
    const AI_MODEL = process.env.AI_MODEL || 'gemini-2.0-flash-exp';

    if (!AI_API_KEY) {
      throw new Error('AI_IMAGE_API_KEY 環境變數未設定');
    }

    console.log(`🔧 [${taskId}] 使用 API: ${AI_API_URL}`);
    console.log(`🤖 [${taskId}] 使用模型: ${AI_MODEL}`);

    // 更新進度
    await supabase
      .from('style_analysis_tasks')
      .update({ progress: 30 })
      .eq('task_id', taskId);

    // 呼叫 AI Vision API
    const aiResponse = await axios.post(
      `${AI_API_URL}/v1/chat/completions`,
      {
        model: AI_MODEL,
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
                  url: imageData
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
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 分鐘超時
      }
    );

    console.log(`✅ [${taskId}] AI 回應接收`);

    // 更新進度
    await supabase
      .from('style_analysis_tasks')
      .update({ progress: 70 })
      .eq('task_id', taskId);

    const content = aiResponse.data.choices[0].message.content.trim();
    console.log(`📝 [${taskId}] 回應內容:`, content);

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
      console.error(`❌ [${taskId}] JSON 解析錯誤:`, content);
      throw new Error('AI 回應格式錯誤，請重試');
    }

    console.log(`🎉 [${taskId}] 風格分析完成:`, analysis);

    // 更新為完成狀態
    await supabase
      .from('style_analysis_tasks')
      .update({
        status: 'completed',
        progress: 100,
        result: analysis,
        usage: aiResponse.data.usage || null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    return { success: true, analysis };

  } catch (error) {
    console.error(`❌ [${taskId}] 風格分析錯誤:`, error);

    let errorMessage = error.message || '未知錯誤';
    if (error.response) {
      const apiError = error.response.data;
      if (apiError && apiError.error) {
        errorMessage = `AI API 錯誤: ${apiError.error.message || JSON.stringify(apiError.error)}`;
      } else {
        errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(apiError)}`;
      }
    }

    // 更新為失敗狀態
    await supabase
      .from('style_analysis_tasks')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    throw error;
  }
}

/**
 * Netlify Background Function Handler
 * 最多可執行 15 分鐘
 */
exports.handler = async function(event, context) {
  console.log('🔔 ====== Style Analysis Background Worker 開始執行 ======');

  try {
    const body = JSON.parse(event.body || '{}');
    const { taskId, imageData } = body;

    if (!taskId || !imageData) {
      console.error('❌ 缺少必要參數:', { taskId: !!taskId, imageData: !!imageData });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing taskId or imageData' })
      };
    }

    console.log(`🚀 [${taskId}] 開始風格分析任務`);

    // 執行分析（可能需要 1-2 分鐘）
    const result = await executeAnalysis(taskId, imageData);

    console.log(`✅ [${taskId}] Background Worker 完成`);
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Background Worker 執行失敗:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

module.exports = {
  handler: exports.handler,
  executeAnalysis
};

