/**
 * AI Generator Module
 * 使用 Gemini API 生成貼圖圖片（Chat Completions 格式）
 */

const axios = require('axios');
const { generateStickerPrompt } = require('./sticker-styles');

// AI 圖片生成 API 設定
const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash-image';

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
 * 從 Chat Completions 回應中提取圖片
 */
function extractImageFromResponse(response) {
  const choices = response.data.choices;
  if (!choices || !choices[0]) {
    throw new Error('API 回應中沒有 choices');
  }

  const message = choices[0].message;
  if (!message || !message.content) {
    throw new Error('API 回應中沒有 message content');
  }

  // content 可能是字串或陣列
  const content = message.content;

  // 如果是陣列格式，尋找圖片
  if (Array.isArray(content)) {
    for (const item of content) {
      // 檢查 image_url 格式
      if (item.type === 'image_url' && item.image_url) {
        const url = item.image_url.url || item.image_url;
        if (url.startsWith('data:image')) {
          return url;
        }
        return url;
      }
      // 檢查 image 格式
      if (item.type === 'image' && item.image) {
        if (item.image.url) {
          return item.image.url;
        }
        if (item.image.data) {
          const mimeType = item.image.mime_type || 'image/png';
          return `data:${mimeType};base64,${item.image.data}`;
        }
      }
      // 檢查 inline_data 格式 (Gemini 風格)
      if (item.inline_data || item.inlineData) {
        const inlineData = item.inline_data || item.inlineData;
        const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${inlineData.data}`;
      }
    }
  }

  // 如果是字串，檢查是否包含 base64 圖片或 URL
  if (typeof content === 'string') {
    // 檢查是否為 base64 data URL
    if (content.startsWith('data:image')) {
      return content;
    }
    // 檢查是否為圖片 URL
    if (content.match(/https?:\/\/.*\.(png|jpg|jpeg|webp)/i)) {
      const match = content.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|webp))/i);
      if (match) return match[1];
    }
  }

  throw new Error('無法從回應中提取圖片');
}

/**
 * 使用 Chat Completions API 生成圖片
 */
async function generateWithChatCompletions(prompt, negativePrompt) {
  // 組合完整的提示詞
  const fullPrompt = `Generate a LINE sticker image: ${prompt}.
Style requirements: transparent background, PNG format, centered character, no text, no watermark.
Avoid: ${negativePrompt}

Please generate the image directly.`;

  console.log(`🤖 調用 Chat Completions API: ${AI_MODEL}`);

  const response = await axios.post(
    `${AI_API_URL}/v1/chat/completions`,
    {
      model: AI_MODEL,
      messages: [
        {
          role: 'user',
          content: fullPrompt
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

  return extractImageFromResponse(response);
}

/**
 * 使用照片生成貼圖（保留臉部特徵）- Chat Completions 格式
 */
async function generateStickerFromPhoto(photoBase64, style, expression) {
  const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
  const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
  const AI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash-image';

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

Make sure the result looks like the person in the photo but in ${styleConfig.name} illustration style.
Please generate the image directly.`;

  console.log(`🎨 生成照片貼圖：${expression} (${style}風格)`);

  try {
    const response = await axios.post(
      `${AI_API_URL}/v1/chat/completions`,
      {
        model: AI_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${photoBase64}`
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
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

    const imageUrl = extractImageFromResponse(response);
    console.log(`✅ 照片貼圖生成成功：${expression}`);
    return imageUrl;

  } catch (error) {
    console.error(`❌ 生成照片貼圖失敗（${expression}）:`, error.message);
    if (error.response?.data) {
      console.error('API 錯誤詳情:', JSON.stringify(error.response.data));
    }
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
        // 使用 Chat Completions API
        imageUrl = await generateWithChatCompletions(prompt, negativePrompt);
        break;  // 成功則跳出重試循環
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ 生成失敗（第 ${attempt}/${MAX_RETRIES} 次）：${error.message}`);
        if (error.response?.data) {
          console.error('API 錯誤詳情:', JSON.stringify(error.response.data));
        }

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

