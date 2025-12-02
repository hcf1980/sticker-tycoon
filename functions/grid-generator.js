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

  const prompt = `Create a PERFECT 3×3 sticker grid from this photo.

=== 📐 CRITICAL: IMAGE DIMENSIONS ===
⚠️ OUTPUT MUST BE EXACTLY 1024×1024 PIXELS (SQUARE)
⚠️ 3 rows × 3 columns = 9 equal cells
⚠️ Each cell: exactly 341×341 pixels
⚠️ NO rectangular output - MUST be SQUARE 1:1 ratio

=== 🎨 STYLE: ${styleConfig.name} ===
${styleConfig.promptBase}
${styleEnhance.lighting}
${styleEnhance.brushwork}

=== 📐 GRID LAYOUT ===
Row 1: Cells 1-2-3 (top)
Row 2: Cells 4-5-6 (middle)
Row 3: Cells 7-8-9 (bottom)
Each cell contains ONE sticker with the SAME character.

=== 😊 9 EXPRESSIONS ===
${cellDescriptions}

=== 🎀 DECORATIONS (${scene.name}) ===
Style: ${scene.decorationStyle || 'kawaii pastel style'}
Elements: ${scene.decorationElements?.join(', ') || 'hearts, sparkles, stars'}
Text style: ${scene.popTextStyle || 'cute rounded text'}

=== 👤 CHARACTER CONSISTENCY ===
ID: ${characterID}
- SAME face in all 9 cells (copy from photo)
- SAME hairstyle and hair color
- SAME clothing style
- Framing: ${framing.name} (${framing.characterFocus})
- Character fills 80% of each cell

=== ⚠️ BACKGROUND REQUIREMENTS ===
✅ PURE WHITE (#FFFFFF) background for each cell
✅ Clean solid white - no gradients
✅ Character with thick black outlines (3px)
❌ NO checkered pattern
❌ NO gray background
❌ NO transparency simulation
❌ NO colored background

=== ⚠️ LAYOUT REQUIREMENTS ===
✅ SQUARE output (1024×1024)
✅ 9 equal-sized cells (341×341 each)
✅ Clear visual separation between cells
✅ Each cell is a complete sticker
❌ NO overlapping between cells
❌ NO merged cells
❌ NO rectangular output

Generate the 3×3 sticker grid NOW. Remember: 1024×1024 SQUARE output.`;

  const negativePrompt = `white background, gray background, solid background, colored background,
checkered background, checker pattern, checkerboard pattern, transparency grid, gray-white squares,
grid lines, borders, separators, frames,
realistic photo, photorealistic, ultra-realism,
text watermark, signature, logo,
different people, inconsistent character,
tiny character, small figure, excessive empty space,
overlapping cells, merged cells,
dull colors, low saturation, blurry, low quality,
simulated transparency, fake transparency`;

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
 * 🎯 檢測並移除棋盤格背景（模擬透明）
 * 棋盤格通常是灰白相間的方格，需要轉換為真正的透明
 *
 * @param {Buffer} imageBuffer - 圖片 Buffer
 * @returns {Buffer} - 處理後的圖片 Buffer
 */
async function removeCheckerboardBackground(imageBuffer) {
  try {
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const pixels = new Uint8Array(data);

    // 棋盤格檢測參數
    const checkerSize = 8; // 常見的棋盤格大小
    const lightGray = { r: 204, g: 204, b: 204 }; // #CCCCCC
    const darkGray = { r: 153, g: 153, b: 153 };   // #999999
    const white = { r: 255, g: 255, b: 255 };
    const tolerance = 30;

    // 檢測是否是棋盤格顏色
    const isCheckerColor = (r, g, b) => {
      const isLight = Math.abs(r - lightGray.r) < tolerance &&
                      Math.abs(g - lightGray.g) < tolerance &&
                      Math.abs(b - lightGray.b) < tolerance;
      const isDark = Math.abs(r - darkGray.r) < tolerance &&
                     Math.abs(g - darkGray.g) < tolerance &&
                     Math.abs(b - darkGray.b) < tolerance;
      const isWhite = Math.abs(r - white.r) < tolerance &&
                      Math.abs(g - white.g) < tolerance &&
                      Math.abs(b - white.b) < tolerance;
      return isLight || isDark || isWhite;
    };

    let checkerPixels = 0;
    let totalPixels = width * height;

    // 第一遍：統計棋盤格像素
    for (let i = 0; i < pixels.length; i += channels) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (isCheckerColor(r, g, b)) {
        checkerPixels++;
      }
    }

    const checkerRatio = checkerPixels / totalPixels;
    console.log(`    🔍 棋盤格背景檢測：${(checkerRatio * 100).toFixed(1)}% 疑似背景像素`);

    // 如果超過 15% 是棋盤格顏色，進行移除
    if (checkerRatio > 0.15) {
      console.log(`    🧹 移除棋盤格背景...`);

      for (let i = 0; i < pixels.length; i += channels) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (isCheckerColor(r, g, b)) {
          // 設為完全透明
          pixels[i + 3] = 0;
        }
      }

      return await sharp(Buffer.from(pixels), {
        raw: { width, height, channels }
      })
        .png()
        .toBuffer();
    }

    return imageBuffer;
  } catch (error) {
    console.error(`    ⚠️ 棋盤格移除失敗:`, error.message);
    return imageBuffer;
  }
}

