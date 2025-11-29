/**
 * Sticker Flex Message Module
 * 建立各種貼圖相關的 Flex Message
 */

const { StickerStyles, DefaultExpressions, LineStickerSpecs } = require('./sticker-styles');

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
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'message',
              label: '📁 我的貼圖組',
              text: '我的貼圖'
            }
          }
        ],
        flex: 0
      }
    }
  };
}

/**
 * 風格選擇 Flex Message
 */
function generateStyleSelectionFlexMessage() {
  const styles = Object.values(StickerStyles);

  const styleButtons = styles.map(style => ({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    action: {
      type: 'message',
      label: `${style.emoji} ${style.name}`,
      text: `風格:${style.id}`
    },
    margin: 'sm'
  }));

  // Quick Reply 項目
  const quickReplyItems = styles.map(style => ({
    type: 'action',
    action: {
      type: 'message',
      label: `${style.emoji} ${style.name}`,
      text: `風格:${style.id}`
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
 * 表情選擇 Flex Message
 */
function generateExpressionSelectionFlexMessage() {
  const templates = Object.values(DefaultExpressions);

  const templateButtons = templates.map(template => ({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    action: {
      type: 'message',
      label: template.name,
      text: `表情模板:${template.id}`
    },
    margin: 'sm'
  }));

  // Quick Reply 項目
  const quickReplyItems = templates.map(template => ({
    type: 'action',
    action: {
      type: 'message',
      label: template.name,
      text: `表情模板:${template.id}`
    }
  }));
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '✏️ 自訂表情', text: '自訂表情' }
  });
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
          { type: 'text', text: '選擇預設模板或自訂表情', size: 'sm', color: '#666666', margin: 'md' },
          { type: 'separator', margin: 'lg' },
          { type: 'box', layout: 'vertical', margin: 'lg', contents: templateButtons },
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: { type: 'message', label: '✏️ 自訂表情', text: '自訂表情' },
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

module.exports = {
  generateWelcomeFlexMessage,
  generateStyleSelectionFlexMessage,
  generateExpressionSelectionFlexMessage
};

