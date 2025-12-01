/**
 * Grid Generator Module v1.0
 * 9宮格批次生成系統 - 大幅節省 API 成本
 * 
 * 核心概念：
 * - AI 生成 1024×1024 的 3×3 網格圖
 * - 自動裁切成 9 張獨立貼圖（370×320）
 * - 每張內容區 350×300，留白 10px
 * - API 調用減少至原本的 1/9
 */

const sharp = require('sharp');
const axios = require('axios');
const { generatePhotoStickerPromptV2 } = require('./sticker-styles');

// AI API 設定
const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash-image';

// 9宮格設定
const GRID_CONFIG = {
  // AI 生成尺寸
  sourceSize: 1024,
  
  // 網格佈局
  gridRows: 3,
  gridCols: 3,
  totalCells: 9,
  
  // 每格在 1024x1024 中的尺寸
  cellSize: 341,  // 1024 / 3 ≈ 341
  
  // 最終輸出尺寸
  output: {
    width: 370,
    height: 320,
    contentWidth: 350,   // 370 - 20
    contentHeight: 300,  // 320 - 20
    padding: 10
  }
};

/**
 * 🎨 生成 9宮格貼圖 Prompt（完整版）
 * 整合 sticker-styles.js 的所有增強功能
 *
 * @param {string} photoBase64 - 照片 base64
 * @param {string} style - 風格 ID
 * @param {Array<string>} expressions - 9 個表情
 * @param {string} characterID - 角色一致性 ID
 * @param {object} options - 額外選項 { sceneConfig, framingId }
 * @returns {object} - { prompt, negativePrompt }
 */
function generateGridPrompt(photoBase64, style, expressions, characterID, options = {}) {
  if (expressions.length !== 9) {
    throw new Error(`必須提供 9 個表情，目前：${expressions.length} 個`);
  }

  const { sceneConfig, framingId } = options;

  // 從 sticker-styles.js 引入設定
  const {
    StickerStyles,
    StyleEnhancer,
    ExpressionEnhancer,
    SceneTemplates,
    FramingTemplates
  } = require('./sticker-styles');

  const styleConfig = StickerStyles[style] || StickerStyles.cute;
  const styleEnhance = StyleEnhancer[style] || StyleEnhancer.cute;
  const framing = FramingTemplates[framingId] || FramingTemplates.halfbody;
  const scene = sceneConfig || SceneTemplates.kawaii; // 預設使用夢幻可愛風格

  // 為每個表情生成詳細描述
  const expressionDetails = expressions.map((expr, idx) => {
    const data = ExpressionEnhancer[expr];
    if (typeof data === 'object' && data !== null) {
      return {
        cell: idx + 1,
        expression: expr,
        action: data.action,
        popText: data.popText,
        decorations: data.decorations
      };
    }
    return {
      cell: idx + 1,
      expression: expr,
      action: expr,
      popText: '',
      decorations: 'sparkles, hearts'
    };
  });

  // 建立格子描述（簡潔版）
  const cellDescriptions = expressionDetails.map(e =>
    `Cell ${e.cell}: "${e.expression}" - ${e.action}${e.popText ? ` [TEXT: "${e.popText}"]` : ''}`
  ).join('\n');

  const prompt = `Create a 3×3 grid of LINE stickers (1024×1024 total) from this photo.

=== 🎨 STYLE: ${styleConfig.name} ===
${styleConfig.promptBase}
${styleEnhance.lighting}
${styleEnhance.brushwork}

=== 📐 GRID LAYOUT ===
9 stickers arranged in 3 rows × 3 columns.
Each cell: ~341×341 pixels, same character, different expression.

=== 😊 9 EXPRESSIONS (with actions & text) ===
${cellDescriptions}

=== 🎀 DECORATIONS (${scene.name}) ===
Style: ${scene.decorationStyle || 'kawaii pastel style'}
Elements: ${scene.decorationElements?.join(', ') || 'hearts, sparkles, stars'}
Text style: ${scene.popTextStyle || 'cute rounded text'}

Each sticker should have:
- Floating decorations (${expressionDetails[0].decorations})
- POP text matching the expression
- Dynamic placement (not centered)

=== 👤 CHARACTER CONSISTENCY ===
ID: ${characterID}
- SAME face in all 9 cells (copy from photo)
- SAME hairstyle and hair color
- SAME clothing style
- Framing: ${framing.name} (${framing.characterFocus})

=== ⚠️ CRITICAL REQUIREMENTS ===
✅ 100% TRANSPARENT background (NO white/gray)
✅ Thick black outlines (2-3px) for visibility
✅ Character fills 80% of each cell
✅ Vibrant colors, high saturation
✅ Clear separation between cells (can be cropped)
✅ POP text and decorations in each cell
❌ NO grid lines or borders
❌ NO overlapping between cells
❌ NO realistic style - must be ${styleConfig.name}

Generate the 3×3 sticker grid NOW.`;

  const negativePrompt = `white background, gray background, solid background, colored background,
grid lines, borders, separators, frames,
realistic photo, photorealistic, ultra-realism,
text watermark, signature, logo,
different people, inconsistent character,
tiny character, small figure, excessive empty space,
overlapping cells, merged cells,
dull colors, low saturation, blurry, low quality`;

  return { prompt, negativePrompt };
}

