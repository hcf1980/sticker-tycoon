/**
 * Sticker Generator Enhanced Module
 * 整合傳統單張生成 & 9宮格批次生成
 * 
 * 功能：
 * - 智能選擇生成模式（單張 vs 9宮格）
 * - 統一的 API 介面
 * - 自動上傳到 Storage
 * - 成本優化（優先使用 9宮格）
 */

const { generate9StickersBatch } = require('./grid-generator');
const { generateStickerSetFromPhoto } = require('./ai-generator');
const { getSupabaseClient } = require('./supabase-client');
const { generateCharacterID } = require('./sticker-styles');

/**
 * 🎯 智能貼圖生成器（自動選擇最優模式）
 * 
 * @param {string} photoBase64 - 照片 base64
 * @param {string} style - 風格
 * @param {Array<string>} expressions - 表情列表
 * @param {object} options - 選項
 * @returns {Array<object>} - 生成結果
 */
async function generateStickersIntelligent(photoBase64, style, expressions, options = {}) {
  const {
    userId,
    setId,
    useGridMode = 'auto',  // 'auto' | 'always' | 'never'
    sceneConfig = null,
    framingId = 'halfbody'
  } = options;

  const totalCount = expressions.length;
  const characterID = generateCharacterID(photoBase64.slice(0, 1000) + style);

  console.log(`🚀 智能貼圖生成器啟動`);
  console.log(`📊 總數：${totalCount} 張，模式：${useGridMode}`);

  // 決定生成模式
  let shouldUseGrid = false;
  
  if (useGridMode === 'always') {
    shouldUseGrid = true;
  } else if (useGridMode === 'auto') {
    // 自動判斷：9/18/27 張時優先使用網格模式
    shouldUseGrid = totalCount >= 9 && totalCount % 9 === 0;
  }

  if (!shouldUseGrid) {
    console.log(`📌 使用傳統模式（逐張生成）`);
    return await generateTraditionalMode(photoBase64, style, expressions, {
      userId,
      setId,
      characterID,
      sceneConfig,
      framingId
    });
  }

  console.log(`🎨 使用 9宮格批次模式（成本節省 89%）`);
  return await generateGridMode(photoBase64, style, expressions, {
    userId,
    setId,
    characterID,
    sceneConfig,
    framingId
  });
}

/**
 * 🔷 傳統模式：逐張生成（相容現有流程）
 */
async function generateTraditionalMode(photoBase64, style, expressions, options) {
  const { userId, setId, characterID, sceneConfig, framingId } = options;

  console.log(`🔷 傳統模式：逐張生成 ${expressions.length} 張`);

  // 使用現有的 generateStickerSetFromPhoto
  const results = await generateStickerSetFromPhoto(
    photoBase64,
    style,
    expressions,
    sceneConfig,
    framingId
  );

  // 上傳到 Storage
  const uploadedResults = [];
  for (const result of results) {
    if (result.status === 'completed' && result.imageUrl) {
      try {
        const storagePath = await uploadStickerToStorage(
          result.imageUrl,
          userId,
          setId,
          result.index
        );
        uploadedResults.push({
          ...result,
          storagePath
        });
      } catch (error) {
        console.error(`上傳失敗（第 ${result.index} 張）:`, error.message);
        uploadedResults.push({
          ...result,
          storagePath: null,
          uploadError: error.message
        });
      }
    } else {
      uploadedResults.push(result);
    }
  }

  return uploadedResults;
}

/**
 * 🎨 9宮格模式：批次生成（新功能）
 */
