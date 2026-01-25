#!/bin/bash

# 測試購物車結帳功能
# 這個腳本用於測試新的購物車結帳流程

echo "🧪 開始測試購物車結帳功能..."
echo ""

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 測試函數
test_case() {
    local test_name=$1
    echo -e "${BLUE}📋 測試案例: ${test_name}${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "================================"
test_case "1. 檢查文件修改"
echo "================================"

if grep -q "handleCheckout" functions/line-webhook.js; then
    success "handleCheckout 函數已創建"
else
    error "handleCheckout 函數未找到"
fi

if grep -q "結帳:" functions/line-webhook.js; then
    success "結帳命令處理已添加"
else
    error "結帳命令處理未找到"
fi

echo ""
echo "================================"
test_case "2. 檢查方案配置"
echo "================================"

# 檢查 NT$ 300 方案
if grep -q "300.*140" functions/line-webhook.js; then
    success "NT$ 300 方案配置正確（140張）"
else
    error "NT$ 300 方案配置不正確"
fi

# 檢查 NT$ 500 方案
if grep -q "500.*260" functions/line-webhook.js; then
    success "NT$ 500 方案配置正確（260張）"
else
    error "NT$ 500 方案配置不正確"
fi

echo ""
echo "================================"
test_case "3. 檢查 UI 元素"
echo "================================"

# 檢查結帳按鈕
if grep -q "🛒 結帳" functions/line-webhook.js; then
    success "結帳按鈕已添加"
else
    warning "結帳按鈕標籤可能不同"
fi

# 檢查熱門標籤
if grep -q "🔥 最熱門" functions/line-webhook.js; then
    success "熱門標籤已添加"
else
    warning "熱門標籤可能不同"
fi

echo ""
echo "================================"
test_case "4. 檢查付款資訊"
echo "================================"

# 檢查銀行資訊
if grep -q "連線商業銀行" functions/line-webhook.js; then
    success "銀行名稱正確"
else
    error "銀行名稱未找到"
fi

if grep -q "111000196474" functions/line-webhook.js; then
    success "銀行帳號正確"
else
    error "銀行帳號未找到"
fi

if grep -q "梁勝喜" functions/line-webhook.js; then
    success "戶名正確"
else
    error "戶名未找到"
fi

echo ""
echo "================================"
test_case "5. 檢查向後兼容性"
echo "================================"

if grep -q "購買方案:" functions/line-webhook.js; then
    success "保留了舊版「購買方案:」命令"
else
    warning "可能移除了舊版命令（可能導致向後不兼容）"
fi

echo ""
echo "================================"
test_case "6. 語法檢查"
echo "================================"

if node -c functions/line-webhook.js 2>/dev/null; then
    success "JavaScript 語法正確"
else
    error "JavaScript 語法錯誤"
    node -c functions/line-webhook.js
fi

echo ""
echo "================================"
echo "🎉 測試完成！"
echo "================================"
echo ""
echo "📝 下一步："
echo "1. 手動測試 LINE Bot 功能"
echo "2. 輸入「購買張數」查看方案"
echo "3. 點擊「結帳」按鈕測試付款流程"
echo "4. 確認所有資訊顯示正確"
echo ""

