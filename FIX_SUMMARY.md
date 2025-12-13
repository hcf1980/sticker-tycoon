# 🔧 貼圖一致性修復 - 完整修改清單

## 📋 問題總結

**問題：** 同一組貼圖在分批生成時，人物、風格、表情、裝飾不一致

**根本原因：**
1. 資料表 `sticker_sets` 缺少欄位：`expressions`、`scene`、`scene_config`、`character_id`
2. 程式碼嘗試寫入這些欄位，但被資料庫忽略
3. 讀取時獲得 `null`，導致使用預設值
4. 多批次生成時，每批次可能使用不同的預設值

---

## ✅ 已完成的修改

### 1️⃣ SQL Schema 修復

**檔案：** `FIX_STICKER_CONSISTENCY.sql`

**修改內容：**
```sql
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS expressions JSONB,
ADD COLUMN IF NOT EXISTS scene TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS scene_config JSONB,
ADD COLUMN IF NOT EXISTS character_id TEXT;
```

**執行方式：**
```bash
# 方法 1：通過 Supabase Dashboard
# 1. 進入 Supabase Dashboard
# 2. 進入 SQL Editor
# 3. 複製 FIX_STICKER_CONSISTENCY.sql 的內容
# 4. 執行

# 方法 2：通過 psql（如果有資料庫連線）
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB -f FIX_STICKER_CONSISTENCY.sql
```

### 2️⃣ 程式碼修復

#### A. `sticker-generator-worker-background.js`

**修改 1：保存 character_id（第 50-78 行）**
```javascript
// 🆕 生成角色一致性 ID（確保同一組貼圖使用相同角色）
const { generateCharacterID } = require('./sticker-styles');
let characterId = null;
if (setData.photoBase64) {
  characterId = generateCharacterID(setData.photoBase64.slice(0, 1000) + setData.style);
  console.log(`🎭 生成角色 ID: ${characterId}`);
}

// 建立貼圖組記錄
const { error: setError } = await supabase
  .from('sticker_sets')
  .insert([{
    // ... 其他欄位 ...
    character_id: characterId,  // 🆕 保存角色 ID
  }]);
```

**修改 2：讀取 character_id（第 150-170 行）**
```javascript
const { 
  // ... 其他欄位 ...
  character_id: savedCharacterId,  // 🆕 讀取保存的角色 ID
} = stickerSet;

console.log(`📋 character_id: ${savedCharacterId || '(無)'}`);  // 🆕 記錄
```

**修改 3：傳入 character_id（第 224-231 行）**
```javascript
generatedImages = await generateStickersIntelligent(photo_base64, style, expressions, {
  userId,
  setId,
  useGridMode,
  sceneConfig,
  framingId: framing,
  characterID: savedCharacterId  // 🆕 傳入保存的角色 ID
});
```

#### B. `sticker-generator-enhanced.js`

**修改：支援傳入 character_id（第 31-49 行）**
```javascript
async function generateStickersIntelligent(photoBase64, style, expressions, options = {}) {
  const {
    // ... 其他選項 ...
    characterID: providedCharacterID = null  // 🆕 允許傳入預先生成的 character ID
  } = options;

  // 🆕 優先使用提供的 character ID，否則動態生成
  const characterID = providedCharacterID || generateCharacterID(photoBase64.slice(0, 1000) + style);

  console.log(`🎭 角色 ID：${characterID}${providedCharacterID ? ' (使用保存的)' : ' (新生成)'}`);
}
```

---

## 🚀 部署步驟

### Step 1：執行 SQL 腳本

1. 開啟 Supabase Dashboard
2. 進入「SQL Editor」
3. 執行 `FIX_STICKER_CONSISTENCY.sql` 的內容
4. 驗證欄位已添加：
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns
   WHERE table_name = 'sticker_sets'
     AND column_name IN ('expressions', 'scene', 'scene_config', 'character_id');
   ```

### Step 2：部署更新的 Functions

```bash
# 部署 Supabase Functions
npx supabase functions deploy sticker-generator-worker-background
npx supabase functions deploy create-sticker-set

