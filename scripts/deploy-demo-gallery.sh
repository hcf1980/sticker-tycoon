#!/bin/bash

# 示範圖集功能 - 快速部署腳本

echo "🚀 開始部署示範圖集功能..."
echo ""

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
  echo "❌ 錯誤: 請在項目根目錄執行此腳本"
  exit 1
fi

echo "📋 部署檢查清單:"
echo ""

# 1. 檢查文件
echo "1️⃣ 檢查必要文件..."
files=(
  "public/admin/demo-gallery.html"
  "public/demo-gallery.html"
  "public/test-demo-gallery.html"
  "functions/demo-gallery.js"
  "functions/admin-stickers.js"
  "supabase/migrations/20240115_demo_gallery.sql"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file 不存在"
    all_exist=false
  fi
done

if [ "$all_exist" = false ]; then
  echo ""
  echo "❌ 有文件缺失，請先創建所有必要文件"
  exit 1
fi

echo ""
echo "2️⃣ Git 狀態檢查..."
git status --short

echo ""
read -p "是否要提交並推送這些變更？(y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "3️⃣ 提交變更..."
  git add .
  git commit -m "feat: Add demo gallery management feature

- Add admin panel for demo gallery management
- Add public demo gallery display page
- Add API endpoints for gallery CRUD
- Add LINE Bot integration
- Add database migration for demo_gallery table
- Add test page and documentation"
  
  echo ""
  echo "4️⃣ 推送到遠端..."
  git push origin main
  
  echo ""
  echo "✅ 代碼已推送到 GitHub"
  echo ""
  echo "⏳ Netlify 將自動部署..."
  echo ""
  echo "📝 接下來的步驟："
  echo "1. 前往 Supabase Dashboard"
  echo "2. 執行 SQL 遷移腳本:"
  echo "   supabase/migrations/20240115_demo_gallery.sql"
  echo "3. 訪問測試頁面:"
  echo "   https://your-site.netlify.app/test-demo-gallery.html"
  echo "4. 測試所有功能（參考 docs/DEPLOYMENT_DEMO_GALLERY.md）"
  echo ""
  echo "🎉 部署腳本執行完成！"
else
  echo ""
  echo "❌ 已取消部署"
  echo ""
  echo "💡 提示: 可以手動執行以下命令部署："
  echo "   git add ."
  echo "   git commit -m 'feat: Add demo gallery feature'"
  echo "   git push origin main"
fi

echo ""

