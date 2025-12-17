# 🎯 Prompt 優化 - 快速摘要

## 問題
- 目前 Prompt 長度：**~1300 字**
- 目標：降低至 **~700 字** (減少 46%)

## 解決方案

### ✅ 不寫死，完全透過 Admin 管理

```
Supabase 資料庫
  └─ framing_settings (構圖設定表)
       ├─ prompt_addition (完整版 ~400字)
       ├─ compact_prompt (精簡版 ~60字) ← 🆕 新增
       └─ use_compact (切換開關) ← 🆕 新增
```

## 實施步驟

### 1. 更新資料庫
```bash
# 在 Supabase SQL Editor 執行
database/update_compact_prompts.sql
```

### 2. Admin 管理
訪問 `/admin/style-settings.html` → 「構圖設定」Tab

每個構圖可設定：
- ✅ 使用精簡模式（推薦，預設打勾）
- 精簡版 Prompt（~60 字）
- 完整版 Prompt（~400 字，保留）

### 3. 自動生效
代碼會自動：
- `use_compact = true` → 使用精簡版
- `use_compact = false` → 使用完整版

## 效果

| 項目 | 舊版 | 新版 | 節省 |
|------|-----|-----|------|
| Prompt 長度 | ~1300 字 | ~700 字 | **-46%** |
| Token 使用 | ~325 tokens | ~175 tokens | **-46%** |
| API 成本 | $100 | $54 | **-46%** |

## 優化內容

### 主要優化：構圖部分

| 構圖 | 完整版 | 精簡版 | 減少 |
|------|-------|--------|------|
| 全身 | ~400 字 | ~60 字 | -85% |
| 半身 | ~350 字 | ~55 字 | -84% |
| 大頭 | ~350 字 | ~60 字 | -83% |
| 特寫 | ~320 字 | ~58 字 | -82% |

**範例對比**：

完整版（~350 字）：
```
(((HALF BODY SHOT - WAIST UP)))

CRITICAL MEASUREMENTS:
- Head size: 25% of frame height (MEDIUM head)
- Torso: 60% of frame height
- Cut at waist level (belly button visible)
... [20+ 行詳細規則]
```

精簡版（~55 字）：
```
Waist up, 25% head, hands visible, 85% vertical fill
```

## 使用方式

### 推薦設定（預設）
```sql
use_compact = true  -- 使用精簡模式
```
✅ 適用於：
- 一般用戶生成
- 批次生成
- 降低成本

### 完整模式（特殊需求）
```sql
use_compact = false  -- 使用完整模式
```
⚠️ 適用於：
- 特殊構圖需求
- 極高品質要求

## 檔案清單

| 檔案 | 說明 |
|------|------|
| `functions/sticker-styles.js` | ✅ 已更新（支援精簡版）|
| `functions/style-settings-loader.js` | ✅ 已更新（載入精簡版）|
| `database/style_settings_schema.sql` | ✅ 已更新（新欄位）|
| `database/update_compact_prompts.sql` | 🆕 執行此腳本更新資料庫 |
| `PROMPT_OPTIMIZATION_GUIDE.md` | 📖 完整文檔 |

## 立即開始

### Step 1: 執行 SQL
```sql
-- 在 Supabase SQL Editor 執行
database/update_compact_prompts.sql
```

### Step 2: 驗證
```sql
SELECT framing_id, name, use_compact, 
       LENGTH(compact_prompt) as compact_len
FROM framing_settings;
```

### Step 3: 測試生成
在 LINE Bot 測試生成貼圖，檢查品質

## 故障排除

### Q: 品質下降？
在 Admin 調整 `compact_prompt` 或關閉 `use_compact`

### Q: 如何切換回完整版？
```sql
UPDATE framing_settings 
SET use_compact = false 
WHERE framing_id = 'halfbody';
```

## 監控
- Token 使用量：預期減少 46%
- 生成品質：保持 ≥95%
- API 成本：預期節省 46%

---

**完整文檔**: 查看 `PROMPT_OPTIMIZATION_GUIDE.md`

**已完成**: ✅ 代碼已更新，等待執行 SQL 腳本