/**
 * 📥 從 Chat Completions 回應提取圖片
 * 支援多種回應格式：陣列、字串、Markdown、直接 URL
 */
function extractImageFromResponse(response) {
  const choices = response.data.choices;
  if (!choices || !choices[0]) {
    console.log('🔍 API 回應結構:', JSON.stringify(response.data).substring(0, 500));
    throw new Error('API 回應中沒有 choices');
  }

  const message = choices[0].message;
  if (!message || !message.content) {
    console.log('🔍 Message 結構:', JSON.stringify(message).substring(0, 500));
    throw new Error('API 回應中沒有 message content');
  }

  const content = message.content;
  console.log(`🔍 Content 類型: ${typeof content}, 是否陣列: ${Array.isArray(content)}`);

  // 處理陣列格式
  if (Array.isArray(content)) {
    for (const item of content) {
      // 檢查 image_url 格式
      if (item.type === 'image_url' && item.image_url) {
        const url = item.image_url.url || item.image_url;
        console.log(`📷 從 image_url 格式提取圖片`);
        return url;
      }

      // 檢查 image 格式
      if (item.type === 'image' && item.image) {
        if (item.image.url) {
          console.log(`📷 從 image.url 格式提取圖片`);
          return item.image.url;
        }
        if (item.image.data) {
          const mimeType = item.image.mime_type || 'image/png';
          console.log(`📷 從 image.data 格式提取圖片`);
          return `data:${mimeType};base64,${item.image.data}`;
        }
      }

      // 檢查 inline_data 格式 (Gemini 風格)
      if (item.inline_data || item.inlineData) {
        const inlineData = item.inline_data || item.inlineData;
        const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';
        console.log(`📷 從 inline_data 格式提取圖片`);
        return `data:${mimeType};base64,${inlineData.data}`;
      }
    }

    // 如果陣列中沒找到，檢查是否有 text 類型包含 URL
    for (const item of content) {
      if (item.type === 'text' && item.text) {
        const urlFromText = extractUrlFromText(item.text);
        if (urlFromText) return urlFromText;
      }
    }
  }

  // 處理字串格式
  if (typeof content === 'string') {
    // 直接是 base64 data URL
    if (content.startsWith('data:image')) {
      console.log(`📷 從 base64 data URL 提取圖片`);
      return content;
    }

    // 直接是 http URL
    if (content.startsWith('http')) {
      console.log(`📷 從 HTTP URL 提取圖片`);
      return content;
    }

    // 嘗試從文字中提取 URL
    const urlFromText = extractUrlFromText(content);
    if (urlFromText) return urlFromText;
  }

  console.log('🔍 無法解析的 content:', JSON.stringify(content).substring(0, 500));
  throw new Error('無法從回應中提取圖片');
}

/**
 * 從文字中提取圖片 URL
 */
function extractUrlFromText(text) {
  // 檢查 Markdown 圖片格式: ![alt](url)
  const markdownMatch = text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
  if (markdownMatch) {
    console.log(`📷 從 Markdown 格式提取圖片 URL`);
    return markdownMatch[1];
  }

  // 檢查是否為直接的圖片 URL（帶副檔名）
  const urlMatch = text.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|webp|gif))/i);
  if (urlMatch) {
    console.log(`📷 提取圖片 URL: ${urlMatch[1].substring(0, 50)}...`);
    return urlMatch[1];
  }

  // 檢查任何 https URL（可能是圖片）
  const anyUrlMatch = text.match(/(https?:\/\/[^\s\)\]"']+)/);
  if (anyUrlMatch) {
    console.log(`📷 提取可能的圖片 URL: ${anyUrlMatch[1].substring(0, 50)}...`);
    return anyUrlMatch[1];
  }

  return null;
}

