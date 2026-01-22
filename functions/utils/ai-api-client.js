/**
 * AI API Client with Fallback
 * 統一的 AI API 調用模組，支援主模型 + 備用模型自動切換
 * 
 * 環境變數設定（Netlify）：
 * - AI_IMAGE_API_KEY: API 金鑰
 * - AI_IMAGE_API_URL: API 基礎 URL
 * - AI_MODEL_3: 主要模型（優先使用）
 * - AI_MODEL: 備用模型（AI_MODEL_3 失敗時使用）
 * 
 * 調用順序：AI_MODEL_3 → AI_MODEL
 */

const axios = require('axios');

// 從環境變數讀取設定
const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
// 🔄 調用順序：AI_MODEL_3 優先，AI_MODEL 備用
const AI_MODEL_PRIMARY = process.env.AI_MODEL_3 || 'gemini-3-pro-image-preview-2k';
const AI_MODEL_FALLBACK = process.env.AI_MODEL || 'gemini-2.5-flash-image';

// 預設設定
const DEFAULT_TIMEOUT = 120000; // 2 分鐘
const RETRY_DELAY = 3000; // 3 秒

/**
 * 延遲函數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 從文字中提取圖片 URL
 */
function extractUrlFromText(text) {
  // Markdown 圖片格式: ![alt](url)
  const markdownMatch = text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
  if (markdownMatch) return markdownMatch[1];

  // 直接圖片 URL（帶副檔名）
  const urlMatch = text.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|webp|gif))/i);
  if (urlMatch) return urlMatch[1];

  // 任何 https URL
  const anyUrlMatch = text.match(/(https?:\/\/[^\s\)\]"']+)/);
  if (anyUrlMatch) return anyUrlMatch[1];

  return null;
}

/**
 * 從 Images Generations 回應中提取圖片
 * 支援：url / b64_json
 */
function extractImageFromImagesResponse(response) {
  const data = response?.data;
  const first = data?.data?.[0];

  if (!first) {
    console.log('🔍 Images API 回應結構:', JSON.stringify(data).substring(0, 800));
    throw new Error('Images API 回應中沒有 data[0]');
  }

  if (typeof first.url === 'string' && first.url.length > 0) {
    return first.url;
  }

  if (typeof first.b64_json === 'string' && first.b64_json.length > 0) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  // 有些供應商可能回在 base64 / b64 / image 等欄位
  if (typeof first.base64 === 'string' && first.base64.length > 0) {
    return `data:image/png;base64,${first.base64}`;
  }

  console.log('🔍 Images API data[0]:', JSON.stringify(first).substring(0, 800));
  throw new Error('Images API 回應中找不到 url 或 b64_json');
}

/**
 * 🎯 核心：帶 Fallback 的 Images API 調用
 */
