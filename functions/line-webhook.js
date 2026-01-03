/**
 * LINE Webhook Handler
 * 處理 LINE Bot 訊息、貼圖創建流程
 */

const line = require('@line/bot-sdk');
const axios = require('axios');
const { supabase, isReplyTokenUsed, recordReplyToken, getOrCreateUser, getUserStickerSets, getUserLatestTask, getUserPendingTasks, getStickerSet, getStickerImages, deleteStickerSet, addToUploadQueue, removeFromUploadQueue, getUploadQueue, clearUploadQueue, getUserTokenBalance, getTokenTransactions, getUserReferralInfo, applyReferralCode, deductTokens, addTokens } = require('./supabase-client');
const { ConversationStage, getConversationState, updateConversationState, resetConversationState, isInCreationFlow } = require('./conversation-state');
const { generateWelcomeFlexMessage, generateTutorialPart1FlexMessage, generateTutorialPart2FlexMessage, generateTutorialPart3FlexMessage, shouldShowTutorial, markTutorialShown } = require('./sticker-flex-message');
const { scheduleProfileUpdate } = require('./utils/profile-updater');
const { globalMonitor } = require('./utils/performance-monitor');
const { handleStartCreate, handleNaming, handleStyleSelection, handleFramingSelection, handleCharacterDescription, handleExpressionTemplate, handleSceneSelection, handleCustomScene, handleCountSelection, handlePhotoUpload } = require('./handlers/create-handler');
const { handleUserPhoto } = require('./photo-handler');
const { createGenerationTask } = require('./sticker-generator-worker-background');
const { StickerStyles, SceneTemplates, FramingTemplates } = require('./sticker-styles');
const {
  checkAndHandleTimeout,
  handleCancelCommand,
  addCancelButton,
  addCancelButtonToFlex
} = require('./creation-flow-manager');
const { getMorningGreeting } = require('./morning-greeting');

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
 * 生成標準 QuickReply 配置
 * @param {Object} options - 配置選項
 * @param {boolean} options.includeShare - 是否包含分享按鈕
 * @param {boolean} options.includeCreate - 是否包含創建貼圖按鈕
 * @param {boolean} options.includeMyStickers - 是否包含我的貼圖按鈕
 * @param {boolean} options.includePurchase - 是否包含購買代幣按鈕
 * @param {boolean} options.includeTutorial - 是否包含教學按鈕
 * @param {boolean} options.includeMorningGreeting - 是否包含早安圖按鈕
 * @param {Array} options.customItems - 自訂項目
 * @returns {Object} QuickReply 配置
 */
function generateQuickReply(options = {}) {
  const {
    includeShare = false,
    includeCreate = true,
    includeMyStickers = true,
    includePurchase = false,
    includeTutorial = false,
    includeMorningGreeting = false,
    customItems = []
  } = options;

  const items = [];

  // 自訂項目優先
  if (customItems.length > 0) {
    items.push(...customItems);
  }

  // 分享按鈕（優先顯示）
  if (includeShare) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '🎁 分享給好友',
        text: '分享給好友'
      }
    });
  }

  // 創建貼圖
  if (includeCreate) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '🎨 創建貼圖',
        text: '創建貼圖'
      }
    });
  }

  // 我的貼圖
  if (includeMyStickers) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '📁 我的貼圖',
        text: '我的貼圖'
      }
    });
  }

  // 購買代幣
  if (includePurchase) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '💰 購買代幣',
        text: '購買代幣'
      }
    });
  }

  // 早安圖
  if (includeMorningGreeting) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '🌅 早安圖',
        text: '早安圖'
      }
    });
  }

  // 教學
  if (includeTutorial) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: '📸 創建教學',
        text: '功能說明'
      }
    });
  }

  // LINE 限制最多 13 個
  return {
    quickReply: {
      items: items.slice(0, 13)
    }
  };
}

/**
 * 處理文字訊息
 */
