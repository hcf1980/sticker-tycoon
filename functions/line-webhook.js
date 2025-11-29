/**
 * LINE Webhook Handler
 * 處理 LINE Bot 訊息、貼圖創建流程
 */

const line = require('@line/bot-sdk');
const axios = require('axios');
const { isReplyTokenUsed, recordReplyToken, getOrCreateUser, getUserStickerSets, getUserLatestTask, getUserPendingTasks, getStickerSet, getStickerImages, deleteStickerSet, addToUploadQueue, removeFromUploadQueue, getUploadQueue, clearUploadQueue, getUserTokenBalance, getTokenTransactions } = require('./supabase-client');
const { ConversationStage, getConversationState, updateConversationState, resetConversationState, isInCreationFlow } = require('./conversation-state');
const { generateWelcomeFlexMessage } = require('./sticker-flex-message');
const { handleStartCreate, handleNaming, handleStyleSelection, handleCharacterDescription, handleExpressionTemplate, handleSceneSelection, handleCustomScene, handleCountSelection, handlePhotoUpload } = require('./handlers/create-handler');
const { handleUserPhoto } = require('./photo-handler');
const { createGenerationTask } = require('./sticker-generator-worker-background');
const { StickerStyles, SceneTemplates } = require('./sticker-styles');

// LINE Bot 設定 - 延遲初始化
let client = null;

function getLineClient() {
  if (client) return client;

  const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
  };

  if (!config.channelAccessToken || !config.channelSecret) {
    console.error('❌ LINE 環境變數未設定：需要 LINE_CHANNEL_ACCESS_TOKEN 和 LINE_CHANNEL_SECRET');
    throw new Error('LINE 環境變數未設定');
  }

  client = new line.Client(config);
  return client;
}

function getChannelSecret() {
  return process.env.LINE_CHANNEL_SECRET;
}

/**
 * 處理文字訊息
 */
async function handleTextMessage(replyToken, userId, text) {
  try {
    console.log(`📝 處理訊息：${text} (User: ${userId})`);

    // 取得用戶對話狀態
    const state = await getConversationState(userId);
    const currentStage = state.current_stage;

    // 詳細日誌
    console.log(`🔍 用戶狀態: stage=${currentStage}, temp_data=${JSON.stringify(state.temp_data)}`);
    
    // 1. 檢查是否要取消
    if (text === '取消' || text === '取消創建') {
      await resetConversationState(userId);
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '❌ 已取消創建流程\n\n輸入「創建貼圖」重新開始！'
      });
    }
    
    // 2. 優先處理創建流程中的輸入（避免被其他指令中斷）
    console.log(`🔍 isInCreationFlow: ${isInCreationFlow(currentStage)} (stage: ${currentStage})`);
    if (isInCreationFlow(currentStage)) {
      // 如果在流程中又輸入「創建貼圖」，詢問是否要重新開始
      if (text === '創建貼圖' || text === '開始' || text === '新增貼圖') {
        return getLineClient().replyMessage(replyToken, {
          type: 'text',
          text: '⚠️ 你正在創建貼圖中\n\n' +
                `目前階段：${getStageDescription(currentStage)}\n\n` +
                '輸入「取消」可以重新開始'
        });
      }
      return await handleCreationFlow(replyToken, userId, text, currentStage, state);
    }

    // 3. 檢查主要指令（只有在非流程中才處理）
    if (text === '創建貼圖' || text === '開始' || text === '新增貼圖') {
      const message = await handleStartCreate(userId);
      return getLineClient().replyMessage(replyToken, message);
    }

    if (text === '我的貼圖' || text === '貼圖列表') {
      const sets = await getUserStickerSets(userId);
      if (sets.length === 0) {
        return getLineClient().replyMessage(replyToken, {
          type: 'text',
          text: '📁 你還沒有創建任何貼圖組\n\n輸入「創建貼圖」開始創建你的第一組貼圖！'
        });
      }
      // 生成貼圖列表 Flex Message
      const stickerListMessage = generateStickerListFlexMessage(sets);
      return getLineClient().replyMessage(replyToken, stickerListMessage);
    }

    // 示範圖集
    if (text === '示範圖集' || text === '範例' || text === '作品集') {
      return getLineClient().replyMessage(replyToken, generateDemoGalleryFlexMessage());
    }

    // 代幣查詢
    if (text === '代幣' || text === '餘額' || text === '我的代幣' || text === '查詢代幣') {
      return await handleTokenQuery(replyToken, userId);
    }

    // 購買代幣
    if (text === '購買代幣' || text === '儲值' || text === '買代幣') {
      return await handlePurchaseInfo(replyToken);
    }

    // 查看特定貼圖組
    if (text.startsWith('查看貼圖:')) {
      const setId = text.replace('查看貼圖:', '');
      return await handleViewStickerSet(replyToken, userId, setId);
    }

    // 刪除貼圖組
    if (text.startsWith('刪除貼圖:')) {
      const setId = text.replace('刪除貼圖:', '');
      return await handleDeleteStickerSet(replyToken, userId, setId);
    }

    // 確認刪除貼圖組
    if (text.startsWith('確認刪除:')) {
      const setId = text.replace('確認刪除:', '');
      return await handleConfirmDeleteStickerSet(replyToken, userId, setId);
    }

    // 加入待上傳佇列
    if (text.startsWith('加入上傳:')) {
      const params = text.replace('加入上傳:', '').split('|');
      const [stickerId, setId, imageUrl, expression] = params;
      return await handleAddToUploadQueue(replyToken, userId, stickerId, setId, imageUrl, expression);
    }

    // 從待上傳佇列移除
    if (text.startsWith('移除上傳:')) {
      const stickerId = text.replace('移除上傳:', '');
      return await handleRemoveFromUploadQueue(replyToken, userId, stickerId);
    }

    // 查看待上傳佇列
    if (text === '待上傳' || text === '上傳佇列' || text === '待上傳列表') {
      return await handleViewUploadQueue(replyToken, userId);
    }

    // 清空待上傳佇列
    if (text === '清空待上傳') {
      return await handleClearUploadQueue(replyToken, userId);
    }

    // 4. 處理特殊指令格式
    if (text.startsWith('風格:')) {
      const styleId = text.replace('風格:', '');
      const message = await handleStyleSelection(userId, styleId);
      return getLineClient().replyMessage(replyToken, message);
    }
    
    if (text.startsWith('表情模板:')) {
      const templateId = text.replace('表情模板:', '');
      const message = await handleExpressionTemplate(userId, templateId);
      return getLineClient().replyMessage(replyToken, message);
    }
    
    if (text.startsWith('數量:')) {
      const count = parseInt(text.replace('數量:', ''));
      const message = await handleCountSelection(userId, count);
      return getLineClient().replyMessage(replyToken, message);
    }
    
    if (text === '確認生成') {
      return await handleConfirmGeneration(replyToken, userId, state);
    }

    // 查詢進度
    if (text === '查詢進度' || text === '進度') {
      return await handleCheckProgress(replyToken, userId);
    }

    // 5. 預設回覆 - 歡迎訊息
    return getLineClient().replyMessage(replyToken, generateWelcomeFlexMessage());
    
  } catch (error) {
    console.error('❌ 處理訊息失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統發生錯誤，請稍後再試'
    });
  }
}