/**
 * 🎯 生成 9宮格貼圖（單次 API 調用）
 *
 * @param {string} photoBase64 - 照片 base64
 * @param {string} style - 風格
 * @param {Array<string>} expressions - 9 個表情
 * @param {string} characterID - 角色一致性 ID
 * @param {object} options - 額外選項 { sceneConfig, framingId }
 * @returns {string} - 1024×1024 圖片的 URL 或 base64
 */
async function generateGridImage(photoBase64, style, expressions, characterID, options = {}) {
  if (!AI_API_KEY) {
    throw new Error('AI_IMAGE_API_KEY 未設定');
  }

  console.log(`🎨 開始生成 9宮格貼圖（${style}風格）`);
  console.log(`📝 表情列表：${expressions.join(', ')}`);
  console.log(`🔑 使用 API: ${AI_API_URL}, 模型: ${AI_MODEL}`);
  console.log(`🎀 裝飾風格: ${options.sceneConfig?.name || '夢幻可愛'}`);
  console.log(`📐 構圖: ${options.framingId || 'halfbody'}`);

  const { prompt, negativePrompt } = generateGridPrompt(photoBase64, style, expressions, characterID, options);
  console.log(`📝 Prompt 長度: ${prompt.length} 字元`);

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
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: photoBase64.startsWith('data:') ? photoBase64 : `data:image/jpeg;base64,${photoBase64}`
                }
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

    console.log(`📡 API 回應狀態: ${response.status}`);
    console.log(`📡 API 回應結構: choices=${response.data?.choices?.length || 0}`);

    const imageUrl = extractImageFromResponse(response);
    console.log(`✅ 9宮格生成成功！圖片類型: ${imageUrl.startsWith('data:') ? 'base64' : 'URL'}`);
    return imageUrl;

  } catch (error) {
    console.error(`❌ 9宮格生成失敗:`, error.message);
    if (error.response) {
      console.error('API 回應狀態碼:', error.response.status);
      console.error('API 錯誤詳情:', JSON.stringify(error.response.data).substring(0, 1000));
    }
    throw error;
  }
}

/**
 * ✂️ 裁切 9宮格為獨立貼圖（修正版）
 *
 * @param {Buffer|string} gridImage - 3x3 網格圖片（Buffer 或 URL）
 * @returns {Array<Buffer>} - 9 張 370×320 的貼圖 Buffer
 */
