/**
 * AI Generator Module
 * 使用 Gemini API 生成貼圖圖片
 */

const axios = require('axios');
const { generateStickerPrompt } = require('./sticker-styles');

// AI 圖片生成 API 設定
const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://tbnx.plus7.plus';
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.0-flash-exp-image-generation';

// Retry 設定
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

/**
 * 延遲函數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 使用 Gemini API 生成圖片（OpenAI 相容格式）
 */
async function generateWithGemini(prompt, negativePrompt) {
  // 組合完整的提示詞
  const fullPrompt = `Generate a LINE sticker image: ${prompt}.
Style requirements: transparent background, PNG format, centered character, no text, no watermark.
Avoid: ${negativePrompt}`;

  console.log(`🤖 調用 Gemini API: ${AI_MODEL}`);

  // 嘗試 OpenAI 相容格式
  try {
    const response = await axios.post(
      `${AI_API_URL}/v1/images/generations`,
      {
        model: AI_MODEL,
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json'
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    // 處理回傳格式
    if (response.data.data && response.data.data[0]) {
      const imageData = response.data.data[0];
      if (imageData.b64_json) {
        return `data:image/png;base64,${imageData.b64_json}`;
      } else if (imageData.url) {
        return imageData.url;
      }
    }

    throw new Error('無法解析圖片回應');
  } catch (error) {
    console.log('OpenAI 格式失敗，嘗試原生 Gemini 格式...');
    return await generateWithGeminiNative(fullPrompt);
  }
}

/**
 * 使用原生 Gemini API 格式
 */
async function generateWithGeminiNative(prompt) {
  const response = await axios.post(
    `${AI_API_URL}/v1beta/models/${AI_MODEL}:generateContent`,
    {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    }
  );

  // 解析 Gemini 回應
  const candidates = response.data.candidates;
  if (candidates && candidates[0] && candidates[0].content) {
    const parts = candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error('Gemini 回應中沒有圖片資料');
}

/**
 * 使用照片生成貼圖（保留臉部特徵）
 */
async function generateStickerFromPhoto(photoBase64, style, expression) {
  const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
  const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://tbnx.plus7.plus';
  const AI_MODEL = process.env.AI_MODEL || 'gemini-2.0-flash-exp-image-generation';

  if (!AI_API_KEY) {
    throw new Error('AI 圖片生成 API Key 未設定');
  }

  const styleConfig = require('./sticker-styles').StickerStyles[style] || require('./sticker-styles').StickerStyles.cute;

  const prompt = `Transform this photo into a LINE sticker illustration.

CRITICAL REQUIREMENTS:
1. PRESERVE the person's facial features - same face shape, eyes, nose, mouth proportions
2. Keep the person recognizable - this should look like the SAME PERSON
3. Apply ${styleConfig.name} art style (${styleConfig.promptBase})
4. Show expression: ${expression}
5. Transparent/white background suitable for LINE sticker
6. Single character, centered composition
7. No text, no watermark

Style: ${styleConfig.promptBase}
Expression to show: ${expression}

Make sure the result looks like the person in the photo but in ${styleConfig.name} illustration style.`;

  console.log(`🎨 生成照片貼圖：${expression} (${style}風格)`);

  try {
    const response = await axios.post(
      `${AI_API_URL}/v1beta/models/${AI_MODEL}:generateContent`,
      {
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: photoBase64
              }
            },
            { text: prompt }
          ]
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    // 解析回應
    const candidates = response.data.candidates;
    if (candidates && candidates[0] && candidates[0].content) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          console.log(`✅ 照片貼圖生成成功：${expression}`);
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('回應中沒有圖片');
  } catch (error) {
    console.error(`❌ 生成照片貼圖失敗（${expression}）:`, error.message);
    throw error;
  }
}

/**
 * 生成單張貼圖
 */
async function generateStickerImage(style, characterDescription, expression) {
  try {
    if (!AI_API_KEY) {
      throw new Error('AI 圖片生成 API Key 未設定');
    }

    console.log(`🎨 開始生成貼圖：${expression}`);

    const { prompt, negativePrompt } = generateStickerPrompt(style, characterDescription, expression);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

    let imageUrl;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 使用 Gemini API
        imageUrl = await generateWithGemini(prompt, negativePrompt);
        break;  // 成功則跳出重試循環
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ 生成失敗（第 ${attempt}/${MAX_RETRIES} 次）：${error.message}`);

        if (attempt < MAX_RETRIES) {
          const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          await delay(delayMs);
        }
      }
    }

    if (!imageUrl) {
      throw lastError || new Error('圖片生成失敗');
    }

    console.log(`✅ 貼圖生成成功：${expression}`);
    return imageUrl;

  } catch (error) {
    console.error(`❌ 生成貼圖失敗（${expression}）:`, error.message);
    throw error;
  }
}

/**
 * 批次生成整組貼圖
 */
async function generateStickerSet(style, characterDescription, expressions) {
  const results = [];
  const total = expressions.length;

  console.log(`🎨 開始批次生成 ${total} 張貼圖`);

  for (let i = 0; i < expressions.length; i++) {
    const expression = expressions[i];
    console.log(`⏳ 生成中 (${i + 1}/${total}): ${expression}`);

    try {
      const imageUrl = await generateStickerImage(style, characterDescription, expression);
      results.push({
        index: i + 1,
        expression,
        imageUrl,
        status: 'completed'
      });
    } catch (error) {
      results.push({
        index: i + 1,
        expression,
        imageUrl: null,
        status: 'failed',
        error: error.message
      });
    }

    // 每張圖片之間稍微延遲，避免 API 限流
    if (i < expressions.length - 1) {
      await delay(1000);
    }
  }

  const successCount = results.filter(r => r.status === 'completed').length;
  console.log(`✅ 批次生成完成：${successCount}/${total} 成功`);

  return results;
}

/**
 * 批次從照片生成貼圖組
 */
async function generateStickerSetFromPhoto(photoBase64, style, expressions) {
  const results = [];
  const total = expressions.length;

  console.log(`📷 開始從照片批次生成 ${total} 張貼圖`);

  for (let i = 0; i < expressions.length; i++) {
    const expression = expressions[i];
    console.log(`⏳ 生成中 (${i + 1}/${total}): ${expression}`);

    try {
      const imageUrl = await generateStickerFromPhoto(photoBase64, style, expression);
      results.push({
        index: i + 1,
        expression,
        imageUrl,
        status: 'completed'
      });
    } catch (error) {
      results.push({
        index: i + 1,
        expression,
        imageUrl: null,
        status: 'failed',
        error: error.message
      });
    }

    // 每張圖片之間稍微延遲，避免 API 限流
    if (i < expressions.length - 1) {
      await delay(2000);
    }
  }

  const successCount = results.filter(r => r.status === 'completed').length;
  console.log(`✅ 照片貼圖批次生成完成：${successCount}/${total} 成功`);

  return results;
}

module.exports = {
  generateStickerImage,
  generateStickerSet,
  generateStickerFromPhoto,
  generateStickerSetFromPhoto
};

