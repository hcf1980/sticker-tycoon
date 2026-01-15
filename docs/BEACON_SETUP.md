# LINE Beacon 管理系統

## 功能概述

本系統提供完整的 LINE Beacon 管理功能，包括：

1. **Beacon 設備管理**：註冊、編輯、啟用/停用 Beacon 設備
2. **觸發動作設定**：設定用戶進入/離開 Beacon 範圍時的自動動作
3. **事件記錄**：記錄所有 Beacon 觸發事件
4. **統計分析**：查看每日觸發次數、不重複用戶數等統計資料

## 資料庫結構

### 1. beacon_devices（Beacon 設備表）
- `id`: UUID 主鍵
- `hwid`: Hardware ID（10位16進制字元，必填）
- `vendor_key`: Vendor Key（8位16進制字元，選填）
- `lot_key`: Lot Key（16位16進制字元，選填）
- `device_name`: 設備名稱
- `location`: 設備位置
- `description`: 設備說明
- `is_active`: 是否啟用

### 2. beacon_events（觸發事件記錄表）
- `id`: UUID 主鍵
- `user_id`: LINE User ID
- `hwid`: Beacon Hardware ID
- `event_type`: 事件類型（'enter' 或 'leave'）
- `device_message`: Device Message（選填）
- `timestamp`: 事件時間戳

### 3. beacon_actions（觸發動作設定表）
- `id`: UUID 主鍵
- `hwid`: Beacon Hardware ID
- `event_type`: 觸發事件類型（'enter' 或 'leave'）
- `action_type`: 動作類型（'message', 'coupon', 'sticker_promo', 'custom'）
- `action_data`: 動作資料（JSONB）
- `is_active`: 是否啟用
- `priority`: 優先級（數字越大越優先）

### 4. beacon_statistics（統計資料表）
- `id`: UUID 主鍵
- `hwid`: Beacon Hardware ID
- `date`: 日期
- `enter_count`: 進入次數
- `leave_count`: 離開次數
- `unique_users`: 不重複用戶數

## 使用流程

### 1. 設定資料庫

執行 `database/beacon_schema.sql` 建立所需的資料表：

```bash
# 在 Supabase SQL Editor 中執行
cat database/beacon_schema.sql
```

### 2. 註冊 Beacon 設備

1. 進入管理後台：`/admin/index.html`
2. 點擊「LINE Beacon 管理」
3. 點擊「➕ 新增 Beacon 設備」
4. 填寫設備資訊：
   - **設備名稱**：例如「辦公室入口」
   - **HWID**：從 Beacon 設備取得（10位16進制）
   - **Vendor Key**：選填（8位16進制）
   - **Lot Key**：選填（16位16進制）
   - **位置**：設備安裝位置
   - **說明**：設備用途說明

### 3. 設定觸發動作

1. 在設備列表中點擊「⚙️ 動作設定」
2. 點擊「➕ 新增動作」
3. 選擇觸發事件：
   - 🚪 進入 Beacon 範圍
   - 🚶 離開 Beacon 範圍
4. 選擇動作類型：
   - 💬 發送訊息：發送文字訊息給用戶
   - ⚙️ 自訂動作：使用 JSON 格式自訂 LINE 訊息
5. 設定優先級（如果有多個動作，會執行優先級最高的）

### 4. 查看統計資料

1. 在設備列表中點擊「📊 查看統計」
2. 可以看到：
   - 每日進入次數
   - 每日離開次數
   - 總觸發次數
   - 不重複用戶數

## LINE Webhook 事件格式

當用戶進入或離開 Beacon 範圍時，LINE 會發送以下格式的 Webhook 事件：

```json
{
  "type": "beacon",
  "replyToken": "...",
  "source": {
    "userId": "U1234567890abcdef1234567890abcdef"
  },
  "beacon": {
    "hwid": "0000000019",
    "type": "enter",
    "dm": "optional_device_message"
  },
  "timestamp": 1234567890123
}
```

## 動作資料格式範例

### 發送文字訊息
```json
{
  "type": "text",
  "text": "👋 歡迎光臨！\n\n您已進入貼圖大亨服務範圍。"
}
```

### 發送 Flex Message
```json
{
  "type": "flex",
  "altText": "歡迎訊息",
  "contents": {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "歡迎光臨！",
          "weight": "bold",
          "size": "xl"
        }
      ]
    }
  }
}
```

## 測試方式

### 1. 使用 LINE Beacon Simulator（iOS/Android）
- 下載 LINE Beacon Simulator App
- 輸入 HWID
- 模擬進入/離開事件

### 2. 使用實體 Beacon 設備
- 設定 Minew E2 或其他支援 LINE Beacon 的設備
- 使用 Minew BeaconSET+ App 設定 HWID、Vendor Key、Lot Key
- 在 LINE App 中靠近 Beacon 設備測試

## 注意事項

1. **HWID 格式**：必須是10位16進制字元（例如：0000000019）
2. **Vendor Key**：8位16進制字元（選填）
3. **Lot Key**：16位16進制字元（選填）
4. **優先級**：當同一個事件有多個動作時，只會執行優先級最高的動作
5. **啟用狀態**：只有啟用的設備和動作才會生效
6. **統計更新**：統計資料每次觸發時自動更新

## 故障排除

### Beacon 事件沒有觸發
1. 檢查設備是否已啟用（`is_active = true`）
2. 檢查 HWID 是否正確
3. 檢查 LINE Bot Webhook 是否正常運作
4. 查看 Netlify Functions 日誌

### 動作沒有執行
1. 檢查動作是否已啟用（`is_active = true`）
2. 檢查動作資料格式是否正確
3. 檢查優先級設定
4. 查看最近觸發記錄確認事件是否有被記錄

### 統計資料不正確
1. 檢查資料庫中的 `beacon_statistics` 表
2. 確認統計更新函數是否正常執行
3. 手動執行 SQL 查詢驗證資料

## 相關檔案

- `database/beacon_schema.sql` - 資料庫結構
- `functions/beacon-handler.js` - Beacon 事件處理器
- `functions/line-webhook.js` - LINE Webhook 處理（已整合 Beacon）
- `public/admin/beacon-manager.html` - 管理頁面
- `public/admin/beacon-manager.js` - 管理頁面邏輯