async function cropGridToStickers(gridImage) {
  console.log(`✂️ 開始裁切 9宮格...`);

  // 下載圖片（如果是 URL）
  let imageBuffer;
  if (Buffer.isBuffer(gridImage)) {
    imageBuffer = gridImage;
  } else if (typeof gridImage === 'string') {
    if (gridImage.startsWith('data:image')) {
      const base64Data = gridImage.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // 從 URL 下載
      const response = await axios.get(gridImage, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(response.data);
    }
  }

  // 🆕 獲取圖片實際尺寸
  const metadata = await sharp(imageBuffer).metadata();
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;
  console.log(`📐 圖片實際尺寸: ${imageWidth}×${imageHeight}`);

  // 🆕 計算正確的格子大小（精確除以 3）
  const cellWidth = Math.floor(imageWidth / 3);
  const cellHeight = Math.floor(imageHeight / 3);
  console.log(`📏 格子大小: ${cellWidth}×${cellHeight}`);

  const results = [];
  const { output } = GRID_CONFIG;

  // 裁切 9 個格子
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const expression = `格子 ${index + 1}`;

      console.log(`  ⏳ 裁切第 ${index + 1} 張（行 ${row + 1}, 列 ${col + 1}）`);

      try {
        // 🆕 精確計算裁切位置（避免邊緣裁切問題）
        const left = col * cellWidth;
        const top = row * cellHeight;

        // 🆕 確保最後一列/行能完整裁切
        let extractWidth = cellWidth;
        let extractHeight = cellHeight;

        // 最後一列：取到右邊界
        if (col === 2) {
          extractWidth = imageWidth - left;
        }
        // 最後一行：取到下邊界
        if (row === 2) {
          extractHeight = imageHeight - top;
        }

        console.log(`    📍 位置: (${left}, ${top}), 裁切: ${extractWidth}×${extractHeight}`);

        // 檢查是否有足夠的區域可裁切
        if (extractWidth < 50 || extractHeight < 50) {
          console.log(`    ⚠️ 區域太小，跳過`);
          results.push({
            index: index + 1,
            buffer: null,
            expression,
            status: 'failed',
            error: '裁切區域太小'
          });
          continue;
        }

        // 🆕 改進的裁切流程：
        // 1. 先裁切出格子
        // 2. 縮放到 350×300（內容區）並保持比例
        // 3. 創建 370×320 透明畫布，將內容置中

        // 步驟 1: 裁切格子
        const extractedBuffer = await sharp(imageBuffer)
          .extract({
            left: left,
            top: top,
            width: extractWidth,
            height: extractHeight
          })
          .toBuffer();

        // 步驟 2: 縮放到內容區尺寸（350×300），保持比例
        const resizedBuffer = await sharp(extractedBuffer)
          .resize(output.contentWidth, output.contentHeight, {
            fit: 'contain',  // 保持比例，可能有透明邊
            withoutEnlargement: false,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .ensureAlpha()
          .toBuffer();

        // 步驟 3: 創建 370×320 透明畫布，將 350×300 置中
        const croppedBuffer = await sharp({
          create: {
            width: output.width,
            height: output.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        })
        .composite([{
          input: resizedBuffer,
          left: output.padding,  // 10px 左邊距
          top: output.padding    // 10px 上邊距
        }])
        // 圖片增強
        .modulate({
          saturation: 1.25,
          brightness: 1.02
        })
        .linear(1.15, -(128 * 0.15))
        // 輸出 PNG
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true
        })
        .toBuffer();

        const fileSize = croppedBuffer.length;
        console.log(`    ✅ 第 ${index + 1} 張完成：${output.width}×${output.height}, ${(fileSize / 1024).toFixed(2)}KB`);

        results.push({
          index: index + 1,
          row: row + 1,
          col: col + 1,
          buffer: croppedBuffer,
          size: fileSize,
          status: 'completed'
        });

      } catch (error) {
        console.error(`    ❌ 第 ${index + 1} 張裁切失敗:`, error.message);
        results.push({
          index: index + 1,
          row: row + 1,
          col: col + 1,
          buffer: null,
          size: 0,
          status: 'failed',
          error: error.message
        });
      }
    }
  }

  const successCount = results.filter(r => r.status === 'completed').length;
  console.log(`✅ 裁切完成：${successCount}/9 成功`);

  return results;
}

/**
 * 🚀 完整的 9宮格批次生成流程
 *
 * @param {string} photoBase64 - 照片 base64
 * @param {string} style - 風格
 * @param {Array<string>} expressions - 9 個表情
 * @param {string} characterID - 角色一致性 ID
 * @param {object} options - 額外選項 { sceneConfig, framingId }
 * @returns {Array<object>} - 9 張貼圖的結果
 */
async function generate9StickersBatch(photoBase64, style, expressions, characterID, options = {}) {
  console.log(`🚀 開始 9宮格批次生成流程`);
  console.log(`📊 風格：${style}, 角色 ID：${characterID}`);
  console.log(`🎀 裝飾：${options.sceneConfig?.name || '夢幻可愛'}, 構圖：${options.framingId || 'halfbody'}`);

  try {
    // 1. 生成 9宮格圖片（1 次 API 調用）
    const gridImageUrl = await generateGridImage(photoBase64, style, expressions, characterID, options);

    // 2. 裁切成 9 張獨立貼圖
    const stickers = await cropGridToStickers(gridImageUrl);

    // 3. 整合表情名稱
    const results = stickers.map((sticker, i) => ({
      ...sticker,
      expression: expressions[i],
      imageUrl: null,  // 已經是 buffer，不需要 URL
      characterID
    }));

    console.log(`🎉 9宮格批次生成完成！成本節省 89%`);
    return results;

  } catch (error) {
    console.error(`❌ 9宮格批次生成失敗:`, error.message);
    throw error;
  }
}

module.exports = {
  GRID_CONFIG,
  generateGridPrompt,
  generateGridImage,
  cropGridToStickers,
  generate9StickersBatch
};
