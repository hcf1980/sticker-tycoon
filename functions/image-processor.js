/**
 * Image Processor Module v2.0
 * 處理貼圖圖片：去背、縮放、裁剪、符合 LINE Creators Market 規格
 *
 * LINE 官方規格：https://creator.line.me/zh-hant/guideline/sticker/
 * - 主要圖片：240 × 240 px
 * - 貼圖圖片：最大 370 × 320 px
 * - 標籤圖片：96 × 74 px
 * - 格式：PNG（透明背景）
 * - 解析度：72 dpi 以上
 * - 色彩模式：RGB
 * - 留白：10 px
 */

const sharp = require('sharp');
const axios = require('axios');
const archiver = require('archiver');
const { Readable } = require('stream');
const { LineStickerSpecs } = require('./sticker-styles');

// ================================
// 去背/去雜訊（無付費 API 的近似方案）
// 適用情境：背景接近白色或單色、前景與背景對比明顯
// ================================
const REMOVE_BG_ENABLED = true;
const REMOVE_BG_SAMPLE_BORDER_PX = 12; // 取樣邊界厚度
const REMOVE_BG_BG_DISTANCE_THRESHOLD = 26; // 背景色距離閾值（越小越嚴格）
const REMOVE_BG_SOFT_EDGE_PX = 2; // 邊緣柔化
const REMOVE_BG_ALPHA_THRESHOLD = 18; // alpha 小於此值直接清為 0（去點點）

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function avgColor(samples) {
  if (samples.length === 0) return { r: 255, g: 255, b: 255 };
  const sum = samples.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
    { r: 0, g: 0, b: 0 }
  );
  return {
    r: sum.r / samples.length,
    g: sum.g / samples.length,
    b: sum.b / samples.length,
  };
}

function estimateBgColorFromBorder({ data, width, height, borderPx }) {
  const samples = [];

  const bx = Math.max(1, Math.min(borderPx, Math.floor(width / 6)));
  const by = Math.max(1, Math.min(borderPx, Math.floor(height / 6)));

  const pushPixel = (x, y) => {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    // 只用接近不透明的像素做背景估計（避免把透明邊緣拿來估計）
    if (a > 200) samples.push({ r, g, b });
  };

  // top/bottom
  for (let y = 0; y < by; y++) {
    for (let x = 0; x < width; x++) pushPixel(x, y);
  }
  for (let y = height - by; y < height; y++) {
    for (let x = 0; x < width; x++) pushPixel(x, y);
  }

  // left/right
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < bx; x++) pushPixel(x, y);
    for (let x = width - bx; x < width; x++) pushPixel(x, y);
  }

  return avgColor(samples);
}

function applyApproxRemoveBg({ rgba, width, height, bgColor, distanceThreshold, alphaThreshold }) {
  const out = Buffer.from(rgba);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = out[idx];
      const g = out[idx + 1];
      const b = out[idx + 2];
      const a = out[idx + 3];

      // 已經透明就跳過
      if (a === 0) continue;

      const dist = colorDistance({ r, g, b }, bgColor);

      // dist 越小越像背景 → alpha 越趨近 0
      if (dist <= distanceThreshold) {
        out[idx + 3] = 0;
        continue;
      }

      // 柔邊：在閾值附近做線性過渡，降低鋸齒/點點
      const softRange = Math.max(8, distanceThreshold * 0.7);
      if (dist < distanceThreshold + softRange) {
        const t = (dist - distanceThreshold) / softRange; // 0..1
        const nextA = clampByte(a * t);
        out[idx + 3] = nextA;
      }

      // 去點點：很小的 alpha 直接清掉
      if (out[idx + 3] < alphaThreshold) {
        out[idx + 3] = 0;
      }
    }
  }

  return out;
}

/**
 * 從 URL 下載圖片（含重試機制）
 */
