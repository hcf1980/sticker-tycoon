# 🚀 部署指南 - 貼圖一致性修復

## 📋 前置檢查清單

在開始部署前，請確認：

- [ ] 已閱讀 `ANALYSIS_STICKER_CONSISTENCY_ISSUE.md`（問題分析）
- [ ] 已閱讀 `FIX_SUMMARY.md`（修改摘要）
- [ ] 已備份當前資料庫（可選，但建議）
- [ ] 已確認 Supabase 連線正常

---

## 🗄️ 步驟 1：資料庫 Schema 更新

### 執行 SQL 腳本

#### 方法 A：通過 Supabase Dashboard（推薦）

1. 開啟瀏覽器，前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案（sticker-tycoon）
3. 左側選單點擊「SQL Editor」
4. 點擊「New Query」
5. 複製 `FIX_STICKER_CONSISTENCY.sql` 的內容並貼上
6. 點擊「Run」執行

#### 方法 B：使用 psql 指令（進階）

```bash
# 如果有 psql 和資料庫連線資訊
psql \
  -h YOUR_SUPABASE_HOST \
  -U postgres \
  -d postgres \
  -f FIX_STICKER_CONSISTENCY.sql
```

### 驗證欄位已添加

執行以下 SQL 確認欄位已成功添加：

```sql
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sticker_sets'
  AND column_name IN ('expressions', 'scene', 'scene_config', 'character_id')
ORDER BY column_name;
```

**預期結果：**
```
    column_name   | data_type | column_default |  is_nullable
------------------+-----------+----------------+---------------
 character_id     | text      | NULL           | YES
 expressions      | jsonb     | NULL           | YES
 scene            | text      | 'none'::text   | YES
 scene_config     | jsonb     | NULL           | YES
```

✅ 如果看到以上 4 個欄位，代表 Schema 更新成功！

---

## 💻 步驟 2：部署 Netlify Functions

### 檢查已修改的檔案

```bash
git status
```

應該會看到：
- ✅ `functions/sticker-generator-worker-background.js`（已修改）
- ✅ `functions/sticker-generator-enhanced.js`（已修改）
- ✅ `FIX_STICKER_CONSISTENCY.sql`（新增）
- ✅ `ANALYSIS_STICKER_CONSISTENCY_ISSUE.md`（新增）
- ✅ `FIX_SUMMARY.md`（新增）

### 提交變更

```bash
# 查看修改內容
git diff functions/sticker-generator-worker-background.js
git diff functions/sticker-generator-enhanced.js

# 添加檔案
git add functions/sticker-generator-worker-background.js
git add functions/sticker-generator-enhanced.js
git add FIX_STICKER_CONSISTENCY.sql
git add ANALYSIS_STICKER_CONSISTENCY_ISSUE.md
git add FIX_SUMMARY.md
git add DEPLOYMENT_GUIDE.md

# 提交
git commit -m "🔧 修復貼圖一致性問題

- 添加 expressions/scene/scene_config/character_id 欄位到資料表
- 修改 worker 保存和讀取 character_id
- 修改智能生成器支援傳入 character_id
- 確保同一組貼圖使用相同的設定和人物"

# 推送到遠端
git push origin main
```

### 自動部署

推送後，Netlify 會自動部署：

