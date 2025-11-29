/**
 * Rich Menu 圖片生成器 - 貼圖大亨
 * 尺寸：2500 x 843 px
 * 布局：1x3 網格（創建貼圖 / 我的貼圖 / 示範圖集）
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Rich Menu 尺寸
const WIDTH = 2500;
const HEIGHT = 843;
const COLS = 3;
const CELL_WIDTH = WIDTH / COLS;
const CELL_HEIGHT = HEIGHT;

// 顏色配置
const COLORS = {
  background: '#FFFFFF',
  border: '#E8E8E8',
  text: '#333333',
  textSecondary: '#666666'
};

// 功能配置
const MENU_ITEMS = [
  {
    col: 0,
    icon: '🎨',
    title: '創建貼圖',
    subtitle: '上傳照片生成貼圖',
    color: '#FF6B6B',
    bgColor: '#FFF0F0'
  },
  {
    col: 1,
    icon: '📁',
    title: '我的貼圖',
    subtitle: '查看已生成貼圖',
    color: '#4CAF50',
    bgColor: '#F0FFF0'
  },
  {
    col: 2,
    icon: '✨',
    title: '示範圖集',
    subtitle: '查看精選作品',
    color: '#2196F3',
    bgColor: '#F0F8FF'
  }
];

/**
 * 生成 Rich Menu 圖片
 */
function generateRichMenuImage() {
  console.log('🎨 開始生成 Rich Menu 圖片...');

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // 填充白色背景
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 繪製每個格子
  MENU_ITEMS.forEach(item => {
    const x = item.col * CELL_WIDTH;
    const y = 0;

    // 繪製格子背景
    ctx.fillStyle = item.bgColor;
    ctx.fillRect(x + 10, y + 10, CELL_WIDTH - 20, CELL_HEIGHT - 20);

    // 繪製圓角效果（簡易版）
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 10, y + 10, CELL_WIDTH - 20, CELL_HEIGHT - 20);

    // 繪製圖標
    ctx.font = 'bold 200px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.color;
    ctx.fillText(item.icon, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 - 120);

    // 繪製標題
    ctx.font = 'bold 90px Arial';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(item.title, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 100);

    // 繪製副標題
    ctx.font = '50px Arial';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(item.subtitle, x + CELL_WIDTH / 2, y + CELL_HEIGHT / 2 + 200);
  });

  // 保存圖片
  const outputDir = path.join(__dirname, '../public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'rich-menu.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Rich Menu 圖片已生成：${outputPath}`);
  console.log(`📏 尺寸：${WIDTH} x ${HEIGHT} px`);
  console.log(`📦 檔案大小：${(buffer.length / 1024).toFixed(2)} KB`);

  return buffer;
}

// 如果直接執行此腳本
if (require.main === module) {
  generateRichMenuImage();
}

module.exports = { generateRichMenuImage };