async function callImagesWithFallback(requestBody, options = {}) {
  const {
    maxRetries = 2,
    timeout = DEFAULT_TIMEOUT
  } = options;

  if (!AI_API_KEY) {
    throw new Error('AI_IMAGE_API_KEY 未設定');
  }

  const models = [
    { name: AI_MODEL_PRIMARY, label: '主要模型' },
    { name: AI_MODEL_FALLBACK, label: '備用模型' }
  ];

  let lastError = null;

  for (const model of models) {
    console.log(`🤖 嘗試 ${model.label}: ${model.name}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   📤 請求 ${attempt}/${maxRetries}...`);

        const resolvedRequestBody = {
          ...(requestBody || {}),
          model: model.name
        };

        console.log(`   🧾 Endpoint: /v1/images/generations`);
        console.log(`   🧾 Request keys: ${Object.keys(resolvedRequestBody).sort().join(', ')}`);
        if (typeof resolvedRequestBody.contents === 'string') {
          console.log(`   🧾 contents length: ${resolvedRequestBody.contents.length}`);
        }
        if (typeof resolvedRequestBody.prompt === 'string') {
          console.log(`   🧾 prompt length: ${resolvedRequestBody.prompt.length}`);
        }

        const response = await axios.post(
          `${AI_API_URL}/v1/images/generations`,
          resolvedRequestBody,
          {
            headers: {
              'Authorization': `Bearer ${AI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout
          }
        );

        console.log(`   ✅ ${model.label} 成功！(狀態: ${response.status})`);
        return {
          response,
          modelUsed: model.name,
          isFallback: model.name === AI_MODEL_FALLBACK
        };

      } catch (error) {
        lastError = error;
        const statusCode = error.response?.status;
        const errorMsg = error.response?.data?.error?.message || error.message;

        console.error(`   ❌ ${model.label} 失敗 (${attempt}/${maxRetries}): ${statusCode || 'N/A'} - ${errorMsg}`);
        if (error.response?.data) {
          console.error(`   🔎 API response data: ${JSON.stringify(error.response.data).substring(0, 2000)}`);
        }

        // 如果是 429 (Rate Limit) 或 5xx 錯誤，等待後重試
        if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
          if (attempt < maxRetries) {
            const waitTime = RETRY_DELAY * attempt;
            console.log(`   ⏳ 等待 ${waitTime / 1000} 秒後重試...`);
            await delay(waitTime);
            continue;
          }
        }

        // 其他錯誤，直接跳到下一個模型
        if (attempt === maxRetries) {
          console.log(`   🔄 切換到下一個模型...`);
          break;
        }
      }
    }
  }

  throw new Error(`所有 AI 模型都失敗: ${lastError?.message || '未知錯誤'}`);
}

/**
 * 🖼️ 生成圖片（帶 Fallback）
 * 預設走 /v1/images/generations
 */
async function generateImage(prompt, options = {}) {
  const {
    size,
    responseFormat = 'b64_json',
    timeout,
    maxRetries
  } = options;

  const requestBody = {
    contents: prompt,
    ...(size ? { size } : {}),
    response_format: responseFormat
  };

  const result = await callImagesWithFallback(requestBody, { timeout, maxRetries });
  const imageUrl = extractImageFromImagesResponse(result.response);

  if (result.isFallback) {
    console.log(`   ⚠️ 注意：使用了備用模型 (${result.modelUsed})`);
  }

  return imageUrl;
}

/**
 * 🖼️ 使用照片生成圖片（帶 Fallback）
 * tangguoapi：如果不支援 image input，需改走其他 endpoint；這裡先以 prompt 為主。
 */
async function generateImageFromPhoto(photoBase64, prompt, options = {}) {
  const {
    size,
    responseFormat = 'b64_json',
    timeout,
    maxRetries
  } = options;

  // 多數 /v1/images/generations 供應商不支援直接丟 dataURL 圖片做 img2img
  // 先將照片資訊包進 prompt，避免直接送 image 參數造成 400。
  const photoHint = photoBase64
    ? '\n\nReference photo provided (base64 omitted in prompt for safety). Keep face consistent.'
    : '';

  const requestBody = {
    contents: `${prompt}${photoHint}`,
    ...(size ? { size } : {}),
    response_format: responseFormat
  };

  const result = await callImagesWithFallback(requestBody, { timeout, maxRetries });
  const imageUrl = extractImageFromImagesResponse(result.response);

  if (result.isFallback) {
    console.log(`   ⚠️ 注意：使用了備用模型 (${result.modelUsed})`);
  }

  return imageUrl;
}

/**
 * 獲取當前設定資訊
 */
function getAIConfig() {
  return {
    apiUrl: AI_API_URL,
    primaryModel: AI_MODEL_PRIMARY,
    fallbackModel: AI_MODEL_FALLBACK,
    hasApiKey: !!AI_API_KEY
  };
}

module.exports = {
  generateImage,
  generateImageFromPhoto,
  getAIConfig,
  delay,
  // exports for debugging / reuse
  extractImageFromImagesResponse,
  extractUrlFromText
};
