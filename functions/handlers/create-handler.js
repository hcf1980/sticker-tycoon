/**
 * Create Handler Module
 * 處理貼圖創建流程的各個階段
 */

const { v4: uuidv4 } = require('uuid');
const { ConversationStage, getConversationState, updateConversationState, getExpressionTemplates } = require('../conversation-state');
const { createStickerSet, getOrCreateUser } = require('../supabase-client');
const { StickerStyles, DefaultExpressions, LineStickerSpecs, SceneTemplates, getSceneConfig } = require('../sticker-styles');
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

  // 更新到場景選擇階段
  await updateConversationState(userId, ConversationStage.SCENE_SELECT, tempData);

  return generateSceneSelectionFlexMessage();
}

/**
 * 生成場景選擇 Flex Message
 */
function generateSceneSelectionFlexMessage() {
  const scenes = Object.values(SceneTemplates);

  // 分成兩行顯示
  const row1 = scenes.slice(0, 5);
  const row2 = scenes.slice(5);

  return {
    type: 'flex',
    altText: '選擇場景/配件',
    contents: {
      type: 'bubble',
      size: 'mega',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '🌍 選擇場景/配件', weight: 'bold', size: 'lg', color: '#FF6B6B' },
          { type: 'text', text: '為貼圖加入場景特色動作與配件', size: 'xs', color: '#888888', margin: 'sm' },
          { type: 'text', text: '（背景仍然是透明的）', size: 'xxs', color: '#AAAAAA', margin: 'xs' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: row1.map(scene => ({
              type: 'button',
              style: scene.id === 'none' ? 'primary' : 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: `${scene.emoji} ${scene.name}`,
                text: `場景:${scene.id}`
              },
              color: scene.id === 'none' ? '#4CAF50' : undefined
            }))
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            spacing: 'sm',
            contents: row2.map(scene => ({
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: `${scene.emoji} ${scene.name}`,
                text: `場景:${scene.id}`
              }
            }))
          }
        ]
      }
    }
  };
}

/**
 * 處理場景選擇
 */
async function handleSceneSelection(userId, sceneId) {
  console.log(`🌍 用戶 ${userId} 選擇場景：${sceneId}`);

  const scene = SceneTemplates[sceneId];
  if (!scene) {
    return { type: 'text', text: '⚠️ 請選擇有效的場景！' };
  }

  const state = await getConversationState(userId);

  // 如果是自訂場景，進入自訂描述階段
  if (sceneId === 'custom') {
    await updateConversationState(userId, ConversationStage.CUSTOM_SCENE, state.temp_data);
    return {
      type: 'text',
      text: '✏️ 請描述你想要的場景\n\n' +
            '例如：\n' +
            '• 「在中正紀念堂練太極拳」\n' +
            '• 「在法國羅浮宮前拍美照」\n' +
            '• 「在新加坡魚尾獅公園唱歌」\n\n' +
            '💡 AI 會根據你的描述生成對應的動作和配件！'
    };
  }

  // 直接保存場景並進入數量選擇
  const tempData = { ...state.temp_data, scene: sceneId, sceneConfig: scene };
  await updateConversationState(userId, ConversationStage.COUNT_SELECT, tempData);

  return generateCountSelectionMessage(tempData.expressions);
}

/**
 * 處理自訂場景描述
 */
async function handleCustomScene(userId, description) {
  console.log(`✏️ 用戶 ${userId} 自訂場景：${description}`);

  const state = await getConversationState(userId);

  // 建立自訂場景配置
  const customScene = {
    id: 'custom',
    name: '自訂場景',
    emoji: '✏️',
    description: description,
    promptHint: description,
    suggestedProps: []  // DeepSeek 會自動推斷
  };

  const tempData = { ...state.temp_data, scene: 'custom', sceneConfig: customScene, customSceneDescription: description };
  await updateConversationState(userId, ConversationStage.COUNT_SELECT, tempData);

  return generateCountSelectionMessage(tempData.expressions);
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
          { type: 'text', text: `已選擇 ${expressions.length} 個表情`, size: 'sm', color: '#666666', margin: 'md' },
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
  const scene = data.sceneConfig || { emoji: '✨', name: '無場景' };

  // 根據是否有照片顯示不同的內容
  const hasPhoto = data.photoUrl || data.photoBase64;
  const sourceText = hasPhoto
    ? '📷 來源：你的照片'
    : `👤 角色：${(data.character || '').substring(0, 30)}${data.character && data.character.length > 30 ? '...' : ''}`;

  // 場景文字
  const sceneText = data.scene === 'custom' && data.customSceneDescription
    ? `🌍 場景：${data.customSceneDescription.substring(0, 20)}${data.customSceneDescription.length > 20 ? '...' : ''}`
    : `🌍 場景：${scene.emoji} ${scene.name}`;

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
          { type: 'text', text: sourceText, size: 'sm', margin: 'sm', wrap: true },
          { type: 'text', text: sceneText, size: 'sm', margin: 'sm', wrap: true },
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
  handleSceneSelection,
  handleCustomScene,
  handleCountSelection
};

