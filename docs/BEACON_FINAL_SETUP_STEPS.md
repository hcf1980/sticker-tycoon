# 🚀 Beacon 系統最後設定步驟

## 📝 執行順序

### 步驟 1：執行快速修復 SQL

在 **Supabase SQL Editor** 執行以下檔案：

```
database/QUICK_FIX_BEACON_ACTIONS.sql
```

這個腳本會：
- ✅ 自動建立缺少的 beacon_devices 記錄
- ✅ 添加外鍵約束
- ✅ 添加 daily_limit 和 cooldown_minutes 欄位
- ✅ 建立檢查函數
- ✅ 建立索引

**預期結果**：
```
✅ 舊的外鍵約束已刪除（如果存在）
✅ hwid 外鍵約束已添加
✅ daily_limit 欄位已添加
✅ cooldown_minutes 欄位已添加
🎉 修復完成！
```

---

### 步驟 2：驗證資料庫結構

執行以下 SQL 驗證：

```sql
-- 1. 檢查 beacon_devices 表
SELECT hwid, device_name, is_active 
FROM beacon_devices 
ORDER BY created_at DESC;

-- 2. 檢查 beacon_actions 表結構
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
  AND column_name IN ('hwid', 'daily_limit', 'cooldown_minutes', 'message_id')
ORDER BY ordinal_position;

-- 3. 檢查外鍵約束
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name = 'beacon_actions'
  AND constraint_type = 'FOREIGN KEY';

-- 4. 測試檢查函數
SELECT * FROM check_beacon_daily_limit(
  'test_user',
  (SELECT hwid FROM beacon_devices LIMIT 1),
  (SELECT id FROM beacon_actions LIMIT 1)
);
```

**預期結果**：
- beacon_devices 有記錄（包含自動建立的）
- beacon_actions 有 daily_limit 和 cooldown_minutes 欄位
- 外鍵約束存在
- 檢查函數可以正常執行

---

### 步驟 3：重新整理管理後台

1. **開啟管理後台**
   ```
   https://你的網站.netlify.app/admin/beacon-manager.html
   ```

2. **重新整理頁面**（Ctrl+F5 或 Cmd+Shift+R）

3. **檢查「⚡ 觸發動作」標籤**
   - 應該可以正常顯示
   - 不再出現關聯錯誤

4. **檢查設備列表**
   - 應該看到 HWID `0000000019` 的設備
   - 如果是自動建立的，設備名稱會是「自動建立 - 0000000019」

---

### 步驟 4：更新設備資訊（可選）

如果設備是自動建立的，建議更新資訊：

1. **在管理後台編輯設備**
   - 點擊「📱 Beacon 設備」標籤
   - 找到 HWID `0000000019` 的設備
   - 點擊「編輯」

2. **更新資訊**
   - 設備名稱：改成有意義的名稱（例如：「店門口 Beacon」）
   - 位置：填寫實際位置（例如：「台北市信義區...」）
   - 說明：填寫用途說明

3. **儲存**

---

### 步驟 5：設定觸發動作

1. **切換到「⚡ 觸發動作」標籤**

2. **編輯現有動作或新增動作**
   - 動作名稱：例如「進入時歡迎」
   - 設備：選擇你的 Beacon 設備
   - 觸發類型：進入範圍 / 離開範圍
   - 推送訊息：選擇訊息模板
   - **每日限制**：2（預設，可修改）
   - **冷卻時間**：60 分鐘（預設，可修改）
   - 狀態：啟用

3. **儲存**

---

### 步驟 6：測試觸發限制

#### 測試 1：首次觸發
```
1. 靠近 Beacon 設備
2. 等待 5-10 秒
3. 檢查：
   ✅ 應該收到推送訊息
   ✅ 事件記錄顯示 message_sent = true
```

#### 測試 2：冷卻時間內再次觸發
```
1. 立即再次靠近 Beacon（不要離開）
2. 等待 5-10 秒
3. 檢查：
   ❌ 不應該收到推送訊息
   ✅ 事件記錄顯示 message_sent = false
   ✅ error_message = '冷卻中，還需等待 XX 分鐘'
```

