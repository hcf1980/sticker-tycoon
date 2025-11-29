/**
 * Rich Menu 圖片生成器 - 貼圖大亨
 * 尺寸：2500 x 843 px
 * 布局：1x3 網格（創建貼圖 / 我的貼圖 / 示範圖集）
 *
 * 布局設計：
 * - 上方 70%：圖示/圖片區（可自訂）
 * - 下方 30%：文字標籤區（固定）
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

// 文字區域高度（底部 30%）
const TEXT_AREA_HEIGHT = Math.floor(HEIGHT * 0.30);
const ICON_AREA_HEIGHT = HEIGHT - TEXT_AREA_HEIGHT;

// 顏色配置
const COLORS = {
  background: '#FFFFFF',
  textAreaBg: '#F8F9FA',
  border: '#E8E8E8',
  text: '#333333',
  textSecondary: '#888888'
};

// 功能配置
const MENU_ITEMS = [
  {
    col: 0,
    icon: '🎨',
    title: '創建貼圖',
    color: '#FF6B6B',
    bgColor: '#FFF0F0'
  },
  {
    col: 1,
    icon: '📁',
    title: '我的貼圖',
    color: '#4CAF50',
    bgColor: '#F0FFF0'
  },
  {
    col: 2,
    icon: '✨',
    title: '示範圖集',
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

    // === 上方圖示區（70%）===
    ctx.fillStyle = item.bgColor;
    ctx.fillRect(x + 5, 5, CELL_WIDTH - 10, ICON_AREA_HEIGHT - 10);

    // 繪製大圖標（置中於上方區域）
    ctx.font = 'bold 280px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.color;
    ctx.fillText(item.icon, x + CELL_WIDTH / 2, ICON_AREA_HEIGHT / 2);

    // === 下方文字區（30%）===
    // 文字背景（深色底）
    ctx.fillStyle = item.color;
    ctx.fillRect(x + 5, ICON_AREA_HEIGHT, CELL_WIDTH - 10, TEXT_AREA_HEIGHT - 5);

    // 繪製標題（白色文字）
    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(item.title, x + CELL_WIDTH / 2, ICON_AREA_HEIGHT + TEXT_AREA_HEIGHT / 2);

    // 繪製分隔線
    ctx.strokeStyle = '#FFFFFF33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + CELL_WIDTH - 5, ICON_AREA_HEIGHT + 20);
    ctx.lineTo(x + CELL_WIDTH - 5, HEIGHT - 20);
    ctx.stroke();
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
  console.log(`📐 布局：上方 ${ICON_AREA_HEIGHT}px 圖示區 / 下方 ${TEXT_AREA_HEIGHT}px 文字區`);

  return buffer;
}

// 如果直接執行此腳本
if (require.main === module) {
  generateRichMenuImage();
}

module.exports = { generateRichMenuImage };