async function handleTextMessage(replyToken, userId, text) {
  try {
    console.log(`📝 處理訊息：${text} (User: ${userId})`);

    // 非同步檢查是否需要顯示功能說明（不阻塞主流程）
    checkAndSendTutorial(userId).catch(err =>
      console.error('檢查功能說明失敗:', err)
    );

    // 取得用戶對話狀態
    const state = await getConversationState(userId);
    const currentStage = state.current_stage;

    // 詳細日誌
    console.log(`🔍 用戶狀態: stage=${currentStage}, temp_data=${JSON.stringify(state.temp_data)}`);

    // ✅ 檢查創建流程是否超時（10分鐘無操作）
    const timeoutMessage = await checkAndHandleTimeout(state, userId);
    if (timeoutMessage) {
      return getLineClient().replyMessage(replyToken, timeoutMessage);
    }

    // 1. 檢查是否要取消
    if (text === '取消' || text === '取消創建') {
      await resetConversationState(userId);
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '❌ 已取消創建流程\n\n輸入「創建貼圖」重新開始！',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '🌅 早安圖', text: '早安圖' } },
            { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } }
          ]
        }
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
                '輸入「取消」可以重新開始',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '❌ 取消重來', text: '取消' } },
              { type: 'action', action: { type: 'message', label: '📋 查詢進度', text: '查詢進度' } }
            ]
          }
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
          text: '📁 你還沒有創建任何貼圖組\n\n輸入「創建貼圖」開始創建你的第一組貼圖！',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
              { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } },
              { type: 'action', action: { type: 'message', label: '🌅 早安圖', text: '早安圖' } },
              { type: 'action', action: { type: 'message', label: '✨ 示範圖集', text: '示範圖集' } }
            ]
          }
        });
      }
      // 生成貼圖列表 Flex Message（帶推薦好友資訊 + 待上傳數量）
      const referralInfo = await getUserReferralInfo(userId);
      const uploadQueue = await getUploadQueue(userId);
      const queueCount = uploadQueue.length;
            const stickerListMessage = generateStickerListFlexMessage(userId, sets, referralInfo, queueCount);
      return getLineClient().replyMessage(replyToken, stickerListMessage);
    }

    // 示範圖集
    if (text === '示範圖集' || text === '範例' || text === '作品集') {
      return await handleDemoGallery(replyToken, userId);
    }

    // 功能說明
    if (text === '功能說明' || text === '使用說明' || text === '教學' || text === '說明') {
      return await handleTutorial(replyToken, userId);
    }

    // 功能說明第2部分
    if (text === '功能說明2') {
      return getLineClient().replyMessage(replyToken, generateTutorialPart2FlexMessage());
    }

    // 功能說明第3部分（早安圖說明）
    if (text === '功能說明3' || text === '早安圖說明') {
      return getLineClient().replyMessage(replyToken, generateTutorialPart3FlexMessage());
    }

    // 早安圖
    if (text === '早安圖' || text === '早安' || text === '今日早安') {
      return await handleMorningGreeting(replyToken, userId);
    }

    // 代幣查詢
    if (text === '代幣' || text === '餘額' || text === '我的代幣' || text === '查詢代幣') {
      return await handleTokenQuery(replyToken, userId);
    }

    // 購買代幣
    if (text === '購買代幣' || text === '儲值' || text === '買代幣') {
      return await handlePurchaseInfo(replyToken, userId);
    }

    // 購買說明
    if (text === '購買說明' || text === '代幣說明' || text === '使用說明' || text === '說明') {
      return await handlePurchaseGuide(replyToken, userId);
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
      text: '❌ 系統發生錯誤，請稍後再試',
      ...generateQuickReply({
        includeShare: true,
        includeCreate: true,
        includeMyStickers: true,
        includeTutorial: true,
        includeMorningGreeting: true
      })
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
        message = { 
          type: 'text', 
          text: '⚠️ 請點擊上方按鈕選擇風格！',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
            ]
          }
        };
      }
      break;
    case ConversationStage.FRAMING:
      // 處理構圖選擇
      if (text.startsWith('構圖:')) {
        const framingId = text.replace('構圖:', '');
        message = await handleFramingSelection(userId, framingId);
      } else {
        message = { 
          type: 'text', 
          text: '⚠️ 請點擊上方按鈕選擇人物構圖！',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
            ]
          }
        };
      }
      break;
    case ConversationStage.EXPRESSIONS:
      // 處理表情選擇
      if (text.startsWith('表情模板:')) {
        const templateId = text.replace('表情模板:', '');
        message = await handleExpressionTemplate(userId, templateId);
      } else {
        message = { 
          type: 'text', 
          text: '⚠️ 請點擊上方按鈕選擇表情模板！',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
            ]
          }
        };
      }
      break;
    case ConversationStage.SCENE_SELECT:
      // 處理場景選擇
      if (text.startsWith('場景:')) {
        const sceneId = text.replace('場景:', '');
        message = await handleSceneSelection(userId, sceneId);
      } else {
        message = { 
          type: 'text', 
          text: '⚠️ 請點擊上方按鈕選擇場景！',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
            ]
          }
        };
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
        message = { 
          type: 'text', 
          text: '⚠️ 請點擊上方按鈕選擇數量！',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '6張 (3代幣)', text: '數量:6' } },
              { type: 'action', action: { type: 'message', label: '12張 (6代幣)', text: '數量:12' } },
              { type: 'action', action: { type: 'message', label: '18張 (9代幣)', text: '數量:18' } },
              { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
            ]
          }
        };
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
        message = { 
          type: 'text', 
          text: '⚠️ 請點擊「開始生成」按鈕或輸入「取消」重新開始',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '✅ 確認生成', text: '確認生成' } },
              { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
            ]
          }
        };
      }
      break;
    default:
      message = { 
        type: 'text', 
        text: '⚠️ 請按照提示操作或輸入「取消」重新開始',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } },
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
          ]
        }
      };
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
      text: '⚠️ 創建資料不完整，請輸入「創建貼圖」重新開始',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
          { type: 'action', action: { type: 'message', label: '💰 我的代幣', text: '代幣' } }
        ]
      }
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
            '📋 輸入「查詢進度」查看生成進度',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '📋 查詢進度', text: '查詢進度' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
          { type: 'action', action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' } }
        ]
      }
    });
  }

  // 計算需要的代幣數量（6宮格批次生成：每6張只需3枚代幣）
  const stickerCount = tempData.count || 6;
  const apiCalls = Math.ceil(stickerCount / 6);  // 每次API調用生成6張
  const tokenCost = apiCalls * 3;  // 每次API調用消耗3枚代幣

  // ✅ 檢查代幣是否足夠（但不扣除！等生成成功後再扣）
  const tokenBalance = await getUserTokenBalance(userId);
  if (tokenBalance < tokenCost) {
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: `❌ 代幣不足！\n\n` +
            `需要 ${tokenCost} 代幣，目前餘額 ${tokenBalance} 代幣\n\n` +
            '💡 輸入「購買代幣」查看儲值方案',
      ...generateQuickReply({
        includeShare: true,
        includePurchase: true,
        includeMyStickers: true,
        includeCreate: false
      })
    });
  }

  // 更新狀態為生成中
  await updateConversationState(userId, ConversationStage.GENERATING, tempData);

  // 取得用戶推薦資訊，判斷是否需要顯示推薦碼提醒
  const referralInfo = await getUserReferralInfo(userId);
  const showReferralReminder = referralInfo.referralCount < 3;

  // 組合訊息文字（✅ 改為「生成成功後扣除」）
  let messageText = '🎨 開始生成貼圖！\n\n' +
        `📛 名稱：${tempData.name}\n` +
        `📊 數量：${stickerCount} 張\n\n` +
        `💰 生成成功後將扣除 ${tokenCost} 代幣\n` +
        `💰 目前餘額：${tokenBalance} 代幣\n\n` +
        '⏳ 預計需要 5-10 分鐘，好圖真的需要等！';

  // 如果未達推薦上限，加入推薦碼提醒
  if (showReferralReminder && referralInfo.referralCode) {
    messageText += `\n\n🎁 分享推薦碼「${referralInfo.referralCode}」給好友，雙方各得 10 代幣！`;
  }

  // 建立 QuickReply 按鈕
  const quickReplyItems = [
    {
      type: 'action',
      action: {
        type: 'uri',
        label: '🎬 YouTuber 推廣計畫',
        uri: `${process.env.URL || 'https://sticker-tycoon.netlify.app'}/youtuber-promotion.html`
      }
    },
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
      tokensDeducted: false,  // ✅ 標記為「未扣除」，在生成成功後才扣
      tokenCost: tokenCost    // ✅ 傳遞要扣除的代幣數量
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
    await addTokens(userId, tokenCost, 'refund', `任務建立失敗退款「${tempData.name}」`);
    console.log(`💰 已退還 ${tokenCost} 代幣`);
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
          text: '📭 目前沒有任何生成任務\n\n輸入「創建貼圖」開始創建！',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
              { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } },
              { type: 'action', action: { type: 'message', label: '🌅 早安圖', text: '早安圖' } },
              { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
            ]
          }
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
                  : '請稍候...'),
        quickReply: {
          items: latestTask.status === 'completed'
            ? [
                { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
                { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
                { type: 'action', action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' } }
              ]
            : latestTask.status === 'failed'
              ? [
                  { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
                  { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
                  { type: 'action', action: { type: 'message', label: '💰 我的代幣', text: '代幣' } }
                ]
              : [
                  { type: 'action', action: { type: 'message', label: '🔄 查詢進度', text: '查詢進度' } },
                  { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
                ]
        }
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
      text: message,
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🔄 查詢進度', text: '查詢進度' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
          { type: 'action', action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' } }
        ]
      }
    });

  } catch (error) {
    console.error('❌ 查詢進度失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 查詢失敗，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🔄 重試', text: '查詢進度' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
          { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
        ]
      }
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
        text: '📷 如果想用照片製作貼圖，請先輸入「創建貼圖」開始！',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
            { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } },
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '✨ 示範圖集', text: '示範圖集' } }
          ]
        }
      });
      return;
    }

    // 不發送處理中訊息，直接處理（節省時間和避免 429）

    // 處理照片
    const photoResult = await handleUserPhoto(messageId, userId);

    if (!photoResult.success) {
      console.log('❌ 照片處理失敗');
      await safeReply(replyToken, {
        type: 'text',
        text: '❌ 照片處理失敗，請重新上傳一張清晰的正面照片！\n\n💡 建議：光線充足、正面、背景簡單的大頭照',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'cameraRoll', label: '📁 重新選擇照片' } },
            { type: 'action', action: { type: 'camera', label: '📷 重新拍照' } },
            { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
          ]
        }
      });
      return;
    }

    // 調用 handler 處理下一步
    console.log('📤 準備發送風格選擇訊息');
    const message = await handlePhotoUpload(userId, photoResult);

    // 直接用 replyMessage 發送（不用 pushMessage，避免 429）
    console.log('📤 發送風格選擇 Flex Message');
    await safeReply(replyToken, message);

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

    // 優化：並行處理多個事件（如果有多個）
    const eventPromises = events.map(async (ev) => {
      const replyToken = ev.replyToken;
      const userId = ev.source.userId;

      // 開始計時
      globalMonitor.start(`event_${ev.type}_${userId}`);

      try {
        // 去重檢查
        const isUsed = await isReplyTokenUsed(replyToken);
        if (isUsed) {
          console.log(`⚠️ ReplyToken 已處理過: ${replyToken.substring(0, 8)}...`);
          globalMonitor.end(`event_${ev.type}_${userId}`);
          return;
        }

        // 優化：並行執行記錄 token 和確保用戶存在
        await Promise.all([
          recordReplyToken(replyToken),
          getOrCreateUser(userId) // 不查詢 Profile，使用快取或基本資料
        ]);

        // 非同步更新 Profile（不阻塞回應）
        scheduleProfileUpdate(userId);

        // 處理 postback 事件
        if (ev.type === 'postback') {
          await handlePostback(replyToken, userId, ev.postback.data);
          globalMonitor.end(`event_${ev.type}_${userId}`);
          return;
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

        globalMonitor.end(`event_${ev.type}_${userId}`);
      } catch (innerError) {
        console.error('❌ 處理事件失敗:', innerError.message);
        globalMonitor.end(`event_${ev.type}_${userId}`);
        await safeReply(replyToken, {
          type: 'text',
          text: '❌ 系統發生錯誤，請稍後再試'
        });
      }
    });

    // 等待所有事件處理完成
    await Promise.allSettled(eventPromises);

  } catch (error) {
    console.error('❌ Webhook 處理失敗:', error.message);
  }

  // 永遠返回 200，避免 LINE 重試
  return { statusCode: 200, body: JSON.stringify({ message: 'OK' }) };
};