/**
 * 取得階段描述
 */
function getStageDescription(stage) {
  const descriptions = {
    [ConversationStage.NAMING]: '輸入貼圖組名稱',
    [ConversationStage.UPLOAD_PHOTO]: '上傳照片',
    [ConversationStage.STYLING]: '選擇風格',
    [ConversationStage.CHARACTER]: '描述角色',
    [ConversationStage.EXPRESSIONS]: '選擇表情',
    [ConversationStage.SCENE_SELECT]: '選擇場景',
    [ConversationStage.CUSTOM_SCENE]: '自訂場景',
    [ConversationStage.COUNT_SELECT]: '選擇數量',
    [ConversationStage.CONFIRMING]: '確認生成'
  };
  return descriptions[stage] || '進行中';
}

/**
 * 處理創建流程中的輸入
 */
async function handleCreationFlow(replyToken, userId, text, stage, state) {
  let message;

  switch (stage) {
    case ConversationStage.NAMING:
      message = await handleNaming(userId, text);
      break;
    case ConversationStage.STYLING:
      // 處理風格選擇（可能是按鈕點擊 "風格:xxx" 或直接輸入）
      if (text.startsWith('風格:')) {
        const styleId = text.replace('風格:', '');
        message = await handleStyleSelection(userId, styleId);
      } else {
        message = { type: 'text', text: '⚠️ 請點擊上方按鈕選擇風格！' };
      }
      break;
    case ConversationStage.EXPRESSIONS:
      // 處理表情選擇
      if (text.startsWith('表情模板:')) {
        const templateId = text.replace('表情模板:', '');
        message = await handleExpressionTemplate(userId, templateId);
      } else {
        message = { type: 'text', text: '⚠️ 請點擊上方按鈕選擇表情模板！' };
      }
      break;
    case ConversationStage.SCENE_SELECT:
      // 處理場景選擇
      if (text.startsWith('場景:')) {
        const sceneId = text.replace('場景:', '');
        message = await handleSceneSelection(userId, sceneId);
      } else {
        message = { type: 'text', text: '⚠️ 請點擊上方按鈕選擇場景！' };
      }
      break;
    case ConversationStage.CUSTOM_SCENE:
      // 處理自訂場景描述
      message = await handleCustomScene(userId, text);
      break;
    case ConversationStage.COUNT_SELECT:
      // 處理數量選擇
      if (text.startsWith('數量:')) {
        const count = parseInt(text.replace('數量:', ''));
        message = await handleCountSelection(userId, count);
      } else {
        message = { type: 'text', text: '⚠️ 請點擊上方按鈕選擇數量！' };
      }
      break;
    case ConversationStage.CHARACTER:
      message = await handleCharacterDescription(userId, text);
      break;
    case ConversationStage.CONFIRMING:
      // 處理確認生成
      if (text === '確認生成') {
        return await handleConfirmGeneration(replyToken, userId, state);
      } else {
        message = { type: 'text', text: '⚠️ 請點擊「開始生成」按鈕或輸入「取消」重新開始' };
      }
      break;
    default:
      message = { type: 'text', text: '⚠️ 請按照提示操作或輸入「取消」重新開始' };
  }

  return getLineClient().replyMessage(replyToken, message);
}

