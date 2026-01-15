#!/bin/bash

# LINE Beacon 管理系統 - 強制推送腳本
# ⚠️ 此腳本會使用 --force 推送，請謹慎使用

echo "⚠️  LINE Beacon 管理系統 - 強制推送"
echo "========================================"
echo ""
echo "⚠️  警告：此操作會使用 git push --force"
echo "⚠️  這將覆蓋遠端倉庫的歷史記錄"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 顯示當前狀態
echo "📊 當前 Git 狀態："
echo "---"
git status --short
echo ""

echo "📋 將要提交的變更："
echo "---"
git diff --stat
echo ""

# 詢問確認
echo -e "${RED}⚠️  你確定要強制推送嗎？${NC}"
echo ""
echo "這將會："
echo "  1. 添加所有變更"
echo "  2. 提交變更"
echo "  3. 強制推送到 GitHub (覆蓋遠端歷史)"
echo ""
read -p "輸入 YES 繼續，或按 Enter 取消: " confirm

if [ "$confirm" != "YES" ]; then
    echo ""
    echo "⏸️  已取消操作"
    exit 0
fi

echo ""
echo "🔄 開始處理..."
echo ""

# 1. 添加所有變更
echo "📝 添加所有變更..."
git add .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 添加變更失敗${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 變更已添加${NC}"
echo ""

# 2. 提交變更
echo "💾 提交變更..."
git commit -m "Add LINE Beacon management system

✨ 新功能：完整的 LINE Beacon 管理系統
- Beacon 設備管理
- 觸發動作設定
- 事件記錄與統計
- 管理後台介面

📁 新增檔案：
- database/beacon_schema.sql - 資料庫結構
- database/beacon_test_data.sql - 測試資料
- functions/beacon-handler.js - Beacon 事件處理器
- public/admin/beacon-manager.html - 管理頁面
- public/admin/beacon-manager.js - 管理邏輯

📚 完整文件系統：
- BEACON_README.md - 快速參考
- BEACON_完成總結.md - 完成總結
- docs/BEACON_*.md - 11 個詳細文件
- deploy-beacon.sh - 自動化部署腳本

🎯 核心功能：
- 設備管理（新增/編輯/啟用/停用）
- 動作設定（進入/離開事件）
- 事件記錄（完整追蹤）
- 統計分析（每日數據）
- 優先級機制
- 雙層啟用控制

📊 監控功能：
- Netlify Functions 日誌
- 管理後台即時顯示
- Supabase 資料庫查詢

🧪 測試支援：
- LINE Beacon Simulator
- Minew E2 實體設備
- 完整測試指南

📖 文件完整度：100%
- 快速開始指南
- 完整設定說明
- 測試指南
- 部署檢查清單
- 監控指南
- 故障排除

⚠️ 重要提醒：
用戶必須先加入 LINE Bot 好友才能收到 Beacon 訊息
這是 LINE Platform 的安全機制

🚀 立即開始：
1. 在 Supabase 執行 database/*.sql
2. 訪問 /admin/beacon-manager.html
3. 使用 LINE Beacon Simulator 測試
4. 查看文件：docs/BEACON_QUICKSTART.md"

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  沒有變更需要提交（或提交失敗）${NC}"
    echo ""
    read -p "是否繼續強制推送？(y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "⏸️  已取消操作"
        exit 0
    fi
else
    echo -e "${GREEN}✅ 變更已提交${NC}"
fi

echo ""

# 3. 強制推送
echo -e "${RED}🚀 強制推送到 GitHub...${NC}"
echo ""

git push --force origin main

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                        ║${NC}"
    echo -e "${GREEN}║     🎉 強制推送成功！                  ║${NC}"
    echo -e "${GREEN}║                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "✅ 已完成的步驟："
    echo "  1. ✅ 所有變更已添加"
    echo "  2. ✅ 變更已提交到本地"
    echo "  3. ✅ 已強制推送到 GitHub"
    echo ""
    echo "🔄 下一步（需要手動操作）："
    echo ""
    echo "  1️⃣  等待 Netlify 自動部署（約 1-2 分鐘）"
    echo "      → 訪問：https://app.netlify.com"
    echo "      → 確認部署狀態為 'Published'"
    echo ""
    echo "  2️⃣  在 Supabase 建立資料表"
    echo "      → 訪問：https://supabase.com/dashboard"
    echo "      → SQL Editor"
    echo "      → 執行 database/beacon_schema.sql"
    echo "      → 執行 database/beacon_test_data.sql"
    echo ""
    echo "  3️⃣  驗證部署"
    echo "      → 訪問：https://your-domain.netlify.app/admin/login.html"
    echo "      → 點擊「LINE Beacon 管理」"
    echo "      → 應該看到測試設備"
    echo ""
    echo "  4️⃣  測試功能"
    echo "      → 下載 LINE Beacon Simulator"
    echo "      → HWID: 0000000019"
    echo "      → 點擊 Enter 測試"
    echo ""
    echo "📖 詳細步驟請參考："
    echo "   → BEACON_完成總結.md"
    echo "   → docs/BEACON_QUICKSTART.md"
    echo "   → docs/BEACON_FINAL_GUIDE.md"
    echo ""
    echo "⚠️  重要提醒："
    echo "   → 用戶必須先加入 LINE Bot 好友"
    echo "   → 才能收到 Beacon 觸發訊息"
    echo "   → 在 Beacon 附近放置 QR Code 引導加入"
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                        ║${NC}"
    echo -e "${RED}║     ❌ 強制推送失敗！                  ║${NC}"
    echo -e "${RED}║                                        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "可能的原因："
    echo "  1. 網路連線問題"
    echo "  2. GitHub 認證問題"
    echo "  3. 沒有遠端倉庫權限"
    echo ""
    echo "請檢查："
    echo "  • 網路連線"
    echo "  • Git 認證設定"
    echo "  • 倉庫權限"
    echo ""
    echo "手動推送命令："
    echo "  git push --force origin main"
    exit 1
fi

echo "========================================"
echo -e "${GREEN}🎊 感謝使用 LINE Beacon 管理系統！${NC}"
echo "========================================"

