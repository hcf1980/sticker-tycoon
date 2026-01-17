#!/bin/bash
# 張數制度改革 - 快速部署腳本
# 
# 用途：自動化部署流程
# 使用：./deploy-token-reform.sh

set -e  # 遇到錯誤立即停止

echo "🚀 張數制度改革 - 自動部署"
echo "================================"
echo ""

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: 檢查檔案
echo "📋 Step 1: 檢查必要檔案..."
if [ ! -f "migrations/token_reform_2025.sql" ]; then
  echo -e "${RED}❌ 找不到 migrations/token_reform_2025.sql${NC}"
  exit 1
fi
echo -e "${GREEN}✅ SQL 遷移檔案存在${NC}"

# Step 2: 提示執行資料庫遷移
echo ""
echo "📊 Step 2: 執行資料庫遷移"
echo "================================"
echo -e "${YELLOW}⚠️  請手動執行以下步驟：${NC}"
echo ""
echo "1. 開啟 Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/kqucbzvjukhxycvgosbo/sql"
echo ""
echo "2. 複製以下檔案內容並執行:"
echo "   migrations/token_reform_2025.sql"
echo ""
echo "3. 確認執行成功（無錯誤訊息）"
echo ""
read -p "已完成資料庫遷移？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}❌ 請先完成資料庫遷移${NC}"
  exit 1
fi

# Step 3: Git 提交
echo ""
echo "📝 Step 3: 提交程式碼變更..."
git add .
git status

echo ""
read -p "確認要提交這些變更？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⏸️  部署已取消${NC}"
  exit 0
fi

git commit -m "🎯 張數制度改革：統一改為「張數」，方案加倍（140張/260張）

- 更新資料庫註解（張數 → 張數）
- 更新方案配置：基礎包 140張，超值包 260張
- 更新所有相關文案
- 計價邏輯：1 張貼圖 = 1 張
- 安全部署：僅更新註解，不修改現有數據"

echo -e "${GREEN}✅ 已提交變更${NC}"

# Step 4: 推送到遠端
echo ""
echo "🚀 Step 4: 推送到遠端..."
git push origin main
echo -e "${GREEN}✅ 已推送到 GitHub${NC}"

# Step 5: 等待 Netlify 部署
echo ""
echo "⏳ Step 5: 等待 Netlify 自動部署..."
echo "請開啟 Netlify Dashboard 檢查部署狀態："
echo "https://app.netlify.com/sites/sticker-tycoon/deploys"
echo ""
echo -e "${YELLOW}部署通常需要 2-3 分鐘${NC}"
echo ""

# Step 6: 測試提醒
echo "✅ 部署完成後，請進行以下測試："
echo "================================"
echo "1. LINE Bot 測試："
echo "   - 發送「購買」→ 確認顯示 140張/260張"
echo "   - 發送「張數」→ 確認餘額正確"
echo ""
echo "2. 生成測試："
echo "   - 生成 6 張貼圖 → 扣除 6 張"
echo "   - 生成 12 張貼圖 → 扣除 12 張"
echo ""
echo "3. 資料庫驗證："
echo "   - 執行 SQL 驗證查詢（見 token_reform_2025.sql 末尾）"
echo ""
echo -e "${GREEN}🎉 自動部署流程完成！${NC}"

