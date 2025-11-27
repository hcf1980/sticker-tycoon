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
          '例如：「小熊日常」、「辦公室趣事」\n\n' +
          '💡 名稱最長 40 字，請盡量簡潔有創意！'
  };
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
  
  // 儲存名稱並進入風格選擇
  await updateConversationState(userId, ConversationStage.STYLING, { name });
  
  return generateStyleSelectionFlexMessage();
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
  
  // 更新到角色描述階段
  await updateConversationState(userId, ConversationStage.CHARACTER, tempData);
  
  return {
    type: 'text',
    text: `✅ 已選擇「${style.emoji} ${style.name}」風格\n\n` +
          '👤 第二步：描述你的角色\n\n' +
          '請詳細描述你想要的角色特徵，例如：\n\n' +
          '• 「一隻圓滾滾的白色小熊，有粉紅色的臉頰和小小的黑眼睛」\n\n' +
          '• 「一個戴眼鏡的上班族貓咪，穿著西裝打領帶」\n\n' +
          '💡 描述越詳細，生成的貼圖越符合你的想像！'
  };
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
          { type: 'text', text: `已選擇 ${expressions.length} 個表情`, size: 'sm', color: '#666', margin: 'md' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box', layout: 'horizontal', margin: 'lg', spacing: 'sm',
            contents: validCounts.slice(0, 3).map(count => ({
              type: 'button', style: 'secondary', height: 'sm', flex: 1,
              action: { type: 'message', label: `${count}張`, text: `數量:${count}` }
            }))
          },
          {
            type: 'box', layout: 'horizontal', margin: 'sm', spacing: 'sm',
            contents: validCounts.slice(3).map(count => ({
              type: 'button', style: 'secondary', height: 'sm', flex: 1,
              action: { type: 'message', label: `${count}張`, text: `數量:${count}` }
            }))
          }
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
  handleStyleSelection,
  handleCharacterDescription,
  handleExpressionTemplate,
  handleCountSelection
};

