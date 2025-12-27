/**
 * Sticker Flex Message Module
 * 建立各種貼圖相關的 Flex Message
 */

const { StickerStyles, DefaultExpressions, LineStickerSpecs } = require('./sticker-styles');
const { getSupabaseClient } = require('./supabase-client');

/**
 * 歡迎訊息 Flex Message
 */
function generateWelcomeFlexMessage() {
  return {
    type: 'flex',
    altText: '歡迎使用貼圖大亨！',
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎨 貼圖大亨',
            weight: 'bold',
            size: 'xxl',
            color: '#FF6B6B',
            align: 'center'
          },
          {
            type: 'text',
            text: 'AI 智慧貼圖生成器',
            size: 'md',
            color: '#666666',
            align: 'center',
            margin: 'sm'
          }
        ],
        paddingAll: '20px',
        backgroundColor: '#FFF5F5'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✨ 三步驟創建專屬貼圖',
            weight: 'bold',
            size: 'md',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              { type: 'text', text: '1️⃣ 選擇風格 & 描述角色', size: 'sm', color: '#555555' },
              { type: 'text', text: '2️⃣ AI 自動生成 8-40 張貼圖', size: 'sm', color: '#555555' },
              { type: 'text', text: '3️⃣ 下載並上傳到 LINE Creators', size: 'sm', color: '#555555' }
            ]
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          {
            type: 'text',
            text: '📋 符合 LINE 官方規格',
            weight: 'bold',
            size: 'sm',
            margin: 'xl',
            color: '#06C755'
          },
          {
            type: 'text',
            text: '自動去背、尺寸調整、打包下載',
            size: 'xs',
            color: '#888888',
            margin: 'sm'
          }
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
            height: 'md',
            action: {
              type: 'message',
              label: '🚀 開始創建貼圖',
              text: '創建貼圖'
            },
            color: '#FF6B6B'
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                flex: 1,
                action: {
                  type: 'message',
                  label: '📖 功能說明',
                  text: '功能說明'
                }
              },
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                flex: 1,
                action: {
                  type: 'message',
                  label: '📁 我的貼圖',
                  text: '我的貼圖'
                }
              }
            ]
          },
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'message',
              label: '🎁 分享給好友賺代幣',
              text: '分享給好友'
            }
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            paddingAll: 'sm',
            backgroundColor: '#FFF3E0',
            cornerRadius: 'md',
            contents: [
              {
                type: 'text',
                text: '🎁 分享給好友，雙方各得 10 代幣！',
                size: 'xs',
                color: '#E65100',
                align: 'center',
                weight: 'bold'
              }
            ]
          }
        ],
        flex: 0
      }
    },
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
        { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
        { type: 'action', action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' } }
      ]
    }
  };
}

/**
 * 風格選擇 Flex Message
 * @param {Array} styles - 從資料庫讀取的風格設定陣列，如果為空則使用預設值
 */
function generateStyleSelectionFlexMessage(styles = null) {
  // 如果沒有提供風格資料，使用預設的 StickerStyles
  const styleList = styles || Object.values(StickerStyles);

  // 將資料庫格式轉換為按鈕格式
  const styleButtons = styleList.map(style => ({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    action: {
      type: 'message',
      label: `${style.emoji} ${style.name}`,
      text: `風格:${style.style_id || style.id}`
    },
    margin: 'sm'
  }));

  // Quick Reply 項目
  const quickReplyItems = styleList.map(style => ({
    type: 'action',
    action: {
      type: 'message',
      label: `${style.emoji} ${style.name}`,
      text: `風格:${style.style_id || style.id}`
    }
  }));
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '❌ 取消', text: '取消' }
  });

  return {
    type: 'flex',
    altText: '請選擇貼圖風格',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎨 選擇貼圖風格',
            weight: 'bold',
            size: 'lg',
            color: '#FF6B6B'
          },
          {
            type: 'text',
            text: '請選擇你喜歡的風格：',
            size: 'sm',
            color: '#666666',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: styleButtons.slice(0, 4)
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            contents: styleButtons.slice(4)
          }
        ]
      }
    },
    quickReply: {
      items: quickReplyItems.slice(0, 13) // LINE 最多 13 個 Quick Reply
    }
  };
}

/**
 * 表情選擇 Flex Message（從資料庫動態載入）
 * @param {Array} templates - 從資料庫讀取的表情模板陣列
 */