#### 測試 3：冷卻完成後觸發
```
1. 等待 60 分鐘（或你設定的冷卻時間）
2. 再次靠近 Beacon
3. 檢查：
   ✅ 應該收到推送訊息（第 2 次）
   ✅ 事件記錄顯示 message_sent = true
```

#### 測試 4：達到每日上限
```
1. 當天第 3 次靠近 Beacon
2. 檢查：
   ❌ 不應該收到推送訊息
   ✅ error_message = '今日已達觸發上限 (2/2)'
```

#### 測試 5：隔天重置
```
1. 隔天再次靠近 Beacon
2. 檢查：
   ✅ 應該收到推送訊息（重新計算）
   ✅ 今日觸發次數重置為 1
```

---

### 步驟 7：查看觸發記錄

1. **開啟事件記錄頁面**
   ```
   https://你的網站.netlify.app/admin/beacon-events.html
   ```

2. **查看統計卡片**
   - 總觸發次數
   - 今日觸發
   - 好友觸發
   - 非好友觸發

3. **查看事件列表**
   - 時間
   - 設備
   - 事件類型
   - 用戶 ID
   - 好友狀態
   - 推送訊息（✅ 已推送 / ⏸️ 未推送）

4. **查看失敗原因**
   - 如果 message_sent = false
   - 查看 error_message 欄位
   - 可能的原因：
     - 冷卻中
     - 今日已達上限
     - 設備未啟用
     - 無符合條件的動作

---

## 🔍 常見問題

### Q1：執行 SQL 時出現外鍵錯誤

**錯誤訊息**：
```
Key (hwid)=(0000000019) is not present in table "beacon_devices"
```

**解決方案**：
已在 `QUICK_FIX_BEACON_ACTIONS.sql` 中自動處理，會自動建立缺少的設備記錄。

---

### Q2：管理後台仍然顯示關聯錯誤

**解決方案**：
1. 確認 SQL 已成功執行
2. 清除瀏覽器快取（Ctrl+Shift+Delete）
3. 重新整理頁面（Ctrl+F5）
4. 檢查瀏覽器 Console 是否有錯誤

---

### Q3：觸發限制沒有生效

**檢查清單**：
1. ✅ 確認 `check_beacon_daily_limit` 函數已建立
2. ✅ 確認 `check_beacon_cooldown` 函數已建立
3. ✅ 確認 `beacon_actions` 表有 `daily_limit` 和 `cooldown_minutes` 欄位
4. ✅ 確認 Netlify Functions 已重新部署
5. ✅ 查看 Netlify Functions 日誌

---

### Q4：如何修改觸發限制？

**方法 1：在管理後台修改**
```
1. 進入管理後台
2. 切換到「⚡ 觸發動作」標籤
3. 點擊「編輯」
4. 修改「每日限制」和「冷卻時間」
5. 儲存
```

**方法 2：直接在資料庫修改**
```sql
UPDATE beacon_actions
SET 
  daily_limit = 3,           -- 每天最多 3 次
  cooldown_minutes = 30      -- 冷卻 30 分鐘
WHERE action_name = '進入時歡迎';
```

---

## 📊 監控建議

### 每日檢查
```sql
-- 查看今日觸發統計
SELECT 
  COUNT(*) as total_triggers,
  SUM(CASE WHEN message_sent THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT message_sent THEN 1 ELSE 0 END) as failed
FROM beacon_events
WHERE DATE(created_at) = CURRENT_DATE;

-- 查看失敗原因分布
SELECT 
  error_message,
  COUNT(*) as count
FROM beacon_events
WHERE DATE(created_at) = CURRENT_DATE
  AND message_sent = false
GROUP BY error_message
ORDER BY count DESC;
```

---

## ✅ 完成檢查清單

- [ ] 執行 `QUICK_FIX_BEACON_ACTIONS.sql`
- [ ] 驗證資料庫結構
- [ ] 重新整理管理後台
- [ ] 更新設備資訊
- [ ] 設定觸發動作（含每日限制和冷卻時間）
- [ ] 測試首次觸發
- [ ] 測試冷卻時間
- [ ] 測試每日上限
- [ ] 查看事件記錄
- [ ] 確認觸發限制生效

---

**設定完成日期：__________**  
**測試人員：__________**

