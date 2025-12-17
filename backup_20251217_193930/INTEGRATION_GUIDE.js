/**
 * 整合 9宮格批次生成到現有系統
 * 
 * 本文件說明如何將新的 grid-generator 整合到背景任務處理中
 */

// ============================================
// 修改 1: sticker-generator-worker-background.js
// ============================================

/*
在 generateStickers 函數中，原本使用：
  const results = await generateStickerSetFromPhoto(
    photoBase64,
    style,
    expressions,
    sceneConfig,
    framingId
  );

改為使用智能生成器：
  const { generateStickersIntelligent } = require('./sticker-generator-enhanced');
  
  const results = await generateStickersIntelligent(photoBase64, style, expressions, {
    userId,
    setId,
    useGridMode: 'auto',  // 自動選擇（9/18/27 自動用網格）
    sceneConfig,
    framingId
  });
*/

// ============================================
// 修改 2: 上傳邏輯調整
// ============================================

/*
原本的 results 格式：
{
  index: 1,
  expression: '開心',
  imageUrl: 'data:image/png;base64...',
  status: 'completed'
}

新格式（網格模式）：
{
  index: 1,
  expression: '開心',
  buffer: Buffer,        // 直接是 Buffer
  storagePath: 'xxx',    // 已上傳的路徑
  status: 'completed',
  mode: 'grid'
}

因此需要檢查：
- 如果有 storagePath，直接使用
- 如果有 buffer，需要上傳
- 如果有 imageUrl，使用現有邏輯
*/

// ============================================
// 修改示例代碼
// ============================================

/**
 * 修改後的背景任務處理（簡化版）
 */
async function processGeneration_V2(taskId, setId, userId) {
  // ... 前面的代碼省略
  
  // 🎨 智能生成
  const { generateStickersIntelligent } = require('./sticker-generator-enhanced');
  
  const results = await generateStickersIntelligent(photoBase64, style, expressions, {
    userId,
    setId,
    useGridMode: 'auto',  // 自動判斷
    sceneConfig,
    framingId
  });
  
  // 📤 處理結果（已經上傳到 Storage）
  const successCount = results.filter(r => r.status === 'completed').length;
  console.log(`✅ 生成完成：${successCount}/${expressions.length} 成功`);
  
  // 更新數據庫
  for (const result of results) {
    if (result.status === 'completed') {
      await supabase
        .from('stickers')
        .insert({
          set_id: setId,
          index: result.index,
          expression: result.expression,
          storage_path: result.storagePath,
          status: 'completed'
        });
    }
  }
  
  // ... 後續邏輯
}

// ============================================
// 修改 3: constants.js 更新
// ============================================

/*
IMAGE_CONFIG.VALID_COUNTS 改為：
  VALID_COUNTS: [9, 18, 27]
*/

// ============================================
// 修改 4: 用戶提示更新
// ============================================

/*
在確認訊息中加入成本提示：
  "使用 9宮格批次生成技術，大幅降低 API 成本！"
  "9 張 = 1 次 API（節省 88.9%）"
*/

module.exports = {
  // 導出說明用於文檔
};

