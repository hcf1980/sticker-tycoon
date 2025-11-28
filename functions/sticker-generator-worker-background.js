/**
 * Sticker Generator Worker
 * 異步執行貼圖生成任務
 */

const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient, updateStickerSetStatus, getStickerSet } = require('./supabase-client');
const { generateStickerSet, generateStickerSetFromPhoto } = require('./ai-generator');
const { processStickerSet, generateMainImage, generateTabImage } = require('./image-processor');
const { DefaultExpressions } = require('./sticker-styles');

/**
 * 建立生成任務
 */
async function createGenerationTask(userId, setData) {
  const supabase = getSupabaseClient();
  const taskId = uuidv4();
  const setId = uuidv4();

  try {
    // 建立貼圖組記錄
    const { error: setError } = await supabase
      .from('sticker_sets')
      .insert([{
        set_id: setId,
        user_id: userId,
        name: setData.name,
        description: setData.description || '',
        style: setData.style,
        character_prompt: setData.character || '',  // 照片流程可能沒有
        photo_url: setData.photoUrl || null,        // 照片 URL
        photo_base64: setData.photoBase64 || null,  // 照片 Base64（用於 AI 生成）
        sticker_count: setData.count,
        status: 'generating'
      }]);

    if (setError) throw setError;

    // 建立任務記錄
    const { error: taskError } = await supabase
      .from('generation_tasks')
      .insert([{
        task_id: taskId,
        user_id: userId,
        set_id: setId,
        task_type: 'create_set',
        status: 'pending',
        progress: 0
      }]);

    if (taskError) throw taskError;

    console.log(`✅ 已建立生成任務：${taskId}, 貼圖組：${setId}`);
    return { taskId, setId };

  } catch (error) {
    console.error('❌ 建立任務失敗:', error);
    throw error;
  }
}

/**
 * 更新任務進度
 */
async function updateTaskProgress(taskId, progress, status = 'processing') {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('generation_tasks')
      .update({
        progress,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    if (error) throw error;
    console.log(`📊 任務 ${taskId} 進度：${progress}%`);
  } catch (error) {
    console.error('❌ 更新進度失敗:', error);
  }
}

/**
 * 執行貼圖生成
 */
async function executeGeneration(taskId, setId) {
  const supabase = getSupabaseClient();

  try {
    console.log(`🚀 開始執行生成任務：${taskId}`);

    // 取得貼圖組資料
    const stickerSet = await getStickerSet(setId);
    if (!stickerSet) {
      throw new Error('找不到貼圖組資料');
    }

    const { style, character_prompt, sticker_count, photo_base64 } = stickerSet;

    // 取得表情列表（預設使用基本日常）
    const expressions = DefaultExpressions.basic.expressions.slice(0, sticker_count);

    // 更新進度：開始生成
    await updateTaskProgress(taskId, 10);

    // 1. AI 生成圖片（根據是否有照片選擇不同方式）
    console.log(`🎨 開始 AI 生成 ${sticker_count} 張貼圖...`);
    let generatedImages;

    if (photo_base64) {
      // 照片流程：使用照片生成
      console.log('📷 使用照片模式生成');
      generatedImages = await generateStickerSetFromPhoto(photo_base64, style, expressions);
    } else {
      // 傳統流程：使用角色描述生成
      console.log('✏️ 使用角色描述模式生成');
      generatedImages = await generateStickerSet(style, character_prompt, expressions);
    }
    await updateTaskProgress(taskId, 50);

    // 2. 處理圖片（符合 LINE 規格）
    const successImages = generatedImages.filter(img => img.status === 'completed');
    const imageUrls = successImages.map(img => img.imageUrl);

    console.log(`🖼️ 開始處理 ${imageUrls.length} 張圖片...`);
    const processedImages = await processStickerSet(imageUrls);
    await updateTaskProgress(taskId, 80);

    // 3. 生成主圖和標籤圖
    let mainImageBuffer = null;
    let tabImageBuffer = null;

    if (imageUrls.length > 0) {
      mainImageBuffer = await generateMainImage(imageUrls[0]);
      tabImageBuffer = await generateTabImage(imageUrls[0]);
    }
    await updateTaskProgress(taskId, 90);

    // 4. 上傳圖片到 Storage
    const uploadResults = await uploadImagesToStorage(setId, processedImages, mainImageBuffer, tabImageBuffer);

    // 5. 更新貼圖組狀態
    await updateStickerSetStatus(setId, 'completed', {
      main_image_url: uploadResults.mainImageUrl,
      tab_image_url: uploadResults.tabImageUrl
    });

    // 6. 完成任務
    await updateTaskProgress(taskId, 100, 'completed');
    console.log(`✅ 貼圖組 ${setId} 生成完成！`);

    return {
      success: true,
      setId,
      imageCount: processedImages.filter(p => p.status === 'completed').length
    };

  } catch (error) {
    console.error(`❌ 生成任務失敗 (${taskId}):`, error);

    // 標記任務失敗
    await supabase
      .from('generation_tasks')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    await updateStickerSetStatus(setId, 'failed');

    throw error;
  }
}

/**
 * 上傳圖片到 Supabase Storage
 */
async function uploadImagesToStorage(setId, processedImages, mainImageBuffer, tabImageBuffer) {
  const supabase = getSupabaseClient();
  const bucket = 'sticker-images';
  const uploadResults = { imageUrls: [], mainImageUrl: null, tabImageUrl: null };

  try {
    // 上傳主圖
    if (mainImageBuffer) {
      const mainPath = `${setId}/main.png`;
      const { error } = await supabase.storage.from(bucket).upload(mainPath, mainImageBuffer, {
        contentType: 'image/png', upsert: true
      });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(mainPath);
        uploadResults.mainImageUrl = data.publicUrl;
      }
    }

    // 上傳標籤圖
    if (tabImageBuffer) {
      const tabPath = `${setId}/tab.png`;
      const { error } = await supabase.storage.from(bucket).upload(tabPath, tabImageBuffer, {
        contentType: 'image/png', upsert: true
      });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(tabPath);
        uploadResults.tabImageUrl = data.publicUrl;
      }
    }

    // 上傳貼圖
    for (const img of processedImages) {
      if (img.status !== 'completed' || !img.buffer) continue;

      const stickerPath = `${setId}/sticker_${String(img.index).padStart(2, '0')}.png`;
      const { error } = await supabase.storage.from(bucket).upload(stickerPath, img.buffer, {
        contentType: 'image/png', upsert: true
      });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(stickerPath);
        uploadResults.imageUrls.push(data.publicUrl);
      }
    }

    console.log(`📤 已上傳 ${uploadResults.imageUrls.length} 張貼圖到 Storage`);
    return uploadResults;

  } catch (error) {
    console.error('❌ 上傳圖片失敗:', error);
    return uploadResults;
  }
}