/**
 * 處理確認生成
 */
async function handleConfirmGeneration(replyToken, userId, state) {
  const tempData = state.temp_data;

  // 驗證資料完整性（照片流程不需要 character）
  const hasPhoto = tempData?.photoUrl || tempData?.photoBase64;
  const hasCharacter = tempData?.character;

  if (!tempData || !tempData.name || !tempData.style || (!hasPhoto && !hasCharacter)) {
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '⚠️ 創建資料不完整，請輸入「創建貼圖」重新開始'
    });
  }

  // 更新狀態為生成中
  await updateConversationState(userId, ConversationStage.GENERATING, tempData);

  // 回覆生成中訊息（不再提到會通知）
  await getLineClient().replyMessage(replyToken, {
    type: 'text',
    text: '🎨 開始生成貼圖！\n\n' +
          `📛 名稱：${tempData.name}\n` +
          `📊 數量：${tempData.count} 張\n\n` +
          '⏳ 預計需要 2-5 分鐘\n\n' +
          '📋 輸入「查詢進度」查看生成進度\n' +
          '📁 輸入「我的貼圖」查看完成的貼圖'
  });

  // 建立生成任務並觸發 Background Worker
  try {
    const { taskId, setId } = await createGenerationTask(userId, {
      name: tempData.name,
      style: tempData.style,
      character: tempData.character || '',
      count: tempData.count || 8,
      photoUrl: tempData.photoUrl,
      photoBase64: tempData.photoBase64,
      expressions: tempData.expressions || [],
      scene: tempData.scene || 'none',
      sceneConfig: tempData.sceneConfig || null,
      customSceneDescription: tempData.customSceneDescription || null
    });

    console.log(`✅ 已建立生成任務: taskId=${taskId}, setId=${setId}`);

    // 觸發 Background Worker 執行生成
    const workerUrl = `${process.env.URL || 'https://sticker-tycoon.netlify.app'}/.netlify/functions/sticker-generator-worker-background`;
    console.log(`🚀 觸發 Background Worker: ${workerUrl}`);

    // 使用 fetch 非同步調用 Background Function
    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, setId, userId })
    }).then(res => {
      console.log(`📡 Worker 回應狀態: ${res.status}`);
    }).catch(err => {
      console.error('❌ Worker 調用失敗:', err.message);
    });

    // 重置對話狀態
    await resetConversationState(userId);

  } catch (error) {
    console.error('❌ 建立生成任務失敗:', error);
    await getLineClient().pushMessage(userId, {
      type: 'text',
      text: '❌ 系統錯誤，無法建立生成任務，請稍後再試'
    });
  }

  return;
}

/**
 * 處理查詢進度
 */
async function handleCheckProgress(replyToken, userId) {
  try {
    // 取得進行中的任務
    const pendingTasks = await getUserPendingTasks(userId);

    if (pendingTasks.length === 0) {
      // 沒有進行中的任務，查詢最新的任務
      const latestTask = await getUserLatestTask(userId);

      if (!latestTask) {
        return getLineClient().replyMessage(replyToken, {
          type: 'text',
          text: '📭 目前沒有任何生成任務\n\n輸入「創建貼圖」開始創建！'
        });
      }

      // 顯示最新任務狀態
      const statusEmoji = {
        'completed': '✅',
        'failed': '❌',
        'pending': '⏳',
        'processing': '🔄'
      };

      const setInfo = latestTask.sticker_set;
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: `📋 最新任務狀態\n\n` +
              `📛 名稱：${setInfo?.name || '未命名'}\n` +
              `${statusEmoji[latestTask.status] || '❓'} 狀態：${latestTask.status}\n` +
              `📊 進度：${latestTask.progress || 0}%\n\n` +
              (latestTask.status === 'completed'
                ? '輸入「我的貼圖」查看結果'
                : latestTask.status === 'failed'
                  ? '輸入「創建貼圖」重試'
                  : '請稍候...')
      });
    }

    // 有進行中的任務
    let message = `🔄 進行中的任務：${pendingTasks.length} 個\n\n`;

    pendingTasks.forEach((task, index) => {
      const setInfo = task.sticker_set;
      message += `${index + 1}. ${setInfo?.name || '未命名'}\n`;
      message += `   📊 進度：${task.progress || 0}%\n`;
    });

    message += '\n💡 輸入「我的貼圖」查看完成的貼圖組';

    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: message
    });

  } catch (error) {
    console.error('❌ 查詢進度失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 查詢失敗，請稍後再試'
    });
  }
}

/**
 * 處理圖片訊息
 */