/**
 * 🎯 移除純白/純灰背景（智能版）
 * 使用邊緣檢測 + Flood Fill 從邊緣開始移除背景
 * 避免誤刪角色內部的白色區域（如眼白、衣服等）
 *
 * @param {Buffer} imageBuffer - 圖片 Buffer
 * @returns {Buffer} - 處理後的圖片 Buffer
 */
async function removeSimpleBackground(imageBuffer) {
  try {
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const pixels = new Uint8Array(data);

    // 背景顏色檢測函數
    const isBackgroundColor = (r, g, b, tolerance = 25) => {
      // 純白背景 (最常見)
      const isWhite = r > 240 && g > 240 && b > 240;
      // 近白色
      const isNearWhite = r > 230 && g > 230 && b > 230 &&
                          Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
      // 淺灰背景
      const isLightGray = r > 200 && r < 240 && g > 200 && g < 240 && b > 200 && b < 240 &&
                          Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
      // 棋盤格深色 (#999, #AAA, #BBB, #CCC)
      const isCheckerGray = r > 140 && r < 210 && g > 140 && g < 210 && b > 140 && b < 210 &&
                            Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
      return isWhite || isNearWhite || isLightGray || isCheckerGray;
    };

    // 收集邊緣像素的顏色，確定背景色
    const edgeColors = [];
    const samplePoints = [
      [0, 0], [width-1, 0], [0, height-1], [width-1, height-1], // 四角
      [Math.floor(width/2), 0], [Math.floor(width/2), height-1], // 上下中
      [0, Math.floor(height/2)], [width-1, Math.floor(height/2)] // 左右中
    ];

    for (const [x, y] of samplePoints) {
      const idx = (y * width + x) * channels;
      edgeColors.push({ r: pixels[idx], g: pixels[idx+1], b: pixels[idx+2] });
    }

    // 檢查邊緣是否都是背景色
    const bgEdgeCount = edgeColors.filter(c => isBackgroundColor(c.r, c.g, c.b)).length;
    const bgRatio = bgEdgeCount / edgeColors.length;
    console.log(`    🔍 邊緣背景檢測：${bgEdgeCount}/${edgeColors.length} 點為背景色`);

    if (bgRatio < 0.5) {
      console.log(`    ⏭️ 邊緣非背景色，跳過去背`);
      return imageBuffer;
    }

    console.log(`    🧹 執行智能去背（從邊緣開始）...`);

    // 使用 visited 陣列追蹤已處理的像素
    const visited = new Uint8Array(width * height);
    const toRemove = new Set();

    // BFS Flood Fill 從邊緣開始
    const queue = [];

    // 添加所有邊緣像素到隊列
    for (let x = 0; x < width; x++) {
      queue.push([x, 0]);
      queue.push([x, height - 1]);
    }
    for (let y = 1; y < height - 1; y++) {
      queue.push([0, y]);
      queue.push([width - 1, y]);
    }

    // BFS 遍歷
    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const pixelIdx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[pixelIdx]) continue;
      visited[pixelIdx] = 1;

      const idx = pixelIdx * channels;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      if (isBackgroundColor(r, g, b)) {
        toRemove.add(pixelIdx);
        // 添加相鄰像素
        queue.push([x + 1, y]);
        queue.push([x - 1, y]);
        queue.push([x, y + 1]);
        queue.push([x, y - 1]);
      }
    }

    console.log(`    📊 移除 ${toRemove.size} 個背景像素 (${((toRemove.size / (width * height)) * 100).toFixed(1)}%)`);

    // 移除背景
    for (const pixelIdx of toRemove) {
      const idx = pixelIdx * channels;
      pixels[idx + 3] = 0; // 設為透明
    }

    return await sharp(Buffer.from(pixels), {
      raw: { width, height, channels }
    })
      .png()
      .toBuffer();

  } catch (error) {
    console.error(`    ⚠️ 純色背景移除失敗:`, error.message);
    return imageBuffer;
  }
}

