/**
 * AI Generator Module v2.1
 * 使用 Gemini API 生成貼圖圖片（Chat Completions 格式）
 *
 * 新增功能：
 * - 角色一致性系統（Character ID）
 * - 風格強化層（Style Enhancer）
 * - 表情增強系統（Expression Enhancer）
 * - DeepSeek 動態表情優化（隨機變化但保持一致性）
 */

const axios = require('axios');
const {
  generateStickerPrompt,
  generateStickerPromptV2,
  generatePhotoStickerPromptV2,
  generateCharacterID,
  StickerStyles,
  FramingTemplates,
  getFramingConfig
} = require('./sticker-styles');
const {
  isDeepSeekAvailable,
  enhanceExpressions,
  buildEnhancedPrompt
} = require('./deepseek-enhancer');
const {
  callAIWithFallback,
  generateImage,
  generateImageFromPhoto,
  extractImageFromResponse: extractImageFromResponseV2,
  getAIConfig,
  delay
} = require('./utils/ai-api-client');

// AI 圖片生成 API 設定（保留供向後兼容）
const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash-image';
const AI_MODEL_3 = process.env.AI_MODEL_3 || 'gemini-2.0-flash-exp-image-generation';

// Retry 設定
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

/**
 * 延遲函數（已遷移到 ai-api-client.js，保留供向後兼容）
 */
function localDelay(ms) {
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

  // 如果是字串，檢查各種格式
  if (typeof content === 'string') {
    // 檢查是否為 base64 data URL
    if (content.startsWith('data:image')) {
      return content;
    }

    // 檢查 Markdown 圖片格式: ![alt](url) 或 |>![alt](url)
    const markdownMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
    if (markdownMatch) {
      console.log(`📷 從 Markdown 格式提取圖片 URL: ${markdownMatch[1]}`);
      return markdownMatch[1];
    }

    // 檢查是否為直接的圖片 URL
    const urlMatch = content.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|webp|gif))/i);
    if (urlMatch) {
      console.log(`📷 提取圖片 URL: ${urlMatch[1]}`);
      return urlMatch[1];
    }

    // 檢查任何 https URL（可能是圖片）
    const anyUrlMatch = content.match(/(https?:\/\/[^\s\)\]]+)/);
    if (anyUrlMatch) {
      console.log(`📷 提取可能的圖片 URL: ${anyUrlMatch[1]}`);
      return anyUrlMatch[1];
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
 * 🎯 使用照片生成貼圖 V2（保留臉部特徵 + 角色一致性）
 *
 * @param {string} photoBase64 - 照片的 base64 編碼
 * @param {string} style - 貼圖風格
 * @param {string} expression - 表情
 * @param {string} characterID - 角色一致性 ID（可選）
 */
async function generateStickerFromPhoto(photoBase64, style, expression, characterID = null) {
  const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
  const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
  const AI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash-image';

  if (!AI_API_KEY) {
    throw new Error('AI 圖片生成 API Key 未設定');
  }

  // 使用 V2 增強版 Prompt 生成器
  const { prompt, negativePrompt } = generatePhotoStickerPromptV2(style, expression, characterID);

  console.log(`🎨 生成照片貼圖 V2：${expression} (${style}風格)`);
  console.log(`🆔 角色 ID：${characterID || '未指定'}`);

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
          await localDelay(delayMs);
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
      await localDelay(1000);
    }
  }

  const successCount = results.filter(r => r.status === 'completed').length;
  console.log(`✅ 批次生成完成：${successCount}/${total} 成功`);

  return results;
}

/**
 * 🎯 批次從照片生成貼圖組 V2.2（角色一致性 + DeepSeek 動態優化 + 構圖選擇）
 *
 * 功能：
 * - Character ID 確保整組貼圖的角色外觀 100% 一致
 * - DeepSeek 動態優化表情描述，讓每組都有獨特變化
 * - 支援構圖選擇（全身/半身/大頭/特寫）
 */