/**
 * 生成貼圖列表 Flex Message（可選擇性顯示推薦好友提示）
 * @param {Array} sets - 貼圖組列表
 * @param {Object} referralInfo - 推薦資訊
 * @param {number} queueCount - 待上傳佇列數量
 */
function generateStickerListFlexMessage(userId, sets, referralInfo = null, queueCount = 0) {
  const statusEmoji = {
    'completed': '✅',
    'processing': '⏳',
    'pending': '🕐',
    'failed': '❌'
  };

  const bubbles = [];

  // 🆕 首先加入「待上傳狀態 + 分享給好友」卡片（移到最前面！）
  const canRefer = referralInfo && (referralInfo.referralCount || 0) < 3;

  // 計算待上傳進度
  const progressText = queueCount >= 40
    ? '✅ 已達 40 張，可以上傳！'
    : `📊 待上傳：${queueCount}/40 張`;
  const progressColor = queueCount >= 40 ? '#4CAF50' : '#FF6B00';
  const needMore = Math.max(0, 40 - queueCount);

  // 待上傳狀態卡片（永遠顯示在最前面）
  const uploadStatusCard = {
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: queueCount >= 40 ? '#E8F5E9' : '#FFF3E0',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: queueCount >= 40 ? '🎉' : '🚧', size: '3xl', align: 'center' },
        { type: 'text', text: '上傳準備狀態', size: 'lg', weight: 'bold', align: 'center', color: '#333333', margin: 'md' },
        { type: 'text', text: progressText, size: 'md', align: 'center', color: progressColor, margin: 'md', weight: 'bold' },
        queueCount < 40
          ? { type: 'text', text: `還需 ${needMore} 張貼圖`, size: 'sm', align: 'center', color: '#666666', margin: 'sm' }
          : { type: 'text', text: '可以打包上傳 LINE 了！', size: 'sm', align: 'center', color: '#4CAF50', margin: 'sm' }
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
          color: '#FF6B00', // Orange
          action: {
            type: 'uri',
            label: '➕ 選擇更多貼圖',
            uri: `https://sticker-tycoon.netlify.app/select-stickers.html?userId=${userId}`
          }
        },
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'uri',
            label: '📋 管理待上傳',
            uri: `https://sticker-tycoon.netlify.app/queue.html?userId=${userId}`
          }
        }
      ]
    }

  };

  // 如果可以推薦，在待上傳卡片下方加入分享資訊
  if (canRefer && referralInfo.referralCode) {
    uploadStatusCard.body.contents.push(
      { type: 'separator', margin: 'lg' },
      { type: 'text', text: '🎁 分享給好友得代幣', size: 'sm', weight: 'bold', align: 'center', color: '#E65100', margin: 'md' },
      { type: 'text', text: `推薦碼：${referralInfo.referralCode}`, size: 'sm', align: 'center', color: '#FF8A00', margin: 'sm' }
    );
    uploadStatusCard.footer.contents.push({
      type: 'button',
      style: 'secondary',
      action: {
        type: 'message',
        label: '🎁 分享給好友',
        text: '分享給好友'
      }
    });
  }

  bubbles.push(uploadStatusCard);

  // 最多顯示 9 組（因為第一個是狀態卡片）
  const displaySets = sets.slice(0, 9);

  displaySets.forEach(set => {
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

    // 🆕 如果是生成中狀態，加上明顯的提示
    if (set.status === 'processing') {
      contents.push({
        type: 'text',
        text: '⚡ 正在生成中...\n請稍候，完成後會通知你',
        size: 'sm',
        color: '#FF6B00',
        weight: 'bold',
        margin: 'lg',
        wrap: true
      });
    } else if (set.status === 'pending') {
      contents.push({
        type: 'text',
        text: '🕐 排隊等待中...\n系統將盡快開始生成',
        size: 'sm',
        color: '#FFA500',
        weight: 'bold',
        margin: 'lg',
        wrap: true
      });
    } else if (set.status === 'failed') {
      contents.push({
        type: 'text',
        text: '❌ 生成失敗\n建議刪除後重新生成',
        size: 'sm',
        color: '#FF0000',
        weight: 'bold',
        margin: 'lg',
        wrap: true
      });
    }

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

    // 所有貼圖組都可以刪除（根據狀態調整按鈕文字）
    const deleteLabel = (set.status === 'processing' || set.status === 'pending')
      ? '🚫 取消生成'
      : '🗑️ 刪除';

    footerContents.push({
      type: 'button',
      style: set.status === 'completed' ? 'secondary' : 'primary',
      color: set.status === 'completed' ? undefined : '#999999',
      height: 'sm',
      action: {
        type: 'postback',
        label: deleteLabel,
        data: `action=delete&setId=${setId}`,
        displayText: `刪除「${set.name || '未命名'}」`
      }
    });

    // 🆕 根據狀態決定 hero 圖片（生成中顯示施工圖標）
    let heroImage;
    if (previewUrl) {
      // 已完成：顯示預覽圖
      heroImage = {
        type: 'image',
        url: previewUrl,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'fit',
        backgroundColor: '#FFFFFF'
      };
    } else if (set.status === 'processing' || set.status === 'pending') {
      // 生成中：顯示施工圖標
      heroImage = {
        type: 'image',
        url: 'https://sticker-tycoon.netlify.app/images/generating.svg',
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'fit',
        backgroundColor: '#FFF8E1'
      };
    } else if (set.status === 'failed') {
      // 失敗：顯示錯誤圖標
      heroImage = {
        type: 'image',
        url: 'https://sticker-tycoon.netlify.app/images/failed.svg',
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'fit',
        backgroundColor: '#FFEBEE'
      };
    }

    const bubble = {
      type: 'bubble',
      size: 'kilo',
      hero: heroImage,
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

    // 過濾掉 undefined 的 hero
    if (!bubble.hero) delete bubble.hero;

    bubbles.push(bubble);
  });

  return {
    type: 'flex',
    altText: `📁 你有 ${sets.length} 組貼圖（待上傳：${queueCount}/40）`,
    contents: {
      type: 'carousel',
      contents: bubbles
    },
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '🎬 YouTuber推廣計畫',
            uri: `${process.env.URL || 'https://sticker-tycoon.netlify.app'}/youtuber-promotion.html`
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '📁 我的貼圖',
            text: '我的貼圖'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🎨 創建貼圖',
            text: '創建貼圖'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '💰 購買代幣',
            text: '購買代幣'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🎁 分享給好友',
            text: '分享給好友'
          }
        }
      ]
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
        text: '❌ 找不到此貼圖組',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
          ]
        }
      });
    }

    // 確認是用戶自己的貼圖組
    if (set.user_id !== userId) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '❌ 你沒有權限查看此貼圖組',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
          ]
        }
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
      },
      ...generateQuickReply({
        includeShare: true,
        includeCreate: true,
        includeMyStickers: true,
        customItems: [
          { type: 'action', action: { type: 'message', label: '📋 查詢進度', text: '查詢進度' } }
        ]
      })
    };

    return getLineClient().replyMessage(replyToken, flexMessage);

  } catch (error) {
    console.error('❌ 查看貼圖組失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
          { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
        ]
      }
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

  // 🆕 計算需要多少個 carousel（每個最多 12 個 bubble）
  // 第一個 carousel：1 個資訊 bubble + 最多 11 張貼圖
  // 後續 carousel：最多 12 張貼圖
  const FIRST_CAROUSEL_STICKERS = 11;  // 第一個 carousel 除了 info bubble 還能放 11 張
  const SUBSEQUENT_CAROUSEL_STICKERS = 12;  // 後續 carousel 可放 12 張

  const totalStickers = stickers.length;
  let carouselMessages = [];

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
        { type: 'text', text: `📊 共 ${totalStickers} 張貼圖`, size: 'sm', margin: 'md' },
        { type: 'text', text: `🎨 風格：${styleName}`, size: 'sm', margin: 'sm' },
        { type: 'text', text: `🎭 裝飾：${sceneName}`, size: 'sm', margin: 'sm' },
        { type: 'text', text: `📅 ${new Date(set.created_at).toLocaleDateString('zh-TW')}`, size: 'xs', color: '#999999', margin: 'lg' },
        { type: 'text', text: '👈 左滑查看所有貼圖', size: 'xs', color: '#06C755', margin: 'md' }
      ]
    }
  };

  // 創建貼圖 bubble 的函數
  const createStickerBubble = (s, index) => ({
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'sm',
      backgroundColor: '#FFFFFF',
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
          text: `${index + 1} / ${totalStickers}`,
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
  });

  // 🆕 分組貼圖
  if (totalStickers <= FIRST_CAROUSEL_STICKERS) {
    // 全部放在一個 carousel
    const stickerBubbles = stickers.map((s, index) => createStickerBubble(s, index));
    const allBubbles = [infoBubble, ...stickerBubbles];

    carouselMessages.push({
      type: 'flex',
      altText: `📁 ${set.name} - ${totalStickers} 張貼圖`,
      contents: {
        type: 'carousel',
        contents: allBubbles
      }
    });
  } else {
    // 需要多個 carousel
    // 第一個 carousel：info + 前 11 張
    const firstBatch = stickers.slice(0, FIRST_CAROUSEL_STICKERS);
    const firstBubbles = [infoBubble, ...firstBatch.map((s, index) => createStickerBubble(s, index))];

    carouselMessages.push({
      type: 'flex',
      altText: `📁 ${set.name} (1-${FIRST_CAROUSEL_STICKERS}張)`,
      contents: {
        type: 'carousel',
        contents: firstBubbles
      }
    });

    // 後續 carousel：每批 12 張
    let remaining = stickers.slice(FIRST_CAROUSEL_STICKERS);
    let batchNumber = 2;
    let startIndex = FIRST_CAROUSEL_STICKERS;

    while (remaining.length > 0) {
      const batch = remaining.slice(0, SUBSEQUENT_CAROUSEL_STICKERS);
      remaining = remaining.slice(SUBSEQUENT_CAROUSEL_STICKERS);

      const batchBubbles = batch.map((s, i) => createStickerBubble(s, startIndex + i));
      const endIndex = startIndex + batch.length;

      carouselMessages.push({
        type: 'flex',
        altText: `📁 ${set.name} (${startIndex + 1}-${endIndex}張)`,
        contents: {
          type: 'carousel',
          contents: batchBubbles
        }
      });

      startIndex = endIndex;
      batchNumber++;
    }
  }

  // 🆕 LINE 限制：一次最多發送 5 則訊息
  // 如果超過 5 個 carousel，截取前 5 個
  if (carouselMessages.length > 5) {
    console.log(`⚠️ 貼圖太多，需要 ${carouselMessages.length} 個 carousel，但 LINE 限制最多 5 則`);
    carouselMessages = carouselMessages.slice(0, 5);
  }

  console.log(`📤 發送 ${carouselMessages.length} 個 carousel，共 ${totalStickers} 張貼圖`);

  return getLineClient().replyMessage(replyToken, carouselMessages);
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
        text: '❌ 找不到此貼圖組',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
          ]
        }
      });
    }

    // 確認是用戶自己的貼圖組
    if (set.user_id !== userId) {
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '❌ 你沒有權限刪除此貼圖組',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
          ]
        }
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
      text: '❌ 系統錯誤，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
          { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
        ]
      }
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
        text: `❌ 刪除失敗：${result.error}`,
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
          ]
        }
      });
    }

    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '✅ 貼圖組已成功刪除！\n\n輸入「我的貼圖」查看剩餘貼圖組',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📁 我的貼圖',
              text: '我的貼圖'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🎨 創建貼圖',
              text: '創建貼圖'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏠 主選單',
              text: '選單'
            }
          }
        ]
      }
    });

  } catch (error) {
    console.error('❌ 確認刪除失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
          { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } }
        ]
      }
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
        text: `❌ ${result.error}`,
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '📤 待上傳', text: '待上傳' } }
          ]
        }
      });
    }

    const selectUrl = `https://sticker-tycoon.netlify.app/select-stickers.html?userId=${encodeURIComponent(userId)}`;
    const queueUrl = `https://sticker-tycoon.netlify.app/queue.html?userId=${encodeURIComponent(userId)}`;

    // 使用 Flex Message 帶連結和 Quick Reply
    return getLineClient().replyMessage(replyToken, {
      type: 'flex',
      altText: `已加入待上傳佇列 (${result.currentCount}/40)`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: '✅ 已加入待上傳', weight: 'bold', color: '#06C755' },
            { type: 'text', text: `📊 目前佇列：${result.currentCount} / 40 張`, size: 'sm', margin: 'md' },
            { type: 'text', text: result.currentCount >= 40 ? '🎉 已滿！可以上架了' : `⏳ 還需 ${40 - result.currentCount} 張`, size: 'xs', color: '#999', margin: 'sm' }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: result.currentCount >= 40 ? [
            { type: 'button', style: 'primary', color: '#06C755', height: 'sm', action: { type: 'uri', label: '🚀 去上架', uri: queueUrl } }
          ] : [
            { type: 'button', style: 'primary', color: '#FF6B6B', height: 'sm', flex: 2, action: { type: 'uri', label: '📌 多選加入', uri: selectUrl } },
            { type: 'button', style: 'secondary', height: 'sm', flex: 1, action: { type: 'message', label: '佇列', text: '待上傳' } }
          ]
        }
      },
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'uri',
              label: '📌 選擇更多貼圖',
              uri: selectUrl
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📁 我的貼圖',
              text: '我的貼圖'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🎨 創建貼圖',
              text: '創建貼圖'
            }
          }
        ]
      }
    });

  } catch (error) {
    console.error('❌ 加入上傳佇列失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
          { type: 'action', action: { type: 'message', label: '📤 待上傳', text: '待上傳' } }
        ]
      }
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
        text: `❌ 移除失敗：${result.error}`,
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '📤 待上傳', text: '待上傳' } },
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
          ]
        }
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
      text: '❌ 系統錯誤，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '📤 待上傳', text: '待上傳' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
        ]
      }
    });
  }
}