/**
 * 通知用戶生成結果
 */
async function notifyUser(userId, success, setId, errorMessage = null) {
  const line = require('@line/bot-sdk');
  const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
  });

  try {
    if (success) {
      await client.pushMessage({
        to: userId,
        messages: [{
          type: 'text',
          text: `🎉 貼圖生成完成！\n\n` +
                `貼圖組 ID：${setId}\n\n` +
                `輸入「我的貼圖」查看所有貼圖組`
        }]
      });
    } else {
      await client.pushMessage({
        to: userId,
        messages: [{
          type: 'text',
          text: `❌ 貼圖生成失敗\n\n` +
                `錯誤：${errorMessage || '未知錯誤'}\n\n` +
                `請輸入「創建貼圖」重試`
        }]
      });
    }
    console.log(`📨 已通知用戶 ${userId} 生成結果`);
  } catch (error) {
    console.error('❌ 通知用戶失敗:', error.message);
  }
}

/**
 * Netlify Background Function Handler
 * 最多可執行 15 分鐘
 */
exports.handler = async function(event, context) {
  console.log('🔔 Sticker Generator Background Worker 開始執行');

  try {
    const body = JSON.parse(event.body || '{}');
    const { taskId, setId, userId } = body;

    if (!taskId || !setId || !userId) {
      console.error('❌ 缺少必要參數:', { taskId, setId, userId });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing taskId, setId or userId' }) };
    }

    console.log(`🚀 開始生成任務：taskId=${taskId}, setId=${setId}, userId=${userId}`);

    // 執行生成（這可能需要幾分鐘）
    const result = await executeGeneration(taskId, setId);

    // 通知用戶完成
    await notifyUser(userId, true, setId);

    console.log(`✅ Background Worker 完成：${JSON.stringify(result)}`);
    return { statusCode: 200, body: JSON.stringify(result) };

  } catch (error) {
    console.error('❌ Background Worker 執行失敗:', error);

    // 嘗試通知用戶失敗
    try {
      const body = JSON.parse(event.body || '{}');
      if (body.userId) {
        await notifyUser(body.userId, false, body.setId, error.message);
      }
    } catch (e) {
      console.error('❌ 通知失敗:', e.message);
    }

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

module.exports = { createGenerationTask, executeGeneration };