/**
 * 🎯 智能邊緣檢測：找出圖片中的實際內容區域
 * 避免裁切到空白或背景區域
 *
 * @param {Buffer} imageBuffer - 圖片 Buffer
 * @returns {object} - { hasContent, bounds: { left, top, right, bottom } }
 */
async function detectContentBounds(imageBuffer) {
  try {
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const pixels = new Uint8Array(data);

    let minX = width, maxX = 0, minY = height, maxY = 0;
    let contentPixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const alpha = pixels[idx + 3];

        // 只考慮不透明的像素
        if (alpha > 50) {
          contentPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const hasContent = contentPixels > 100;
    return {
      hasContent,
      bounds: hasContent ? { left: minX, top: minY, right: maxX, bottom: maxY } : null,
      contentRatio: contentPixels / (width * height)
    };
  } catch (error) {
    return { hasContent: true, bounds: null, contentRatio: 1 };
  }
}

/**
 * ✂️ 裁切 9宮格為獨立貼圖（增強版 v2）
 *
 * 新增功能：
 * - 智能網格檢測（驗證圖片是否為有效的 3x3）
 * - 棋盤格背景自動移除
 * - 內容區域檢測
 *
 * @param {Buffer|string} gridImage - 3x3 網格圖片（Buffer 或 URL）
 * @returns {Array<Buffer>} - 9 張 370×320 的貼圖 Buffer
 */
async function cropGridToStickers(gridImage) {
  console.log(`✂️ 開始裁切 9宮格（增強版 v2）...`);

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

  // 🆕 步驟 1：先進行棋盤格背景移除
  console.log(`🧹 步驟 1：檢測並移除棋盤格背景...`);
  imageBuffer = await removeCheckerboardBackground(imageBuffer);

  // 🆕 獲取圖片實際尺寸
  const metadata = await sharp(imageBuffer).metadata();
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;
  console.log(`📐 圖片實際尺寸: ${imageWidth}×${imageHeight}`);

  // 🆕 步驟 2：驗證圖片比例是否接近正方形（3x3 網格應該是正方形）
  const aspectRatio = imageWidth / imageHeight;
  const isSquarish = aspectRatio >= 0.8 && aspectRatio <= 1.25;

  if (!isSquarish) {
    console.log(`⚠️ 圖片比例異常 (${aspectRatio.toFixed(2)})，可能不是標準 3x3 網格`);
    console.log(`🔄 嘗試智能裁切模式...`);
  }

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

        // 🆕 改進的裁切流程 v2：
        // 1. 先裁切出格子
        // 2. 對單格進行棋盤格背景移除
        // 3. 檢測內容區域，確保裁切到角色
        // 4. 縮放到 350×300（內容區）並保持比例
        // 5. 創建 370×320 透明畫布，將內容置中

        // 步驟 1: 裁切格子
        let extractedBuffer = await sharp(imageBuffer)
          .extract({
            left: left,
            top: top,
            width: extractWidth,
            height: extractHeight
          })
          .ensureAlpha()
          .png()
          .toBuffer();

        // 步驟 2: 🆕 對單格進行額外的背景移除（確保透明）
        extractedBuffer = await removeCheckerboardBackground(extractedBuffer);

        // 🆕 步驟 2.5：移除純白/純灰背景
        extractedBuffer = await removeSimpleBackground(extractedBuffer);

        // 步驟 3: 🆕 檢測內容區域
        const contentInfo = await detectContentBounds(extractedBuffer);
        if (contentInfo.hasContent && contentInfo.contentRatio < 0.1) {
          console.log(`    ⚠️ 內容過少 (${(contentInfo.contentRatio * 100).toFixed(1)}%)，可能是空白格`);
        }

        // 步驟 4: 縮放到內容區尺寸（350×300），保持比例
        const resizedBuffer = await sharp(extractedBuffer)
          .resize(output.contentWidth, output.contentHeight, {
            fit: 'contain',  // 保持比例，可能有透明邊
            withoutEnlargement: false,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .ensureAlpha()
          .toBuffer();

        // 步驟 5: 創建 370×320 透明畫布，將 350×300 置中
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
