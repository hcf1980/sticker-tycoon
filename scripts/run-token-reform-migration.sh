#!/bin/bash

# =========================================
# 🔄 張數改革 - 資料庫遷移執行腳本
# =========================================
# 用途：執行資料庫註解更新
# 安全等級：✅ 高（僅更新註解，不修改數據）
# =========================================

set -e  # 遇到錯誤立即停止

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 資料庫配置（從環境變數讀取）
DB_HOST="${SUPABASE_DB_HOST:-db.YOUR_PROJECT.supabase.co}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"

# SQL 檔案路徑
SQL_FILE="./migrations/token_reform_2025.sql"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🔄 張數改革 - 資料庫遷移${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 檢查 SQL 檔案是否存在
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ 錯誤：找不到 SQL 檔案 $SQL_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 找到 SQL 檔案${NC}"
echo -e "${YELLOW}檔案位置：$SQL_FILE${NC}"
echo ""

# 顯示資料庫配置
echo -e "${BLUE}資料庫配置：${NC}"
echo -e "  主機：${YELLOW}$DB_HOST${NC}"
echo -e "  資料庫：${YELLOW}$DB_NAME${NC}"
echo -e "  用戶：${YELLOW}$DB_USER${NC}"
echo -e "  端口：${YELLOW}$DB_PORT${NC}"
echo ""

# 確認執行
echo -e "${YELLOW}⚠️  即將執行資料庫遷移腳本${NC}"
echo -e "${YELLOW}此操作僅更新註解，不會修改數據${NC}"
echo ""
read -p "是否繼續？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ 已取消執行${NC}"
    exit 1
fi

# 執行 SQL 腳本
echo ""
echo -e "${BLUE}開始執行 SQL 腳本...${NC}"
echo ""

# 使用 psql 執行
if command -v psql &> /dev/null; then
    echo -e "${GREEN}使用 psql 執行...${NC}"
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -p "$DB_PORT" \
        -f "$SQL_FILE"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}=========================================${NC}"
        echo -e "${GREEN}✅ 資料庫遷移成功！${NC}"
        echo -e "${GREEN}=========================================${NC}"
        echo ""
        echo -e "${GREEN}✓ 所有註解已更新為「張數」語義${NC}"
        echo -e "${GREEN}✓ 用戶數據保持不變${NC}"
        echo -e "${GREEN}✓ 無資料遺失風險${NC}"
        echo ""
    else
        echo ""
        echo -e "${RED}=========================================${NC}"
        echo -e "${RED}❌ 資料庫遷移失敗${NC}"
        echo -e "${RED}=========================================${NC}"
        echo ""
        echo -e "${YELLOW}請檢查：${NC}"
        echo -e "  1. 資料庫連線設定是否正確"
        echo -e "  2. 資料庫密碼是否正確"
        echo -e "  3. SQL 檔案語法是否正確"
        echo ""
        exit 1
    fi
else
    echo -e "${RED}❌ 錯誤：找不到 psql 命令${NC}"
    echo -e "${YELLOW}請安裝 PostgreSQL 客戶端${NC}"
    exit 1
fi

# 驗證結果
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}📊 驗證資料庫註解${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 查詢 users 表註解
echo -e "${YELLOW}users 表註解：${NC}"
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -p "$DB_PORT" \
    -c "
    SELECT 
      column_name,
      col_description(attrelid, attnum) as description
    FROM pg_attribute
    WHERE attrelid = 'users'::regclass
    AND col_description(attrelid, attnum) IS NOT NULL
    ORDER BY attnum;
    "

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ 遷移完成${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo -e "  1. 檢查上述驗證查詢結果"
echo -e "  2. 修改程式碼（參考 TOKEN_REFORM_CHECKLIST.md）"
echo -e "  3. 更新前端頁面文案"
echo -e "  4. 測試完整流程"
echo ""

