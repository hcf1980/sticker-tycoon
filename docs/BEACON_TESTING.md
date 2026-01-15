# LINE Beacon 測試指南

## 前置準備

### 1. 執行資料庫設定

在 Supabase SQL Editor 中執行以下 SQL：

```sql
-- 1. 建立資料表結構
-- 複製 database/beacon_schema.sql 的內容並執行

-- 2. 插入測試資料
-- 複製 database/beacon_test_data.sql 的內容並執行
```

### 2. 確認環境變數

確保 Netlify 環境變數已設定：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

### 3. 部署更新

```bash
# 提交變更
git add .
git commit -m "Add LINE Beacon management system"
git push

# Netlify 會自動部署
```

## 測試步驟

### 方法 1：使用管理後台測試（推薦）

#### 1. 登入管理後台
- 訪問：`https://your-domain.netlify.app/admin/login.html`
- 輸入管理員密碼

#### 2. 進入 Beacon 管理
- 點擊「LINE Beacon 管理」卡片
- 或直接訪問：`/admin/beacon-manager.html`

#### 3. 查看設備列表
- 應該會看到「Minew E2 測試設備」
- HWID: `0000000019`
- 狀態：✅ 啟用中

#### 4. 查看動作設定
- 點擊「⚙️ 動作設定」
- 應該會看到兩個動作：
  - 🚪 進入 - 發送歡迎訊息
  - 🚶 離開 - 發送感謝訊息

#### 5. 測試新增設備
- 點擊「➕ 新增 Beacon 設備」
- 填寫測試資料：
  ```
  設備名稱: 測試設備 2
  HWID: 0000000020
  位置: 測試區域
  ```
- 點擊「✅ 新增設備」

#### 6. 測試編輯設備
- 點擊任一設備的「✏️ 編輯」
- 修改設備名稱或位置
- 儲存變更

#### 7. 測試停用/啟用
- 點擊「⏸️ 停用」或「▶️ 啟用」
- 確認狀態變更

### 方法 2：使用 LINE Beacon Simulator（實際測試）

#### iOS 測試

1. **下載 LINE Beacon Simulator**
   - App Store 搜尋「LINE Beacon Simulator」
   - 或使用 TestFlight 安裝

2. **設定 Beacon**
   - 開啟 App
   - 輸入 HWID: `0000000019`
   - 選擇「Simple Beacon」模式

3. **模擬進入事件**
   - 點擊「Enter」按鈕
   - 開啟 LINE App
   - 應該會收到歡迎訊息

4. **模擬離開事件**
   - 點擊「Leave」按鈕
   - 應該會收到感謝訊息

#### Android 測試

1. **下載 LINE Beacon Simulator**
   - Google Play 搜尋「LINE Beacon Simulator」

2. **設定和測試步驟同 iOS**

### 方法 3：使用實體 Beacon 設備（Minew E2）

#### 1. 設定 Beacon 設備

使用 Minew BeaconSET+ App：

1. **連接設備**
   - 開啟藍牙
   - 掃描並連接 Minew E2

2. **設定 LINE Beacon**
   - 選擇「LINE Beacon」模式
   - 設定 HWID: `0000000019`
   - 設定 Vendor Key: `00000019`
   - 設定 Lot Key: `0011223344556603`

3. **設定廣播參數**
   - Advertising Interval: 100ms（建議）
   - TX Power: 0dBm（可調整）

4. **儲存設定**
   - 點擊「Save」
   - 設備會重新啟動

#### 2. 測試觸發

1. **準備測試**
   - 確保 LINE App 已登入
   - 確保藍牙已開啟
   - 確保位置權限已授予

2. **靠近 Beacon**
   - 走到 Beacon 設備附近（約 1-3 公尺）
   - 等待 5-10 秒
   - 應該會收到歡迎訊息

3. **遠離 Beacon**
   - 走離 Beacon 設備（約 10 公尺以上）
   - 等待 5-10 秒
   - 應該會收到感謝訊息

## 驗證測試結果

### 1. 查看觸發記錄

在管理後台的「最近觸發記錄」區塊：
- 應該會看到觸發事件
- 包含時間、HWID、用戶 ID、事件類型

### 2. 查看統計資料

