#!/bin/bash

# 測試 Rich Menu API 端點
# 用於驗證 API 是否正常工作

echo "🧪 測試 Rich Menu API"
echo "================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試 1: 檢查 Rich Menu Info API
echo "📋 測試 1: 取得 Rich Menu 資訊"
echo "--------------------------------"

RESPONSE=$(curl -s http://localhost:8888/api/admin/rich-menu-info)
echo "響應: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Rich Menu Info API 正常${NC}"
else
  echo -e "${RED}❌ Rich Menu Info API 異常${NC}"
fi

echo ""
echo "================================"
echo ""
echo "💡 提示："
echo "1. 確保開發服務器正在運行 (netlify dev)"
echo "2. 確保環境變數已正確設置"
echo "3. 查看瀏覽器控制台的詳細錯誤訊息"
echo ""
echo "🔍 調試步驟："
echo "1. 打開瀏覽器開發者工具 (F12)"
echo "2. 切換到 Console 標籤"
echo "3. 切換到 Network 標籤"
echo "4. 嘗試更新 Rich Menu"
echo "5. 查看請求和響應的詳細內容"
echo ""

