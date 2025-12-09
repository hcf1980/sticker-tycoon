# LINE Pay 串接快速開始指南

## 🚀 5 分鐘快速部署

### 步驟 1: 註冊 LINE Pay Sandbox

1. 前往 [LINE Pay Sandbox 申請頁面](https://pay.line.me/tw/developers/techsupport/sandbox/creation)
2. 填寫表單（立即通過）
3. 取得 **Channel ID** 和 **Channel Secret Key**

### 步驟 2: 設定環境變數

在 Netlify 後台或 `.env` 中添加：

```bash
LINE_PAY_CHANNEL_ID=你的_Channel_ID
LINE_PAY_CHANNEL_SECRET=你的_Channel_Secret
LINE_PAY_ENV=sandbox
```

### 步驟 3: 執行資料庫遷移

在 Supabase SQL Editor 中執行：

```bash
migrations/linepay_payment_system.sql
```

### 步驟 4: 部署 API 函數

將以下檔案複製到 `functions/` 目錄：
- `payment-request.js`
- `payment-confirm.js`
- `payment-cancel.js`

### 步驟 5: 測試付款流程

使用 LINE Pay 提供的測試卡號進行測試：
- 卡號：`5555555555554444`
- 有效期：任意未來日期
- CVV：`123`

---

## 📊 代幣方案定價

| 方案 | 代幣 | 價格 | 贈送 | 總計 | 單價 |
|------|------|------|------|------|------|
| 入門包 | 30 | $99 | - | 30 | $3.3 |
| 超值包 | 100 | $299 | +10 | 110 | $2.7 |
| 熱門包 | 300 | $799 | +50 | 350 | $2.3 |
| 豪華包 | 500 | $1,199 | +100 | 600 | $2.0 |

**代幣有效期：購買後 365 天**

---

## 🔑 核心功能

### 1. 購買代幣
用戶在 LINE Bot 中點擊「購買代幣」→ 選擇方案 → 跳轉 LINE Pay 付款

### 2. 自動發放
付款成功後自動發放代幣到用戶帳戶，有效期 365 天

### 3. FIFO 扣款
使用代幣時，系統優先扣除最早到期的代幣（先進先出）

### 4. 到期提醒
到期前 30 天自動通知用戶使用代幣

### 5. 自動過期
過期代幣自動失效，不影響其他有效代幣

---

## ⚙️ 定期維護任務

需要設定以下 Cron Jobs（建議使用 [EasyCron](https://www.easycron.com/)）：

| 任務 | 執行時間 | URL | 說明 |
|------|---------|-----|------|
| 標記過期代幣 | 每天 00:00 | `/.netlify/functions/check-expired-tokens` | 標記並清理過期代幣 |
| 清理過期訂單 | 每天 00:10 | `/.netlify/functions/cleanup-expired-orders` | 清理 15 分鐘未付款的訂單 |
| 到期提醒 | 每天 09:00 | `/.netlify/functions/notify-expiring-tokens` | 提醒用戶即將到期的代幣 |

---

## 📱 LINE Bot 整合範例

在 `line-webhook.js` 中添加：

```javascript
// 處理「購買代幣」訊息
if (message.text.match(/購買|儲值/i)) {
  return [{
    type: 'flex',
    altText: '🎫 代幣儲值方案',
    contents: {
      type: 'carousel',
      contents: [
        createPackageBubble('starter', '入門包', 30, 0, 99),
        createPackageBubble('value', '超值包', 100, 10, 299),
        createPackageBubble('popular', '熱門包', 300, 50, 799),
        createPackageBubble('deluxe', '豪華包', 500, 100, 1199)
      ]
    }
  }];
}

function createPackageBubble(id, name, tokens, bonus, price) {
  const total = tokens + bonus;
  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: name, weight: 'bold', size: 'xl', color: '#667eea' },
        { type: 'text', text: `${tokens} 代幣`, size: 'md', color: '#666', margin: 'md' },
        ...(bonus > 0 ? [
          { type: 'text', text: `+ 贈送 ${bonus} 代幣`, size: 'sm', color: '#ff9800', margin: 'sm' }
        ] : []),
        { type: 'text', text: `NT$ ${price}`, size: 'xxl', weight: 'bold', margin: 'lg' },
        { type: 'text', text: '⏰ 有效期 365 天', size: 'xs', color: '#999', margin: 'sm' }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [{
        type: 'button',
        action: {
          type: 'uri',
          label: '立即購買',
          uri: `https://liff.line.me/${process.env.LIFF_ID}?package=${id}`
        },
        style: 'primary',
        color: '#667eea'
      }]
    }
  };
}
```

---

## 🧪 測試檢查清單

- [ ] Sandbox 環境測試付款
- [ ] 確認代幣正確發放
- [ ] 驗證有效期計算（365 天）
- [ ] 測試 FIFO 扣款邏輯
- [ ] 測試重複付款防護
- [ ] 測試訂單過期機制
- [ ] 測試取消付款流程
- [ ] 確認交易記錄完整

---

## 📞 支援資源

- **LINE Pay 開發者文件**: https://pay.line.me/tw/developers/apis/onlineApis
- **技術支援**: https://pay.line.me/tw/developers/techsupport/overview
- **完整文檔**: 查看 `docs/LINE_PAY_INTEGRATION_GUIDE.md`

---

**祝串接順利！有問題歡迎查看完整文檔。** 🎉

