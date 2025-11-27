/**
 * Image Processor Module
 * 處理貼圖圖片：去背、縮放、裁剪、符合 LINE 規格
 */

const sharp = require('sharp');
const axios = require('axios');
const { LineStickerSpecs } = require('./sticker-styles');

/**
 * 從 URL 下載圖片
 */
async function downloadImage(url) {
  try {
    // 處理 base64 格式
    if (url.startsWith('data:image')) {
      const base64Data = url.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    // 從 URL 下載
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('下載圖片失敗:', error.message);
    throw error;
  }
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
    let targetWidth, targetHeight;
    switch (type) {
      case 'main':
        targetWidth = LineStickerSpecs.mainImage.width;
        targetHeight = LineStickerSpecs.mainImage.height;
        break;
      case 'tab':
        targetWidth = LineStickerSpecs.tabImage.width;
        targetHeight = LineStickerSpecs.tabImage.height;
        break;
      case 'sticker':
      default:
        targetWidth = LineStickerSpecs.stickerImage.maxWidth;
        targetHeight = LineStickerSpecs.stickerImage.maxHeight;
    }

    // 預留邊距
    const padding = LineStickerSpecs.padding;
    const contentWidth = targetWidth - (padding * 2);
    const contentHeight = targetHeight - (padding * 2);

    // 處理圖片
    let processedImage = sharp(imageBuffer);
    
    // 取得原始圖片資訊
    const metadata = await processedImage.metadata();
    console.log(`📐 原始圖片尺寸: ${metadata.width}x${metadata.height}`);

    // 縮放到目標尺寸（保持比例，置中）
    processedImage = processedImage
      .resize(contentWidth, contentHeight, {
        fit: 'inside',  // 保持比例，不裁切
        withoutEnlargement: false
      })
      // 確保透明背景
      .ensureAlpha()
      // 擴展到目標尺寸（加入透明邊距）
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });

    // 最終調整到精確尺寸
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
 */
async function generateMainImage(stickerUrl) {
  console.log('🎯 生成主要圖片 (240x240)');
  return await processImage(stickerUrl, 'main');
}

/**
 * 生成聊天室標籤圖片
 */
async function generateTabImage(stickerUrl) {
  console.log('📑 生成標籤圖片 (96x74)');
  return await processImage(stickerUrl, 'tab');
}

module.exports = {
  downloadImage,
  processImage,
  processStickerSet,
  generateMainImage,
  generateTabImage
};

