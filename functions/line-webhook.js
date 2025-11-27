/**
 * LINE Webhook Handler
 * 處理 LINE Bot 訊息、貼圖創建流程
 */

const line = require('@line/bot-sdk');
const { isReplyTokenUsed, recordReplyToken, getOrCreateUser, getUserStickerSets } = require('./supabase-client');
const { ConversationStage, getConversationState, updateConversationState, resetConversationState, isInCreationFlow } = require('./conversation-state');
const { generateWelcomeFlexMessage } = require('./sticker-flex-message');
const { handleStartCreate, handleNaming, handleStyleSelection, handleCharacterDescription, handleExpressionTemplate, handleCountSelection, handlePhotoUpload } = require('./handlers/create-handler');
const { handleUserPhoto } = require('./photo-handler');

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
      // TODO: 生成貼圖列表 Flex Message
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: `📁 你有 ${sets.length} 組貼圖\n\n（詳細列表功能開發中）`
      });
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
  
  if (!tempData || !tempData.name || !tempData.style || !tempData.character) {
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '⚠️ 創建資料不完整，請輸入「創建貼圖」重新開始'
    });
  }
  
  // 更新狀態為生成中
  await updateConversationState(userId, ConversationStage.GENERATING, tempData);
  
  // 回覆生成中訊息
  await getLineClient().replyMessage(replyToken, {
    type: 'text',
    text: '🎨 開始生成貼圖！\n\n' +
          `📛 名稱：${tempData.name}\n` +
          `📊 數量：${tempData.count} 張\n\n` +
          '⏳ 預計需要 2-5 分鐘\n' +
          '生成完成後會通知你！\n\n' +
          '💡 可以先去做其他事情，完成後會收到通知'
  });
  
  // TODO: 觸發異步生成任務
  // 這裡會調用 sticker-generator-worker 進行實際生成

  return;
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

