/**
 * LINE Webhook Handler
 * 處理 LINE Bot 訊息、貼圖創建流程
 */

const line = require('@line/bot-sdk');
const axios = require('axios');
const { isReplyTokenUsed, recordReplyToken, getOrCreateUser, getUserStickerSets, getUserLatestTask, getUserPendingTasks, getStickerSet, getStickerImages, deleteStickerSet, addToUploadQueue, removeFromUploadQueue, getUploadQueue, clearUploadQueue, getUserTokenBalance, getTokenTransactions, getUserReferralInfo, applyReferralCode, deductTokens, addTokens } = require('./supabase-client');
const { ConversationStage, getConversationState, updateConversationState, resetConversationState, isInCreationFlow } = require('./conversation-state');
const { generateWelcomeFlexMessage } = require('./sticker-flex-message');
const { handleStartCreate, handleNaming, handleStyleSelection, handleFramingSelection, handleCharacterDescription, handleExpressionTemplate, handleSceneSelection, handleCustomScene, handleCountSelection, handlePhotoUpload } = require('./handlers/create-handler');
const { handleUserPhoto } = require('./photo-handler');
const { createGenerationTask } = require('./sticker-generator-worker-background');
const { StickerStyles, SceneTemplates, FramingTemplates } = require('./sticker-styles');

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
    
    // 2. 優先處理全局命令（即使在創建流程中也可以使用）
    const globalCommands = ['分享給好友', '推薦好友', '我的推薦碼', '推薦碼', '邀請好友', '查詢進度', '我的貼圖', '貼圖列表', '代幣', '餘額', '我的代幣', '查詢代幣'];
    if (globalCommands.includes(text)) {
      // 這些命令不受創建流程限制，直接跳過創建流程處理
      console.log(`🌐 執行全局命令：${text}`);
    } else if (isInCreationFlow(currentStage)) {
      // 3. 處理創建流程中的輸入
      console.log(`🔍 isInCreationFlow: ${isInCreationFlow(currentStage)} (stage: ${currentStage})`);
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
      // 生成貼圖列表 Flex Message（帶推薦好友資訊）
      const referralInfo = await getUserReferralInfo(userId);
      const stickerListMessage = generateStickerListFlexMessage(sets, referralInfo);
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

    // 分享給好友
    if (text === '分享給好友' || text === '推薦好友' || text === '我的推薦碼' || text === '推薦碼' || text === '邀請好友') {
      return await handleReferralInfo(replyToken, userId);
    }

    // 使用推薦碼
    if (text.startsWith('輸入推薦碼') || text.startsWith('使用推薦碼')) {
      const code = text.replace(/^(輸入推薦碼|使用推薦碼)\s*/, '').trim();
      if (code) {
        return await handleApplyReferralCode(replyToken, userId, code);
      }
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '📝 請輸入推薦碼\n\n格式：輸入推薦碼 XXXXXX\n例如：輸入推薦碼 ABC123'
      });
    }

    // 分享推薦碼
    if (text === '分享推薦碼') {
      return await handleShareReferralCode(replyToken, userId);
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

    // 查看待上傳佇列（支援分頁）
    if (text === '待上傳' || text === '上傳佇列' || text === '待上傳列表') {
      return await handleViewUploadQueue(replyToken, userId, 1);
    }

    // 待上傳佇列分頁
    if (text.startsWith('待上傳頁:')) {
      const page = parseInt(text.replace('待上傳頁:', '')) || 1;
      return await handleViewUploadQueue(replyToken, userId, page);
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

    if (text.startsWith('構圖:')) {
      const framingId = text.replace('構圖:', '');
      const message = await handleFramingSelection(userId, framingId);
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
    [ConversationStage.FRAMING]: '選擇構圖',
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
    case ConversationStage.FRAMING:
      // 處理構圖選擇
      if (text.startsWith('構圖:')) {
        const framingId = text.replace('構圖:', '');
        message = await handleFramingSelection(userId, framingId);
      } else {
        message = { type: 'text', text: '⚠️ 請點擊上方按鈕選擇人物構圖！' };
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

  // 🔒 防止重複點擊：檢查是否已有進行中的任務
  const pendingTasks = await getUserPendingTasks(userId);
  if (pendingTasks.length > 0) {
    const task = pendingTasks[0];
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '⚠️ 你已有任務正在生成中！\n\n' +
            `📛 名稱：${task.sticker_set?.name || '處理中'}\n` +
            `📊 進度：${task.progress || 0}%\n\n` +
            '請等待目前的任務完成後再開始新任務。\n\n' +
            '📋 輸入「查詢進度」查看生成進度'
    });
  }

  // 計算需要的代幣數量
  const stickerCount = tempData.count || 8;

  // 💰 先扣除代幣（避免重複扣款）
  const deductResult = await deductTokens(
    userId,
    stickerCount,
    `生成貼圖組「${tempData.name}」(${stickerCount}張)`,
    null  // setId 還沒產生
  );

  if (!deductResult.success) {
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: `❌ ${deductResult.error}\n\n` +
            '💡 輸入「購買代幣」查看儲值方案'
    });
  }

  // 更新狀態為生成中
  await updateConversationState(userId, ConversationStage.GENERATING, tempData);

  // 取得用戶推薦資訊，判斷是否需要顯示推薦碼提醒
  const referralInfo = await getUserReferralInfo(userId);
  const showReferralReminder = referralInfo.referralCount < 3;

  // 組合訊息文字
  let messageText = '🎨 開始生成貼圖！\n\n' +
        `📛 名稱：${tempData.name}\n` +
        `📊 數量：${tempData.count} 張\n\n` +
        `💰 已扣除 ${stickerCount} 代幣，剩餘 ${deductResult.balance} 代幣\n\n` +
        '⏳ 預計需要 2-5 分鐘';

  // 如果未達推薦上限，加入推薦碼提醒
  if (showReferralReminder && referralInfo.referralCode) {
    messageText += `\n\n🎁 分享推薦碼「${referralInfo.referralCode}」給好友，雙方各得 10 代幣！(${referralInfo.referralCount}/3)`;
  }

  // 建立 QuickReply 按鈕
  const quickReplyItems = [
    {
      type: 'action',
      action: { type: 'message', label: '📋 查詢進度', text: '查詢進度' }
    },
    {
      type: 'action',
      action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' }
    }
  ];

  // 如果未達推薦上限，加入分享給好友按鈕
  if (showReferralReminder) {
    quickReplyItems.push({
      type: 'action',
      action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' }
    });
  }

  // 回覆生成中訊息（包含代幣扣除通知和 QuickReply）
  await getLineClient().replyMessage(replyToken, {
    type: 'text',
    text: messageText,
    quickReply: {
      items: quickReplyItems
    }
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
      customSceneDescription: tempData.customSceneDescription || null,
      framing: tempData.framing || 'halfbody',  // 構圖選擇（全身/半身/大頭/特寫）
      tokensDeducted: true  // 標記已經扣過代幣
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
    // 退還代幣（因為任務建立失敗）
    await addTokens(userId, stickerCount, 'refund', `任務建立失敗退款「${tempData.name}」`);
    console.log(`💰 已退還 ${stickerCount} 代幣`);
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
 * 處理 Postback 事件
 */
async function handlePostback(replyToken, userId, data) {
  console.log(`📮 處理 Postback：${data} (User: ${userId})`);

  // 解析 postback data
  const params = new URLSearchParams(data);
  const action = params.get('action');

  if (!action) {
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '⚠️ 操作無效，請重試'
    });
  }

  switch (action) {
    case 'view': {
      const setId = params.get('setId');
      if (!setId) return invalidPostback(replyToken);
      return await handleViewStickerSet(replyToken, userId, setId);
    }
    case 'delete': {
      const setId = params.get('setId');
      if (!setId) return invalidPostback(replyToken);
      return await handleDeleteStickerSet(replyToken, userId, setId);
    }
    case 'confirmDelete': {
      const setId = params.get('setId');
      if (!setId) return invalidPostback(replyToken);
      return await handleConfirmDeleteStickerSet(replyToken, userId, setId);
    }
    case 'removeUpload': {
      const stickerId = params.get('stickerId');
      if (!stickerId) return invalidPostback(replyToken);
      return await handleRemoveFromUploadQueue(replyToken, userId, stickerId);
    }
    default:
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '⚠️ 不支援的操作'
      });
  }
}

