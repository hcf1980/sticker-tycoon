# 🔍 貼圖一致性問題分析報告

## 📋 問題描述

用戶反應：**同一組貼圖在分批生成時，看起來不一致**
- 人物不同
- 風格不同
- 裝飾元素不同
- 構圖方式不同

## 🔎 根本原因分析

### 1️⃣ 資料表 Schema 問題

**`sticker_sets` 資料表缺少關鍵欄位：**

| 欄位 | 用途 | 當前狀態 | 影響 |
|------|------|----------|------|
| `expressions` | 保存用戶選擇的表情列表 | ❌ 不存在 | 重試時使用預設表情 |
| `scene` | 保存裝飾風格 ID (none/pop/kawaii) | ❌ 不存在 | 無法保持裝飾一致性 |
| `scene_config` | 保存完整的場景配置 JSON | ❌ 不存在 | 裝飾元素不一致 |
| `character_id` | 保存角色一致性 ID | ❌ 不存在 | 無法驗證人物一致性 |

### 2️⃣ 程式碼流程分析

#### 📝 寫入階段（`sticker-generator-worker-background.js` 第 51-69 行）
```javascript
const { error: setError } = await supabase
  .from('sticker_sets')
  .insert([{
    // ... 其他欄位 ...
    expressions: JSON.stringify(setData.expressions || []), // ✅ 程式有寫入
    scene: setData.scene || 'none',                         // ✅ 程式有寫入
    scene_config: setData.sceneConfig ? JSON.stringify(setData.sceneConfig) : null, // ✅ 程式有寫入
    // ❌ 但資料表沒有這些欄位，所以被忽略！
  }]);
```

#### 📖 讀取階段（`sticker-generator-worker-background.js` 第 141 行）
```javascript
const { 
  expressions: expressionsJson,  // ❌ 讀到 null（欄位不存在）
  scene,                          // ❌ 讀到 null
  scene_config: sceneConfigJson   // ❌ 讀到 null
} = stickerSet;
```

#### 🔄 回退邏輯（第 162-175 行）
```javascript
if (expressionsJson) {
  expressions = JSON.parse(expressionsJson); // 使用保存的表情
} else {
  expressions = DefaultExpressions.basic.expressions; // ❌ 使用預設表情！
  // 問題：每次重試可能用不同的預設表情
}
```

### 3️⃣ Character ID 生成機制

**當前機制：**
```javascript
// sticker-generator-enhanced.js 第 41 行
const characterID = generateCharacterID(photoBase64.slice(0, 1000) + style);
```

**問題：**
- ✅ 同一照片 + 同一風格 = 同一 ID（理論正確）
- ❌ 但 ID 未保存到資料表，無法追蹤驗證
- ❌ 如果照片或風格意外改變（如用戶重新上傳），ID 會不同

## 🎯 影響範圍

### 受影響的場景

1. **多批次生成（12張、18張套餐）**
   - 第一批 6 張：使用某組設定
   - 第二批 6 張：**可能使用不同設定**
   
2. **任務重試**
   - 第一次嘗試失敗
   - 重試時：**重新讀取資料表 → 讀到 null → 使用預設值**
   
3. **背景任務處理**
   - Worker 重啟後重新處理任務
   - 由於設定未保存，使用預設值

### 不受影響的場景

1. **單批次生成（6張以下）**
   - 一次 API 完成，不需要讀取設定
   
2. **成功的多批次生成（無重試）**
   - 只要不重試，設定在記憶體中保持一致

## 🛠️ 解決方案

### 方案 1：修改資料表 Schema（推薦）✅

**執行 SQL：**
```sql
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS expressions JSONB,
ADD COLUMN IF NOT EXISTS scene TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS scene_config JSONB,
ADD COLUMN IF NOT EXISTS character_id TEXT;
```

**優點：**
- ✅ 徹底解決問題
- ✅ 可追蹤和驗證設定
- ✅ 支援未來功能（如編輯貼圖組）

**缺點：**
- 需要執行資料庫遷移

### 方案 2：使用 temp_data 欄位（臨時方案）

將設定保存到 `conversation_states.temp_data`：
```javascript
await supabase.from('conversation_states').update({
  temp_data: {
    expressions,
    scene,
    sceneConfig,
    characterID
  }
}).eq('user_id', userId);
```

**優點：**
- 不需要修改 schema

**缺點：**
- ❌ 只能在對話期間使用
- ❌ 用戶切換對話後設定會丟失
- ❌ 不適合長期保存

## ✅ 建議採取的行動

### 立即執行（緊急修復）

1. **執行 SQL 腳本**
   ```bash
   psql -f FIX_STICKER_CONSISTENCY.sql
   ```

2. **驗證欄位已添加**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns
   WHERE table_name = 'sticker_sets'
     AND column_name IN ('expressions', 'scene', 'scene_config', 'character_id');
   ```

3. **重新部署 Functions**（程式碼已經支援這些欄位，只是資料表缺少）

### 測試驗證

1. **創建新的 12 張貼圖組**
2. **檢查資料表記錄**
   ```sql
   SELECT set_id, name, style, scene, framing, expressions, character_id
   FROM sticker_sets
   WHERE set_id = 'YOUR_SET_ID';
   ```
3. **驗證生成結果**
   - 12 張貼圖應使用相同的人物
   - 相同的風格設定
   - 相同的裝飾元素

### 長期改進

1. **添加資料驗證**
   - 生成前檢查必要欄位不為 null
   - 批次間驗證 character_id 一致性

2. **添加監控告警**
   - 如果讀取到 null 設定，記錄警告日誌
   - 監控預設表情使用率

3. **改進錯誤處理**
   - 當設定缺失時，標記任務為失敗而非使用預設值

## 📊 預期效果

修復後，同一組貼圖應該：
- ✅ 使用完全相同的照片/角色
- ✅ 使用完全相同的風格設定
- ✅ 使用完全相同的表情列表
- ✅ 使用完全相同的裝飾風格
- ✅ 使用完全相同的構圖方式
- ✅ 保持視覺一致性