async function handleImageMessage(replyToken, userId, messageId) {
  try {
    console.log(`📷 處理圖片訊息：${messageId} (User: ${userId})`);

    // 取得用戶對話狀態
    const state = await getConversationState(userId);
    const currentStage = state.current_stage;

    // 檢查是否在等待上傳照片的階段
    if (currentStage !== ConversationStage.UPLOAD_PHOTO) {
      await safeReply(replyToken, {
        type: 'text',
        text: '📷 如果想用照片製作貼圖，請先輸入「創建貼圖」開始！'
      });
      return;
    }

    // 顯示處理中訊息
    await safeReply(replyToken, {
      type: 'text',
      text: '📥 正在處理你的照片...'
    });

    // 處理照片
    const photoResult = await handleUserPhoto(messageId, userId);

    if (!photoResult.success) {
      console.log('❌ 照片處理失敗');
      try {
        await getLineClient().pushMessage(userId, {
          type: 'text',
          text: '❌ 照片處理失敗，請重新上傳一張清晰的正面照片！'
        });
      } catch (e) {
        console.error('pushMessage 失敗:', e.message);
      }
      return;
    }

    // 調用 handler 處理下一步
    console.log('📤 準備發送風格選擇訊息');
    const message = await handlePhotoUpload(userId, photoResult);
    console.log('📤 發送風格選擇 Flex Message');

    try {
      await getLineClient().pushMessage(userId, message);
      console.log('✅ 風格選擇訊息發送成功');
    } catch (pushError) {
      console.error('❌ pushMessage 失敗:', pushError.message);
    }

  } catch (error) {
    console.error('❌ 處理圖片失敗:', error);
    await safeReply(replyToken, {
      type: 'text',
      text: '❌ 系統發生錯誤，請稍後再試'
    });
  }
}

/**
 * 安全地回覆 LINE 訊息（失敗不拋出錯誤）
 */
async function safeReply(replyToken, message) {
  try {
    await getLineClient().replyMessage(replyToken, message);
    return true;
  } catch (error) {
    // 400 錯誤通常是 replyToken 過期或已使用，不需要重試
    if (error.statusCode === 400) {
      console.log('⚠️ Reply token 已過期或已使用，跳過回覆');
    } else {
      console.error('❌ 回覆訊息失敗:', error.message);
    }
    return false;
  }
}

/**
 * Netlify Function Handler
 */
exports.handler = async function(event, context) {
  console.log('🔔 LINE Webhook 被呼叫');

  // 無論發生什麼，都要返回 200 給 LINE（避免重試循環）
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 200, body: JSON.stringify({ message: 'Method Not Allowed but OK' }) };
    }

    // 驗證 LINE Signature
    const signature = event.headers['x-line-signature'];
    if (!signature) {
      console.log('⚠️ 缺少 signature');
      return { statusCode: 200, body: JSON.stringify({ message: 'No signature but OK' }) };
    }

    const crypto = require('crypto');
    const hash = crypto.createHmac('SHA256', getChannelSecret()).update(event.body).digest('base64');
    if (hash !== signature) {
      console.log('⚠️ 簽名驗證失敗');
      return { statusCode: 200, body: JSON.stringify({ message: 'Invalid signature but OK' }) };
    }

    const body = JSON.parse(event.body);
    const events = body.events || [];

    for (const ev of events) {
      if (ev.type !== 'message') continue;

      const replyToken = ev.replyToken;
      const userId = ev.source.userId;

      // 去重檢查
      const isUsed = await isReplyTokenUsed(replyToken);
      if (isUsed) {
        console.log(`⚠️ ReplyToken 已處理過: ${replyToken.substring(0, 8)}...`);
        continue;
      }

      // 先記錄 token（確保不會重複處理）
      await recordReplyToken(replyToken);

      // 根據訊息類型處理
      try {
        if (ev.message.type === 'text') {
          const text = ev.message.text.trim();
          await handleTextMessage(replyToken, userId, text);
        } else if (ev.message.type === 'image') {
          await handleImageMessage(replyToken, userId, ev.message.id);
        }
      } catch (innerError) {
        console.error('❌ 處理訊息失敗:', innerError.message);
        // 嘗試回覆錯誤訊息，但失敗也沒關係
        await safeReply(replyToken, {
          type: 'text',
          text: '❌ 系統發生錯誤，請稍後再試'
        });
      }
    }

  } catch (error) {
    console.error('❌ Webhook 處理失敗:', error.message);
  }

  // 永遠返回 200，避免 LINE 重試
  return { statusCode: 200, body: JSON.stringify({ message: 'OK' }) };
};

/**
 * 生成貼圖列表 Flex Message
 */
