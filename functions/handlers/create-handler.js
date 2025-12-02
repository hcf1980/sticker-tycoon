/**
 * Create Handler Module
 * 處理貼圖創建流程的各個階段
 */

const { v4: uuidv4 } = require('uuid');
const { ConversationStage, getConversationState, updateConversationState, getExpressionTemplates } = require('../conversation-state');
const { createStickerSet, getOrCreateUser } = require('../supabase-client');
const { StickerStyles, DefaultExpressions, LineStickerSpecs, SceneTemplates, FramingTemplates, getSceneConfig, getFramingConfig } = require('../sticker-styles');
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
          '💡 名稱最長 40 字，請盡量簡潔有創意！',
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '我的日常', text: '我的日常' } },
        { type: 'action', action: { type: 'message', label: '辦公室趣事', text: '辦公室趣事' } },
        { type: 'action', action: { type: 'message', label: '可愛表情包', text: '可愛表情包' } },
        { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
      ]
    }
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
          '🤖 AI 會保留你的臉部特徵，生成各種表情的貼圖！',
    quickReply: {
      items: [
        { type: 'action', action: { type: 'cameraRoll', label: '📁 從相簿選擇' } },
        { type: 'action', action: { type: 'camera', label: '📷 拍照' } },
        { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
      ]
    }
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

  // 如果有照片，進入構圖選擇；否則進入角色描述
  if (tempData.photoUrl) {
    await updateConversationState(userId, ConversationStage.FRAMING, tempData);
    return generateFramingSelectionMessage(style);
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
            '💡 描述越詳細，生成的貼圖越符合你的想像！',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🐱 可愛貓咪', text: '一隻圓滾滾的橘色小貓咪，有大大的眼睛和粉紅色的鼻子' } },
          { type: 'action', action: { type: 'message', label: '🐻 療癒小熊', text: '一隻胖嘟嘟的白色小熊，有粉紅色的臉頰和小小的黑眼睛' } },
          { type: 'action', action: { type: 'message', label: '🐰 呆萌兔子', text: '一隻長耳朵的白色兔子，眼睛是紅色的，表情呆呆的很可愛' } },
          { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
        ]
      }
    };
  }
}

/**
 * 生成構圖選擇訊息
 */
function generateFramingSelectionMessage(style) {
  const framingOptions = Object.values(FramingTemplates);

  return {
    type: 'flex',
    altText: '🖼️ 請選擇人物構圖',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FF6B6B',
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: `✅ 已選擇「${style.emoji} ${style.name}」`, size: 'md', color: '#FFFFFF', align: 'center' },
          { type: 'text', text: '🖼️ 選擇人物構圖', size: 'xl', weight: 'bold', color: '#FFFFFF', align: 'center', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'md',
        contents: [
          { type: 'text', text: '不同構圖會大幅改變貼圖的感覺！', size: 'sm', color: '#666666', align: 'center', margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          ...framingOptions.map(framing => ({
            type: 'box',
            layout: 'horizontal',
            paddingAll: 'md',
            backgroundColor: '#F8F8F8',
            cornerRadius: 'lg',
            margin: 'md',
            action: { type: 'message', label: framing.name, text: `構圖:${framing.id}` },
            contents: [
              { type: 'text', text: framing.emoji, size: 'xxl', flex: 0 },
              {
                type: 'box',
                layout: 'vertical',
                paddingStart: 'lg',
                contents: [
                  { type: 'text', text: framing.name, weight: 'bold', size: 'md', color: '#333333' },
                  { type: 'text', text: framing.description, size: 'xs', color: '#888888', wrap: true }
                ]
              }
            ]
          }))
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            action: { type: 'message', label: '❌ 取消', text: '取消' }
          }
        ]
      }
    },
    quickReply: {
      items: [
        ...framingOptions.map(framing => ({
          type: 'action',
          action: { type: 'message', label: `${framing.emoji} ${framing.name}`, text: `構圖:${framing.id}` }
        })),
        { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
      ]
    }
  };
}

/**
 * 處理構圖選擇
 */
