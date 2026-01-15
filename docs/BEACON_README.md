# 📡 LINE Beacon 管理系統

> 為貼圖大亨 LINE Bot 添加完整的 Beacon 管理功能

## ✨ 功能特色

### 🎯 核心功能
- **設備管理**：註冊、編輯、啟用/停用 Beacon 設備
- **動作設定**：配置進入/離開範圍時的自動觸發動作
- **事件記錄**：完整記錄所有 Beacon 觸發事件
- **統計分析**：每日觸發次數、不重複用戶數統計

### 🎨 管理介面
- 科技感設計風格
- 響應式設計，支援手機/平板/桌面
- 即時數據更新
- 直覺的操作流程

### ⚡ 技術亮點
- 事件驅動架構
- 優先級機制（多動作智能選擇）
- 啟用/停用控制（設備和動作層級）
- PostgreSQL + JSONB 靈活儲存

## 🚀 5 分鐘快速開始

### 1. 建立資料庫（1 分鐘）
在 Supabase SQL Editor 執行：
```sql
-- 複製並執行 database/beacon_schema.sql
-- 複製並執行 database/beacon_test_data.sql
```

### 2. 部署程式碼（2 分鐘）
```bash
git add .
git commit -m "Add LINE Beacon management"
git push
```

### 3. 訪問管理後台（1 分鐘）
1. 訪問：`https://your-domain.netlify.app/admin/login.html`
2. 點擊「LINE Beacon 管理」
3. 查看測試設備

### 4. 測試觸發（1 分鐘）
使用 LINE Beacon Simulator：
- HWID: `0000000019`
- 點擊 Enter → 收到歡迎訊息
- 點擊 Leave → 收到感謝訊息

## 📁 檔案結構

```
├── database/
│   ├── beacon_schema.sql          # 資料庫結構
│   └── beacon_test_data.sql       # 測試資料
├── docs/
│   ├── BEACON_QUICKSTART.md       # 🚀 快速開始（推薦）
│   ├── BEACON_SETUP.md            # 📖 完整設定說明
│   ├── BEACON_TESTING.md          # 🧪 測試指南
│   ├── BEACON_DEPLOYMENT_CHECKLIST.md # ✅ 部署檢查清單
│   └── BEACON_SUMMARY.md          # 📊 功能總結
├── functions/
│   ├── beacon-handler.js          # Beacon 事件處理器
│   └── line-webhook.js            # LINE Webhook（已整合）
└── public/admin/
    ├── beacon-manager.html        # 管理介面
    └── beacon-manager.js          # 管理邏輯
```

## 📖 文件導航

### 🎯 新手入門
1. **5 分鐘快速開始** → [`BEACON_QUICKSTART.md`](./docs/BEACON_QUICKSTART.md)
2. **部署檢查清單** → [`BEACON_DEPLOYMENT_CHECKLIST.md`](./docs/BEACON_DEPLOYMENT_CHECKLIST.md)

### 📚 詳細文件
3. **完整設定說明** → [`BEACON_SETUP.md`](./docs/BEACON_SETUP.md)
4. **測試指南** → [`BEACON_TESTING.md`](./docs/BEACON_TESTING.md)
5. **功能總結** → [`BEACON_SUMMARY.md`](./docs/BEACON_SUMMARY.md)

## 🎯 使用場景

### 零售店面
```
進入店面 → 歡迎訊息 + 今日優惠
離開店面 → 感謝訊息 + 下次優惠預告
```

### 展覽活動
```
進入展區 → 展覽簡介 + 參觀指南
離開展區 → 問卷調查 + 紀念貼圖
```

### 辦公室
```
進入辦公室 → 打卡提醒 + 今日行程
離開辦公室 → 待辦事項提醒
```

## 📊 資料庫結構

### beacon_devices（設備表）
- `hwid`: Hardware ID（10 位 hex）
- `vendor_key`: Vendor Key（8 位 hex）
- `lot_key`: Lot Key（16 位 hex）
- `is_active`: 啟用狀態

### beacon_actions（動作表）
- `event_type`: 'enter' 或 'leave'
- `action_type`: 'message', 'coupon', 'custom'
- `action_data`: JSONB 動作資料
- `priority`: 優先級（越大越優先）

### beacon_events（事件表）
- `user_id`: LINE User ID
- `hwid`: Hardware ID
- `event_type`: 事件類型
- `timestamp`: 觸發時間

### beacon_statistics（統計表）
- `date`: 日期
- `enter_count`: 進入次數
- `leave_count`: 離開次數
- `unique_users`: 不重複用戶數

## 🔧 支援的 Beacon 設備

### ✅ 已測試
- **Minew E2** - 推薦，設定簡單
- LINE Beacon Simulator - 測試用

### 📱 設定 App
- **iOS/Android**: Minew BeaconSET+
- **iOS/Android**: LINE Beacon Simulator

## 🎨 動作類型範例

### 文字訊息
```json
{
  "type": "text",
  "text": "👋 歡迎光臨！"
}
```

### Flex Message
```json
{
  "type": "flex",
  "altText": "歡迎訊息",
  "contents": {
    "type": "bubble",
    "body": { ... }
  }
}
```

## 📈 統計功能

### 即時統計
- 今日觸發次數
- 今日不重複用戶
- 設備啟用狀態

### 歷史統計
- 每日進入/離開次數
- 趨勢分析
- 用戶行為模式

## 🛠️ 技術棧

- **前端**: Vanilla JS + Tailwind CSS
- **後端**: Netlify Functions
- **資料庫**: Supabase PostgreSQL
- **API**: LINE Messaging API
- **Beacon**: LINE Beacon Protocol

## ⚠️ 注意事項

1. **HWID 格式**：10 位 16 進制字元（例：0000000019）
2. **優先級機制**：同事件多動作時，只執行最高優先級
3. **啟用控制**：設備和動作都要啟用才會觸發
4. **觸發延遲**：實體設備約 5-10 秒觸發

## 🆘 故障排除

### Beacon 沒觸發
- ✅ 檢查設備是否啟用
- ✅ 檢查 HWID 是否正確
- ✅ 查看 Netlify Functions 日誌

### 訊息沒發送
- ✅ 檢查動作是否啟用
- ✅ 檢查動作資料格式
- ✅ 驗證 LINE Channel Token

詳細請參考 [`BEACON_TESTING.md`](./docs/BEACON_TESTING.md)

## 📞 需要幫助？

1. 查看完整文件：`docs/` 目錄
2. 檢查 Netlify Functions 日誌
3. 查看 Supabase 資料庫
4. 參考測試指南排除問題

## 🎉 立即開始

```bash
# 1. 設定資料庫
# 在 Supabase SQL Editor 執行 database/*.sql

# 2. 部署
git add . && git commit -m "Add Beacon" && git push

# 3. 測試
# 訪問 /admin/beacon-manager.html
```

---

**Have fun with LINE Beacon! 🎊**