1. 前往 [Netlify Dashboard](https://app.netlify.com/)
2. 選擇「sticker-tycoon」專案
3. 點擊「Deploys」查看部署狀態
4. 等待部署完成（通常 2-5 分鐘）

✅ 看到綠色的「Published」代表部署成功！

---

## 🧪 步驟 3：測試驗證

### 測試 1：創建新的 12 張貼圖組

1. **打開 LINE Bot**
2. **輸入「創建貼圖」**
3. **完整流程：**
   - 輸入名稱（例如：測試一致性）
   - 上傳照片（使用清晰的大頭照）
   - 選擇風格（例如：可愛風）
   - 選擇構圖（例如：半身）
   - 選擇表情模板（例如：基本日常）
   - 選擇裝飾風格（例如：夢幻可愛）
   - **重點：選擇 12 張套餐**
   - 確認生成

### 測試 2：檢查資料表記錄

在 Supabase Dashboard 的 SQL Editor 執行：

```sql
SELECT 
  set_id,
  name,
  style,
  scene,
  framing,
  jsonb_array_length(expressions) as expression_count,
  character_id,
  status,
  created_at
FROM sticker_sets
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**預期結果：**
- ✅ `expressions` 不是 NULL（應該是 JSONB 陣列）
- ✅ `scene` 不是 NULL（應該是 'kawaii' 或其他）
- ✅ `scene_config` 不是 NULL（應該是 JSONB 物件）
- ✅ `character_id` 不是 NULL（應該是一個字串）
- ✅ `expression_count` 應該是 12

### 測試 3：檢查生成結果

等待生成完成（約 1-3 分鐘），然後：

1. **在 LINE Bot 輸入「我的貼圖」**
2. **查看剛生成的貼圖組**
3. **仔細檢查 12 張貼圖：**
   - ✅ 人物是否一致（同一張臉）
   - ✅ 風格是否一致（例如都是可愛風）
   - ✅ 裝飾元素是否一致（例如都有愛心、星星）
   - ✅ 構圖是否一致（例如都是半身）

### 測試 4：檢查日誌

在 Netlify Dashboard：

1. 點擊「Functions」
2. 找到「sticker-generator-worker-background」
3. 點擊「View logs」
4. 查看最近的日誌

**應該看到：**
```
🎭 生成角色 ID: char_abc123...
📋 character_id: char_abc123...
🎭 角色 ID：char_abc123... (使用保存的)
```

✅ 如果看到「使用保存的」，代表 character_id 正確傳遞！

---

## 🔍 驗證清單

### 資料表驗證

- [ ] `sticker_sets` 表有 `expressions` 欄位
- [ ] `sticker_sets` 表有 `scene` 欄位
- [ ] `sticker_sets` 表有 `scene_config` 欄位
- [ ] `sticker_sets` 表有 `character_id` 欄位

### 功能驗證

- [ ] 新建的貼圖組有保存 `expressions`（不是 NULL）
- [ ] 新建的貼圖組有保存 `scene`（不是 NULL）
- [ ] 新建的貼圖組有保存 `character_id`（不是 NULL）
- [ ] 12 張貼圖組的人物一致
- [ ] 12 張貼圖組的風格一致
- [ ] 12 張貼圖組的裝飾一致

### 日誌驗證

- [ ] 日誌顯示「生成角色 ID」
- [ ] 日誌顯示「使用保存的」character_id
- [ ] 沒有錯誤訊息

---

## ⚠️ 常見問題

### Q1：執行 SQL 時出現權限錯誤

**解決方案：**
- 確認使用的是 Service Role Key（不是 Anon Key）
- 在 Supabase Dashboard 的 SQL Editor 中執行（已有正確權限）

### Q2：部署後 Functions 沒有更新

**解決方案：**
```bash
# 手動觸發部署
netlify deploy --prod

# 或清除 Functions 快取
netlify functions:serve --force
```

### Q3：舊的貼圖組欄位是 NULL

**這是正常的：**
- 舊貼圖組不會被修改
- 只有新建的貼圖組會有這些欄位
- 如果需要，可以用 SQL 補充預設值（見 `FIX_STICKER_CONSISTENCY.sql` 第 6️⃣ 步驟）

### Q4：生成的貼圖仍然不一致

**檢查步驟：**

1. **確認資料表欄位已添加**
   ```sql
   SELECT * FROM information_schema.columns 
   WHERE table_name = 'sticker_sets' 
     AND column_name = 'character_id';
   ```

2. **確認新貼圖組有保存資料**
   ```sql
   SELECT character_id, expressions 
   FROM sticker_sets 
   WHERE set_id = 'YOUR_SET_ID';
   ```

3. **檢查 Functions 日誌**
   - 看是否有錯誤訊息
   - 確認「使用保存的」character_id

4. **聯繫支援**
   - 提供 set_id
   - 提供日誌截圖

---

## ✅ 完成後的效果

### 修復前 ❌

```
貼圖組：12 張
├─ 第 1-6 張：人物 A，可愛風，夢幻裝飾
└─ 第 7-12 張：人物 B，簡約風，無裝飾  ❌ 不一致！
```

### 修復後 ✅

```
貼圖組：12 張
├─ 第 1-6 張：人物 A，可愛風，夢幻裝飾
└─ 第 7-12 張：人物 A，可愛風，夢幻裝飾  ✅ 完全一致！
```

---

## 📞 支援

如果遇到問題：

1. **檢查日誌**
   - Netlify Functions 日誌
   - Supabase 資料庫日誌

2. **檢查資料**
   - 執行驗證 SQL
   - 確認欄位存在

3. **回滾**
   ```bash
   # 如果需要回滾到上一版本
   git revert HEAD
   git push origin main
   ```

---

**部署愉快！🎉**