async function generateGridMode(photoBase64, style, expressions, options) {
  const { userId, setId, characterID } = options;
  const totalCount = expressions.length;
  const batchCount = Math.ceil(totalCount / 9);

  console.log(`🎨 9宮格模式：共 ${batchCount} 批次，總計 ${totalCount} 張`);

  const allResults = [];

  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    const startIdx = batchIndex * 9;
    const endIdx = Math.min(startIdx + 9, totalCount);
    const batchExpressions = expressions.slice(startIdx, endIdx);

    // 如果不足 9 張，補齊（複製最後一個表情）
    while (batchExpressions.length < 9) {
      batchExpressions.push(batchExpressions[batchExpressions.length - 1]);
    }

    console.log(`📦 批次 ${batchIndex + 1}/${batchCount}：生成 9 張`);

    try {
      // 生成 9宮格
      const batchResults = await generate9StickersBatch(
        photoBase64,
        style,
        batchExpressions,
        characterID
      );

      // 上傳到 Storage
      for (let i = 0; i < Math.min(9, endIdx - startIdx); i++) {
        const result = batchResults[i];
        const globalIndex = startIdx + i + 1;

        if (result.status === 'completed' && result.buffer) {
          try {
            const storagePath = await uploadBufferToStorage(
              result.buffer,
              userId,
              setId,
              globalIndex
            );

            allResults.push({
              index: globalIndex,
              expression: expressions[startIdx + i],
              status: 'completed',
              storagePath,
              size: result.size,
              characterID,
              mode: 'grid'
            });
          } catch (error) {
            console.error(`上傳失敗（第 ${globalIndex} 張）:`, error.message);
            allResults.push({
              index: globalIndex,
              expression: expressions[startIdx + i],
              status: 'upload_failed',
              error: error.message,
              mode: 'grid'
            });
          }
        } else {
          allResults.push({
            index: globalIndex,
            expression: expressions[startIdx + i],
            status: 'failed',
            error: result.error || 'Unknown error',
            mode: 'grid'
          });
        }
      }

      // 批次間延遲
      if (batchIndex < batchCount - 1) {
        await delay(2000);
      }

    } catch (error) {
      console.error(`批次 ${batchIndex + 1} 失敗:`, error.message);
      // 標記這個批次的所有圖片為失敗
      for (let i = startIdx; i < endIdx; i++) {
        allResults.push({
          index: i + 1,
          expression: expressions[i],
          status: 'failed',
          error: error.message,
          mode: 'grid'
        });
      }
    }
  }

  const successCount = allResults.filter(r => r.status === 'completed').length;
  console.log(`✅ 9宮格批次完成：${successCount}/${totalCount} 成功`);

  return allResults;
}

/**
 * 📤 上傳圖片 URL 到 Storage
 */
async function uploadStickerToStorage(imageUrl, userId, setId, index) {
  const axios = require('axios');
  const supabase = getSupabaseClient();

  // 下載圖片
  let imageBuffer;
  if (imageUrl.startsWith('data:image')) {
    const base64Data = imageUrl.split(',')[1];
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    imageBuffer = Buffer.from(response.data);
  }

  // 上傳到 Storage
  const fileName = `${setId}/${String(index).padStart(2, '0')}.png`;
  const { data, error } = await supabase.storage
    .from('sticker-images')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) throw error;

  console.log(`  ✅ 已上傳：${fileName}`);
  return fileName;
}

/**
 * 📤 上傳 Buffer 到 Storage
 */
async function uploadBufferToStorage(buffer, userId, setId, index) {
  const supabase = getSupabaseClient();

  const fileName = `${setId}/${String(index).padStart(2, '0')}.png`;
  const { data, error } = await supabase.storage
    .from('sticker-images')
    .upload(fileName, buffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) throw error;

  console.log(`  ✅ 已上傳：${fileName}`);
  return fileName;
}

/**
 * 延遲函數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 📊 取得建議的生成模式
 */
function getSuggestedMode(stickerCount) {
  if (stickerCount >= 9 && stickerCount % 9 === 0) {
    return {
      mode: 'grid',
      reason: '數量是 9 的倍數，使用網格模式可節省 89% 成本',
      apiCalls: stickerCount / 9,
      savings: `節省 ${stickerCount - stickerCount / 9} 次 API 調用`
    };
  }

  return {
    mode: 'traditional',
    reason: '數量不是 9 的倍數，建議使用傳統模式',
    apiCalls: stickerCount,
    savings: null
  };
}

module.exports = {
  generateStickersIntelligent,
  generateTraditionalMode,
  generateGridMode,
  uploadStickerToStorage,
  uploadBufferToStorage,
  getSuggestedMode
};


