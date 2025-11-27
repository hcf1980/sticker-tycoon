/**
 * 貼圖生成觸發器
 * 負責觸發異步生成任務
 */

const { createGenerationTask } = require('../sticker-generator-worker');
const fetch = require('node-fetch');

/**
 * 觸發貼圖生成任務
 */
async function triggerStickerGeneration(userId, tempData) {
  console.log(`🚀 觸發貼圖生成：userId=${userId}`);

  console.log('📋 生成參數:', {
    userId,
    name: tempData.name,
    style: tempData.style,
    count: tempData.count || 8,
    hasPhoto: !!tempData.photoUrl,
    hasCharacter: !!tempData.character,
    expressionsCount: (tempData.expressions || []).length
  });

  try {
    // 建立生成任務和貼圖組記錄
    const setData = {
      name: tempData.name,
      style: tempData.style,
      count: tempData.count || 8,
      character: tempData.character || `照片人物，表情：${(tempData.expressions || []).join('、')}`,
      description: `${tempData.name} - ${tempData.style}風格`,
      // 照片模式額外資料
      photoUrl: tempData.photoUrl || null,
      photoBase64: tempData.photoBase64 || null,
      expressions: tempData.expressions || []
    };

    const { taskId, setId } = await createGenerationTask(userId, setData);
    console.log(`✅ 已建立任務：taskId=${taskId}, setId=${setId}`);

    // 異步調用 worker（非阻塞）
    const workerUrl = process.env.STICKER_WORKER_URL || '/.netlify/functions/sticker-generator-worker';
    const fullUrl = workerUrl.startsWith('http')
      ? workerUrl
      : `${process.env.URL || 'https://sticker-tycoon.netlify.app'}${workerUrl}`;

    // Fire and forget
    fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskId, setId })
    }).then(response => {
      console.log(`📡 Worker 響應狀態: ${response.status}`);
    }).catch(error => {
      console.error('📡 Worker 調用失敗:', error.message);
    });

    return { triggered: true, taskId, setId };

  } catch (error) {
    console.error('❌ 創建任務失敗:', error.message);
    throw error;
  }
}

module.exports = {
  triggerStickerGeneration
};

