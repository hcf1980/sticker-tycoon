/*
 * normalize-tutorial-images.js
 * 將教學圖片自動補成 1080x1920（9:16），避免 LINE Flex `fit` 造成過多留白。
 * - 不裁切內容（contain）
 * - 背景白色
 * - 額外加入輕微陰影，讓截圖看起來更像卡片（可關閉）
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

const DEFAULT_OPTIONS = {
  background: { r: 255, g: 255, b: 255, alpha: 1 },
  addShadow: true,
  shadow: {
    blur: 18,
    opacity: 0.18,
    offsetX: 0,
    offsetY: 10,
  },
  borderRadius: 24,
  padding: 40,
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildShadowSvg({ width, height, blur, opacity, offsetX, offsetY, borderRadius }) {
  // SVG filter drop shadow; alpha controlled by opacity.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="${offsetX}" dy="${offsetY}" stdDeviation="${blur}" flood-color="rgba(0,0,0,${opacity})" />
    </filter>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="white" filter="url(#ds)"/>
</svg>`;
}

async function normalizeOne(inputPath, outputPath, options = DEFAULT_OPTIONS) {
  const image = sharp(inputPath);
  const meta = await image.metadata();

  // 先把原圖縮放到能放進 1080x1920 的區域（預留 padding）
  const innerWidth = TARGET_WIDTH - options.padding * 2;
  const innerHeight = TARGET_HEIGHT - options.padding * 2;

  const resized = await image
    .resize(innerWidth, innerHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  // 把 resized 放在白底畫布中央
  let composed = sharp({
    create: {
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      channels: 4,
      background: options.background,
    },
  });

  // 可選：讓截圖本身有圓角（更像卡片）
  const resizedMeta = await sharp(resized).metadata();

  const rounded = await sharp(resized)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${resizedMeta.width}" height="${resizedMeta.height}"><rect x="0" y="0" width="100%" height="100%" rx="${options.borderRadius}" ry="${options.borderRadius}"/></svg>`
        ),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  const overlays = [];

  if (options.addShadow) {
    // 先放一個陰影底板（跟圖片同大小），讓畫面更立體
    const shadowSvg = buildShadowSvg({
      width: meta.width || innerWidth,
      height: meta.height || innerHeight,
      blur: options.shadow.blur,
      opacity: options.shadow.opacity,
      offsetX: options.shadow.offsetX,
      offsetY: options.shadow.offsetY,
      borderRadius: options.borderRadius,
    });

    // 用 resized 的實際尺寸來做陰影更準
    const shadowSvgFixed = buildShadowSvg({
      width: resizedMeta.width || innerWidth,
      height: resizedMeta.height || innerHeight,
      blur: options.shadow.blur,
      opacity: options.shadow.opacity,
      offsetX: options.shadow.offsetX,
      offsetY: options.shadow.offsetY,
      borderRadius: options.borderRadius,
    });

    overlays.push({
      input: Buffer.from(shadowSvgFixed),
      top: Math.round((TARGET_HEIGHT - (resizedMeta.height || innerHeight)) / 2),
      left: Math.round((TARGET_WIDTH - (resizedMeta.width || innerWidth)) / 2),
    });
  }

  // 再把圓角圖片疊上
  const roundedMeta = await sharp(rounded).metadata();
  overlays.push({
    input: rounded,
    top: Math.round((TARGET_HEIGHT - (roundedMeta.height || innerHeight)) / 2),
    left: Math.round((TARGET_WIDTH - (roundedMeta.width || innerWidth)) / 2),
  });

  composed = composed.composite(overlays).png({ compressionLevel: 9, adaptiveFiltering: true });

  ensureDir(path.dirname(outputPath));
  await composed.toFile(outputPath);

  return { inputPath, outputPath };
}

async function run() {
  const inputDir = process.argv[2] || 'public/images/demo';
  const outputDir = process.argv[3] || 'public/images/demo-9x16';

  if (!fs.existsSync(inputDir)) {
    console.error(`Input dir not found: ${inputDir}`);
    process.exit(1);
  }

  ensureDir(outputDir);

  const files = fs
    .readdirSync(inputDir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort();

  console.log(`Found ${files.length} png files in ${inputDir}`);
  console.log(`Output => ${outputDir} (${TARGET_WIDTH}x${TARGET_HEIGHT})`);

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);

    const before = await sharp(inputPath).metadata();
    await normalizeOne(inputPath, outputPath);
    const after = await sharp(outputPath).metadata();

    console.log(`${file}: ${before.width}x${before.height} -> ${after.width}x${after.height}`);
  }

  console.log('✅ Done');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
