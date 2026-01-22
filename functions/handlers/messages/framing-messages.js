/**
 * 生成人物大小選擇訊息
 */
async function generateFramingSelectionMessage(style, getActiveFramingTemplates) {
  const framingTemplates = await getActiveFramingTemplates();
  const framingOptions = Object.values(framingTemplates);

  return {
    type: 'flex',
    altText: '🧍 請選擇人物大小',
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
          { type: 'text', text: '🧍 選擇人物大小', size: 'xl', weight: 'bold', color: '#FFFFFF', align: 'center', margin: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'md',
        contents: [
          { type: 'text', text: '不同構圖會大幅改變貼圖的感覺！', size: 'sm', color: '#666666', align: 'center', margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          ...framingOptions.map((framing) => ({
            type: 'box',
            layout: 'horizontal',
            paddingAll: 'md',
            backgroundColor: '#F8F8F8',
            cornerRadius: 'lg',
            margin: 'md',
            action: { type: 'message', label: framing.name, text: `人物大小:${framing.id}` },
            contents: [
              { type: 'text', text: framing.emoji, size: 'xxl', flex: 0 },
              {
                type: 'box',
                layout: 'vertical',
                paddingStart: 'lg',
                contents: [
                  { type: 'text', text: framing.name, weight: 'bold', size: 'md', color: '#333333' },
                  { type: 'text', text: framing.description, size: 'xs', color: '#888888', wrap: true },
                ],
              },
            ],
          })),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            action: { type: 'message', label: '❌ 取消', text: '取消' },
          },
        ],
      },
    },
    quickReply: {
      items: [
        ...framingOptions.map((framing) => ({
          type: 'action',
          action: { type: 'message', label: `${framing.emoji} ${framing.name}`, text: `人物大小:${framing.id}` },
        })),
        { type: 'action', action: { type: 'message', label: '❌ 取消', text: '取消' } },
      ],
    },
  };
}

module.exports = {
  generateFramingSelectionMessage,
};