function generateStickerListFlexMessage(sets) {
  const statusEmoji = {
    'completed': '✅',
    'processing': '⏳',
    'pending': '🕐',
    'failed': '❌'
  };

  // 最多顯示 10 組
  const displaySets = sets.slice(0, 10);

  const bubbles = displaySets.map(set => {
    const emoji = statusEmoji[set.status] || '📁';
    const createdDate = new Date(set.created_at).toLocaleDateString('zh-TW');

    // 使用 set_id 優先，否則使用 id
    const setId = set.set_id || set.id;

    // 取得第一張貼圖作為預覽圖（如果有）
    const previewUrl = set.main_image_url || set.preview_url || null;

    const contents = [
      { type: 'text', text: `${emoji} ${set.name || '未命名'}`, weight: 'bold', size: 'lg', wrap: true },
      { type: 'text', text: `📊 ${set.sticker_count || 0} 張貼圖`, size: 'sm', color: '#666666', margin: 'md' },
      { type: 'text', text: `📅 ${createdDate}`, size: 'xs', color: '#999999', margin: 'sm' }
    ];

    // 根據狀態決定按鈕
    const footerContents = [];

    // 已完成的顯示查看詳情
    if (set.status === 'completed') {
      footerContents.push({
        type: 'button',
        style: 'primary',
        color: '#FF6B6B',
        height: 'sm',
        action: {
          type: 'message',
          label: '查看詳情',
          text: `查看貼圖:${setId}`
        }
      });
    }

    // 所有貼圖組都可以刪除
    footerContents.push({
      type: 'button',
      style: set.status === 'completed' ? 'secondary' : 'primary',
      color: set.status === 'completed' ? undefined : '#999999',
      height: 'sm',
      action: {
        type: 'message',
        label: '🗑️ 刪除',
        text: `刪除貼圖:${setId}`
      }
    });

    return {
      type: 'bubble',
      size: 'kilo',
      hero: previewUrl ? {
        type: 'image',
        url: previewUrl,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'cover'
      } : undefined,
      body: {
        type: 'box',
        layout: 'vertical',
        contents: contents
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: footerContents
      }
    };
  });

  // 過濾掉 undefined 的 hero
  bubbles.forEach(bubble => {
    if (!bubble.hero) delete bubble.hero;
  });

  return {
    type: 'flex',
    altText: `📁 你有 ${sets.length} 組貼圖`,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}

/**
 * 處理查看特定貼圖組
 */
async function handleViewStickerSet(replyToken, userId, setId) {
  try {
    const set = await getStickerSet(setId);

    if (!set) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '❌ 找不到此貼圖組'
      });
    }

    // 確認是用戶自己的貼圖組
    if (set.user_id !== userId) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '❌ 你沒有權限查看此貼圖組'
      });
    }

    // 從資料庫取得貼圖圖片
    const stickers = await getStickerImages(set.set_id);
    const completedStickers = stickers.filter(s => s.status === 'completed' && s.image_url);

    console.log(`📷 貼圖組 ${set.set_id} 有 ${completedStickers.length} 張已完成貼圖`);

    // 如果有貼圖，用輪播方式顯示
    if (completedStickers.length > 0) {
      return await sendStickerCarousel(replyToken, set, completedStickers);
    }

    // 沒有貼圖，顯示基本資訊
    const statusText = {
      'completed': '✅ 已完成',
      'processing': '⏳ 生成中',
      'pending': '🕐 等待中',
      'failed': '❌ 失敗'
    };

    // 取得風格詳情
    const styleInfo = StickerStyles[set.style] || null;
    const styleName = styleInfo ? `${styleInfo.emoji} ${styleInfo.name}` : (set.style || '未指定');

    // 取得場景/裝飾風格詳情
    const sceneInfo = SceneTemplates[set.scene] || null;
    const sceneName = sceneInfo ? `${sceneInfo.emoji} ${sceneInfo.name}` : (set.scene === 'none' || !set.scene ? '✨ 簡約風' : set.scene);

    const flexMessage = {
      type: 'flex',
      altText: `📁 ${set.name}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: `📁 ${set.name || '未命名'}`, weight: 'bold', size: 'xl', wrap: true },
            { type: 'text', text: statusText[set.status] || set.status, size: 'sm', color: '#666666', margin: 'md' },
            { type: 'text', text: `📊 貼圖數量：${set.sticker_count || 0} 張`, size: 'sm', margin: 'sm' },
            { type: 'text', text: `🎨 風格：${styleName}`, size: 'sm', margin: 'sm' },
            { type: 'text', text: `🎭 裝飾：${sceneName}`, size: 'sm', margin: 'sm' },
            { type: 'text', text: `📅 建立時間：${new Date(set.created_at).toLocaleString('zh-TW')}`, size: 'xs', color: '#999999', margin: 'lg' },
            { type: 'text', text: '（此貼圖組尚無已完成的貼圖）', size: 'xs', color: '#999999', margin: 'md' }
          ]
        }
      }
    };

    return getLineClient().replyMessage(replyToken, flexMessage);

  } catch (error) {
    console.error('❌ 查看貼圖組失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試'
    });
  }
}

/**
 * 發送貼圖輪播訊息 - 每格一張大圖
 */
async function sendStickerCarousel(replyToken, set, stickers) {
  const statusText = {
    'completed': '✅ 已完成',
    'processing': '⏳ 生成中',
    'pending': '🕐 等待中',
    'failed': '❌ 失敗'
  };

  // 取得風格詳情
  const styleInfo = StickerStyles[set.style] || null;
  const styleName = styleInfo ? `${styleInfo.emoji} ${styleInfo.name}` : (set.style || '未指定');

  // 取得場景/裝飾風格詳情
  const sceneInfo = SceneTemplates[set.scene] || null;
  const sceneName = sceneInfo ? `${sceneInfo.emoji} ${sceneInfo.name}` : (set.scene === 'none' || !set.scene ? '✨ 簡約風' : set.scene);

  // 第一張 bubble：貼圖組資訊
  const infoBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#FF6B6B',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: `📁 ${set.name || '未命名'}`, weight: 'bold', size: 'lg', color: '#FFFFFF', wrap: true }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: statusText[set.status] || set.status, size: 'md', color: '#06C755', weight: 'bold' },
        { type: 'text', text: `📊 共 ${stickers.length} 張貼圖`, size: 'sm', margin: 'md' },
        { type: 'text', text: `🎨 風格：${styleName}`, size: 'sm', margin: 'sm' },
        { type: 'text', text: `🎭 裝飾：${sceneName}`, size: 'sm', margin: 'sm' },
        { type: 'text', text: `📅 ${new Date(set.created_at).toLocaleDateString('zh-TW')}`, size: 'xs', color: '#999999', margin: 'lg' },
        { type: 'text', text: '👈 左滑查看所有貼圖', size: 'xs', color: '#06C755', margin: 'md' }
      ]
    }
  };

  // 每張貼圖一個 bubble（帶「加入待上傳」按鈕）
  const stickerBubbles = stickers.map((s, index) => ({
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'sm',
      contents: [
        {
          type: 'image',
          url: s.image_url,
          size: 'full',
          aspectRatio: '1:1',
          aspectMode: 'fit',
          backgroundColor: '#FFFFFF'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'sm',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: s.expression || `#${s.index_number}`,
          size: 'sm',
          color: '#333333',
          align: 'center',
          weight: 'bold'
        },
        {
          type: 'text',
          text: `${index + 1} / ${stickers.length}`,
          size: 'xs',
          color: '#999999',
          align: 'center'
        },
        {
          type: 'button',
          style: 'primary',
          color: '#06C755',
          height: 'sm',
          action: {
            type: 'message',
            label: '✅ 加入待上傳',
            text: `加入上傳:${s.sticker_id}|${set.set_id}|${s.image_url}|${s.expression || ''}`
          }
        }
      ]
    }
  }));

  // 組合輪播（最多 12 個 bubble，LINE 限制）
  const allBubbles = [infoBubble, ...stickerBubbles].slice(0, 12);

  const carouselMessage = {
    type: 'flex',
    altText: `📁 ${set.name} - ${stickers.length} 張貼圖`,
    contents: {
      type: 'carousel',
      contents: allBubbles
    }
  };

  return getLineClient().replyMessage(replyToken, carouselMessage);
}