/**
 * 處理查看上傳佇列（支援分頁）
 */
async function handleViewUploadQueue(replyToken, userId, page = 1) {
  try {
    const queue = await getUploadQueue(userId);
    const selectUrl = `https://sticker-tycoon.netlify.app/select-stickers.html?userId=${encodeURIComponent(userId)}`;

    if (queue.length === 0) {
      return getLineClient().replyMessage(replyToken, {
        type: 'flex',
        altText: '待上傳佇列是空的',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '📋 待上傳佇列是空的', weight: 'bold', size: 'lg', color: '#FF6B6B' },
              { type: 'text', text: '需要累積 40 張貼圖才能上架 LINE', size: 'sm', color: '#666', margin: 'md', wrap: true },
              { type: 'separator', margin: 'lg' },
              { type: 'text', text: '💡 快速選擇貼圖', weight: 'bold', size: 'md', margin: 'lg' },
              { type: 'text', text: '點擊下方按鈕，一次勾選多張貼圖加入佇列', size: 'xs', color: '#999', margin: 'sm', wrap: true }
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
                color: '#06C755',
                action: { type: 'uri', label: '📌 選擇貼圖（多選）', uri: selectUrl }
              },
              {
                type: 'button',
                style: 'secondary',
                action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' }
              }
            ]
          }
        }
      });
    }

    // 生成佇列輪播（帶分頁）
    return await sendUploadQueueCarousel(replyToken, queue, page, userId);

  } catch (error) {
    console.error('❌ 查看上傳佇列失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '📤 待上傳', text: '待上傳' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
        ]
      }
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
        // 選擇更多貼圖（未滿時顯示）
        ...(!isReady ? [{
          type: 'button',
          style: 'primary',
          color: '#FF6B6B',
          action: {
            type: 'uri',
            label: '📌 選擇更多貼圖',
            uri: `https://sticker-tycoon.netlify.app/select-stickers.html?userId=${encodeURIComponent(userId || '')}`
          }
        }] : []),
        // 網頁版完整查看
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'uri',
            label: '🖼️ 網頁版查看佇列',
            uri: `https://sticker-tycoon.netlify.app/queue.html?userId=${encodeURIComponent(userId || '')}`
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
        backgroundColor: '#FFFFFF',
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

  // 創建貼圖（方便生成更多）
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' }
  });

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
        text: `❌ 清空失敗：${result.error}`,
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '📤 待上傳', text: '待上傳' } },
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
          ]
        }
      });
    }

    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '✅ 待上傳佇列已清空\n\n輸入「我的貼圖」重新選擇貼圖',
      ...generateQuickReply({
        includeShare: true,
        includeCreate: true,
        includeMyStickers: true,
        includeMorningGreeting: true
      })
    });

  } catch (error) {
    console.error('❌ 清空佇列失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '📤 待上傳', text: '待上傳' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
        ]
      }
    });
  }
}

