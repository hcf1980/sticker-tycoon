# 🔬 技術文檔 - Admin 設定同步架構

## 系統架構

```
┌─────────────────────────────────────┐
│     Supabase PostgreSQL Database    │
├─────────────────────────────────────┤
│  Tables:                            │
│  - style_settings                   │
│  - framing_settings                 │
│  - scene_settings                   │
│  - expression_template_settings     │
└──────────┬──────────────────────────┘
           │
           │ (Real-time Query)
           │
┌──────────▼──────────────────────────┐
│    LINE Webhook Handler             │
│    line-webhook.js                  │
└──────────┬──────────────────────────┘
           │
           │
┌──────────▼──────────────────────────┐
│    Create Handler Module            │
│    create-handler.js                │
├─────────────────────────────────────┤
│  Functions:                         │
│  - handleStartCreate()              │
│  - handlePhotoUpload()              │
│  - handleStyleSelection()           │
│  - handleFramingSelection() ✨      │
│  - handleExpressionTemplate()       │
│  - handleSceneSelection() ✨        │
│  - handleCountSelection()           │
└──────────┬──────────────────────────┘
           │
           │
┌──────────▼──────────────────────────┐
│    Helper Functions (NEW) ✨        │
├─────────────────────────────────────┤
│  - getActiveFramings()              │
│  - getFramingById()                 │
│  - getActiveScenes()                │
│  - getSceneById()                   │
└──────────┬──────────────────────────┘
           │
           │
┌──────────▼──────────────────────────┐
│    Supabase Client                  │
│    supabase-client.js               │
└──────────┬──────────────────────────┘
           │
           │ (SELECT WHERE is_active=true)
           │
┌──────────▼──────────────────────────┐
│    Supabase Database Server         │
└─────────────────────────────────────┘
```

---

## 數據流向

### 用戶創建流程（完整路徑）

```javascript
用戶行動 → LINE Message → Webhook → Handler → DB 查詢 → 返回用戶
  1           2           3         4         5       6
```

### 具體示例：構圖選擇

```
用戶點擊「上傳照片」
    ↓
webhook.js: handlePhotoUpload()
    ↓
create-handler.js: getActiveStyles() [讀取 DB]
    ↓
返回最新風格選項給用戶
    ↓
用戶選擇風格「cute」
    ↓
webhook.js: handleStyleSelection('cute')
    ↓
create-handler.js: handleStyleSelection()
    ↓
create-handler.js: generateFramingSelectionMessage(style)
    ↓
create-handler.js: await getActiveFramings() [讀取 DB] ✨
    ↓
Supabase: SELECT * FROM framing_settings WHERE is_active=true
    ↓
返回：[{framing_id: 'fullbody', ...}, ...]
    ↓
生成 Flex Message，發送給用戶
    ↓
用戶看到最新構圖選項 ✅
```

---

## 關鍵改動

### 改動 1: 異步化 generateFramingSelectionMessage()

**Before:**
```javascript
function generateFramingSelectionMessage(style) {
  const framingOptions = Object.values(FramingTemplates); // 硬編碼
  return { type: 'flex', ... };
}
```

**After:**
```javascript
async function generateFramingSelectionMessage(style) {
  const framingOptions = await getActiveFramings(); // DB
  return { type: 'flex', ... };
}
```

### 改動 2: 添加 DB 查詢函數

```javascript
async function getActiveFramings() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('framing_settings')
    .select('*')
    .eq('is_active', true)
    .order('framing_id');
    
  if (error) return Object.values(FramingTemplates); // fallback
  return data || Object.values(FramingTemplates);
}
```

---

## 數據庫查詢

### framing_settings 表結構

```sql
SELECT *
FROM framing_settings
WHERE is_active = true
ORDER BY framing_id;

結果示例:
[
  {
    framing_id: 'fullbody',
    name: '全身',
    emoji: '🧍',
    description: '完整全身...',
    is_active: true,
    created_at: ...,
    updated_at: ...
  },
  { ... }
]
```

### scene_settings 表結構

```sql
SELECT *
FROM scene_settings
WHERE is_active = true
ORDER BY scene_id;

結果示例:
[
  {
    scene_id: 'none',
    name: '簡約風',
    emoji: '✨',
    description: '乾淨簡約...',
    is_active: true,
    ...
  },
  { ... }
]
```

---

## 容錯機制

### 三層保護

```javascript
try {
  // 第 1 層：DB 查詢
  const { data, error } = await supabase.from(...);
  
  if (error) {
    // 第 2 層：錯誤處理
    console.error('DB 查詢失敗');
    return fallback;
  }
  
  if (!data || data.length === 0) {
    // 第 3 層：空值檢查
    console.log('無數據，使用預設值');
    return fallback;
  }
  
  return data;
} catch (error) {
  // 第 4 層：異常捕捉
  console.error('異常發生');
  return fallback;
}
```

---

## 性能優化

### 查詢優化
- ✅ 只查詢 is_active=true 的記錄
- ✅ 按 ID 排序以保持一致順序
- ✅ 單字段查詢，無 JOIN
- ✅ 預計 < 100ms 完成

### 快取策略
- ✅ Supabase 內部快取
- ✅ 無在應用層快取（確保即時性）
- ✅ 每次流程階段新查詢（最新設定）

---

## 測試場景

### 場景 1: Admin 修改構圖名稱

```javascript
1. Admin: 修改 fullbody.name = 'Full Body'
2. DB: 更新 framing_settings
3. User: 新建流程
4. Query: await getActiveFramings() 
5. Result: 返回最新名稱 'Full Body' ✅
```

### 場景 2: Admin 禁用某個構圖

```javascript
1. Admin: 設置 halfbody.is_active = false
2. DB: 更新 framing_settings
3. Query: WHERE is_active = true
4. Result: halfbody 不在列表中 ✅
```

---

## 調試技巧

### 啟用 Console 日誌

```javascript
// 日誌已內置：
console.log(`✅ 從資料庫載入 ${count} 個構圖`);
console.error('❌ 從資料庫載入構圖失敗:', error);
console.log('資料庫無構圖設定，使用預設值');
```

### Supabase 監控

1. Supabase Dashboard → Logs
2. 查看 framing_settings / scene_settings 查詢
3. 檢查響應時間和成功率

---

## 限制與注意事項

- ⚠️ 無本地快取，每次都查詢 DB
- ⚠️ 如果 DB 故障，回到硬編碼值
- ⚠️ 查詢失敗不會拋出異常，只會使用 fallback

---

**文檔版本**: 1.0
**最後更新**: 2024
**維護人**: [開發團隊]