/**
 * 處理刪除貼圖組請求（顯示確認訊息）
 */
async function handleDeleteStickerSet(replyToken, userId, setId) {
  try {
    const set = await getStickerSet(setId);

    if (!set) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '❌ 找不到此貼圖組'
      });
    }

    // 確認是用戶自己的貼圖組
    if (set.user_id !== userId) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '❌ 你沒有權限刪除此貼圖組'
      });
    }

    // 顯示確認刪除的訊息
    const confirmMessage = {
      type: 'flex',
      altText: '確認刪除貼圖組',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: '⚠️ 確認刪除', weight: 'bold', size: 'lg', color: '#FF6B6B' },
            { type: 'text', text: `確定要刪除「${set.name || '未命名'}」嗎？`, size: 'md', margin: 'lg', wrap: true },
            { type: 'text', text: '此操作無法復原！', size: 'sm', color: '#FF0000', margin: 'md' }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#FF6B6B',
              action: {
                type: 'message',
                label: '✅ 確認刪除',
                text: `確認刪除:${setId}`
              }
            },
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'message',
                label: '❌ 取消',
                text: '我的貼圖'
              }
            }
          ]
        }
      }
    };

    return getLineClient().replyMessage(replyToken, confirmMessage);

  } catch (error) {
    console.error('❌ 處理刪除請求失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試'
    });
  }
}

/**
 * 處理確認刪除貼圖組
 */
async function handleConfirmDeleteStickerSet(replyToken, userId, setId) {
  try {
    const result = await deleteStickerSet(setId, userId);

    if (!result.success) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: `❌ 刪除失敗：${result.error}`
      });
    }

    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '✅ 貼圖組已成功刪除！\n\n輸入「我的貼圖」查看剩餘貼圖組'
    });

  } catch (error) {
    console.error('❌ 確認刪除失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試'
    });
  }
}

// ============================================
// 上傳佇列相關功能
// ============================================

/**
 * 處理加入上傳佇列
 */
async function handleAddToUploadQueue(replyToken, userId, stickerId, setId, imageUrl, expression) {
  try {
    const result = await addToUploadQueue(userId, stickerId, setId, imageUrl, expression);

    if (!result.success) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: `❌ ${result.error}`
      });
    }

    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: `✅ 已加入待上傳佇列！\n\n` +
            `📊 目前佇列：${result.currentCount} / 40 張\n\n` +
            (result.currentCount >= 40
              ? '🎉 已達 40 張！輸入「待上傳」查看並下載'
              : `💡 再選 ${40 - result.currentCount} 張即可上傳 LINE 貼圖`)
    });

  } catch (error) {
    console.error('❌ 加入上傳佇列失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試'
    });
  }
}

/**
 * 處理從上傳佇列移除
 */
async function handleRemoveFromUploadQueue(replyToken, userId, stickerId) {
  try {
    const result = await removeFromUploadQueue(userId, stickerId);

    if (!result.success) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: `❌ 移除失敗：${result.error}`
      });
    }

    // 取得更新後的佇列數量
    const queue = await getUploadQueue(userId);

    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: `✅ 已從待上傳佇列移除\n\n📊 目前佇列：${queue.length} / 40 張`
    });

  } catch (error) {
    console.error('❌ 移除失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試'
    });
  }
}

/**
 * 處理查看上傳佇列
 */