async function handleFramingSelection(userId, framingId) {
  console.log(`🖼️ 用戶 ${userId} 選擇構圖：${framingId}`);

  const framing = FramingTemplates[framingId];
  if (!framing) {
    return {
      type: 'text',
      text: '⚠️ 請選擇有效的構圖選項！',
      quickReply: {
        items: Object.values(FramingTemplates).map(f => ({
          type: 'action',
          action: { type: 'message', label: `${f.emoji} ${f.name}`, text: `構圖:${f.id}` }
        }))
      }
    };
  }

  // 取得當前暫存資料
  const state = await getConversationState(userId);
  const tempData = { ...state.temp_data, framing: framingId };

  // 進入表情選擇階段
  await updateConversationState(userId, ConversationStage.EXPRESSIONS, tempData);

  return {
    type: 'flex',
    altText: '選擇表情模板',
    contents: generateExpressionSelectionFlexMessage().contents,
    quickReply: generateExpressionSelectionFlexMessage().quickReply
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
      text: '⚠️ 請提供更詳細的角色描述（至少 10 字）！',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🐱 可愛貓咪', text: '一隻圓滾滾的橘色小貓咪，有大大的眼睛和粉紅色的鼻子' } },
          { type: 'action', action: { type: 'message', label: '🐻 療癒小熊', text: '一隻胖嘟嘟的白色小熊，有粉紅色的臉頰和小小的黑眼睛' } },
          { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
        ]
      }
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
 * 隨機洗牌陣列（Fisher-Yates 演算法）
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 處理表情模板選擇
 * 從模板的 24 個表情中隨機選取指定數量
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

  // 從模板的表情池中隨機洗牌，稍後會根據選擇的數量取用
  // 先保存完整的洗牌後表情列表，在選擇數量後再取對應數量
  const shuffledExpressions = shuffleArray(template.expressions);

  // 取得當前暫存資料
  const state = await getConversationState(userId);
  const tempData = {
    ...state.temp_data,
    expressions: shuffledExpressions,  // 保存洗牌後的完整列表
    expressionTemplateId: templateId   // 保存模板 ID 以供參考
  };

  // 更新到場景選擇階段
  await updateConversationState(userId, ConversationStage.SCENE_SELECT, tempData);

  return generateSceneSelectionFlexMessage();
}

/**
 * 生成裝飾風格選擇 Flex Message
 */
function generateSceneSelectionFlexMessage() {
  const scenes = Object.values(SceneTemplates);

  // 排除 custom，分開處理
  const regularScenes = scenes.filter(s => s.id !== 'custom');
  const customScene = scenes.find(s => s.id === 'custom');

  // 分成兩行顯示（不包含 custom）
  const row1 = regularScenes.slice(0, 4);
  const row2 = regularScenes.slice(4);

  // Quick Reply 項目
  const quickReplyItems = scenes.map(scene => ({
    type: 'action',
    action: {
      type: 'message',
      label: `${scene.emoji} ${scene.name}`,
      text: `場景:${scene.id}`
    }
  }));
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '❌ 取消', text: '取消' }
  });

  return {
    type: 'flex',
    altText: '選擇裝飾風格',
    contents: {
      type: 'bubble',
      size: 'mega',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '🎨 選擇裝飾風格', weight: 'bold', size: 'lg', color: '#FF6B6B' },
          { type: 'text', text: '為貼圖加入 POP 文字與裝飾元素', size: 'xs', color: '#888888', margin: 'sm' },
          { type: 'text', text: '（愛心、星星、對話框等）', size: 'xxs', color: '#AAAAAA', margin: 'xs' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: row1.map(scene => ({
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: `${scene.emoji} ${scene.name}`,
                text: `場景:${scene.id}`
              }
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
          },
          // 自訂風格（無限延伸）- 強調色
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'message',
              label: `${customScene.emoji} ${customScene.name}（無限延伸）`,
              text: `場景:${customScene.id}`
            },
            margin: 'lg',
            color: '#FF6B6B'
          }
        ]
      }
    },
    quickReply: {
      items: quickReplyItems.slice(0, 13)
    }
  };
}

/**
 * 處理裝飾風格選擇
 */
async function handleSceneSelection(userId, sceneId) {
  console.log(`🎨 用戶 ${userId} 選擇裝飾風格：${sceneId}`);

  const scene = SceneTemplates[sceneId];
  if (!scene) {
    return { type: 'text', text: '⚠️ 請選擇有效的裝飾風格！' };
  }

  const state = await getConversationState(userId);

  // 如果是自訂風格，進入自訂描述階段
  if (sceneId === 'custom') {
    await updateConversationState(userId, ConversationStage.CUSTOM_SCENE, state.temp_data);
    return {
      type: 'text',
      text: '✏️ 請描述你想要的風格\n\n' +
            '🔥 熱門風格範例：\n' +
            '• 「宮崎駿吉卜力水彩風」\n' +
            '• 「Q版大頭公仔 chibi」\n' +
            '• 「Nanana Banana 香蕉人風格」\n' +
            '• 「像素風 pixel art」\n' +
            '• 「賽博龐克霓虹風」\n\n' +
            '💡 直接複製或輸入你想要的風格描述！',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '🎨 宮崎駿風', text: '宮崎駿吉卜力水彩風格，溫暖柔和的色調' } },
          { type: 'action', action: { type: 'message', label: '🎀 Q版大頭', text: 'Q版大頭公仔 chibi style，超可愛大眼睛' } },
          { type: 'action', action: { type: 'message', label: '🍌 香蕉人風', text: 'Nanana Banana 香蕉人風格，黃色系可愛' } },
          { type: 'action', action: { type: 'message', label: '👾 像素風', text: '像素風 pixel art 8-bit 復古遊戲風格' } },
          { type: 'action', action: { type: 'message', label: '💜 賽博龐克', text: '賽博龐克霓虹風，紫色藍色發光效果' } },
          { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } }
        ]
      }
    };
  }

  // 直接保存裝飾風格並進入數量選擇
  const tempData = { ...state.temp_data, scene: sceneId, sceneConfig: scene };
  await updateConversationState(userId, ConversationStage.COUNT_SELECT, tempData);

  return generateCountSelectionMessage(tempData.expressions);
}