function invalidPostback(replyToken) {
  return getLineClient().replyMessage(replyToken, {
    type: 'text',
    text: '⚠️ 操作參數無效，請重試'
  });
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

      // 取得用戶資料並儲存到資料庫
      try {
        const profile = await getLineClient().getProfile(userId);
        await getOrCreateUser(userId, profile.displayName, profile.pictureUrl);
      } catch (profileError) {
        console.log('⚠️ 無法取得用戶 Profile:', profileError.message);
        await getOrCreateUser(userId);
      }

      try {
        // 處理 postback 事件
        if (ev.type === 'postback') {
          await handlePostback(replyToken, userId, ev.postback.data);
          continue;
        }

        // 處理訊息事件
        if (ev.type === 'message') {
          if (ev.message.type === 'text') {
            const text = ev.message.text.trim();
            await handleTextMessage(replyToken, userId, text);
          } else if (ev.message.type === 'image') {
            await handleImageMessage(replyToken, userId, ev.message.id);
          }
        }
      } catch (innerError) {
        console.error('❌ 處理事件失敗:', innerError.message);
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
 * 生成貼圖列表 Flex Message（可選擇性顯示推薦好友提示）
 */
function generateStickerListFlexMessage(sets, referralInfo = null) {
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

    // 已完成的顯示查看詳情（使用 postback 避免顯示 ID）
    if (set.status === 'completed') {
      footerContents.push({
        type: 'button',
        style: 'primary',
        color: '#FF6B6B',
        height: 'sm',
        action: {
          type: 'postback',
          label: '查看詳情',
          data: `action=view&setId=${setId}`,
          displayText: `查看「${set.name || '未命名'}」`
        }
      });
    }

    // 所有貼圖組都可以刪除（使用 postback 避免顯示 ID）
    footerContents.push({
      type: 'button',
      style: set.status === 'completed' ? 'secondary' : 'primary',
      color: set.status === 'completed' ? undefined : '#999999',
      height: 'sm',
      action: {
        type: 'postback',
        label: '🗑️ 刪除',
        data: `action=delete&setId=${setId}`,
        displayText: `刪除「${set.name || '未命名'}」`
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

  // 如果可以分享，在最後加入分享給好友卡片
  const canRefer = referralInfo && (referralInfo.referralCount || 0) < 3;
  if (canRefer && referralInfo.referralCode) {
    bubbles.push({
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFF3E0',
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: '🎁', size: '3xl', align: 'center' },
          { type: 'text', text: '分享給好友得代幣', size: 'lg', weight: 'bold', align: 'center', color: '#E65100', margin: 'md' },
          { type: 'text', text: `推薦碼：${referralInfo.referralCode}`, size: 'md', align: 'center', color: '#FF8A00', margin: 'md', weight: 'bold' },
          { type: 'text', text: `雙方各得 10 代幣！`, size: 'sm', align: 'center', color: '#666666', margin: 'sm' },
          { type: 'text', text: `還可分享 ${3 - referralInfo.referralCount} 位好友`, size: 'xs', align: 'center', color: '#999999', margin: 'xs' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#FF6B00',
            action: {
              type: 'message',
              label: '📤 分享給好友',
              text: '分享給好友'
            }
          }
        ]
      }
    });
  }

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
                type: 'postback',
                label: '✅ 確認刪除',
                data: `action=confirmDelete&setId=${setId}`,
                displayText: `確認刪除「${set.name || '未命名'}」`
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

    // 取得更新後的佇列
    const queue = await getUploadQueue(userId);
    const count = queue.length;

    // 帶有 Quick Reply 方便繼續操作
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: `✅ 已移除！\n\n📊 目前佇列：${count} / 40 張` +
            (count > 0 ? `\n⏳ 還需要 ${40 - count} 張` : '\n📋 佇列已清空'),
      quickReply: {
        items: [
          ...(count > 0 ? [{
            type: 'action',
            action: { type: 'message', label: '📤 查看佇列', text: '待上傳' }
          }] : []),
          {
            type: 'action',
            action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' }
          },
          {
            type: 'action',
            action: { type: 'message', label: '🏠 主選單', text: '選單' }
          }
        ]
      }
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
 * 處理查看上傳佇列（支援分頁）
 */
async function handleViewUploadQueue(replyToken, userId, page = 1) {
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

    // 生成佇列輪播（帶分頁）
    return await sendUploadQueueCarousel(replyToken, queue, page, userId);

  } catch (error) {
    console.error('❌ 查看上傳佇列失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試'
    });
  }
}

/**
 * 發送上傳佇列輪播（支援分頁）
 */
async function sendUploadQueueCarousel(replyToken, queue, page = 1, userId) {
  const count = queue.length;
  const isReady = count >= 40;
  const itemsPerPage = 8;  // 每頁顯示 8 張（留位置給狀態卡片和導航）
  const totalPages = Math.ceil(count / itemsPerPage);
  const currentPage = Math.min(Math.max(1, page), totalPages || 1);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, count);
  const pageItems = queue.slice(startIdx, endIdx);

  // 計算進度條
  const progressPercent = Math.round((count / 40) * 100);

  // 第一個 bubble：佇列狀態總覽
  const statusBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: isReady ? '#06C755' : '#FF9800',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: '📤 待上傳佇列', weight: 'bold', size: 'lg', color: '#FFFFFF' },
        { type: 'text', text: `第 ${currentPage} / ${totalPages || 1} 頁`, size: 'xs', color: '#FFFFFF', margin: 'sm' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // 大數字顯示
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: `${count}`, size: '3xl', weight: 'bold', color: isReady ? '#06C755' : '#FF9800' },
            { type: 'text', text: '/ 40 張', size: 'md', color: '#666666', gravity: 'bottom', margin: 'sm' }
          ]
        },
        // 進度條
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#EEEEEE',
          height: '8px',
          cornerRadius: 'md',
          margin: 'lg',
          contents: [{
            type: 'box',
            layout: 'vertical',
            backgroundColor: isReady ? '#06C755' : '#FF9800',
            height: '8px',
            cornerRadius: 'md',
            width: `${progressPercent}%`,
            contents: []
          }]
        },
        // 狀態文字
        {
          type: 'text',
          text: isReady ? '🎉 已滿 40 張，可以下載！' : `⏳ 還需要 ${40 - count} 張`,
          size: 'sm',
          color: isReady ? '#06C755' : '#666666',
          margin: 'lg',
          wrap: true
        },
        // 當前頁顯示範圍
        count > 0 ? {
          type: 'text',
          text: `📍 顯示：第 ${startIdx + 1} - ${endIdx} 張`,
          size: 'xs',
          color: '#999999',
          margin: 'md'
        } : { type: 'filler' }
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
            label: '📥 上架 LINE Market',
            uri: `https://sticker-tycoon.netlify.app/queue.html?userId=${encodeURIComponent(userId || '')}`
          }
        }] : []),
        // 網頁版完整查看
        {
          type: 'button',
          style: isReady ? 'secondary' : 'primary',
          color: isReady ? undefined : '#4A90E2',
          action: {
            type: 'uri',
            label: '🖼️ 網頁版完整查看',
            uri: `https://sticker-tycoon.netlify.app/queue?userId=${encodeURIComponent(userId || '')}`
          }
        },
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
  const stickerBubbles = pageItems.map((item, index) => {
    const globalIndex = startIdx + index + 1;
    return {
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
            backgroundColor: '#F5F5F5'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'sm',
        spacing: 'xs',
        contents: [
          {
            type: 'text',
            text: item.expression || `貼圖 #${globalIndex}`,
            size: 'sm',
            color: '#333333',
            align: 'center',
            weight: 'bold',
            wrap: true,
            maxLines: 1
          },
          {
            type: 'text',
            text: `#${globalIndex} / ${count}`,
            size: 'xs',
            color: '#999999',
            align: 'center'
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '❌ 移除',
              data: `action=removeUpload&stickerId=${item.sticker_id}`,
              displayText: `移除第 ${globalIndex} 張`
            }
          }
        ]
      }
    };
  });

  // 組合輪播
  const allBubbles = [statusBubble, ...stickerBubbles];

  const carouselMessage = {
    type: 'flex',
    altText: `📤 待上傳佇列 - ${count}/40 張 (第${currentPage}頁)`,
    contents: {
      type: 'carousel',
      contents: allBubbles
    }
  };

  // 建立分頁 Quick Reply
  const quickReplyItems = [];

  // 上一頁
  if (currentPage > 1) {
    quickReplyItems.push({
      type: 'action',
      action: { type: 'message', label: `⬅️ 第${currentPage - 1}頁`, text: `待上傳頁:${currentPage - 1}` }
    });
  }

  // 頁碼快捷（最多顯示 5 個頁碼）
  const pageRange = getPageRange(currentPage, totalPages, 5);
  pageRange.forEach(p => {
    if (p !== currentPage) {
      quickReplyItems.push({
        type: 'action',
        action: { type: 'message', label: `📄 第${p}頁`, text: `待上傳頁:${p}` }
      });
    }
  });

  // 下一頁
  if (currentPage < totalPages) {
    quickReplyItems.push({
      type: 'action',
      action: { type: 'message', label: `➡️ 第${currentPage + 1}頁`, text: `待上傳頁:${currentPage + 1}` }
    });
  }

  // 我的貼圖（方便新增更多）
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' }
  });

  // 分享給好友
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' }
  });

  // 加入 Quick Reply
  if (quickReplyItems.length > 0) {
    carouselMessage.quickReply = {
      items: quickReplyItems.slice(0, 13)  // LINE 限制最多 13 個
    };
  }

  return getLineClient().replyMessage(replyToken, carouselMessage);
}

