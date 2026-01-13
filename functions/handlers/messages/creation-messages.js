const { LineStickerSpecs } = require('../../sticker-styles');

/**
 * 生成數量選擇訊息
 * 生成幾張就扣幾張
 */
function generateCountSelectionMessage(_expressions) {
  const validCounts = LineStickerSpecs.validCounts; // [6, 12, 18]

  // Quick Reply 項目（包含張數消耗說明）
  const quickReplyItems = validCounts.map(count => {
    return {
      type: 'action',
      action: {
        type: 'message',
        label: `${count}張 (${count}張)`,
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
            text: '🎨 生成幾張就扣幾張！',
            size: 'sm',
            color: '#FF6B6B',
            margin: 'xs',
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
                    text: '6 張',
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
                    text: '12 張',
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
                    text: '18 張',
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

module.exports = {
  generateCountSelectionMessage,
};
