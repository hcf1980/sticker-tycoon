# 🚨 貼圖生成失敗診斷與修復指南

## 問題現象
- 用戶確認生成後，沒有貼圖產生
- Netlify Function Logs 沒有 Background Worker 的執行日誌
- 貼圖狀態停留在 `draft` 或 `generating`

## 根本原因
**Supabase 資料表 `sticker_sets` 缺少 4 個必要欄位**，導致程式無法正確保存生成設定。

### 缺少的欄位：
1. `expressions` (JSONB) - 表情列表
2. `scene` (TEXT) - 場景/裝飾風格
3. `scene_config` (JSONB) - 場景配置
4. `character_id` (TEXT) - 角色一致性 ID

---

## 🔧 修復步驟（5 分鐘完成）

### Step 1: 檢查當前欄位（診斷）

1. 登入 Supabase Dashboard: https://supabase.com/dashboard
2. 選擇你的專案 (sticker-tycoon)
3. 點擊左側 **「SQL Editor」**
4. 執行以下 SQL：

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sticker_sets'
ORDER BY column_name;
```

5. **檢查結果**：
   - ❌ 如果看不到 `expressions`, `scene`, `scene_config`, `character_id` → 需要修復
   - ✅ 如果這 4 個欄位都存在 → 跳到 Step 3

---

### Step 2: 添加缺失欄位（修復）

在 Supabase SQL Editor 執行以下 SQL：

```sql
-- 添加表情列表欄位
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS expressions JSONB;

-- 添加場景風格欄位
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene TEXT DEFAULT 'none';

-- 添加場景配置欄位
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene_config JSONB;

-- 添加角色一致性 ID
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS character_id TEXT;
```

**預期結果**：顯示 `Success. No rows returned`

---

### Step 3: 驗證修復成功

執行以下 SQL 確認欄位已添加：

```sql
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'sticker_sets'
  AND column_name IN ('expressions', 'scene', 'scene_config', 'character_id')
ORDER BY column_name;
```

**預期結果**：
```
character_id | text  | NULL
expressions  | jsonb | NULL
scene        | text  | 'none'::text
scene_config | jsonb | NULL
```

---

### Step 4: 清理現有失敗任務（可選）

如果有卡住的生成任務，執行以下 SQL 清理：

```sql
-- 刪除失敗的貼圖組
DELETE FROM sticker_sets 
WHERE status IN ('draft', 'generating') 
  AND created_at < NOW() - INTERVAL '1 hour';

-- 刪除對應的生成任務
DELETE FROM generation_tasks 
WHERE status IN ('pending', 'processing') 
  AND created_at < NOW() - INTERVAL '1 hour';
```

---

### Step 5: 測試生成

1. 在 LINE Bot 中輸入「我要創建貼圖」
2. 完成所有選項（風格、構圖、表情、數量）
3. 點擊「✅ 確認生成」
4. **等待 2-5 分鐘**

#### 如何檢查生成狀態：

**方式 1：Netlify Function Logs**
- 打開：https://app.netlify.com/sites/sticker-tycoon/logs/functions
- 搜尋關鍵字：`sticker-generator-worker`
- 應該看到：
  ```
  🚀 [WORKER] 模組載入開始...
  ✅ [WORKER] supabase-client 載入成功
  🎨 開始 AI 生成 6 張貼圖...
  ```

**方式 2：Supabase 資料表**
- 在 SQL Editor 執行：
  ```sql
  SELECT 
    name, 
    status, 
    sticker_count,
    scene,
    framing,
    created_at
  FROM sticker_sets
  ORDER BY created_at DESC
  LIMIT 5;
  ```
- 檢查 `status` 欄位：
  - `draft` → 尚未開始生成
  - `generating` → 生成中
  - `completed` → 生成成功 ✅
  - `failed` → 生成失敗 ❌

---

## 🔍 如果還是失敗，檢查以下項目：

### 1. Netlify 部署狀態
- 打開：https://app.netlify.com/sites/sticker-tycoon/deploys
- 確認最新部署狀態為 **「Published」**（綠色）
- 最新 commit 應該是：`🔧 修正：Background Function 模組引用路徑`

### 2. Background Function 是否正確部署
- 在 Netlify Dashboard → Functions 頁面
- 搜尋：`sticker-generator-worker`
- 應該看到這個 function 存在

### 3. 環境變數檢查
在 Netlify Dashboard → Site settings → Environment variables，確認以下變數存在：
- `OPENAI_API_KEY` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_KEY` ✅
- `LINE_CHANNEL_ACCESS_TOKEN` ✅

### 4. OpenAI API 額度檢查
- 登入 OpenAI Dashboard: https://platform.openai.com/usage
- 確認還有可用額度

---

## 📋 完整錯誤日誌收集（如果問題持續）

請提供以下資訊：

1. **Netlify Function Logs**（最近 5 分鐘）
   - https://app.netlify.com/sites/sticker-tycoon/logs/functions
   - 複製整段日誌

2. **Supabase 最新貼圖組資料**：
   ```sql
   SELECT * FROM sticker_sets 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. **Supabase 最新生成任務**：
   ```sql
   SELECT * FROM generation_tasks 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

4. **LINE Bot 對話截圖**
   - 從「我要創建貼圖」到「確認生成」的完整流程

---

## ✅ 修復完成後的預期行為

1. 用戶點擊「✅ 確認生成」後，立即收到訊息：
   ```
   ✅ 開始生成！
   ⏳ 生成需要 2-5 分鐘，完成後會通知你
   ```

2. 2-5 分鐘後，用戶收到 LINE 推送訊息：
   ```
   🎉 貼圖生成完成！
   組名：XXX
   數量：6 張
   點選「我的貼圖」查看
   ```

3. 在「我的貼圖」中可以看到新生成的貼圖組

---

**現在請立即執行 Step 1-3，完成後回報結果！** 🚀

