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
 * 🎨 生成 9宮格貼圖 Prompt
 * 
 * @param {string} photoBase64 - 照片 base64
 * @param {string} style - 風格
 * @param {Array<string>} expressions - 9 個表情
 * @param {string} characterID - 角色一致性 ID
 * @returns {object} - { prompt, negativePrompt }
 */
function generateGridPrompt(photoBase64, style, expressions, characterID) {
  if (expressions.length !== 9) {
    throw new Error(`必須提供 9 個表情，目前：${expressions.length} 個`);
  }

  // 建立 3x3 佈局說明
  const gridLayout = `
╔═══════╦═══════╦═══════╗
║   1   ║   2   ║   3   ║
║ ${expressions[0].padEnd(5)} ║ ${expressions[1].padEnd(5)} ║ ${expressions[2].padEnd(5)} ║
╠═══════╬═══════╬═══════╣
║   4   ║   5   ║   6   ║
║ ${expressions[3].padEnd(5)} ║ ${expressions[4].padEnd(5)} ║ ${expressions[5].padEnd(5)} ║
╠═══════╬═══════╬═══════╣
║   7   ║   8   ║   9   ║
║ ${expressions[6].padEnd(5)} ║ ${expressions[7].padEnd(5)} ║ ${expressions[8].padEnd(5)} ║
╚═══════╩═══════╩═══════╝`;

  const prompt = `Generate a 3x3 grid of LINE stickers (1024x1024px total).
Each cell contains ONE character from the photo with different expressions.

=== GRID LAYOUT (3 rows × 3 columns) ===
${gridLayout}

=== CHARACTER REQUIREMENTS ===
- Character ID: ${characterID}
- Style: ${style}
- Same person in ALL 9 cells
- Consistent appearance (face, hair, clothes)
- Half-body framing (waist up)
- Centered in each cell

=== EXPRESSION DETAILS ===
Cell 1 (Top-Left): ${expressions[0]}
Cell 2 (Top-Center): ${expressions[1]}
Cell 3 (Top-Right): ${expressions[2]}
Cell 4 (Middle-Left): ${expressions[3]}
Cell 5 (Middle-Center): ${expressions[4]}
Cell 6 (Middle-Right): ${expressions[5]}
Cell 7 (Bottom-Left): ${expressions[6]}
Cell 8 (Bottom-Center): ${expressions[7]}
Cell 9 (Bottom-Right): ${expressions[8]}

=== TECHNICAL SPECS ===
1. Total size: 1024×1024 pixels
2. Grid: 3 rows × 3 columns
3. Each cell: ~341×341 pixels
4. Background: 100% TRANSPARENT
5. Border: NO grid lines, NO separators
6. Spacing: Natural spacing between characters
7. Style: ${style} sticker style
8. Outlines: Thick black (2-3px)

=== CRITICAL RULES ===
✅ Same character in all 9 cells
✅ Each cell has different expression
✅ Transparent background everywhere
✅ No text, no watermarks
✅ Clean separation (can be cropped later)
✅ Centered characters in each cell
❌ NO grid lines or borders
❌ NO overlapping between cells
❌ NO background patterns

Generate the 3×3 sticker grid NOW.`;

  const negativePrompt = `white background, gray background, colored background, grid lines, borders, separators, 
text, watermarks, signatures, different people, inconsistent style, realistic photo, 
overlapping characters, merged cells, frames, patterns`;

  return { prompt, negativePrompt };
}

/**
 * 📥 從 Chat Completions 回應提取圖片
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

  const content = message.content;

  // 處理陣列格式
  if (Array.isArray(content)) {
    for (const item of content) {
      // Gemini 格式: { type: 'image_url', image_url: { url: 'data:image...' } }
      if (item.type === 'image_url' && item.image_url?.url) {
        return item.image_url.url;
      }

      // 其他可能格式
      if (item.type === 'image' && item.source?.url) {
        return item.source.url;
      }
      if (item.inline_data || item.inlineData) {
        const data = item.inline_data || item.inlineData;
        return `data:${data.mimeType || 'image/png'};base64,${data.data}`;
      }
    }
  }

  // 處理字串格式（直接是 URL 或 base64）
  if (typeof content === 'string') {
    if (content.startsWith('data:image') || content.startsWith('http')) {
      return content;
    }
  }

  throw new Error('無法從回應中提取圖片');
}

/**
 * 🎯 生成 9宮格貼圖（單次 API 調用）
 *
 * @param {string} photoBase64 - 照片 base64
 * @param {string} style - 風格
 * @param {Array<string>} expressions - 9 個表情
 * @param {string} characterID - 角色一致性 ID
 * @returns {string} - 1024×1024 圖片的 URL 或 base64
 */
async function generateGridImage(photoBase64, style, expressions, characterID) {
  if (!AI_API_KEY) {
    throw new Error('AI_IMAGE_API_KEY 未設定');
  }

  console.log(`🎨 開始生成 9宮格貼圖（${style}風格）`);
  console.log(`📝 表情列表：${expressions.join(', ')}`);

  const { prompt, negativePrompt } = generateGridPrompt(photoBase64, style, expressions, characterID);

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

    const imageUrl = extractImageFromResponse(response);
    console.log(`✅ 9宮格生成成功！`);
    return imageUrl;

  } catch (error) {
    console.error(`❌ 9宮格生成失敗:`, error.message);
    if (error.response?.data) {
      console.error('API 錯誤詳情:', JSON.stringify(error.response.data));
    }
    throw error;
  }
}

/**
 * ✂️ 裁切 9宮格為獨立貼圖
 *
 * @param {Buffer|string} gridImage - 1024×1024 的圖片（Buffer 或 URL）
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

  const results = [];
  const { cellSize, output } = GRID_CONFIG;

  // 裁切 9 個格子
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const expression = `格子 ${index + 1}`;

      console.log(`  ⏳ 裁切第 ${index + 1} 張（行 ${row + 1}, 列 ${col + 1}）`);

      try {
        // 計算裁切位置
        const left = col * cellSize;
        const top = row * cellSize;

        // 裁切並調整尺寸
        const croppedBuffer = await sharp(imageBuffer)
          .extract({
            left: left,
            top: top,
            width: cellSize,
            height: cellSize
          })
          // 縮放到內容區尺寸（保持比例）
          .resize(output.contentWidth, output.contentHeight, {
            fit: 'inside',
            withoutEnlargement: false,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          // 確保透明背景
          .ensureAlpha()
          // 加入留白（10px）
          .extend({
            top: output.padding,
            bottom: output.padding,
            left: output.padding,
            right: output.padding,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          // 強制調整到最終尺寸
          .resize(output.width, output.height, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          // 圖片增強（與 image-processor 一致）
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
 * @returns {Array<object>} - 9 張貼圖的結果
 */
async function generate9StickersBatch(photoBase64, style, expressions, characterID) {
  console.log(`🚀 開始 9宮格批次生成流程`);
  console.log(`📊 風格：${style}, 角色 ID：${characterID}`);

  try {
    // 1. 生成 9宮格圖片（1 次 API 調用）
    const gridImageUrl = await generateGridImage(photoBase64, style, expressions, characterID);

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
