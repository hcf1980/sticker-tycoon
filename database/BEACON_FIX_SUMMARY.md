# 🎯 完整修正步驟：使用正確的 HWID (018d4b2fdc)

## 📋 問題總結

1. ❌ **HWID 打錯了**：SQL 腳本中寫成 `018d4b2f1dc`（11 個字元），正確應該是 `018d4b2fdc`（10 個字元）
2. ❌ **beacon_messages 缺少唯一約束**：無法使用 `ON CONFLICT (template_name)`
3. ❌ **beacon_test_data.sql 使用舊的表結構**：`event_type` 已改為 `trigger_type`

---

## ✅ 已修正的檔案

1. ✅ `database/CLEAN_AND_REBUILD_BEACON.sql` - 修正 HWID
2. ✅ `database/DIAGNOSE_AND_FIX_BEACON.sql` - 修正 HWID
3. ✅ `database/FINAL_BEACON_FIX_CORRECT_HWID.sql` - 新建，使用正確 HWID
4. ✅ `database/beacon_test_data.sql` - 更新為新表結構
5. ✅ `database/FIX_BEACON_MESSAGES_CONSTRAINT.sql` - 新建，添加唯一約束

---

## 🚀 執行步驟（按順序）

### 步驟 1：添加 beacon_messages 唯一約束

在 Supabase SQL Editor 執行：

**檔案：`database/FIX_BEACON_MESSAGES_CONSTRAINT.sql`**

---

### 步驟 2：執行完整修正腳本

在 Supabase SQL Editor 執行：

**檔案：`database/FINAL_BEACON_FIX_CORRECT_HWID.sql`**

這個腳本會：
1. 清理所有錯誤的 HWID 資料
2. 使用正確的 HWID（`018d4b2fdc`）重建設備
3. 建立 4 個訊息模板
4. 建立 4 個觸發動作
5. 驗證結果

---

### 步驟 3：驗證設定

執行後應該看到：

```
📡 Beacon 設備: hwid = 018d4b2fdc
💬 訊息模板: 4 個
⚡ 觸發動作: 4 個
📊 統計: device_count=1, message_count=4, action_count=4
```

---

## 📱 測試 Beacon

1. **完全關閉 LINE App**（從背景清除）
2. **重新開啟 LINE App**
3. **靠近 Beacon 設備**（1-2 公尺內）
4. **等待 5-10 秒**
5. **應該收到訊息！** 🎉

---

## 🔍 檢查測試結果

在 Supabase 執行：

```sql
SELECT 
  user_id,
  event_type,
  is_friend,
  message_sent,
  error_message,
  created_at
FROM beacon_events 
WHERE hwid = '018d4b2fdc' 
ORDER BY created_at DESC 
LIMIT 10;
```

**成功：** `message_sent = true` ✅
**失敗：** `message_sent = false`, 查看 `error_message` ❌

---

## 🎉 完成！

執行完以上步驟後，你的 Beacon 系統應該可以正常運作了！