async function generateExpressionSelectionFlexMessage(templates = null) {
  // 如果沒有提供模板，從資料庫載入
  let templateList = templates;

  if (!templateList) {
    try {
      const { getSupabaseClient } = require('./supabase-client');
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('expression_template_settings')
        .select('*')
        .eq('is_active', true)
        .order('template_id');

      if (error) throw error;

      // 轉換格式：template_id -> id, 保持相容性
      templateList = (data || []).map(t => ({
        id: t.template_id,
        name: t.name,
        emoji: t.emoji,
        expressions: t.expressions
      }));

      console.log(`✅ 從資料庫載入 ${templateList.length} 個表情模板`);
    } catch (error) {
      console.error('❌ 從資料庫載入表情模板失敗，使用預設值:', error);
      // 降級到硬編碼的 DefaultExpressions
      const { DefaultExpressions } = require('./sticker-styles');
      templateList = Object.values(DefaultExpressions);
    }
  }

  const templateButtons = templateList.map(template => ({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    action: {
      type: 'message',
      label: `${template.emoji || '😀'} ${template.name}`,
      text: `表情模板:${template.id}`
    },
    margin: 'sm'
  }));

  // Quick Reply 項目
  const quickReplyItems = templateList.map(template => ({
    type: 'action',
    action: {
      type: 'message',
      label: `${template.emoji || '😀'} ${template.name}`,
      text: `表情模板:${template.id}`
    }
  }));
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '❌ 取消', text: '取消' }
  });

  return {
    type: 'flex',
    altText: '請選擇表情模板',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '😀 選擇表情模板', weight: 'bold', size: 'lg', color: '#FF6B6B' },
          { type: 'text', text: '選擇預設模板', size: 'sm', color: '#666666', margin: 'md' },
          { type: 'separator', margin: 'lg' },
          { type: 'box', layout: 'vertical', margin: 'lg', contents: templateButtons }
        ]
      }
    },
    quickReply: {
      items: quickReplyItems.slice(0, 13)
    }
  };
}

/**
 * 檢查是否應該顯示功能說明（每週最多一次）
 */
async function shouldShowTutorial(userId) {
  try {
    const supabase = getSupabaseClient();

    // 查詢用戶的最後一次教學顯示時間
    const { data, error } = await supabase
      .from('users')
      .select('last_tutorial_shown_at')
      .eq('line_user_id', userId)
      .single();

    if (error) {
      console.error('查詢教學顯示時間失敗:', error);
      return true; // 錯誤時預設顯示
    }

    // 如果從未顯示過，應該顯示
    if (!data || !data.last_tutorial_shown_at) {
      return true;
    }

    // 檢查是否超過 7 天
    const lastShown = new Date(data.last_tutorial_shown_at);
    const now = new Date();
    const daysDiff = (now - lastShown) / (1000 * 60 * 60 * 24);

    return daysDiff >= 7;
  } catch (error) {
    console.error('檢查教學顯示條件失敗:', error);
    return true; // 錯誤時預設顯示
  }
}

/**
 * 記錄教學已顯示
 */
async function markTutorialShown(userId) {
  try {
    const supabase = getSupabaseClient();

    await supabase
      .from('users')
      .update({ last_tutorial_shown_at: new Date().toISOString() })
      .eq('line_user_id', userId);

    console.log(`✅ 已記錄教學顯示時間: ${userId}`);
  } catch (error) {
    console.error('記錄教學顯示時間失敗:', error);
  }
}

/**
 * 完整功能說明 Flex Message（第一部分：創建貼圖流程 - Carousel 格式）
 */