/**
 * 處理功能說明
 */
async function handleTutorial(replyToken, userId) {
  try {
    // 記錄教學已顯示
    await markTutorialShown(userId);

    // 發送第一部分
    return getLineClient().replyMessage(replyToken, generateTutorialPart1FlexMessage());
  } catch (error) {
    console.error('發送功能說明失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
        ]
      }
    });
  }
}

/**
 * 處理早安圖請求
 */
async function handleMorningGreeting(replyToken, userId) {
  try {
    console.log(`🌅 用戶 ${userId} 請求早安圖`);

    // 直接從緩存獲取早安圖（不再即時生成）
    const result = await getMorningGreeting();

    if (!result.success) {
      // 今日早安圖尚未生成
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: `🌅 ${result.solarTerm}早安！\n\n${result.error}\n\n💡 早安圖每日凌晨自動更新，請稍後再來看看！`,
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } }
          ]
        }
      });
    }

    // 發送早安圖
    return getLineClient().replyMessage(replyToken, [
      {
        type: 'image',
        originalContentUrl: result.imageUrl,
        previewImageUrl: result.imageUrl
      },
      {
        type: 'text',
        text: `🌅 ${result.solarTerm}早安！\n\n${result.greeting}`,
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } },
            { type: 'action', action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' } }
          ]
        }
      }
    ]);

  } catch (error) {
    console.error('❌ 早安圖處理失敗:', error);
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 系統錯誤，請稍後再試',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
        ]
      }
    });
  }
}