點擊「📊 查看統計」：
- 應該會看到今日的統計
- 進入次數、離開次數、總觸發次數

### 3. 查看資料庫

在 Supabase SQL Editor 執行：

```sql
-- 查看最近的事件
SELECT * FROM beacon_events 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看今日統計
SELECT * FROM beacon_statistics 
WHERE date = CURRENT_DATE;
```

### 4. 查看 Netlify 日誌

在 Netlify Dashboard：
- Functions → line-webhook
- 查看最近的執行日誌
- 應該會看到 `📡 Beacon 事件` 的日誌

## 常見問題排除

### 問題 1：沒有收到 Beacon 訊息

**可能原因：**
1. Beacon 設備未啟用
2. 動作未啟用
3. LINE Webhook 未正確設定
4. HWID 不匹配

**解決方法：**
```sql
-- 檢查設備狀態
SELECT * FROM beacon_devices WHERE hwid = '0000000019';

-- 檢查動作狀態
SELECT * FROM beacon_actions WHERE hwid = '0000000019';

-- 確認兩者的 is_active 都是 true
```

### 問題 2：事件有記錄但沒有發送訊息

**可能原因：**
1. 動作資料格式錯誤
2. LINE API 回應錯誤

**解決方法：**
- 查看 Netlify Functions 日誌
- 檢查動作資料的 JSON 格式
- 測試 LINE Messaging API

### 問題 3：統計資料不更新

**可能原因：**
1. 統計更新函數執行失敗
2. 資料庫權限問題

**解決方法：**
```sql
-- 手動更新統計
INSERT INTO beacon_statistics (hwid, date, enter_count, leave_count, unique_users)
VALUES ('0000000019', CURRENT_DATE, 1, 0, 1)
ON CONFLICT (hwid, date) 
DO UPDATE SET 
  enter_count = beacon_statistics.enter_count + 1;
```

### 問題 4：管理頁面載入失敗

**可能原因：**
1. 未登入管理後台
2. Supabase 連線問題
3. JavaScript 錯誤

**解決方法：**
- 開啟瀏覽器開發者工具（F12）
- 查看 Console 錯誤訊息
- 檢查 Network 請求狀態

## 進階測試

### 測試多個動作優先級

1. 新增多個動作給同一個事件
2. 設定不同的優先級
3. 測試觸發，應該只執行優先級最高的動作

### 測試自訂 JSON 動作

建立自訂動作：
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
          "text": "🎉 歡迎光臨！",
          "weight": "bold",
          "size": "xl",
          "color": "#00B900"
        },
        {
          "type": "text",
          "text": "您已進入貼圖大亨服務範圍",
          "size": "sm",
          "color": "#999999",
          "margin": "md"
        }
      ]
    }
  }
}
```

### 壓力測試

模擬多個用戶同時觸發：
- 使用多個測試帳號
- 同時靠近 Beacon
- 觀察系統效能和穩定性

## 測試檢查清單

- [ ] 資料庫表格已建立
- [ ] 測試資料已插入
- [ ] 管理後台可以正常訪問
- [ ] 可以查看設備列表
- [ ] 可以新增設備
- [ ] 可以編輯設備
- [ ] 可以停用/啟用設備
- [ ] 可以查看動作設定
- [ ] 可以新增動作
- [ ] 可以編輯動作
- [ ] 可以刪除動作
- [ ] 可以查看統計資料
- [ ] 可以查看觸發記錄
- [ ] Beacon 進入事件正常觸發
- [ ] Beacon 離開事件正常觸發
- [ ] 訊息正確發送給用戶
- [ ] 事件正確記錄到資料庫
- [ ] 統計資料正確更新

## 下一步

測試完成後，你可以：

1. **新增更多設備**
   - 在不同位置部署 Beacon
   - 設定不同的觸發動作

2. **優化動作內容**
   - 使用 Flex Message 提升視覺效果
   - 加入互動按鈕

3. **整合其他功能**
   - 觸發時自動發送優惠券
   - 觸發時推薦貼圖
   - 觸發時記錄用戶行為

4. **分析數據**
   - 定期查看統計報表
   - 分析用戶行為模式
   - 優化 Beacon 位置和動作