/**
 * 計算分頁範圍
 */
function getPageRange(current, total, maxVisible) {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
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
 * 生成示範圖集 Flex Message（隨機展示不同風格）
 */
function generateDemoGalleryFlexMessage() {
  // LINE 官方帳號連結
  const lineOALink = 'https://line.me/R/ti/p/@276vcfne';

  // 分享文字
  const shareText = `🎨 推薦你一個超讚的貼圖製作工具！

【貼圖大亨】用 AI 幫你製作專屬 LINE 貼圖 ✨

🎁 新用戶免費送 40 代幣
📸 上傳照片就能生成貼圖
🚀 3-7 天免費代上架 LINE 貼圖小舖

👉 點擊加入：${lineOALink}`;

  // 所有可用風格的示範貼圖（每種風格多張供隨機選擇）
  const allDemoStickers = [
    // 美顏真實
    { url: 'https://sticker-tycoon.netlify.app/demo/realistic-1.png', style: 'realistic', styleName: '📸 美顏真實', expression: '開心' },
    { url: 'https://sticker-tycoon.netlify.app/demo/realistic-2.png', style: 'realistic', styleName: '📸 美顏真實', expression: '讚讚' },
    // 可愛風
    { url: 'https://sticker-tycoon.netlify.app/demo/cute-1.png', style: 'cute', styleName: '🥰 可愛風', expression: 'Hi' },
    { url: 'https://sticker-tycoon.netlify.app/demo/cute-2.png', style: 'cute', styleName: '🥰 可愛風', expression: '愛心' },
    // 酷炫風
    { url: 'https://sticker-tycoon.netlify.app/demo/cool-1.png', style: 'cool', styleName: '😎 酷炫風', expression: 'OK' },
    { url: 'https://sticker-tycoon.netlify.app/demo/cool-2.png', style: 'cool', styleName: '😎 酷炫風', expression: '耍帥' },
    // 搞笑風
    { url: 'https://sticker-tycoon.netlify.app/demo/funny-1.png', style: 'funny', styleName: '🤣 搞笑風', expression: '驚訝' },
    { url: 'https://sticker-tycoon.netlify.app/demo/funny-2.png', style: 'funny', styleName: '🤣 搞笑風', expression: '大哭' },
    // 簡約風
    { url: 'https://sticker-tycoon.netlify.app/demo/simple-1.png', style: 'simple', styleName: '✨ 簡約風', expression: '微笑' },
    { url: 'https://sticker-tycoon.netlify.app/demo/simple-2.png', style: 'simple', styleName: '✨ 簡約風', expression: '睡覺' },
    // 動漫風
    { url: 'https://sticker-tycoon.netlify.app/demo/anime-1.png', style: 'anime', styleName: '🎌 動漫風', expression: '讚讚' },
    { url: 'https://sticker-tycoon.netlify.app/demo/anime-2.png', style: 'anime', styleName: '🎌 動漫風', expression: '比心' },
    // 像素風
    { url: 'https://sticker-tycoon.netlify.app/demo/pixel-1.png', style: 'pixel', styleName: '👾 像素風', expression: 'Good' },
    { url: 'https://sticker-tycoon.netlify.app/demo/pixel-2.png', style: 'pixel', styleName: '👾 像素風', expression: '開心' },
    // 素描風
    { url: 'https://sticker-tycoon.netlify.app/demo/sketch-1.png', style: 'sketch', styleName: '✏️ 素描風', expression: '思考' },
    { url: 'https://sticker-tycoon.netlify.app/demo/sketch-2.png', style: 'sketch', styleName: '✏️ 素描風', expression: '微笑' }
  ];

  // 隨機打亂並選取 6 張不同風格的貼圖
  const shuffled = [...allDemoStickers].sort(() => Math.random() - 0.5);
  const selectedStyles = new Set();
  const selectedStickers = [];

  for (const sticker of shuffled) {
    if (!selectedStyles.has(sticker.style) && selectedStickers.length < 6) {
      selectedStyles.add(sticker.style);
      selectedStickers.push(sticker);
    }
  }

  // 介紹卡片
  const infoBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#FF6B6B',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: '✨ 示範圖集', weight: 'bold', size: 'lg', color: '#FFFFFF', align: 'center' },
        { type: 'text', text: '各種風格貼圖範例', size: 'xs', color: '#FFDDDD', align: 'center', margin: 'sm' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '👈 左滑查看更多風格', size: 'sm', color: '#06C755', align: 'center' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '🎨 8 種風格任選：', size: 'sm', weight: 'bold', margin: 'lg' },
        { type: 'text', text: '📸美顏 🥰可愛 😎酷炫 🤣搞笑', size: 'xs', color: '#666666', margin: 'sm' },
        { type: 'text', text: '✨簡約 🎌動漫 👾像素 ✏️素描', size: 'xs', color: '#666666', margin: 'sm' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '🎁 新用戶免費送 40 代幣！', size: 'xs', color: '#FF6B6B', margin: 'lg', weight: 'bold' }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#FF6B6B',
          action: { type: 'message', label: '🚀 開始創建貼圖', text: '創建貼圖' }
        },
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'uri',
            label: '📤 分享給好友',
            uri: `https://line.me/R/share?text=${encodeURIComponent(shareText)}`
          }
        }
      ]
    }
  };

  // 示範貼圖卡片（每張都有創建和分享按鈕）
  const demoBubbles = selectedStickers.map(demo => ({
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
        },
        {
          type: 'box',
          layout: 'vertical',
          paddingTop: 'sm',
          contents: [
            { type: 'text', text: demo.expression, size: 'md', weight: 'bold', align: 'center', color: '#333333' },
            { type: 'text', text: demo.styleName, size: 'xs', color: '#FF6B6B', align: 'center', margin: 'xs' }
          ]
        }
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
          height: 'sm',
          flex: 1,
          action: { type: 'message', label: '🚀 創建', text: '創建貼圖' }
        },
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          flex: 1,
          action: {
            type: 'uri',
            label: '📤 分享',
            uri: `https://line.me/R/share?text=${encodeURIComponent(shareText)}`
          }
        }
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

  // 取得推薦資訊
  const referralInfo = await getUserReferralInfo(userId);
  const canRefer = (referralInfo.referralCount || 0) < 3;

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
          { type: 'text', text: '💡 每生成1張貼圖消耗1代幣', size: 'xs', color: '#888888', margin: 'lg', wrap: true },
          // 分享給好友提示
          ...(canRefer ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            paddingAll: 'sm',
            backgroundColor: '#FFF3E0',
            cornerRadius: 'md',
            contents: [
              { type: 'text', text: '🎁 分享給好友，雙方各得 10 代幣！', size: 'xs', color: '#E65100', align: 'center', weight: 'bold' },
              { type: 'text', text: `還可分享 ${3 - referralInfo.referralCount} 位好友`, size: 'xxs', color: '#FF8A00', align: 'center', margin: 'xs' }
            ]
          }] : [])
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            action: { type: 'message', label: '🛒 購買代幣', text: '購買代幣' },
            style: 'primary',
            color: '#FF6B00'
          },
          ...(canRefer ? [{
            type: 'button',
            action: { type: 'message', label: '🎁 分享給好友得代幣', text: '分享給好友' },
            style: 'secondary',
            height: 'sm'
          }] : [])
        ]
      }
    }
  };

  return getLineClient().replyMessage(replyToken, message);
}