/**
 * 檢查並自動發送功能說明（新用戶或很久沒上線）
 */
async function checkAndSendTutorial(userId) {
  try {
    const shouldShow = await shouldShowTutorial(userId);

    if (shouldShow) {
      console.log(`📖 自動發送功能說明給用戶: ${userId}`);

      // 記錄教學已顯示
      await markTutorialShown(userId);

      // 使用 pushMessage 發送（不需要 replyToken）
      await getLineClient().pushMessage(userId, [
        {
          type: 'text',
          text: '👋 歡迎回來！為您準備了完整功能說明，幫助您快速上手 ✨'
        },
        generateTutorialPart1FlexMessage()
      ]);
    }
  } catch (error) {
    console.error('自動發送功能說明失敗:', error);
  }
}

/**
 * 處理示範圖集
 * 使用 replyMessage 回覆（比 pushMessage 有更高的配額限制）
 */
async function handleDemoGallery(replyToken, userId) {
  try {
    // 從數據庫讀取示範圖集（限制 10 張）
    // 按 display_order 升序排列（最前面的 display_order=0 是最新加入的）
    console.log(`📖 開始讀取示範圖集，userId: ${userId}`);
    
    const { data: demoItems, error } = await supabase
      .from('demo_gallery')
      .select('*')
      .order('display_order', { ascending: true })
      .limit(10);

    if (error) {
      console.error('讀取示範圖集失敗:', error);
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '❌ 示範圖集讀取失敗，請稍後再試\n\n如果問題持續發生，請聯繫客服。',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
            { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } },
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
          ]
        }
      });
    }

    // 如果數據庫沒有資料，提示需要在後台設定
    if (!demoItems || demoItems.length === 0) {
      console.log('⚠️ 示範圖集資料庫為空，需要在後台設定');
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '📭 目前尚無示範圖集\n\n請聯繫管理員在後台設定示範圖集，或直接輸入「創建貼圖」開始製作你的專屬貼圖！',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
            { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } },
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
            { type: 'action', action: { type: 'message', label: '💰 我的代幣', text: '代幣' } }
          ]
        }
      });
    }

    // 生成從資料庫讀取的示範圖集
    console.log(`✨ 成功讀取 ${demoItems.length} 個示範圖集項目`);
    
    // 驗證數據格式
    const validItems = demoItems.filter(item => item.url && item.url.startsWith('http'));
    if (validItems.length === 0) {
      console.error('❌ 示範圖集中沒有有效的圖片 URL');
      return getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: '📭 示範圖集資料有誤\n\n請聯繫管理員檢查後台設定。',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
            { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } },
            { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
          ]
        }
      });
    }
    
    console.log(`📤 使用 ${validItems.length} 個有效項目生成 Flex Message`);
    const message = generateDemoGalleryFromDB(validItems);
    
    console.log('📤 發送示範圖集 replyMessage...');
    return getLineClient().replyMessage(replyToken, message);

  } catch (error) {
    console.error('❌ 示範圖集處理失敗:', error.message);
    
    // 發生錯誤時回覆錯誤訊息
    return getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: '❌ 示範圖集載入失敗，請稍後再試\n\n如需協助，請輸入「客服」聯繫我們。',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
          { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
        ]
      }
    });
  }
}

/**
 * 從數據庫資料生成示範圖集 Flex Message
 */
function generateDemoGalleryFromDB(items) {
  // LINE 官方帳號連結
  const lineOALink = 'https://line.me/R/ti/p/@sticker-tycoon';

  // 分享文字
  const shareText = `🎨 推薦你一個超讚的貼圖製作工具！

【貼圖大亨】用 AI 幫你製作專屬 LINE 貼圖 ✨

🎁 新用戶免費送 40 代幣
📸 上傳照片就能生成貼圖
🚀 1-3 天免費代上架 LINE 貼圖小舖

👉 點擊加入：${lineOALink}`;

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
        { type: 'text', text: '精選貼圖範例與參數', size: 'xs', color: '#FFDDDD', align: 'center', margin: 'sm' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '👈 左滑查看範例貼圖', size: 'sm', color: '#06C755', align: 'center' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '📝 每張圖都有生成參數', size: 'sm', weight: 'bold', margin: 'lg' },
        { type: 'text', text: '包含風格、角色、場景等', size: 'xs', color: '#666666', margin: 'sm' },
        { type: 'text', text: '參考這些參數創作類似效果！', size: 'xs', color: '#666666', margin: 'xs' },
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
          style: 'link',
          action: {
            type: 'uri',
            label: '🌐 查看完整圖集',
            uri: 'https://sticker-tycoon.netlify.app/demo-gallery.html'
          }
        }
      ]
    }
  };

  // 示範貼圖卡片（帶參數資訊）
  const demoBubbles = items.map(item => {
    // 構建參數說明
    const params = [];
    if (item.style_name) params.push(`🎨 ${item.style_name}`);
    if (item.character) params.push(`👤 ${truncateText(item.character, 30)}`);
    if (item.scene) params.push(`🌄 ${truncateText(item.scene, 30)}`);
    if (item.expression) params.push(`😊 ${truncateText(item.expression, 30)}`);

    return {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        backgroundColor: '#F8F9FA',  // 淡灰色背景
        contents: [
          {
            type: 'image',
            url: item.url,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'fit',
            backgroundColor: '#FFFFFF'
          },
          {
            type: 'box',
            layout: 'vertical',
            paddingTop: 'md',
            paddingAll: 'sm',
            backgroundColor: '#FFFFFF',  // 白色背景提升對比
            cornerRadius: 'md',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: item.style_name || '未指定風格',
                size: 'xl',  // 從 md 改為 xl
                weight: 'bold',
                align: 'center',
                color: '#FF6B6B'
              },
              {
                type: 'text',
                text: '生成參數 ↓',
                size: 'sm',  // 從 xxs 改為 sm
                color: '#666666',  // 從 #999999 改為更深的灰色
                align: 'center',
                margin: 'sm',
                weight: 'bold'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',  // 從 xs 改為 sm
        paddingAll: 'md',  // 從 sm 改為 md
        backgroundColor: '#FFFFFF',  // 白色背景
        contents: params.length > 0 ?
          params.map(param => ({
            type: 'text',
            text: param,
            size: 'sm',  // 從 xxs 改為 sm
            color: '#333333',  // 從 #666666 改為更深的顏色
            wrap: true,
            weight: 'bold'  // 加粗字體
          })) :
          [{ type: 'text', text: '無參數資訊', size: 'sm', color: '#999999', align: 'center' }]
      }
    };
  });

  return {
    type: 'flex',
    altText: '✨ 示範圖集 - 精選貼圖範例與生成參數',
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
 * 處理購買代幣資訊 - 美化版 Carousel（包含用戶代幣資訊）
 */
async function handlePurchaseInfo(replyToken, userId) {
  // 獲取用戶代幣資訊
  const balance = await getUserTokenBalance(userId);
  const transactions = await getTokenTransactions(userId, 3); // 最近 3 筆交易

  // 用戶代幣資訊卡片（第一個）
  const userTokenBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#9C27B0',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: '💰 我的代幣', size: 'xl', weight: 'bold', color: '#FFFFFF', align: 'center' }
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
            { type: 'text', text: '💎', size: '5xl', margin: 'sm' },
            { type: 'text', text: `${balance || 0} 代幣`, size: 'xxl', weight: 'bold', color: '#333333', margin: 'md' }
          ]
        },
        { type: 'separator', margin: 'lg' },
        ...(transactions && transactions.length > 0 ? [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            margin: 'md',
            contents: [
              { type: 'text', text: '📜 最近交易', size: 'sm', weight: 'bold', color: '#666666' },
              ...transactions.slice(0, 3).map(t => ({
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: t.amount > 0 ? '➕' : '➖', size: 'xs', flex: 0 },
                  { type: 'text', text: `${Math.abs(t.amount)} 代幣`, size: 'xxs', color: '#888888', flex: 1 },
                  { type: 'text', text: t.type === 'purchase' ? '購買' : t.type === 'generate' ? '生成' : t.type === 'refund' ? '退款' : '其他', size: 'xxs', color: '#888888', align: 'end' }
                ]
              }))
            ]
          }
        ] : [])
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
          color: '#9C27B0'
        }
      ]
    }
  };
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

  // 方案輪播（第一個顯示用戶代幣資訊，然後是兩個方案）
  const planCarousel = {
    type: 'flex',
    altText: '🛒 購買代幣方案',
    contents: {
      type: 'carousel',
      contents: [
        userTokenBubble, // 🆕 第一個顯示用戶代幣資訊
        createPlanBubble(300, 70, 10, false),
        createPlanBubble(500, 130, 30, true)
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

  // QR Code 圖片（添加 Quick Reply）
  const qrMessage = {
    type: 'image',
    originalContentUrl: 'https://sticker-tycoon.netlify.app/payment-qr.png',
    previewImageUrl: 'https://sticker-tycoon.netlify.app/payment-qr.png',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '🎬 YouTuber推廣計畫',
            uri: `${process.env.URL || 'https://sticker-tycoon.netlify.app'}/youtuber-promotion.html`
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '📁 我的貼圖',
            text: '我的貼圖'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🎨 創建貼圖',
            text: '創建貼圖'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '💰 購買代幣',
            text: '購買代幣'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🎁 分享給好友',
            text: '分享給好友'
          }
        }
      ]
    }
  };

  const messages = [planCarousel, paymentInfo, qrMessage];
  
  // 加入 QuickReply
  messages[0].quickReply = generateQuickReply({
    includeShare: true,
    includeMyStickers: true,
    includeTutorial: true
  }).quickReply;
  
  return getLineClient().replyMessage(replyToken, messages);
}