# 或使用自定義部署腳本
./deploy-functions.sh
```

### Step 3：測試驗證

1. **創建新的 12 張貼圖組**
   - 通過 LINE Bot 創建貼圖
   - 選擇 12 張套餐（測試多批次）

2. **檢查資料表記錄**
   ```sql
   SELECT 
     set_id, 
     name, 
     style, 
     scene, 
     framing,
     expressions,
     character_id,
     status
   FROM sticker_sets
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **驗證生成結果**
   - ✅ 所有貼圖應使用相同的人物
   - ✅ 相同的風格設定
   - ✅ 相同的裝飾元素
   - ✅ 相同的構圖方式

---

## 📊 預期效果

### 修復前 ❌
- 同一組貼圖的 12 張可能：
  - 人物不同（不同的臉）
  - 風格不同
  - 表情不匹配
  - 裝飾風格不一致

### 修復後 ✅
- 同一組貼圖的 12 張保證：
  - ✅ 使用完全相同的人物（character_id 保證）
  - ✅ 使用完全相同的風格設定（style 欄位）
  - ✅ 使用完全相同的表情列表（expressions 欄位）
  - ✅ 使用完全相同的裝飾風格（scene + scene_config 欄位）
  - ✅ 使用完全相同的構圖方式（framing 欄位）

---

## 🔍 如何驗證修復成功

### 測試場景 1：單批次生成（6張）
```
預期：一次生成完成，無需多批次
結果：應該成功
```

### 測試場景 2：多批次生成（12張）
```
預期：
- 第 1 批（1-6張）使用設定 A
- 第 2 批（7-12張）也使用設定 A（從資料表讀取）
結果：12 張貼圖視覺一致
```

### 測試場景 3：任務重試
```
步驟：
1. 模擬第一次生成失敗
2. Worker 重新讀取資料表
3. 使用保存的設定重試
預期：重試後的貼圖與第一次嘗試的設定相同
```

### 檢查 SQL
```sql
-- 檢查最近創建的貼圖組
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
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 檢查某個貼圖組的完整設定
SELECT 
  set_id,
  expressions,
  scene,
  scene_config,
  character_id
FROM sticker_sets
WHERE set_id = 'YOUR_SET_ID';
```

---

## 📝 相關文件

- `ANALYSIS_STICKER_CONSISTENCY_ISSUE.md` - 問題分析報告
- `FIX_STICKER_CONSISTENCY.sql` - SQL 修復腳本
- `functions/sticker-generator-worker-background.js` - Worker 邏輯
- `functions/sticker-generator-enhanced.js` - 智能生成器

---

## ⚠️ 注意事項

1. **舊資料不受影響**
   - 已完成的貼圖組不會被修改
   - 新欄位對舊記錄為 `NULL`，不影響現有功能

2. **向後兼容**
   - 如果 `character_id` 為 `NULL`，系統會自動生成
   - 如果 `expressions` 為 `NULL`，會使用預設表情
   - 不會破壞現有流程

3. **部署順序**
   - ✅ 先執行 SQL（添加欄位）
   - ✅ 再部署 Functions（使用欄位）
   - ❌ 不要反過來（會導致程式嘗試寫入不存在的欄位）

---

## ✅ 完成清單

- [x] 分析問題原因
- [x] 創建 SQL 修復腳本
- [x] 修改 worker 程式碼（保存 character_id）
- [x] 修改 worker 程式碼（讀取 character_id）
- [x] 修改智能生成器（支援傳入 character_id）
- [x] 創建測試驗證方案
- [ ] 執行 SQL 腳本（待執行）
- [ ] 部署 Functions（待執行）
- [ ] 測試驗證（待執行）