/**
 * 處理購買代幣資訊 - 美化版 Carousel
 */
async function handlePurchaseInfo(replyToken) {
  // 方案卡片生成函數
  const createPlanBubble = (price, tokens, bonus, isPopular = false) => {
    const perToken = (price / tokens).toFixed(1);
    return {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: isPopular ? '#FF6B6B' : '#4A90D9',
        paddingAll: 'lg',
        contents: [
          ...(isPopular ? [{ type: 'text', text: '🔥 最熱門', size: 'xs', color: '#FFEEEE', align: 'center' }] : []),
          { type: 'text', text: `NT$ ${price}`, size: 'xxl', weight: 'bold', color: '#FFFFFF', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            alignItems: 'center',
            contents: [
              { type: 'text', text: '🎫', size: '3xl' },
              { type: 'text', text: `${tokens} 代幣`, size: 'xl', weight: 'bold', color: '#333333', margin: 'sm' },
              ...(bonus > 0 ? [{ type: 'text', text: `含贈送 ${bonus} 代幣`, size: 'xs', color: '#FF6B6B', margin: 'xs' }] : [])
            ]
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            contents: [
              { type: 'text', text: '每代幣約', size: 'sm', color: '#888888', flex: 1 },
              { type: 'text', text: `$${perToken}`, size: 'sm', weight: 'bold', color: '#333333', align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '可製作約', size: 'sm', color: '#888888', flex: 1 },
              { type: 'text', text: `${tokens} 張貼圖`, size: 'sm', weight: 'bold', color: '#333333', align: 'end' }
            ]
          }
        ]
      }
    };
  };

  // 方案輪播
  const planCarousel = {
    type: 'flex',
    altText: '🛒 購買代幣方案',
    contents: {
      type: 'carousel',
      contents: [
        createPlanBubble(300, 70, 10, false),
        createPlanBubble(500, 130, 30, true),
        createPlanBubble(1000, 300, 100, false)
      ]
    }
  };

  // 付款資訊卡片
  const paymentInfo = {
    type: 'flex',
    altText: '💳 付款方式',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#2D9CDB',
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: '💳 付款方式', size: 'lg', weight: 'bold', color: '#FFFFFF', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'md',
        contents: [
          // 銀行轉帳
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#F7F9FC',
            cornerRadius: 'lg',
            paddingAll: 'lg',
            contents: [
              { type: 'text', text: '🏦 銀行轉帳', size: 'md', weight: 'bold', color: '#333333' },
              { type: 'separator', margin: 'md' },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  { type: 'text', text: '銀行', size: 'sm', color: '#888888', flex: 2 },
                  { type: 'text', text: '連線商業銀行（824）', size: 'sm', weight: 'bold', color: '#333333', flex: 4, align: 'end' }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '帳號', size: 'sm', color: '#888888', flex: 2 },
                  { type: 'text', text: '111000196474', size: 'md', weight: 'bold', color: '#2D9CDB', flex: 4, align: 'end' }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '戶名', size: 'sm', color: '#888888', flex: 2 },
                  { type: 'text', text: '梁勝喜', size: 'sm', weight: 'bold', color: '#333333', flex: 4, align: 'end' }
                ]
              }
            ]
          },
          // 付款步驟
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FFF8E7',
            cornerRadius: 'lg',
            paddingAll: 'lg',
            margin: 'md',
            contents: [
              { type: 'text', text: '📝 付款步驟', size: 'md', weight: 'bold', color: '#333333' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '1️⃣ 選擇方案並轉帳', size: 'sm', color: '#666666', margin: 'md' },
              { type: 'text', text: '2️⃣ 截圖轉帳明細', size: 'sm', color: '#666666', margin: 'sm' },
              { type: 'text', text: '3️⃣ 傳送截圖給我們', size: 'sm', color: '#666666', margin: 'sm' },
              { type: 'text', text: '4️⃣ 客服確認後立即入帳', size: 'sm', color: '#666666', margin: 'sm' }
            ]
          },
          // 提示
          {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#FFE8E8',
            cornerRadius: 'md',
            paddingAll: 'sm',
            margin: 'md',
            contents: [
              { type: 'text', text: '⚡', size: 'sm', flex: 0 },
              { type: 'text', text: '請在轉帳備註填寫 LINE 名稱，加速對帳！', size: 'xs', color: '#CC0000', flex: 1, wrap: true, margin: 'sm' }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          { type: 'text', text: '👇 掃碼轉帳更方便', size: 'sm', align: 'center', color: '#888888' }
        ]
      }
    }
  };

  // QR Code 圖片
  const qrMessage = {
    type: 'image',
    originalContentUrl: 'https://sticker-tycoon.netlify.app/payment-qr.png',
    previewImageUrl: 'https://sticker-tycoon.netlify.app/payment-qr.png'
  };

  return getLineClient().replyMessage(replyToken, [planCarousel, paymentInfo, qrMessage]);
}