/**
 * 處理購買說明 - 提供完整的購買和使用說明（Carousel 版本）
 */
async function handlePurchaseGuide(replyToken, userId) {
  const guideUrl = `${process.env.URL || 'https://sticker-tycoon.netlify.app'}/token-guide.html`;

  // 獲取用戶代幣資訊
  const balance = await getUserTokenBalance(userId);
  const transactions = await getTokenTransactions(userId, 3); // 最近 3 筆交易

  // 卡片 1: 用戶代幣資訊（第一個）
  const userTokenBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#9C27B0',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: '💰 我的代幣', size: 'xl', weight: 'bold', color: '#FFFFFF', align: 'center' }
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
            { type: 'text', text: '💎', size: '5xl', margin: 'sm' },
            { type: 'text', text: `${balance || 0} 代幣`, size: 'xxl', weight: 'bold', color: '#333333', margin: 'md' }
          ]
        },
        { type: 'separator', margin: 'lg' },
        ...(transactions && transactions.length > 0 ? [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            margin: 'md',
            contents: [
              { type: 'text', text: '📜 最近交易', size: 'sm', weight: 'bold', color: '#666666' },
              ...transactions.slice(0, 3).map(t => ({
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: t.amount > 0 ? '➕' : '➖', size: 'xs', flex: 0 },
                  { type: 'text', text: `${Math.abs(t.amount)} 代幣`, size: 'xxs', color: '#888888', flex: 1 },
                  { type: 'text', text: t.type === 'purchase' ? '購買' : t.type === 'generate' ? '生成' : t.type === 'refund' ? '退款' : '其他', size: 'xxs', color: '#888888', align: 'end' }
                ]
              }))
            ]
          }
        ] : [])
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
          color: '#9C27B0'
        }
      ]
    }
  };

  // 卡片 2: 價目表
  const priceListBubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#667eea',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: '💳 代幣價目表', size: 'xl', weight: 'bold', color: '#FFFFFF', align: 'center' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'lg',
      spacing: 'md',
      contents: [
        // 基礎包
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F7F9FC',
          cornerRadius: 'lg',
          paddingAll: 'md',
          contents: [
            { type: 'text', text: '基礎包', size: 'md', weight: 'bold', color: '#333333' },
            { type: 'separator', margin: 'sm' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                { type: 'text', text: '代幣數量', size: 'xs', color: '#888888', flex: 1 },
                { type: 'text', text: '70 代幣', size: 'sm', weight: 'bold', color: '#333333', align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '售價', size: 'xs', color: '#888888', flex: 1 },
                { type: 'text', text: 'NT$ 300', size: 'sm', weight: 'bold', color: '#667eea', align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '平均單價', size: 'xs', color: '#888888', flex: 1 },
                { type: 'text', text: 'NT$ 4.29/代幣', size: 'xs', color: '#666666', align: 'end' }
              ]
            }
          ]
        },
        // 超值包
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFF0F0',
          cornerRadius: 'lg',
          paddingAll: 'md',
          margin: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '超值包', size: 'md', weight: 'bold', color: '#333333', flex: 1 },
                { type: 'text', text: '🔥 最受歡迎', size: 'xxs', color: '#FF6B6B', weight: 'bold' }
              ]
            },
            { type: 'separator', margin: 'sm' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                { type: 'text', text: '代幣數量', size: 'xs', color: '#888888', flex: 1 },
                { type: 'text', text: '130 代幣', size: 'sm', weight: 'bold', color: '#333333', align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '售價', size: 'xs', color: '#888888', flex: 1 },
                { type: 'text', text: 'NT$ 500', size: 'sm', weight: 'bold', color: '#FF6B6B', align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '平均單價', size: 'xs', color: '#888888', flex: 1 },
                { type: 'text', text: 'NT$ 3.85/代幣', size: 'xs', color: '#666666', align: 'end' }
              ]
            }
          ]
        },
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFF8E7',
          cornerRadius: 'md',
          paddingAll: 'sm',
          margin: 'sm',
          contents: [
            { type: 'text', text: '⏰ 代幣有效期限：30 天', size: 'xs', color: '#CC6600', weight: 'bold' }
          ]
        }
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
          color: '#667eea'
        }
      ]
    }
  };

  // 卡片 3: 交易流程
  const processBubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#2D9CDB',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: '📝 完整交易流程', size: 'xl', weight: 'bold', color: '#FFFFFF', align: 'center' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'lg',
      spacing: 'sm',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '1️⃣', size: 'sm', flex: 0 },
            { type: 'text', text: '在 LINE Bot 選擇「購買代幣」', size: 'xs', color: '#333333', flex: 1, wrap: true }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '2️⃣', size: 'sm', flex: 0 },
            { type: 'text', text: '選擇代幣方案（基礎包/超值包）', size: 'xs', color: '#333333', flex: 1, wrap: true }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '3️⃣', size: 'sm', flex: 0 },
            { type: 'text', text: '確認結帳畫面（商品、數量、金額）', size: 'xs', color: '#333333', flex: 1, wrap: true }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '4️⃣', size: 'sm', flex: 0 },
            { type: 'text', text: '選擇付款方式完成付款', size: 'xs', color: '#333333', flex: 1, wrap: true }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '5️⃣', size: 'sm', flex: 0 },
            { type: 'text', text: '付款成功，代幣即時到帳', size: 'xs', color: '#333333', flex: 1, wrap: true }
          ]
        },
        { type: 'separator', margin: 'md' },
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#E8F5E9',
          cornerRadius: 'md',
          paddingAll: 'sm',
          margin: 'sm',
          contents: [
            { type: 'text', text: '💳 支援付款方式', size: 'xs', weight: 'bold', color: '#2E7D32' },
            { type: 'text', text: '信用卡、LINE Pay、超商代碼、ATM 轉帳', size: 'xxs', color: '#666666', margin: 'xs' }
          ]
        }
      ]
    }
  };

  // 卡片 4: 退換貨政策
  const refundPolicyBubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#FF6B6B',
      paddingAll: 'lg',
      contents: [
        { type: 'text', text: '🔄 退換貨政策', size: 'xl', weight: 'bold', color: '#FFFFFF', align: 'center' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'lg',
      spacing: 'sm',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFE8E8',
          cornerRadius: 'md',
          paddingAll: 'sm',
          margin: 'sm',
          contents: [
            { type: 'text', text: '⚠️ 重要說明', size: 'xs', weight: 'bold', color: '#CC0000' },
            { type: 'text', text: '代幣為數位商品，一經購買並成功入帳後，無法退換貨。', size: 'xxs', color: '#666666', wrap: true, margin: 'xs' }
          ]
        },
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#E8F5E9',
          cornerRadius: 'md',
          paddingAll: 'sm',
          margin: 'sm',
          contents: [
            { type: 'text', text: '✅ 可申請代幣調整的情況', size: 'xs', weight: 'bold', color: '#2E7D32' },
            { type: 'text', text: '• 系統錯誤導致重複扣款', size: 'xxs', color: '#666666', margin: 'xs' },
            { type: 'text', text: '• 付款成功但代幣未入帳', size: 'xxs', color: '#666666', margin: 'xs' },
            { type: 'text', text: '• 程式異常導致出圖錯誤', size: 'xxs', color: '#666666', margin: 'xs' }
          ]
        },
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#E3F2FD',
          cornerRadius: 'md',
          paddingAll: 'sm',
          margin: 'sm',
          contents: [
            { type: 'text', text: '📞 客服聯繫', size: 'xs', weight: 'bold', color: '#1976D2' },
            { type: 'text', text: 'Email: johnyarcher2100@yahoo.com.tw', size: 'xxs', color: '#666666', margin: 'xs' },
            { type: 'text', text: '電話: 0922-327-910', size: 'xxs', color: '#666666', margin: 'xs' },
            { type: 'text', text: '處理時效: 1-3 個工作天', size: 'xxs', color: '#666666', margin: 'xs' }
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'md',
      contents: [
        {
          type: 'button',
          action: { type: 'uri', label: '📖 查看完整說明', uri: guideUrl },
          style: 'secondary'
        }
      ]
    }
  };

  // Carousel Message（移除商家資訊卡片）
  const carousel = {
    type: 'flex',
    altText: '📖 代幣購買完整說明',
    contents: {
      type: 'carousel',
      contents: [userTokenBubble, priceListBubble, processBubble, refundPolicyBubble]
    }
  };

  // 加入 QuickReply
  carousel.quickReply = generateQuickReply({
    includeShare: true,
    includeMyStickers: true,
    includePurchase: true,
    includeTutorial: true
  }).quickReply;
  
  return getLineClient().replyMessage(replyToken, carousel);
}