function generateTutorialPart1FlexMessage() {
  const baseUrl = process.env.URL || 'https://sticker-tycoon.netlify.app';

  return {
    type: 'flex',
    altText: '📸 創建貼圖教學 - 左右滑動查看步驟',
    contents: {
      type: 'carousel',
      contents: [
        // 步驟 1：上傳照片
        {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FF6B6B',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '📸 創建貼圖', weight: 'bold', size: 'md', color: '#FFFFFF' },
              { type: 'text', text: '步驟 1/5', size: 'xs', color: '#FFFFFFCC' }
            ]
          },
          hero: {
            type: 'image',
            url: `${baseUrl}/images/demo/step1-upload.png`,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '上傳照片', weight: 'bold', size: 'md', color: '#333333' },
              { type: 'text', text: '選擇一張清晰的正面照', size: 'sm', color: '#666666', margin: 'sm', wrap: true }
            ]
          }
        },
        // 步驟 2：選擇風格
        {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#AF52DE',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '📸 創建貼圖', weight: 'bold', size: 'md', color: '#FFFFFF' },
              { type: 'text', text: '步驟 2/5', size: 'xs', color: '#FFFFFFCC' }
            ]
          },
          hero: {
            type: 'image',
            url: `${baseUrl}/images/demo/step2-style.png`,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '選擇風格', weight: 'bold', size: 'md', color: '#333333' },
              { type: 'text', text: '可愛風、寫實風、Q版等', size: 'sm', color: '#666666', margin: 'sm', wrap: true }
            ]
          }
        },
        // 步驟 3：選擇表情
        {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#007AFF',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '📸 創建貼圖', weight: 'bold', size: 'md', color: '#FFFFFF' },
              { type: 'text', text: '步驟 3/5', size: 'xs', color: '#FFFFFFCC' }
            ]
          },
          hero: {
            type: 'image',
            url: `${baseUrl}/images/demo/step3-emotion.png`,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '選擇表情', weight: 'bold', size: 'md', color: '#333333' },
              { type: 'text', text: '最多可選擇 24 種表情！', size: 'sm', color: '#666666', margin: 'sm', wrap: true }
            ]
          }
        },
        // 步驟 4：AI 生成中
        {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FF9500',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '📸 創建貼圖', weight: 'bold', size: 'md', color: '#FFFFFF' },
              { type: 'text', text: '步驟 4/5', size: 'xs', color: '#FFFFFFCC' }
            ]
          },
          hero: {
            type: 'image',
            url: `${baseUrl}/images/demo/step4-generating.png`,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: 'AI 生成中', weight: 'bold', size: 'md', color: '#333333' },
              { type: 'text', text: 'AI 正在為你創作貼圖...', size: 'sm', color: '#666666', margin: 'sm', wrap: true }
            ]
          }
        },
        // 步驟 5：完成
        {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#34C759',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '📸 創建貼圖', weight: 'bold', size: 'md', color: '#FFFFFF' },
              { type: 'text', text: '步驟 5/5 ✅', size: 'xs', color: '#FFFFFFCC' }
            ]
          },
          hero: {
            type: 'image',
            url: `${baseUrl}/images/demo/step5-complete.png`,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '🎉 貼圖生成完畢', weight: 'bold', size: 'md', color: '#333333' },
              { type: 'text', text: '選擇下載或申請代上架！', size: 'sm', color: '#666666', margin: 'sm', wrap: true }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#06C755',
                height: 'sm',
                action: { type: 'message', label: '🚀 開始創建', text: '創建貼圖' }
              }
            ]
          }
        }
      ]
    },
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '🚀 下載/上架說明', text: '功能說明2' } },
        { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
        { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
      ]
    }
  };
}

/**
 * 完整功能說明 Flex Message（第二部分：下載/上架說明 - Carousel 格式）
 */
function generateTutorialPart2FlexMessage() {
  const baseUrl = process.env.URL || 'https://sticker-tycoon.netlify.app';

  return {
    type: 'flex',
    altText: '🚀 下載/上架教學 - 左右滑動查看步驟',
    contents: {
      type: 'carousel',
      contents: [
        // 步驟 1：選滿 40 張
        {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#34C759',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '🚀 下載/上架', weight: 'bold', size: 'md', color: '#FFFFFF' },
              { type: 'text', text: '步驟 1/3', size: 'xs', color: '#FFFFFFCC' }
            ]
          },
          hero: {
            type: 'image',
            url: `${baseUrl}/images/demo/step-40stickers.png`,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '選滿 40 張貼圖', weight: 'bold', size: 'md', color: '#333333' },
              { type: 'text', text: '確認已生成 40 張才能下載或申請上架！', size: 'sm', color: '#666666', margin: 'sm', wrap: true }
            ]
          }
        },
        // 步驟 2：自行下載
        {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#007AFF',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '🚀 下載/上架', weight: 'bold', size: 'md', color: '#FFFFFF' },
              { type: 'text', text: '步驟 2/3', size: 'xs', color: '#FFFFFFCC' }
            ]
          },
          hero: {
            type: 'image',
            url: `${baseUrl}/images/demo/step-download.png`,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '自行下載', weight: 'bold', size: 'md', color: '#333333' },
              { type: 'text', text: '下載 ZIP 壓縮檔，自行上傳到 LINE Creators', size: 'sm', color: '#666666', margin: 'sm', wrap: true }
            ]
          }
        },
        // 步驟 3：免費代上架
        {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FF6B6B',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '🚀 下載/上架', weight: 'bold', size: 'md', color: '#FFFFFF' },
              { type: 'text', text: '步驟 3/3 ⭐', size: 'xs', color: '#FFFFFFCC' }
            ]
          },
          hero: {
            type: 'image',
            url: `${baseUrl}/images/demo/step-listing.png`,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '免費代上架 ⭐', weight: 'bold', size: 'md', color: '#333333' },
              { type: 'text', text: '填寫貼圖資訊，我們幫你上架到 LINE Store！', size: 'sm', color: '#666666', margin: 'sm', wrap: true }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#06C755',
                height: 'sm',
                action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' }
              }
            ]
          }
        }
      ]
    },
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '📸 創建貼圖教學', text: '功能說明' } },
        { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
        { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
        { type: 'action', action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' } }
      ]
    }
  };
}

module.exports = {
  generateWelcomeFlexMessage,
  generateStyleSelectionFlexMessage,
  generateExpressionSelectionFlexMessage,
  generateTutorialPart1FlexMessage,
  generateTutorialPart2FlexMessage,
  shouldShowTutorial,
  markTutorialShown
};