/**
 * 處理分享給好友資訊 - 可直接分享給好友
 */
async function handleReferralInfo(replyToken, userId) {
  const info = await getUserReferralInfo(userId);
  const remainingInvites = 3 - (info.referralCount || 0);
  const referralCode = info.referralCode || 'XXXXXX';

  // LINE 官方帳號連結
  const lineOALink = 'https://line.me/R/ti/p/@276vcfne';

  // 分享文字訊息
  const shareText = `🎨 推薦你一個超讚的貼圖製作工具！

【貼圖大亨】用 AI 幫你製作專屬 LINE 貼圖 ✨

🎁 新用戶免費送 40 代幣
📸 上傳照片就能生成貼圖
🎉 使用我的推薦碼「${referralCode}」再送 10 代幣！

👉 點擊加入：${lineOALink}

加入後輸入「輸入推薦碼 ${referralCode}」即可領取獎勵！`;

  // 主訊息卡片
  const message = {
    type: 'flex',
    altText: '🎁 分享給好友賺代幣',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FF6B6B',
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: '🎁 分享給好友賺代幣', size: 'xl', weight: 'bold', color: '#FFFFFF', align: 'center' },
          { type: 'text', text: '分享好友，雙方各得 10 代幣！', size: 'sm', color: '#FFDDDD', align: 'center', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        contents: [
          // 推薦碼區塊
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FFF5F5',
            cornerRadius: 'xl',
            paddingAll: 'xl',
            contents: [
              { type: 'text', text: '你的專屬推薦碼', size: 'sm', color: '#888888', align: 'center' },
              { type: 'text', text: referralCode, size: '3xl', weight: 'bold', align: 'center', color: '#FF6B6B', margin: 'md' },
              { type: 'text', text: `還可邀請 ${remainingInvites} 位好友`, size: 'xs', color: '#999999', align: 'center', margin: 'md' }
            ]
          },
          // 進度條
          info.referralCount > 0 ? {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '邀請進度', size: 'xs', color: '#888888' },
                  { type: 'text', text: `${info.referralCount}/3`, size: 'xs', color: '#FF6B6B', align: 'end', weight: 'bold' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#EEEEEE',
                height: '6px',
                cornerRadius: 'md',
                margin: 'sm',
                contents: [{
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: '#FF6B6B',
                  height: '6px',
                  cornerRadius: 'md',
                  width: `${Math.round(info.referralCount / 3 * 100)}%`,
                  contents: []
                }]
              }
            ]
          } : { type: 'filler' },
          { type: 'separator', margin: 'xl' },
          // 說明
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: [
              { type: 'text', text: '📤 分享方式：', size: 'md', weight: 'bold', color: '#333333' },
              { type: 'text', text: '點擊下方按鈕即可直接分享', size: 'xs', color: '#666666', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '好友加入後只要輸入：', size: 'sm', color: '#666666', margin: 'md' },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#F5F5F5',
                cornerRadius: 'md',
                paddingAll: 'md',
                margin: 'sm',
                contents: [
                  { type: 'text', text: `輸入推薦碼 ${referralCode}`, size: 'md', weight: 'bold', color: '#333333', align: 'center' }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: 'md',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#00B900',
            height: 'md',
            action: {
              type: 'uri',
              label: '📤 立即分享給好友',
              uri: `https://line.me/R/share?text=${encodeURIComponent(shareText)}`
            }
          }
        ]
      }
    }
  };

  // 提供純文字版本方便複製分享
  const textMessage = {
    type: 'text',
    text: `📋 複製以下內容分享給好友：

━━━━━━━━━━━━━━━━

${shareText}

━━━━━━━━━━━━━━━━

💡 小提示：
• 點擊上方綠色按鈕可直接透過 LINE 分享
• 或複製上方訊息，手動傳送給好友
• 好友需加入官方帳號並輸入推薦碼才能領取獎勵`
  };

  return getLineClient().replyMessage(replyToken, [message, textMessage]);
}

