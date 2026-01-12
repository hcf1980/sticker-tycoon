const { StickerStyles } = require('../../sticker-styles');

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

  // 計算張數消耗（每 6 張 = 3 張）
  const stickerCount = data.count || 6;
  const tokenCost = Math.ceil(stickerCount / 6) * 3;

  return {
    type: 'flex',
    altText: '確認貼圖設定',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '✅ 確認貼圖設定', weight: 'bold', size: 'lg', color: '#FF6B6B' },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: `📛 名稱：${data.name}`, size: 'sm', margin: 'lg' },
          { type: 'text', text: `🎨 風格：${style.emoji} ${style.name}`, size: 'sm', margin: 'sm' },
          { type: 'text', text: sourceText, size: 'sm', margin: 'sm', wrap: true },
          { type: 'text', text: sceneText, size: 'sm', margin: 'sm', wrap: true },
          { type: 'text', text: `📊 數量：${stickerCount} 張`, size: 'sm', margin: 'sm' },
          { type: 'text', text: `💰 消耗：${tokenCost} 張`, size: 'sm', margin: 'sm', color: '#28A745', weight: 'bold' },
          { type: 'separator', margin: 'lg' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', action: { type: 'message', label: '✅ 開始生成', text: '確認生成' }, color: '#FF6B6B' },
          { type: 'button', style: 'secondary', action: { type: 'message', label: '❌ 取消', text: '取消' } },
        ],
      },
    },
  };
}

module.exports = {
  generateConfirmationMessage,
};

