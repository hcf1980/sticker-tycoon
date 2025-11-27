/**
 * Create Handler Module
 * 處理貼圖創建流程的各個階段
 */

const { v4: uuidv4 } = require('uuid');
const { ConversationStage, getConversationState, updateConversationState, getExpressionTemplates } = require('../conversation-state');
const { createStickerSet, getOrCreateUser } = require('../supabase-client');
const { StickerStyles, DefaultExpressions, LineStickerSpecs } = require('../sticker-styles');
const { generateStyleSelectionFlexMessage, generateExpressionSelectionFlexMessage } = require('../sticker-flex-message');

/**
 * 開始創建流程
 */
async function handleStartCreate(userId) {
  console.log(`🚀 用戶 ${userId} 開始創建貼圖`);

  // 確保用戶存在
  await getOrCreateUser(userId);

  // 更新對話狀態到命名階段
  await updateConversationState(userId, ConversationStage.NAMING, {});

  return {
    type: 'text',
    text: '🎨 開始創建你的專屬貼圖！\n\n' +
          '📝 第一步：請輸入貼圖組名稱\n\n' +
          '例如：「我的日常」、「辦公室趣事」\n\n' +
          '💡 名稱最長 40 字，請盡量簡潔有創意！'
  };
}

/**
 * 處理照片上傳完成
 */
async function handlePhotoUpload(userId, photoResult) {
  console.log(`📷 用戶 ${userId} 上傳照片完成`);

  // 取得當前暫存資料
  const state = await getConversationState(userId);
  const tempData = {
    ...state.temp_data,
    photoUrl: photoResult.publicUrl,
    photoPath: photoResult.storagePath,
    photoBase64: photoResult.base64
  };

  // 進入風格選擇階段
  await updateConversationState(userId, ConversationStage.STYLING, tempData);

  return generateStyleSelectionFlexMessage();
}

/**
 * 處理命名階段
 */
async function handleNaming(userId, name) {
  console.log(`📝 用戶 ${userId} 設定名稱：${name}`);

  // 驗證名稱
  if (!name || name.length > 40) {
    return {
      type: 'text',
      text: '⚠️ 名稱請在 40 字以內，請重新輸入！'
    };
  }

  // 儲存名稱並進入照片上傳階段
  await updateConversationState(userId, ConversationStage.UPLOAD_PHOTO, { name });

  return {
    type: 'text',
    text: '✅ 名稱設定完成！\n\n' +
          '📷 第二步：請上傳一張你的照片\n\n' +
          '建議：\n' +
          '• 正面清晰的大頭照\n' +
          '• 光線充足、背景簡單\n' +
          '• 表情自然最佳\n\n' +
          '🤖 AI 會保留你的臉部特徵，生成各種表情的貼圖！'
  };
}

/**
 * 處理風格選擇
 */
async function handleStyleSelection(userId, styleId) {
  console.log(`🎨 用戶 ${userId} 選擇風格：${styleId}`);

  const style = StickerStyles[styleId];
  if (!style) {
    return {
      type: 'text',
      text: '⚠️ 請選擇有效的風格！'
    };
  }

  // 取得當前暫存資料
  const state = await getConversationState(userId);
  const tempData = { ...state.temp_data, style: styleId };

  // 如果有照片，直接進入表情選擇；否則進入角色描述
  if (tempData.photoUrl) {
    await updateConversationState(userId, ConversationStage.EXPRESSIONS, tempData);
    return generateExpressionSelectionFlexMessage();
  } else {
    // 舊流程：沒有照片時要求描述角色
    await updateConversationState(userId, ConversationStage.CHARACTER, tempData);
    return {
      type: 'text',
      text: `✅ 已選擇「${style.emoji} ${style.name}」風格\n\n` +
            '👤 描述你的角色\n\n' +
            '請詳細描述你想要的角色特徵，例如：\n\n' +
            '• 「一隻圓滾滾的白色小熊，有粉紅色的臉頰和小小的黑眼睛」\n\n' +
            '• 「一個戴眼鏡的上班族貓咪，穿著西裝打領帶」\n\n' +
            '💡 描述越詳細，生成的貼圖越符合你的想像！'
    };
  }
}

