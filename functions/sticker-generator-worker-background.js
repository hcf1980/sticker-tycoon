/**
 * Sticker Generator Worker
 * 異步執行貼圖生成任務
 */

const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient, updateStickerSetStatus, getStickerSet } = require('./supabase-client');
const { generateStickerSet } = require('./ai-generator');
const { processStickerSet, generateMainImage, generateTabImage } = require('./image-processor');
const { DefaultExpressions } = require('./sticker-styles');

// 取得 Supabase 客戶端
const getSupabase = () => getSupabaseClient();

/**
 * 建立生成任務
 */
async function createGenerationTask(userId, setData) {
  const taskId = uuidv4();
  const setId = uuidv4();

  try {
    const supabase = getSupabase();

    // 建立貼圖組記錄
    const { error: setError } = await supabase
      .from('sticker_sets')
      .insert([{
        set_id: setId,
        user_id: userId,
        name: setData.name,
        description: setData.description || '',
        style: setData.style,
        character_prompt: setData.character,
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
    const supabase = getSupabase();
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
 * 發送 LINE 推送訊息
 */
async function sendLineNotification(userId, message) {
  try {
    const line = require('@line/bot-sdk');
    const client = new line.Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
    await client.pushMessage(userId, { type: 'text', text: message });
    console.log(`📤 已發送通知給用戶 ${userId}`);
  } catch (error) {
    console.error('發送 LINE 通知失敗:', error.message);
  }
}

/**
 * 執行貼圖生成
 */
async function executeGeneration(taskId, setId) {
  let userId = null;

  try {
    console.log(`🚀 開始執行生成任務：${taskId}`);

    // 取得貼圖組資料
    const stickerSet = await getStickerSet(setId);
    if (!stickerSet) {
      throw new Error('找不到貼圖組資料');
    }

    userId = stickerSet.user_id;
    const { style, character_prompt, sticker_count, name } = stickerSet;

    // 通知用戶開始生成
    await sendLineNotification(userId, `🎨 開始生成「${name}」...\n\n📊 共 ${sticker_count} 張貼圖\n⏳ 請稍候...`);

    // 取得表情列表（預設使用基本日常）
    const expressions = DefaultExpressions.basic.expressions.slice(0, sticker_count);

    // 更新進度：開始生成
    await updateTaskProgress(taskId, 10);

    // 1. AI 生成圖片
    console.log(`🎨 開始 AI 生成 ${sticker_count} 張貼圖...`);
    const generatedImages = await generateStickerSet(style, character_prompt, expressions);
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

    // 通知用戶完成
    const successCount = processedImages.filter(p => p.status === 'completed').length;
    await sendLineNotification(userId,
      `🎉 「${name}」貼圖組生成完成！\n\n` +
      `✅ 成功：${successCount} 張\n\n` +
      `💡 輸入「我的貼圖」查看作品`
    );

    return {
      success: true,
      setId,
      imageCount: successCount
    };

  } catch (error) {
    console.error(`❌ 生成任務失敗 (${taskId}):`, error);

    // 標記任務失敗
    const supabase = getSupabase();
    await supabase
      .from('generation_tasks')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    await updateStickerSetStatus(setId, 'failed');

    // 通知用戶失敗
    if (userId) {
      await sendLineNotification(userId,
        `❌ 貼圖生成失敗\n\n` +
        `錯誤：${error.message}\n\n` +
        `請輸入「創建貼圖」重新開始`
      );
    }

    throw error;
  }
}

/**
 * 上傳圖片到 Supabase Storage
 */
async function uploadImagesToStorage(setId, processedImages, mainImageBuffer, tabImageBuffer) {
  const bucket = 'sticker-images';
  const uploadResults = { imageUrls: [], mainImageUrl: null, tabImageUrl: null };
  const supabase = getSupabase();

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
 * Netlify Function Handler（供內部調用）
 */
exports.handler = async function(event, context) {
  console.log('🔔 Sticker Generator Worker 被呼叫');
  console.log('📦 Event body:', event.body);

  try {
    const body = JSON.parse(event.body || '{}');
    const { taskId, setId } = body;

    console.log(`📋 收到任務: taskId=${taskId}, setId=${setId}`);

    if (!taskId || !setId) {
      console.error('❌ 缺少必要參數');
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing taskId or setId' }) };
    }

    // 立即返回 200，讓生成在背景執行
    // 這是因為 Netlify Functions 有超時限制
    console.log('✅ 開始背景生成任務...');

    // 不 await，讓它在背景執行
    executeGeneration(taskId, setId)
      .then(result => {
        console.log('✅ 背景生成完成:', result);
      })
      .catch(err => {
        console.error('❌ 背景生成失敗:', err.message);
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Generation started',
        taskId,
        setId
      })
    };

  } catch (error) {
    console.error('❌ Worker 執行失敗:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

module.exports = { createGenerationTask, executeGeneration };

