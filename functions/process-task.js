/**
 * 處理生成任務（供外部 Cron 調用）
 * 每次只處理一個待處理任務的一張圖片
 */

const { getSupabaseClient, getStickerSet } = require('./supabase-client');
const { generateStickerFromPhoto, generateStickerImage } = require('./ai-generator');
const { processAndUploadSticker } = require('./image-processor');
const { DefaultExpressions } = require('./sticker-styles');
const line = require('@line/bot-sdk');

/**
 * 取得一個待處理的任務
 */
async function getPendingTask() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('generation_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('查詢任務失敗:', error);
  }
  return data;
}

/**
 * 取得進行中的任務
 */
async function getProcessingTask() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('generation_tasks')
    .select('*')
    .eq('status', 'processing')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('查詢任務失敗:', error);
  }
  return data;
}

/**
 * 更新任務狀態
 */
async function updateTask(taskId, updates) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('generation_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('task_id', taskId);

  if (error) console.error('更新任務失敗:', error);
}

/**
 * 更新貼圖組狀態
 */
async function updateStickerSet(setId, updates) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('sticker_sets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('set_id', setId);

  if (error) console.error('更新貼圖組失敗:', error);
}

/**
 * 通知用戶
 */
async function notifyUser(userId, message) {
  try {
    const client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    });
    await client.pushMessage({ to: userId, messages: [{ type: 'text', text: message }] });
  } catch (e) {
    console.error('通知用戶失敗:', e.message);
  }
}

exports.handler = async function(event, context) {
  console.log('🔄 Process Task 開始執行');

  try {
    // 優先處理進行中的任務，否則取一個新的待處理任務
    let task = await getProcessingTask();
    if (!task) {
      task = await getPendingTask();
    }

    if (!task) {
      console.log('📭 沒有待處理的任務');
      return { statusCode: 200, body: JSON.stringify({ message: 'No pending tasks' }) };
    }

    const { task_id, set_id, user_id, progress } = task;
    console.log(`📋 處理任務: ${task_id}, 進度: ${progress}%`);

    // 取得貼圖組資料
    const stickerSet = await getStickerSet(set_id);
    if (!stickerSet) {
      await updateTask(task_id, { status: 'failed' });
      return { statusCode: 200, body: JSON.stringify({ error: 'Sticker set not found' }) };
    }

    const { style, sticker_count, photo_base64, character_prompt, name } = stickerSet;
    const expressions = DefaultExpressions.basic.expressions.slice(0, sticker_count);

    // 計算當前要生成第幾張圖
    const currentIndex = Math.floor((progress / 100) * sticker_count);
    
    if (currentIndex >= sticker_count) {
      // 全部完成
      await updateTask(task_id, { status: 'completed', progress: 100 });
      await updateStickerSet(set_id, { status: 'completed' });
      await notifyUser(user_id, `🎉 貼圖「${name}」生成完成！\n\n輸入「我的貼圖」查看`);
      console.log(`✅ 任務 ${task_id} 完成`);
      return { statusCode: 200, body: JSON.stringify({ message: 'Task completed', task_id }) };
    }

    // 更新狀態為處理中
    if (task.status === 'pending') {
      await updateTask(task_id, { status: 'processing' });
      await notifyUser(user_id, `🎨 開始生成貼圖「${name}」...\n\n⏳ 預計需要幾分鐘，完成後會通知你`);
    }

    // 生成一張圖
    const expression = expressions[currentIndex];
    console.log(`🖼️ 生成第 ${currentIndex + 1}/${sticker_count} 張: ${expression}`);

    let imageUrl;
    if (photo_base64) {
      imageUrl = await generateStickerFromPhoto(photo_base64, style, expression);
    } else {
      imageUrl = await generateStickerImage(style, character_prompt, expression);
    }

    // TODO: 處理並上傳圖片到 Storage
    console.log(`✅ 第 ${currentIndex + 1} 張生成成功`);

    // 更新進度
    const newProgress = Math.round(((currentIndex + 1) / sticker_count) * 100);
    await updateTask(task_id, { progress: newProgress });

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        message: 'Progress updated', 
        task_id, 
        progress: newProgress,
        current: currentIndex + 1,
        total: sticker_count
      }) 
    };

  } catch (error) {
    console.error('❌ 處理失敗:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