async function downloadImage(url, retries = 3) {
  // 處理 base64 格式
  if (url.startsWith('data:image')) {
    const base64Data = url.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`   📥 下載圖片 (嘗試 ${attempt}/${retries})...`);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000, // 增加到 60 秒
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StickerBot/1.0)'
        }
      });
      console.log(`   ✅ 下載成功: ${(response.data.byteLength / 1024).toFixed(1)}KB`);
      return Buffer.from(response.data);
    } catch (error) {
      lastError = error;
      console.error(`   ❌ 下載失敗 (嘗試 ${attempt}): ${error.message}`);
      if (attempt < retries) {
        const delay = attempt * 2000; // 2秒, 4秒, 6秒
        console.log(`   ⏳ 等待 ${delay}ms 後重試...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * 處理貼圖圖片，符合 LINE 規格
 * @param {Buffer|string} input - 圖片 Buffer 或 URL
 * @param {string} type - 'sticker' | 'main' | 'tab'
 */
async function processImage(input, type = 'sticker') {
  try {
    // 取得圖片 buffer
    const imageBuffer = Buffer.isBuffer(input) ? input : await downloadImage(input);
    
    // 取得對應尺寸
    let targetWidth, targetHeight, padding, contentWidth, contentHeight;
    switch (type) {
      case 'main':
        targetWidth = LineStickerSpecs.mainImage.width;
        targetHeight = LineStickerSpecs.mainImage.height;
        padding = 0; // main 和 tab 不需要 padding
        contentWidth = targetWidth;
        contentHeight = targetHeight;
        break;
      case 'tab':
        targetWidth = LineStickerSpecs.tabImage.width;
        targetHeight = LineStickerSpecs.tabImage.height;
        padding = 0; // main 和 tab 不需要 padding
        contentWidth = targetWidth;
        contentHeight = targetHeight;
        break;
      case 'sticker':
      default:
        targetWidth = LineStickerSpecs.stickerImage.maxWidth;
        targetHeight = LineStickerSpecs.stickerImage.maxHeight;
        padding = LineStickerSpecs.padding; // 貼圖需要 10px padding
        contentWidth = targetWidth - (padding * 2);
        contentHeight = targetHeight - (padding * 2);
    }

    // 處理圖片
    let processedImage = sharp(imageBuffer);
    
    // 取得原始圖片資訊
    const metadata = await processedImage.metadata();
    console.log(`📐 原始圖片尺寸: ${metadata.width}x${metadata.height}`);

    // 先把圖片 decode 成 RGBA，嘗試做「近似去背」
    // 適用：背景接近白底或單色底
    if (REMOVE_BG_ENABLED && metadata.width && metadata.height) {
      try {
        const raw = await processedImage
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        const { data, info } = raw;
        const bgColor = estimateBgColorFromBorder({
          data,
          width: info.width,
          height: info.height,
          borderPx: REMOVE_BG_SAMPLE_BORDER_PX,
        });

        const removed = applyApproxRemoveBg({
          rgba: data,
          width: info.width,
          height: info.height,
          bgColor,
          distanceThreshold: REMOVE_BG_BG_DISTANCE_THRESHOLD,
          alphaThreshold: REMOVE_BG_ALPHA_THRESHOLD,
        });

        processedImage = sharp(removed, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4,
          },
        });

        console.log(`🧼 近似去背已套用（bg≈ rgb(${bgColor.r.toFixed(0)},${bgColor.g.toFixed(0)},${bgColor.b.toFixed(0)})）`);
      } catch (error) {
        console.warn(`⚠️ 近似去背失敗，改用原流程：${error.message}`);
        processedImage = sharp(imageBuffer).ensureAlpha();
      }
    } else {
      processedImage = processedImage.ensureAlpha();
    }

    // 縮放到目標尺寸（保持比例，置中）
    processedImage = processedImage
      .resize(contentWidth, contentHeight, {
        fit: 'inside', // 保持比例，不裁切
        withoutEnlargement: false,
      })
      // 🎨 調色（稍微保守，避免放大去背邊緣雜訊）
      .modulate({
        saturation: 1.12,
        brightness: 1.01,
      })
      .linear(1.08, -(128 * 0.08));

    // 只有貼圖需要加 padding（main 和 tab 不需要）
    if (padding > 0) {
      processedImage = processedImage.extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    }

    // 最終調整到精確尺寸（強制 370x320）
    processedImage = processedImage
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true
      });

    const outputBuffer = await processedImage.toBuffer();
    
    // 檢查檔案大小
    const fileSize = outputBuffer.length;
    console.log(`📦 處理後圖片尺寸: ${targetWidth}x${targetHeight}, 大小: ${(fileSize / 1024).toFixed(2)}KB`);
    
    if (fileSize > LineStickerSpecs.maxFileSize) {
      console.warn(`⚠️ 圖片過大（${(fileSize / 1024).toFixed(2)}KB），嘗試進一步壓縮`);
      // 進一步壓縮
      return await sharp(outputBuffer)
        .png({ compressionLevel: 9, quality: 80 })
        .toBuffer();
    }

    return outputBuffer;

  } catch (error) {
    console.error('處理圖片失敗:', error.message);
    throw error;
  }
}

/**
 * 批次處理整組貼圖
 */
async function processStickerSet(stickerUrls) {
  const results = [];
  
  console.log(`🖼️ 開始處理 ${stickerUrls.length} 張貼圖`);

  for (let i = 0; i < stickerUrls.length; i++) {
    const url = stickerUrls[i];
    console.log(`⏳ 處理中 (${i + 1}/${stickerUrls.length})`);

    try {
      const processedBuffer = await processImage(url, 'sticker');
      results.push({
        index: i + 1,
        buffer: processedBuffer,
        status: 'completed'
      });
    } catch (error) {
      results.push({
        index: i + 1,
        buffer: null,
        status: 'failed',
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.status === 'completed').length;
  console.log(`✅ 圖片處理完成：${successCount}/${stickerUrls.length} 成功`);

  return results;
}

/**
 * 生成主要圖片（從第一張貼圖）
 * LINE 規格：240 × 240 px
 */
async function generateMainImage(stickerUrl) {
  console.log('🎯 生成主要圖片 (240x240)');
  return await processImage(stickerUrl, 'main');
}

/**
 * 生成聊天室標籤圖片
 * LINE 規格：96 × 74 px
 */
async function generateTabImage(stickerUrl) {
  console.log('📑 生成標籤圖片 (96x74)');
  return await processImage(stickerUrl, 'tab');
}

/**
 * 🎯 生成完整的 LINE 貼圖 ZIP 包
 *
 * ZIP 結構：
 * ├── main.png      (240 × 240)
 * ├── tab.png       (96 × 74)
 * ├── 01.png        (最大 370 × 320)
 * ├── 02.png
 * ├── ...
 * └── 40.png
 */
async function generateStickerZip(stickerUrls, setName = 'sticker_set') {
  console.log(`📦 開始生成 LINE 貼圖 ZIP 包：${setName}`);
  console.log(`📊 貼圖數量：${stickerUrls.length}`);

  // 驗證數量
  if (!LineStickerSpecs.validCounts.includes(stickerUrls.length)) {
    throw new Error(`貼圖數量必須是 ${LineStickerSpecs.validCounts.join('/')} 張之一，目前：${stickerUrls.length} 張`);
  }

  const chunks = [];

  return new Promise(async (resolve, reject) => {
    try {
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最高壓縮
      });

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        console.log(`✅ ZIP 生成完成，大小：${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

        // 檢查大小限制
        if (zipBuffer.length > LineStickerSpecs.maxZipSize) {
          reject(new Error(`ZIP 檔案過大：${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB，上限 60 MB`));
        } else {
          resolve(zipBuffer);
        }
      });
      archive.on('error', reject);

      // 1. 主要圖片 (main.png)
      console.log('📸 處理主要圖片...');
      const mainBuffer = await generateMainImage(stickerUrls[0]);
      archive.append(mainBuffer, { name: LineStickerSpecs.fileNaming.main });

      // 2. 標籤圖片 (tab.png)
      console.log('📑 處理標籤圖片...');
      const tabBuffer = await generateTabImage(stickerUrls[0]);
      archive.append(tabBuffer, { name: LineStickerSpecs.fileNaming.tab });

      // 3. 貼圖圖片 (01.png ~ 40.png)
      console.log('🖼️ 處理貼圖圖片...');
      for (let i = 0; i < stickerUrls.length; i++) {
        const url = stickerUrls[i];
        console.log(`⏳ 處理貼圖 (${i + 1}/${stickerUrls.length})`);

        try {
          const stickerBuffer = await processImage(url, 'sticker');
          const filename = LineStickerSpecs.fileNaming.sticker(i + 1);
          archive.append(stickerBuffer, { name: filename });
        } catch (error) {
          console.error(`❌ 處理貼圖 ${i + 1} 失敗:`, error.message);
          throw error;
        }
      }

      // 完成打包
      archive.finalize();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 驗證貼圖數量是否符合 LINE 規格
 */
function validateStickerCount(count) {
  const valid = LineStickerSpecs.validCounts.includes(count);
  return {
    valid,
    count,
    validCounts: LineStickerSpecs.validCounts,
    message: valid
      ? `✅ 數量 ${count} 符合 LINE 規格`
      : `❌ 數量 ${count} 不符合，必須是 ${LineStickerSpecs.validCounts.join('/')} 張之一`
  };
}

/**
 * 取得貼圖規格資訊
 */
function getStickerSpecs() {
  return {
    mainImage: `${LineStickerSpecs.mainImage.width} × ${LineStickerSpecs.mainImage.height} px`,
    stickerImage: `最大 ${LineStickerSpecs.stickerImage.maxWidth} × ${LineStickerSpecs.stickerImage.maxHeight} px`,
    tabImage: `${LineStickerSpecs.tabImage.width} × ${LineStickerSpecs.tabImage.height} px`,
    padding: `${LineStickerSpecs.padding} px`,
    format: LineStickerSpecs.format,
    maxFileSize: '1 MB',
    maxZipSize: '60 MB',
    validCounts: LineStickerSpecs.validCounts
  };
}

module.exports = {
  downloadImage,
  processImage,
  processStickerSet,
  generateMainImage,
  generateTabImage,
  generateStickerZip,
  validateStickerCount,
  getStickerSpecs
};

