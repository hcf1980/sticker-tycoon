#!/bin/bash

# 🗑️ 專案清理腳本
# 用途：刪除無效文件、重組文檔結構、優化專案

set -e  # 遇到錯誤立即停止

echo "🔧 開始專案清理與優化..."
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 確認是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 錯誤：請在專案根目錄執行此腳本${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  此腳本將刪除大量文件，請確認已備份！${NC}"
echo ""
read -p "是否繼續？(y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消清理"
    exit 0
fi

# 創建備份目錄
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ 創建備份目錄: $BACKUP_DIR${NC}"

# ============================================
# 階段 1: 刪除重複的綠色主題文檔
# ============================================
echo ""
echo "📁 階段 1: 清理綠色主題文檔..."

GREEN_THEME_FILES=(
    "GREEN_THEME_COMPLETION_SUMMARY.md"
    "GREEN_THEME_CONVERSION_REPORT.md"
    "GREEN_THEME_QUICK_START.md"
    "VISUAL_COMPARISON_REPORT.md"
    "VISUAL_PREVIEW_GUIDE.md"
    "README_GREEN_THEME.md"
)

for file in "${GREEN_THEME_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$BACKUP_DIR/"
        echo -e "  ${GREEN}✓${NC} 移除: $file"
    fi
done

# ============================================
# 階段 2: 刪除 Logo 相關重複文檔
# ============================================
echo ""
echo "📁 階段 2: 清理 Logo 文檔..."

LOGO_FILES=(
    "LOGO_CHANGES_VISUAL.md"
    "LOGO_FILES_CHECKLIST.md"
    "LOGO_UPDATE_SUMMARY.md"
    "QUICK_START_LOGO.md"
)

for file in "${LOGO_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$BACKUP_DIR/"
        echo -e "  ${GREEN}✓${NC} 移除: $file"
    fi
done

# ============================================
# 階段 3: 刪除舊的修復文檔
# ============================================
echo ""
echo "📁 階段 3: 清理修復文檔..."

FIX_FILES=(
    "ANALYSIS_STICKER_CONSISTENCY_ISSUE.md"
    "DOWNLOAD_TIMEOUT_FIX.md"
    "FIX_500_ERROR_GUIDE.md"
    "FIX_SUMMARY.md"
    "README_FIX.md"
    "RICH_MENU_FIX_SUMMARY.md"
    "SCENE_CONFIG_FIX_REPORT.md"
    "URGENT_FIX_500_ERROR.sql"
    "debug-check-task.sql"
    "問題修復完成通知.md"
)

for file in "${FIX_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$BACKUP_DIR/"
        echo -e "  ${GREEN}✓${NC} 移除: $file"
    fi
done

# ============================================
# 階段 4: 刪除測試相關重複文檔
# ============================================
echo ""
echo "📁 階段 4: 清理測試文檔..."

TEST_FILES=(
    "QUICK_TEST_GUIDE.md"
    "TEST_GENERATING_STATUS.md"
    "check_deployment.md"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$BACKUP_DIR/"
        echo -e "  ${GREEN}✓${NC} 移除: $file"
    fi
done

# ============================================
# 階段 5: 移動 SQL 文件到 database/ 目錄
# ============================================
echo ""
echo "📁 階段 5: 整理 SQL 文件..."

SQL_FILES=(
    "FIX_STICKER_CONSISTENCY.sql"
    "FIX_STICKER_CONSISTENCY_SIMPLE.sql"
    "supabase-schema.sql"
)

mkdir -p database/archive

for file in "${SQL_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "database/archive/"
        echo -e "  ${GREEN}✓${NC} 移動: $file → database/archive/"
    fi
done

# ============================================
# 階段 6: 清理其他臨時文件
# ============================================
echo ""
echo "📁 階段 6: 清理臨時文件..."

OTHER_FILES=(
    "MODIFICATIONS_SUMMARY.md"
    "FINAL_CHECKLIST.md"
    "update-framing-prompts.js"
)

for file in "${OTHER_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$BACKUP_DIR/"
        echo -e "  ${GREEN}✓${NC} 移除: $file"
    fi
done

# 移動 INTEGRATION_GUIDE.js (應該是 .md)
if [ -f "functions/INTEGRATION_GUIDE.js" ]; then
    mv "functions/INTEGRATION_GUIDE.js" "$BACKUP_DIR/"
    echo -e "  ${GREEN}✓${NC} 移除: functions/INTEGRATION_GUIDE.js"
fi

# ============================================
# 階段 7: 創建新的文檔結構
# ============================================
echo ""
echo "📁 階段 7: 創建新文檔結構..."

# 創建 docs 子目錄
mkdir -p docs/{setup,features,api,archive}
echo -e "  ${GREEN}✓${NC} 創建: docs/setup/"
echo -e "  ${GREEN}✓${NC} 創建: docs/features/"
echo -e "  ${GREEN}✓${NC} 創建: docs/api/"
echo -e "  ${GREEN}✓${NC} 創建: docs/archive/"

# 移動現有文檔到正確位置
if [ -f "DEPLOYMENT_GUIDE.md" ]; then
    mv "DEPLOYMENT_GUIDE.md" "docs/setup/"
    echo -e "  ${GREEN}✓${NC} 移動: DEPLOYMENT_GUIDE.md → docs/setup/"
fi

if [ -f "TROUBLESHOOTING.md" ]; then
    mv "TROUBLESHOOTING.md" "docs/setup/"
    echo -e "  ${GREEN}✓${NC} 移動: TROUBLESHOOTING.md → docs/setup/"
fi

if [ -f "PROMPT_OPTIMIZATION_GUIDE.md" ]; then
    mv "PROMPT_OPTIMIZATION_GUIDE.md" "docs/features/"
    echo -e "  ${GREEN}✓${NC} 移動: PROMPT_OPTIMIZATION_GUIDE.md → docs/features/"
fi

if [ -f "PROMPT_OPTIMIZATION_SUMMARY.md" ]; then
    mv "PROMPT_OPTIMIZATION_SUMMARY.md" "docs/features/"
    echo -e "  ${GREEN}✓${NC} 移動: PROMPT_OPTIMIZATION_SUMMARY.md → docs/features/"
fi

# 移動 docs/ 現有文檔（如果有重複）
if [ -d "docs" ]; then
    # AI 模型配置
    if [ -f "docs/AI_MODEL_CONFIG.md" ]; then
        mv "docs/AI_MODEL_CONFIG.md" "docs/api/"
    fi
    
    # LINE Pay 集成
    if [ -f "docs/LINE_PAY_INTEGRATION_GUIDE.md" ]; then
        mv "docs/LINE_PAY_INTEGRATION_GUIDE.md" "docs/api/"
    fi
    
    # Grid Generator
    if [ -f "docs/GRID_GENERATOR_GUIDE.md" ]; then
        mv "docs/GRID_GENERATOR_GUIDE.md" "docs/features/"
    fi
fi

# ============================================
# 階段 8: 統計與報告
# ============================================
echo ""
echo "📊 清理統計:"
echo ""

BACKUP_COUNT=$(find "$BACKUP_DIR" -type f | wc -l | tr -d ' ')
echo -e "  ${YELLOW}📦 已備份文件數: $BACKUP_COUNT${NC}"

DOCS_COUNT=$(find docs -type f -name "*.md" | wc -l | tr -d ' ')
echo -e "  ${GREEN}📄 docs/ 文檔數: $DOCS_COUNT${NC}"

ROOT_MD_COUNT=$(find . -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
echo -e "  ${GREEN}📄 根目錄 MD 數: $ROOT_MD_COUNT${NC} (目標 ≤ 3)"

echo ""
echo -e "${GREEN}✅ 清理完成！${NC}"
echo ""
echo "📦 備份位置: $BACKUP_DIR"
echo "💡 如需恢復，請從備份目錄複製回來"
echo ""
echo "📚 下一步："
echo "  1. 檢查 docs/ 目錄結構"
echo "  2. 更新 README.md 的文檔鏈接"
echo "  3. 提交更改到 Git"
echo ""