/**
 * 處理分享給好友資訊 - 簡化版本，縮短分享文字
 */
async function handleReferralInfo(replyToken, userId) {
  try {
    console.log(`📤 處理分享給好友請求 - User: ${userId}`);

    const info = await getUserReferralInfo(userId);
    console.log(`📊 推薦資訊:`, JSON.stringify(info));

    const referralCode = info.referralCode || 'XXXXXX';
    const remainingInvites = 30 - (info.referralCount || 0);

    // 縮短分享文字（避免 URI 過長導致 400 錯誤）
    const shareText = `🎨 推薦貼圖製作工具！
AI 幫你做專屬 LINE 貼圖 ✨
🎁 新用戶 40 代幣+推薦碼「${referralCode}」再送 10！
👉 https://line.me/R/ti/p/@sticker-tycoon
加入後輸入「輸入推薦碼 ${referralCode}」`;

    // 簡單的文字訊息 + QuickReply 分享按鈕
    const message = {
      type: 'text',
      text: `🎁 分享給好友賺代幣

你的推薦碼：${referralCode}
還可邀請：${remainingInvites} 位好友

限時推廣，上限增至30位，趕緊拉好友進來玩 🎉

點擊下方按鈕即可分享給好友 👇`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'uri',
              label: '📤 立即分享',
              uri: `https://line.me/R/share?text=${encodeURIComponent(shareText)}`
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '💰 查詢代幣',
              text: '查詢代幣'
            }
          }
        ]
      }
    };

    console.log(`✅ 發送簡化版分享訊息給用戶 ${userId}`);
    return getLineClient().replyMessage(replyToken, message);

  } catch (error) {
    console.error(`❌ handleReferralInfo 失敗:`, error);
    return safeReply(replyToken, {
      type: 'text',
      text: `❌ 無法載入分享資訊，請稍後再試`
    });
  }
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
      text: `❌ ${result.error}\n\n💡 如果你有推薦碼，請輸入：\n輸入推薦碼 XXXXXX`,
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
          { type: 'action', action: { type: 'message', label: '💰 購買代幣', text: '購買代幣' } },
          { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
        ]
      }
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
1. 加入 LINE 官方帳號 @sticker-tycoon
2. 輸入「輸入推薦碼 ${code}」
3. 一起來創建可愛貼圖吧！`;

  return getLineClient().replyMessage(replyToken, {
    type: 'text',
    text: shareText,
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
        { type: 'action', action: { type: 'message', label: '🌅 早安圖', text: '早安圖' } },
        { type: 'action', action: { type: 'message', label: '📸 創建教學', text: '功能說明' } },
        { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
      ]
    }
  });
}

/**
 * 截斷文字
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