/**
 * 處理角色描述
 */
async function handleCharacterDescription(userId, description) {
  console.log(`👤 用戶 ${userId} 角色描述：${description.substring(0, 50)}...`);
  
  // 驗證描述
  if (!description || description.length < 10) {
    return {
      type: 'text',
      text: '⚠️ 請提供更詳細的角色描述（至少 10 字）！'
    };
  }
  
  // 取得當前暫存資料
  const state = await getConversationState(userId);
  const tempData = { ...state.temp_data, character: description };
  
  // 更新到表情選擇階段
  await updateConversationState(userId, ConversationStage.EXPRESSIONS, tempData);
  
  return generateExpressionSelectionFlexMessage();
}

/**
 * 處理表情模板選擇
 */
async function handleExpressionTemplate(userId, templateId) {
  console.log(`😀 用戶 ${userId} 選擇表情模板：${templateId}`);
  
  const template = DefaultExpressions[templateId];
  if (!template) {
    return {
      type: 'text',
      text: '⚠️ 請選擇有效的表情模板！'
    };
  }
  
  // 取得當前暫存資料
  const state = await getConversationState(userId);
  const tempData = { ...state.temp_data, expressions: template.expressions };
  
  // 更新到數量選擇階段
  await updateConversationState(userId, ConversationStage.COUNT_SELECT, tempData);
  
  return generateCountSelectionMessage(template.expressions);
}

/**
 * 生成數量選擇訊息
 */
function generateCountSelectionMessage(expressions) {
  const validCounts = LineStickerSpecs.validCounts;

  // 生成按鈕列表
  const buttons = validCounts.map(count => ({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    action: { type: 'message', label: `${count}張`, text: `數量:${count}` }
  }));

  return {
    type: 'flex',
    altText: '選擇貼圖數量',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '📊 選擇貼圖數量', weight: 'bold', size: 'lg', color: '#FF6B6B' },
          { type: 'text', text: `已選擇 ${expressions.length} 個表情`, size: 'sm', color: '#666666', margin: 'md' },
          { type: 'separator', margin: 'lg' },
          ...buttons.map(btn => ({ ...btn, margin: 'md' }))
        ]
      }
    }
  };
}

/**
 * 處理數量選擇
 */
async function handleCountSelection(userId, count) {
  console.log(`📊 用戶 ${userId} 選擇數量：${count}`);
  
  if (!LineStickerSpecs.validCounts.includes(count)) {
    return { type: 'text', text: '⚠️ 請選擇有效的數量！' };
  }
  
  const state = await getConversationState(userId);
  const tempData = { ...state.temp_data, count };
  
  // 進入確認階段
  await updateConversationState(userId, ConversationStage.CONFIRMING, tempData);
  
  return generateConfirmationMessage(tempData);
}

/**
 * 生成確認訊息
 */
function generateConfirmationMessage(data) {
  const style = StickerStyles[data.style];
  
  return {
    type: 'flex',
    altText: '確認貼圖設定',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '✅ 確認貼圖設定', weight: 'bold', size: 'lg', color: '#FF6B6B' },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: `📛 名稱：${data.name}`, size: 'sm', margin: 'lg' },
          { type: 'text', text: `🎨 風格：${style.emoji} ${style.name}`, size: 'sm', margin: 'sm' },
          { type: 'text', text: `👤 角色：${data.character.substring(0, 30)}...`, size: 'sm', margin: 'sm', wrap: true },
          { type: 'text', text: `📊 數量：${data.count} 張`, size: 'sm', margin: 'sm' },
          { type: 'separator', margin: 'lg' }
        ]
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', action: { type: 'message', label: '✅ 開始生成', text: '確認生成' }, color: '#FF6B6B' },
          { type: 'button', style: 'secondary', action: { type: 'message', label: '❌ 取消', text: '取消' } }
        ]
      }
    }
  };
}

module.exports = {
  handleStartCreate,
  handleNaming,
  handlePhotoUpload,
  handleStyleSelection,
  handleCharacterDescription,
  handleExpressionTemplate,
  handleCountSelection
};