/**
 * 處理自訂裝飾風格描述
 */
async function handleCustomScene(userId, description) {
  console.log(`✏️ 用戶 ${userId} 自訂裝飾風格：${description}`);

  const state = await getConversationState(userId);

  // 建立自訂裝飾風格配置
  const customScene = {
    id: 'custom',
    name: '自訂風格',
    emoji: '✏️',
    description: description,
    decorationStyle: description,
    decorationElements: [],
    popTextStyle: description
  };

  const tempData = { ...state.temp_data, scene: 'custom', sceneConfig: customScene, customSceneDescription: description };
  await updateConversationState(userId, ConversationStage.COUNT_SELECT, tempData);

  return generateCountSelectionMessage(tempData.expressions);
}

/**
 * 生成數量選擇訊息（6宮格批次生成優化版）
 * 每 6 張 = 1 次 API = 3 代幣
 */
function generateCountSelectionMessage(expressions) {
  const validCounts = LineStickerSpecs.validCounts; // [6, 12, 18]

  // Quick Reply 項目（包含代幣消耗說明）
  const quickReplyItems = validCounts.map(count => {
    const apiCalls = count / 6;
    const tokenCost = apiCalls * 3;  // 每次API調用消耗3枚代幣
    return {
      type: 'action',
      action: {
        type: 'message',
        label: `${count}張 (${tokenCost}代幣)`,
        text: `數量:${count}`
      }
    };
  });
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '❌ 取消', text: '取消' }
  });

  return {
    type: 'flex',
    altText: '選擇貼圖數量',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📊 選擇貼圖數量',
            weight: 'bold',
            size: 'lg',
            color: '#FF6B6B'
          },
          {
            type: 'text',
            text: '🎨 6宮格批次生成特價！',
            size: 'sm',
            color: '#FF6B6B',
            margin: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: '💰 每6張僅需 3 枚代幣',
            size: 'xs',
            color: '#28A745',
            margin: 'sm',
            weight: 'bold'
          },
          { type: 'separator', margin: 'lg' },
          // 6張選項
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    height: 'sm',
                    action: {
                      type: 'message',
                      label: '6 張',
                      text: '數量:6'
                    },
                    color: '#FF6B6B'
                  },
                  {
                    type: 'text',
                    text: '3 代幣',
                    size: 'xxs',
                    color: '#28A745',
                    align: 'center',
                    margin: 'xs',
                    weight: 'bold'
                  }
                ]
              }
            ]
          },
          // 12張選項
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  {
                    type: 'button',
                    style: 'secondary',
                    height: 'sm',
                    action: {
                      type: 'message',
                      label: '12 張',
                      text: '數量:12'
                    }
                  },
                  {
                    type: 'text',
                    text: '6 代幣',
                    size: 'xxs',
                    color: '#28A745',
                    align: 'center',
                    margin: 'xs',
                    weight: 'bold'
                  }
                ]
              }
            ]
          },
          // 18張選項
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  {
                    type: 'button',
                    style: 'secondary',
                    height: 'sm',
                    action: {
                      type: 'message',
                      label: '18 張',
                      text: '數量:18'
                    }
                  },
                  {
                    type: 'text',
                    text: '9 代幣',
                    size: 'xxs',
                    color: '#28A745',
                    align: 'center',
                    margin: 'xs',
                    weight: 'bold'
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    quickReply: {
      items: quickReplyItems
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

  // 計算代幣消耗
  const stickerCount = data.count || 9;
  const apiCalls = Math.ceil(stickerCount / 9);
  const tokenCost = apiCalls * 3;

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
          { type: 'text', text: `📊 數量：${stickerCount} 張`, size: 'sm', margin: 'sm' },
          { type: 'text', text: `💰 消耗：${tokenCost} 代幣（${apiCalls}次API調用）`, size: 'sm', margin: 'sm', color: '#28A745', weight: 'bold' },
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
  handleFramingSelection,
  handleCharacterDescription,
  handleExpressionTemplate,
  handleSceneSelection,
  handleCustomScene,
  handleCountSelection
};

