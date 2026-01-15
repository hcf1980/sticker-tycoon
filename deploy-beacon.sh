#!/bin/bash

# LINE Beacon 管理系統 - 部署腳本
# 此腳本會檢查所有必要檔案並提交到 GitHub

echo "🚀 LINE Beacon 管理系統 - 部署檢查"
echo "========================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查函數
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $1"
        return 0
    else
        echo -e "${RED}❌${NC} $1 (缺少)"
        return 1
    fi
}

# 計數器
total=0
passed=0

echo "📁 檢查資料庫檔案..."
echo "---"
check_file "database/beacon_schema.sql" && ((passed++))
((total++))
check_file "database/beacon_test_data.sql" && ((passed++))
((total++))
echo ""

echo "⚙️ 檢查後端檔案..."
echo "---"
check_file "functions/beacon-handler.js" && ((passed++))
((total++))
check_file "functions/line-webhook.js" && ((passed++))
((total++))
echo ""

echo "🎨 檢查前端檔案..."
echo "---"
check_file "public/admin/beacon-manager.html" && ((passed++))
((total++))
check_file "public/admin/beacon-manager.js" && ((passed++))
((total++))
check_file "public/admin/index.html" && ((passed++))
((total++))
echo ""

echo "📖 檢查文件檔案..."
echo "---"
check_file "docs/BEACON_README.md" && ((passed++))
((total++))
check_file "docs/BEACON_QUICKSTART.md" && ((passed++))
((total++))
check_file "docs/BEACON_SETUP.md" && ((passed++))
((total++))
check_file "docs/BEACON_TESTING.md" && ((passed++))
((total++))
check_file "docs/BEACON_DEPLOYMENT_CHECKLIST.md" && ((passed++))
((total++))
check_file "docs/BEACON_DEPLOYMENT_MONITORING.md" && ((passed++))
((total++))
check_file "docs/BEACON_FINAL_GUIDE.md" && ((passed++))
((total++))
check_file "docs/BEACON_SUMMARY.md" && ((passed++))
((total++))
check_file "docs/BEACON_INDEX.md" && ((passed++))
((total++))
check_file "docs/BEACON_COMPLETION_REPORT.md" && ((passed++))
((total++))
check_file "BEACON_README.md" && ((passed++))
((total++))
echo ""

echo "========================================"
echo -e "檢查結果: ${GREEN}${passed}${NC}/${total} 通過"
echo ""

if [ $passed -eq $total ]; then
    echo -e "${GREEN}✅ 所有檔案都已就緒！${NC}"
    echo ""
    echo "📤 準備提交到 GitHub..."
    echo ""
    
    # 顯示 Git 狀態
    echo "📊 Git 狀態："
    git status --short
    echo ""
    
    # 詢問是否繼續
    read -p "是否要提交並推送到 GitHub? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🔄 正在提交..."
        git add .
        git commit -m "Add LINE Beacon management system

✨ 新功能：
- Beacon 設備管理
- 觸發動作設定
- 事件記錄與統計
- 管理後台介面

📁 新增檔案：
- database/beacon_schema.sql
- database/beacon_test_data.sql
- functions/beacon-handler.js
- public/admin/beacon-manager.html
- public/admin/beacon-manager.js
- 完整文件系統 (10 個文件)

📚 文件：
- 快速開始指南
- 完整設定說明
- 測試指南
- 部署檢查清單
- 監控指南"
        
        echo ""
        echo "📤 正在推送到 GitHub..."
        git push origin main
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}🎉 部署成功！${NC}"
            echo ""
            echo "下一步："
            echo "1. 等待 Netlify 自動部署 (約 1-2 分鐘)"
            echo "2. 在 Supabase 執行 database/beacon_schema.sql"
            echo "3. 在 Supabase 執行 database/beacon_test_data.sql"
            echo "4. 訪問管理後台驗證部署"
            echo ""
            echo "📖 詳細步驟請參考："
            echo "   docs/BEACON_QUICKSTART.md"
            echo "   docs/BEACON_FINAL_GUIDE.md"
        else
            echo ""
            echo -e "${RED}❌ 推送失敗！${NC}"
            echo "請檢查 Git 設定和網路連線"
        fi
    else
        echo ""
        echo "⏸️ 已取消部署"
        echo "你可以稍後手動執行："
        echo "  git add ."
        echo "  git commit -m \"Add LINE Beacon management system\""
        echo "  git push origin main"
    fi
else
    echo -e "${RED}❌ 有檔案缺少，請檢查！${NC}"
    echo ""
    echo "請確保所有必要檔案都已建立"
    exit 1
fi

echo ""
echo "========================================"
echo "🎊 感謝使用 LINE Beacon 管理系統！"
echo "========================================"