async function handleViewUploadQueue(replyToken, userId) {
  try {
    const queue = await getUploadQueue(userId);

    if (queue.length === 0) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '📋 待上傳佇列是空的\n\n' +
              '💡 操作說明：\n' +
              '1. 輸入「我的貼圖」\n' +
              '2. 點「查看詳情」\n' +
              '3. 在每張貼圖下點「✅ 加入待上傳」\n' +
              '4. 累積 40 張即可下載打包上傳 LINE'
      });
    }

    // 生成佇列輪播
    return await sendUploadQueueCarousel(replyToken, queue);

  } catch (error) {
    console.error('❌ 查看上傳佇列失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試'
    });
  }
}

/**
 * 發送上傳佇列輪播
 */
async function sendUploadQueueCarousel(replyToken, queue) {
  const count = queue.length;
  const isReady = count >= 40;

  // 第一個 bubble：佇列狀態
  const statusBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: isReady ? '#06C755' : '#FF9800',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: '📤 待上傳佇列', weight: 'bold', size: 'lg', color: '#FFFFFF' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `📊 已選擇：${count} / 40 張`, size: 'md', weight: 'bold' },
        {
          type: 'text',
          text: isReady ? '🎉 已達到 40 張，可以下載打包！' : `⏳ 還需要 ${40 - count} 張`,
          size: 'sm',
          color: isReady ? '#06C755' : '#FF9800',
          margin: 'md',
          wrap: true
        },
        { type: 'text', text: '👈 左滑查看已選貼圖', size: 'xs', color: '#999999', margin: 'lg' }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        ...(isReady ? [{
          type: 'button',
          style: 'primary',
          color: '#06C755',
          action: {
            type: 'uri',
            label: '📥 下載貼圖包',
            uri: `https://sticker-tycoon.netlify.app/download?userId=${encodeURIComponent(queue[0]?.user_id || '')}`
          }
        }] : []),
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'message',
            label: '🗑️ 清空佇列',
            text: '清空待上傳'
          }
        }
      ]
    }
  };

  // 每張貼圖一個 bubble（帶移除按鈕）
  const stickerBubbles = queue.slice(0, 10).map((item, index) => ({
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'sm',
      contents: [
        {
          type: 'image',
          url: item.image_url,
          size: 'full',
          aspectRatio: '1:1',
          aspectMode: 'fit',
          backgroundColor: '#FFFFFF'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'sm',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: item.expression || `#${index + 1}`,
          size: 'sm',
          color: '#333333',
          align: 'center',
          weight: 'bold'
        },
        {
          type: 'text',
          text: `${index + 1} / ${count}`,
          size: 'xs',
          color: '#999999',
          align: 'center'
        },
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'message',
            label: '❌ 移除',
            text: `移除上傳:${item.sticker_id}`
          }
        }
      ]
    }
  }));

  // 組合輪播
  const allBubbles = [statusBubble, ...stickerBubbles].slice(0, 12);

  const carouselMessage = {
    type: 'flex',
    altText: `📤 待上傳佇列 - ${count}/40 張`,
    contents: {
      type: 'carousel',
      contents: allBubbles
    }
  };

  return getLineClient().replyMessage(replyToken, carouselMessage);
}

/**
 * 處理清空上傳佇列
 */
async function handleClearUploadQueue(replyToken, userId) {
  try {
    const result = await clearUploadQueue(userId);

    if (!result.success) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: `❌ 清空失敗：${result.error}`
      });
    }

    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '✅ 待上傳佇列已清空\n\n輸入「我的貼圖」重新選擇貼圖'
    });

  } catch (error) {
    console.error('❌ 清空佇列失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試'
    });
  }
}

/**
 * 生成示範圖集 Flex Message
 */
function generateDemoGalleryFlexMessage() {
  // 示範貼圖（可以替換成真實的範例圖片 URL）
  const demoStickers = [
    { url: 'https://sticker-tycoon.netlify.app/demo/cute-1.png', style: '可愛風', expression: 'Hi' },
    { url: 'https://sticker-tycoon.netlify.app/demo/cool-1.png', style: '酷炫風', expression: 'OK' },
    { url: 'https://sticker-tycoon.netlify.app/demo/anime-1.png', style: '動漫風', expression: '讚讚' },
    { url: 'https://sticker-tycoon.netlify.app/demo/realistic-1.png', style: '美顏真實', expression: '開心' }
  ];

  const infoBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#FF6B6B',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: '✨ 示範圖集', weight: 'bold', size: 'lg', color: '#FFFFFF' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '以下是各種風格的貼圖範例', size: 'sm', wrap: true },
        { type: 'text', text: '👈 左滑查看更多', size: 'xs', color: '#06C755', margin: 'lg' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '🎨 可選風格：', size: 'sm', weight: 'bold', margin: 'lg' },
        { type: 'text', text: '美顏真實 / 可愛風 / 酷炫風', size: 'xs', color: '#666666', margin: 'sm' },
        { type: 'text', text: '搞笑風 / 簡約風 / 動漫風', size: 'xs', color: '#666666', margin: 'sm' },
        { type: 'text', text: '像素風 / 塗鴉風', size: 'xs', color: '#666666', margin: 'sm' }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#FF6B6B',
          action: { type: 'message', label: '🚀 開始創建', text: '創建貼圖' }
        }
      ]
    }
  };

  const demoBubbles = demoStickers.map(demo => ({
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'sm',
      contents: [
        {
          type: 'image',
          url: demo.url,
          size: 'full',
          aspectRatio: '1:1',
          aspectMode: 'fit',
          backgroundColor: '#FFFFFF'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'sm',
      contents: [
        { type: 'text', text: demo.expression, size: 'sm', weight: 'bold', align: 'center' },
        { type: 'text', text: demo.style, size: 'xs', color: '#999999', align: 'center', margin: 'sm' }
      ]
    }
  }));

  return {
    type: 'flex',
    altText: '✨ 示範圖集 - 各種風格的貼圖範例',
    contents: {
      type: 'carousel',
      contents: [infoBubble, ...demoBubbles]
    }
  };
}