/**
 * 處理使用推薦碼
 */
async function handleApplyReferralCode(replyToken, userId, code) {
  const result = await applyReferralCode(userId, code.toUpperCase());

  if (result.success) {
    return getLineClient().replyMessage(replyToken, {
      type: 'flex',
      altText: '🎉 推薦碼使用成功！',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: '🎉 推薦碼使用成功！', weight: 'bold', size: 'xl', color: '#28A745', align: 'center' },
            { type: 'separator', margin: 'lg' },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              backgroundColor: '#F0FFF4',
              cornerRadius: 'lg',
              paddingAll: 'lg',
              contents: [
                { type: 'text', text: `+${result.tokensAwarded} 代幣`, size: 'xxl', weight: 'bold', align: 'center', color: '#28A745' },
                { type: 'text', text: `目前餘額：${result.newBalance} 代幣`, size: 'md', align: 'center', color: '#666666', margin: 'md' }
              ]
            },
            { type: 'text', text: `感謝 ${result.referrerName} 的推薦！`, size: 'sm', color: '#666666', align: 'center', margin: 'lg' },
            { type: 'text', text: '對方也獲得了 10 代幣獎勵 🎁', size: 'xs', color: '#999999', align: 'center', margin: 'sm' }
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
              action: { type: 'message', label: '🎨 開始創建貼圖', text: '創建貼圖' }
            }
          ]
        }
      }
    });
  } else {
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: `❌ ${result.error}\n\n💡 如果你有推薦碼，請輸入：\n輸入推薦碼 XXXXXX`
    });
  }
}

/**
 * 處理分享推薦碼
 */
async function handleShareReferralCode(replyToken, userId) {
  const info = await getUserReferralInfo(userId);
  const code = info.referralCode || '載入中';

  // 生成分享訊息
  const shareText = `🎁 我在用「貼圖大亨」創建專屬 LINE 貼圖！

輸入我的推薦碼，你我都能獲得 10 代幣 🎉

📋 推薦碼：${code}

👉 加入方式：
1. 加入 LINE 官方帳號 @276vcfne
2. 輸入「輸入推薦碼 ${code}」
3. 一起來創建可愛貼圖吧！`;

  return getLineClient().replyMessage(replyToken, {
    type: 'text',
    text: shareText
  });
}