async function generateStickerSetFromPhoto(photoBase64, style, expressions, sceneConfig = null, framingId = 'halfbody') {
  const results = [];
  const total = expressions.length;

  // 取得構圖配置
  const framingConfig = getFramingConfig(framingId);

  console.log(`📷 開始從照片批次生成 ${total} 張貼圖（V2.3 構圖支援版）`);

  // 🆔 生成角色一致性 ID（基於照片內容的 hash）
  const characterID = generateCharacterID(photoBase64.slice(0, 1000) + style);

  console.log(`🆔 角色一致性 ID：${characterID}`);
  console.log(`🎨 風格：${style}`);
  console.log(`🖼️ 構圖：${framingConfig.name} (${framingConfig.id})`);
  console.log(`📝 表情數量：${total}`);
  if (sceneConfig) {
    console.log(`🌍 場景：${sceneConfig.name} (${sceneConfig.id})`);
  }

  // 🧠 使用 DeepSeek 動態優化表情描述（含場景）
  let enhancedData = null;
  const USE_DEEPSEEK = true;

  if (USE_DEEPSEEK && isDeepSeekAvailable()) {
    try {
      // 傳入場景配置給 DeepSeek
      enhancedData = await enhanceExpressions(style, expressions, characterID, sceneConfig);
      if (enhancedData) {
        console.log(`✅ DeepSeek 表情優化成功！`);
        console.log(`📝 角色基礎：${enhancedData.characterBase}`);
        if (sceneConfig) {
          console.log(`🌍 場景應用：${enhancedData.sceneApplied || sceneConfig.name}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ DeepSeek 優化失敗，使用預設描述：${error.message}`);
    }
  } else {
    console.log(`ℹ️ DeepSeek 已關閉，使用純靜態 Prompt 確保一致性`);
  }

  for (let i = 0; i < expressions.length; i++) {
    const expression = expressions[i];
    console.log(`⏳ 生成中 (${i + 1}/${total}): ${expression}`);

    // 取得優化後的表情描述
    const enhancedExpression = enhancedData?.expressions?.[expression] || null;
    if (enhancedExpression) {
      console.log(`   🎨 優化描述：${enhancedExpression.substring(0, 50)}...`);
    }

    try {
      // 傳入 Character ID、優化資料、場景配置和構圖設定確保一致性
      const imageUrl = await generateStickerFromPhotoEnhanced(
        photoBase64,
        style,
        expression,
        characterID,
        enhancedData,
        sceneConfig,
        framingConfig
      );
      results.push({
        index: i + 1,
        expression,
        enhancedExpression,
        imageUrl,
        status: 'completed',
        characterID
      });
    } catch (error) {
      results.push({
        index: i + 1,
        expression,
        imageUrl: null,
        status: 'failed',
        error: error.message,
        characterID
      });
    }

    // 每張圖片之間稍微延遲，避免 API 限流
    if (i < expressions.length - 1) {
      await localDelay(2000);
    }
  }

  const successCount = results.filter(r => r.status === 'completed').length;
  console.log(`✅ 照片貼圖批次生成完成：${successCount}/${total} 成功`);
  console.log(`🆔 所有貼圖使用 Character ID：${characterID}`);
  console.log(`🧠 DeepSeek 優化：${enhancedData ? '已啟用' : '未啟用'}`);

  return results;
}

/**
 * 🎨 使用 DeepSeek 優化的照片貼圖生成（V2.4 含場景+構圖支援+Fallback）
 */
async function generateStickerFromPhotoEnhanced(photoBase64, style, expression, characterID, enhancedData, sceneConfig = null, framingConfig = null) {
  const aiConfig = getAIConfig();
  console.log(`🎨 生成照片貼圖：${expression} (${style}風格, ${framingConfig?.name || '半身'}構圖)`);
  console.log(`   🤖 主要模型: ${aiConfig.primaryModel}, 備用: ${aiConfig.fallbackModel}`);

  // 取得基礎 prompt（含場景配置和構圖設定）
  const { prompt: basePrompt, negativePrompt } = generatePhotoStickerPromptV2(style, expression, characterID, sceneConfig, framingConfig);

  // 如果有 DeepSeek 優化資料，增強 prompt
  let finalPrompt = basePrompt;
  if (enhancedData) {
    const characterBase = enhancedData.characterBase || '';
    const outfit = enhancedData.outfit || 'plain white t-shirt, no patterns';
    const enhancedExpression = enhancedData.expressions?.[expression] || '';

    if (characterBase || enhancedExpression) {
      finalPrompt = `${basePrompt}

=== DEEPSEEK DYNAMIC ENHANCEMENT ===
Character features: ${characterBase}
Expression detail: ${enhancedExpression}`;
    }
  }

  // 取得構圖相關的最終指示
  const framingName = framingConfig?.name || '半身';
  const framingFocus = framingConfig?.characterFocus || 'upper body, waist up';

  // 🔒 極簡最終要求（放在最後）- 加入禁止圓框和構圖指示
  const absoluteRequirements = `

=== 🔒 FINAL OUTPUT REQUIREMENTS ===
1. BACKGROUND: 100% TRANSPARENT (alpha=0) - NO white, NO gray, NO color
2. T-SHIRT: Solid pure white (#FFFFFF) - NO patterns, NO stripes
3. CHARACTER: Same as photo, ID: ${characterID}
4. STYLE: Apply ${style} style distinctly
5. OUTLINES: Thick black (2-3px)
6. FRAMING: ${framingName}構圖 - ${framingFocus}
7. TEXT: NONE
8. NO FRAMES: NO circular frame, NO border, NO avatar style, NO vignette

CRITICAL:
- Background MUST be transparent (PNG cutout style)
- Character must be FREE-FLOATING, NO circular frames
- STRICTLY follow ${framingName} framing: ${framingFocus}
- Skin tone MUST be warm peachy-beige, consistent across all stickers

Generate the ${style} style ${framingName} sticker NOW.`;

  finalPrompt += absoluteRequirements;

  try {
    // 🆕 使用帶 Fallback 的 API 調用
    console.log(`   🚀 使用 AI API Client with Fallback...`);
    
    const imageUrl = await generateImageFromPhoto(photoBase64, finalPrompt, {
      maxRetries: 2,  // 每個模型嘗試 2 次
      timeout: 120000
    });

    console.log(`   ✅ 生成成功！`);
    return imageUrl;

  } catch (error) {
    console.error(`   ❌ 生成失敗（主備模型都失敗）: ${error.message}`);
    throw new Error(`生成失敗: ${error.message}`);
  }
}

module.exports = {
  generateStickerImage,
  generateStickerSet,
  generateStickerFromPhoto,
  generateStickerSetFromPhoto,
  generateStickerFromPhotoEnhanced
};

