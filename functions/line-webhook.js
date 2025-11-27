/**
 * LINE Webhook Handler
 * 處理 LINE Bot 訊息、貼圖創建流程
 */

const line = require('@line/bot-sdk');
const { isReplyTokenUsed, recordReplyToken, getOrCreateUser, getUserStickerSets } = require('./supabase-client');
const { ConversationStage, getConversationState, updateConversationState, resetConversationState, isInCreationFlow } = require('./conversation-state');
const { generateWelcomeFlexMessage } = require('./sticker-flex-message');
const { handleStartCreate, handleNaming, handleStyleSelection, handleCharacterDescription, handleExpressionTemplate, handleCountSelection } = require('./handlers/create-handler');

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

if (!config.channelAccessToken || !config.channelSecret) {
  throw new Error('❌ LINE 環境變數未設定：需要 LINE_CHANNEL_ACCESS_TOKEN 和 LINE_CHANNEL_SECRET');
}

const client = new line.Client(config);

/**
 * 處理文字訊息
 */
async function handleTextMessage(replyToken, userId, text) {
  try {
    console.log(`📝 處理訊息：${text} (User: ${userId})`);
    
    // 取得用戶對話狀態
    const state = await getConversationState(userId);
    const currentStage = state.current_stage;
    
    // 1. 檢查是否要取消
    if (text === '取消' || text === '取消創建') {
      await resetConversationState(userId);
      return client.replyMessage(replyToken, {
        type: 'text',
        text: '❌ 已取消創建流程\n\n輸入「創建貼圖」重新開始！'
      });
    }
    
    // 2. 檢查主要指令
    if (text === '創建貼圖' || text === '開始' || text === '新增貼圖') {
      const message = await handleStartCreate(userId);
      return client.replyMessage(replyToken, message);
    }
    
    if (text === '我的貼圖' || text === '貼圖列表') {
      const sets = await getUserStickerSets(userId);
      if (sets.length === 0) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: '📁 你還沒有創建任何貼圖組\n\n輸入「創建貼圖」開始創建你的第一組貼圖！'
        });
      }
      // TODO: 生成貼圖列表 Flex Message
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `📁 你有 ${sets.length} 組貼圖\n\n（詳細列表功能開發中）`
      });
    }
    
    // 3. 處理創建流程中的輸入
    if (isInCreationFlow(currentStage)) {
      return await handleCreationFlow(replyToken, userId, text, currentStage, state);
    }
    
    // 4. 處理特殊指令格式
    if (text.startsWith('風格:')) {
      const styleId = text.replace('風格:', '');
      const message = await handleStyleSelection(userId, styleId);
      return client.replyMessage(replyToken, message);
    }
    
    if (text.startsWith('表情模板:')) {
      const templateId = text.replace('表情模板:', '');
      const message = await handleExpressionTemplate(userId, templateId);
      return client.replyMessage(replyToken, message);
    }
    
    if (text.startsWith('數量:')) {
      const count = parseInt(text.replace('數量:', ''));
      const message = await handleCountSelection(userId, count);
      return client.replyMessage(replyToken, message);
    }
    
    if (text === '確認生成') {
      return await handleConfirmGeneration(replyToken, userId, state);
    }
    
    // 5. 預設回覆 - 歡迎訊息
    return client.replyMessage(replyToken, generateWelcomeFlexMessage());
    
  } catch (error) {
    console.error('❌ 處理訊息失敗:', error);
    return client.replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統發生錯誤，請稍後再試'
    });
  }
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
    case ConversationStage.CHARACTER:
      message = await handleCharacterDescription(userId, text);
      break;
    default:
      message = { type: 'text', text: '⚠️ 請按照提示操作或輸入「取消」重新開始' };
  }
  
  return client.replyMessage(replyToken, message);
}

/**
 * 處理確認生成
 */
async function handleConfirmGeneration(replyToken, userId, state) {
  const tempData = state.temp_data;
  
  if (!tempData || !tempData.name || !tempData.style || !tempData.character) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: '⚠️ 創建資料不完整，請輸入「創建貼圖」重新開始'
    });
  }
  
  // 更新狀態為生成中
  await updateConversationState(userId, ConversationStage.GENERATING, tempData);
  
  // 回覆生成中訊息
  await client.replyMessage(replyToken, {
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
 * Netlify Function Handler
 */
exports.handler = async function(event, context) {
  console.log('🔔 LINE Webhook 被呼叫');

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // 驗證 LINE Signature
    const signature = event.headers['x-line-signature'];
    if (!signature) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const crypto = require('crypto');
    const hash = crypto.createHmac('SHA256', config.channelSecret).update(event.body).digest('base64');
    if (hash !== signature) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    const body = JSON.parse(event.body);
    const events = body.events || [];

    for (const ev of events) {
      if (ev.type !== 'message' || ev.message.type !== 'text') continue;

      const replyToken = ev.replyToken;
      const userId = ev.source.userId;
      const text = ev.message.text.trim();

      // 去重檢查
      const isUsed = await isReplyTokenUsed(replyToken);
      if (isUsed) continue;

      // 處理訊息
      await handleTextMessage(replyToken, userId, text);
      await recordReplyToken(replyToken);
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'OK' }) };

  } catch (error) {
    console.error('❌ Webhook 處理失敗:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

