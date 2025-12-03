/**
 * 圖片質量診斷工具
 * 用於檢測生成的圖片是否有變形、損壞等問題
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * 分析圖片的像素分佈，檢測是否有異常
 */
async function analyzeImageQuality(imagePath) {
  console.log(`\n🔍 分析圖片: ${imagePath}`);
  
  try {
    // 讀取圖片元數據
    const metadata = await sharp(imagePath).metadata();
    console.log(`📐 尺寸: ${metadata.width}×${metadata.height}`);
    console.log(`📊 格式: ${metadata.format}`);
    console.log(`🎨 色彩空間: ${metadata.space}`);
    console.log(`📦 通道數: ${metadata.channels}`);
    
    // 獲取圖片像素數據
    const { data, info } = await sharp(imagePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { width, height, channels } = info;
    const pixels = new Uint8Array(data);
    
    // 分析像素統計
    let stats = {
      totalPixels: width * height,
      opaquePixels: 0,
      transparentPixels: 0,
      colorVariance: new Map(),
      edgePixels: 0,
      uniformAreas: 0
    };
    
    // 統計不透明像素
    for (let i = 0; i < pixels.length; i += channels) {
      const alpha = pixels[i + 3];
      if (alpha > 128) {
        stats.opaquePixels++;
      } else {
        stats.transparentPixels++;
      }
    }
    
    // 檢測顏色變化（用於檢測變形）
    let maxColorDiff = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * channels;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        
        // 與相鄰像素比較
        const idxRight = (y * width + (x + 1)) * channels;
        const rRight = pixels[idxRight];
        const gRight = pixels[idxRight + 1];
        const bRight = pixels[idxRight + 2];
        
        const diff = Math.abs(r - rRight) + Math.abs(g - gRight) + Math.abs(b - bRight);
        if (diff > maxColorDiff) {
          maxColorDiff = diff;
        }
      }
    }
    
    console.log(`\n📊 像素統計:`);
    console.log(`  ✓ 不透明像素: ${stats.opaquePixels} (${(stats.opaquePixels / stats.totalPixels * 100).toFixed(1)}%)`);
    console.log(`  ✓ 透明像素: ${stats.transparentPixels} (${(stats.transparentPixels / stats.totalPixels * 100).toFixed(1)}%)`);
    console.log(`  ✓ 最大顏色差異: ${maxColorDiff}`);
    
    // 檢測異常
    const issues = [];
    
    if (stats.opaquePixels < stats.totalPixels * 0.05) {
      issues.push(`⚠️ 內容過少 (只有 ${(stats.opaquePixels / stats.totalPixels * 100).toFixed(1)}% 不透明)`);
    }
    
    if (maxColorDiff > 200) {
      issues.push(`⚠️ 顏色變化劇烈 (最大差異: ${maxColorDiff})，可能有變形`);
    }
    
    if (maxColorDiff < 10) {
      issues.push(`⚠️ 顏色變化太小，可能是單色或損壞`);
    }
    
    if (issues.length > 0) {
      console.log(`\n❌ 檢測到問題:`);
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log(`\n✅ 圖片質量正常`);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      stats
    };
    
  } catch (error) {
    console.error(`❌ 分析失敗: ${error.message}`);
    return {
      valid: false,
      issues: [error.message],
      stats: null
    };
  }
}

/**
 * 比較兩張圖片的相似度
 */
async function compareImages(imagePath1, imagePath2) {
  console.log(`\n🔄 比較圖片:`);
  console.log(`  圖片 1: ${imagePath1}`);
  console.log(`  圖片 2: ${imagePath2}`);
  
  try {
    const meta1 = await sharp(imagePath1).metadata();
    const meta2 = await sharp(imagePath2).metadata();
    
    console.log(`  尺寸 1: ${meta1.width}×${meta1.height}`);
    console.log(`  尺寸 2: ${meta2.width}×${meta2.height}`);
    
    if (meta1.width !== meta2.width || meta1.height !== meta2.height) {
      console.log(`  ⚠️ 尺寸不同`);
    }
    
  } catch (error) {
    console.error(`❌ 比較失敗: ${error.message}`);
  }
}

// 主函數
async function main() {
  console.log(`🔍 圖片質量診斷工具\n`);
  
  // 檢查命令行參數
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`使用方法:`);
    console.log(`  node diagnose-image-quality.js <image-path>`);
    console.log(`  node diagnose-image-quality.js <image1> <image2>`);
    process.exit(1);
  }
  
  if (args.length === 1) {
    await analyzeImageQuality(args[0]);
  } else if (args.length >= 2) {
    await analyzeImageQuality(args[0]);
    await analyzeImageQuality(args[1]);
    await compareImages(args[0], args[1]);
  }
}

main().catch(console.error);

