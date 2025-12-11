#!/bin/bash

# 貼圖大亨 Logo 設置檢查腳本
# 檢查所有必需的圖標文件是否存在

echo "🎨 貼圖大亨 Logo 設置檢查"
echo "================================"
echo ""

PUBLIC_DIR="public"
MISSING_FILES=()
EXISTING_FILES=()

# 檢查的文件列表
FILES=(
  "favicon.ico"
  "logo-192.png"
  "logo-512.png"
  "apple-touch-icon.png"
  "manifest.json"
)

echo "📋 檢查必需的圖標文件..."
echo ""

for file in "${FILES[@]}"; do
  filepath="$PUBLIC_DIR/$file"
  if [ -f "$filepath" ]; then
    size=$(du -h "$filepath" | cut -f1)
    echo "✅ $file (大小: $size)"
    EXISTING_FILES+=("$file")
  else
    echo "❌ $file (缺失)"
    MISSING_FILES+=("$file")
  fi
done

echo ""
echo "================================"
echo ""

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
  echo "🎉 太棒了！所有圖標文件都已設置完成！"
  echo ""
  echo "✅ 已完成: ${#EXISTING_FILES[@]}/${#FILES[@]} 個文件"
  echo ""
  echo "📱 下一步："
  echo "1. 啟動開發服務器測試"
  echo "2. 檢查瀏覽器標籤頁圖標"
  echo "3. 檢查首頁 header 和 footer 的 logo 顯示"
  echo "4. 在手機上測試 PWA 功能"
else
  echo "⚠️  還有 ${#MISSING_FILES[@]} 個文件需要設置"
  echo ""
  echo "缺失的文件："
  for file in "${MISSING_FILES[@]}"; do
    echo "  - $file"
  done
  echo ""
  echo "📖 請參考 public/LOGO_SETUP_GUIDE.md 了解如何創建這些文件"
  echo ""
  echo "💡 快速方法："
  echo "1. 訪問 https://realfavicongenerator.net/"
  echo "2. 上傳您的 STICKER TYCOON 圖標"
  echo "3. 下載生成的文件並放置到 public/ 目錄"
fi

echo ""
echo "================================"
echo ""

# 檢查 HTML 文件是否已更新
echo "📄 檢查 HTML 文件配置..."
echo ""

HTML_FILES=(
  "public/index.html"
  "public/demo-gallery.html"
  "public/token-guide.html"
  "public/youtuber-promotion.html"
)

UPDATED_COUNT=0

for htmlfile in "${HTML_FILES[@]}"; do
  if [ -f "$htmlfile" ]; then
    if grep -q "favicon.ico" "$htmlfile" && grep -q "logo-192.png" "$htmlfile"; then
      echo "✅ $(basename $htmlfile) - 已配置圖標引用"
      ((UPDATED_COUNT++))
    else
      echo "⚠️  $(basename $htmlfile) - 可能需要更新"
    fi
  fi
done

echo ""
echo "已配置: $UPDATED_COUNT/${#HTML_FILES[@]} 個主要頁面"
echo ""

# 顯示圖標尺寸建議
echo "================================"
echo ""
echo "📐 圖標尺寸要求："
echo ""
echo "  favicon.ico       - 16x16, 32x32, 48x48 (多尺寸)"
echo "  logo-192.png      - 192x192 像素"
echo "  logo-512.png      - 512x512 像素"
echo "  apple-touch-icon  - 180x180 像素"
echo ""
echo "================================"