/**
 * 處理代幣查詢
 */
async function handleTokenQuery(replyToken, userId) {
  const balance = await getUserTokenBalance(userId);
  const transactions = await getTokenTransactions(userId, 5);

  let transactionText = '';
  if (transactions.length > 0) {
    transactionText = '\n\n📜 最近交易：\n' + transactions.map(t => {
      const sign = t.amount > 0 ? '+' : '';
      const date = new Date(t.created_at).toLocaleDateString('zh-TW');
      return `${date} ${sign}${t.amount} ${t.description || ''}`;
    }).join('\n');
  }

  const message = {
    type: 'flex',
    altText: `💰 你的代幣餘額：${balance}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFD700',
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: '💰 我的代幣', size: 'lg', weight: 'bold', color: '#333333', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'xl',
        contents: [
          { type: 'text', text: `${balance}`, size: '3xl', weight: 'bold', align: 'center', color: '#FF6B00' },
          { type: 'text', text: '代幣', size: 'sm', align: 'center', color: '#666666', margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: '💡 每生成1張貼圖消耗1代幣', size: 'xs', color: '#888888', margin: 'lg', wrap: true }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          {
            type: 'button',
            action: { type: 'message', label: '🛒 購買代幣', text: '購買代幣' },
            style: 'primary',
            color: '#FF6B00'
          }
        ]
      }
    }
  };

  return getLineClient().replyMessage(replyToken, message);
}

/**
 * 處理購買代幣資訊
 */
async function handlePurchaseInfo(replyToken) {
  const message = {
    type: 'flex',
    altText: '🛒 購買代幣方案',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FF6B00',
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: '🛒 購買代幣', size: 'xl', weight: 'bold', color: '#FFFFFF', align: 'center' },
          { type: 'text', text: '用代幣創作專屬貼圖', size: 'sm', color: '#FFDDBB', align: 'center', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'md',
        contents: [
          // 方案1
          {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#FFF8F0',
            cornerRadius: 'md',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '💰 NT$300', size: 'md', weight: 'bold', color: '#333333', flex: 1 },
              { type: 'text', text: '70 代幣', size: 'md', weight: 'bold', color: '#FF6B00', align: 'end' }
            ]
          },
          // 方案2
          {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#FFF0E0',
            cornerRadius: 'md',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '💰 NT$500', size: 'md', weight: 'bold', color: '#333333', flex: 1 },
              { type: 'text', text: '130 代幣', size: 'md', weight: 'bold', color: '#FF6B00', align: 'end' },
              { type: 'text', text: '熱門', size: 'xxs', color: '#FFFFFF', backgroundColor: '#FF3366', position: 'absolute', offsetTop: '0px', offsetEnd: '0px', paddingAll: 'xs' }
            ]
          },
          // 方案3
          {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#FFE8D0',
            cornerRadius: 'md',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '💰 NT$1000', size: 'md', weight: 'bold', color: '#333333', flex: 1 },
              { type: 'text', text: '300 代幣', size: 'md', weight: 'bold', color: '#FF6B00', align: 'end' }
            ]
          },
          { type: 'separator', margin: 'lg' },
          // 付款資訊
          { type: 'text', text: '📱 轉帳資訊', size: 'md', weight: 'bold', margin: 'lg' },
          { type: 'text', text: '連線商業銀行（824）', size: 'sm', color: '#666666', margin: 'sm' },
          { type: 'text', text: '帳號：111000196474', size: 'sm', color: '#333333', weight: 'bold', margin: 'sm' },
          { type: 'text', text: '戶名：梁勝喜', size: 'sm', color: '#666666', margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: '⚠️ 轉帳後請截圖並傳送給我們', size: 'xs', color: '#FF6600', margin: 'md', wrap: true },
          { type: 'text', text: '客服會在確認後幫您加值代幣', size: 'xs', color: '#888888', wrap: true }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#F0F0F0',
            cornerRadius: 'md',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '👇 掃碼轉帳更方便', size: 'sm', align: 'center', color: '#666666' }
            ]
          }
        ]
      }
    }
  };

  // 傳送 QR Code 圖片
  const qrMessage = {
    type: 'image',
    originalContentUrl: 'https://sticker-tycoon.netlify.app/payment-qr.png',
    previewImageUrl: 'https://sticker-tycoon.netlify.app/payment-qr.png'
  };

  return getLineClient().replyMessage(replyToken, [message, qrMessage]);
}
