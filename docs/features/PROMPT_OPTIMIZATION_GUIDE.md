# 🎯 Prompt 精簡優化方案

## 📊 問題分析

目前生成貼圖的 Prompt 長度約 **1300 字**，導致：
- Token 使用過高
- API 調用成本增加
- 生成速度較慢

**目標**：將 Prompt 降低至 **700 字左右**（減少 ~46%）

---

## ✅ 解決方案（不寫死，完全可透過 Admin 管理）

### 1️⃣ 架構設計

```
現有系統：
Supabase 資料庫
  ├─ style_settings (風格設定)
  ├─ framing_settings (構圖設定) ← 🆕 新增精簡版欄位
  ├─ scene_settings (裝飾風格)
  └─ expression_template_settings (表情模板)
     
Admin 管理頁面 (/admin/style-settings.html)
  ├─ 風格設定 Tab
  ├─ 構圖設定 Tab ← 🆕 新增「精簡模式」切換
  ├─ 裝飾風格 Tab
  └─ 表情模板 Tab
```

### 2️⃣ 資料庫變更

**新增欄位到 `framing_settings` 表**：

```sql
ALTER TABLE framing_settings 
ADD COLUMN compact_prompt TEXT;

ALTER TABLE framing_settings 
ADD COLUMN use_compact BOOLEAN DEFAULT true;
```

| 欄位 | 說明 | 範例 |
|------|------|------|
| `prompt_addition` | 完整版 Prompt (~400 字) | 詳細的構圖規則... |
| `compact_prompt` | 精簡版 Prompt (~60 字) | "Waist up, 25% head..." |
| `use_compact` | 是否使用精簡版 | true / false |

### 3️⃣ Prompt 精簡策略

#### 構圖部分優化（主要優化目標）

| 構圖類型 | 完整版長度 | 精簡版長度 | 減少比例 |
|---------|-----------|-----------|---------|
| 全身 (fullbody) | ~400 字 | ~60 字 | -85% |
| 半身 (halfbody) | ~350 字 | ~55 字 | -84% |
| 大頭 (portrait) | ~350 字 | ~60 字 | -83% |
| 特寫 (closeup) | ~320 字 | ~58 字 | -82% |

**完整版範例**（halfbody）：
```
(((HALF BODY SHOT - WAIST UP)))

CRITICAL MEASUREMENTS:
- Head size: 25% of frame height (MEDIUM head)
- Torso: 60% of frame height
- Cut at waist level (belly button visible)
- Hands and arms MUST be in frame
- Character fills 85% of vertical space

COMPOSITION RULES:
- Upper body from waist up
- Both arms visible and expressive
- Hands doing gestures (waving, pointing, etc.)
- Torso and chest clearly visible
- Camera angle: Slightly below eye-level

ABSOLUTELY FORBIDDEN:
- Full body with legs visible
- Head-only shots
- Cut at chest level
- Arms cropped out of frame
- Character smaller than 80% of frame
```

**精簡版範例**（halfbody）：
```
Waist up, 25% head, hands visible, 85% vertical fill
```

#### 整體 Prompt 結構優化

**舊版（~1300 字）**：
```
=== 🎨 PRIORITY 0: CORE ART STYLE ===
（詳細風格說明 200 字）

=== 😊 EXPRESSION & ACTION ===
（詳細表情說明 150 字）

=== 🎀 DECORATIONS (DYNAMIC LAYOUT) ===
（裝飾規則 200 字）

=== 👤 CHARACTER ===
（角色一致性規則 100 字）

=== 🖼️ FRAMING / COMPOSITION ===
（構圖規則 400 字）← 主要優化目標

=== 📐 SIZE & FILL REQUIREMENTS ===
（尺寸規格 150 字）

=== ⚠️ TECHNICAL REQUIREMENTS ===
（技術要求 100 字）

總計：~1300 字
```

**新版（~700 字）**：
```
LINE sticker from photo: [風格基礎]

🎨 STYLE: [核心風格]
Lighting: [光線] | [氛圍]
Colors: [色彩]
Avoid: [禁止項]

😊 EXPRESSION: [表情]
[動作描述]
Clear pose, readable at small size

🎀 DECORATIONS: [裝飾元素]
[風格元素]
Dynamic layout

👤 CHARACTER (ID: [角色ID]):
- Copy exact face/hair from photo
- Colorful casual outfit

🖼️ FRAMING: [構圖類型]
[精簡構圖規則] ← 從 400 字 → 60 字

📐 SIZE: 370x320px
- Character fills 85-90%
- Transparent background

總計：~700 字 ✅
```

---

## 🎛️ Admin 管理介面使用

### 在 Admin 頁面操作

1. 訪問 `/admin/style-settings.html`
2. 切換到「構圖設定」Tab
3. 編輯任何構圖（如「半身」）
4. 看到新欄位：
   - ✅ **使用精簡模式**：打勾則使用 `compact_prompt`
   - **精簡版 Prompt**：輸入精簡版文字（~60 字）
   - **完整版 Prompt**：保留原本的 `prompt_addition`（~400 字）

### 切換模式

```javascript
// 使用精簡模式（預設，推薦）
use_compact: true  → 使用 compact_prompt (~60 字)

// 使用完整模式（特殊需求）
use_compact: false → 使用 prompt_addition (~400 字)
```

---

## 📈 效果預測

### Token 使用對比

| 場景 | 舊版 Prompt | 新版 Prompt | 節省 |
|------|------------|------------|------|
| 生成 1 張貼圖 | ~1300 字 (~325 tokens) | ~700 字 (~175 tokens) | -46% |
| 生成 6 張貼圖 | ~7800 字 | ~4200 字 | -46% |
| 生成 18 張貼圖 | ~23400 字 | ~12600 字 | -46% |

### 成本節省

假設 API 費用為 $0.002 / 1K tokens：

| 生成數量 | 舊版成本 | 新版成本 | 節省 |
|---------|---------|---------|------|
| 100 張貼圖 | $6.5 | $3.5 | **-46% ($3)** |
| 1000 張貼圖 | $65 | $35 | **-46% ($30)** |
| 10000 張貼圖 | $650 | $350 | **-46% ($300)** |

---

## 🚀 實施步驟

### Step 1: 更新資料庫結構

執行 SQL 腳本：
```bash
# 在 Supabase SQL Editor 執行
database/update_compact_prompts.sql
```

### Step 2: 驗證變更

```sql
SELECT 
  framing_id, 
  name,
  LENGTH(prompt_addition) as full_length,
  LENGTH(compact_prompt) as compact_length,
  use_compact
FROM framing_settings;
```

### Step 3: 測試生成

1. 在 LINE Bot 測試生成貼圖
2. 檢查生成結果是否正常
3. 對比新舊版本的品質

### Step 4: 調整優化

根據實際效果：
- 品質良好 → 保持精簡模式
- 品質下降 → 在 Admin 關閉 `use_compact`
- 局部調整 → 修改 `compact_prompt` 內容

---

## 💡 最佳實踐

### 何時使用精簡模式？

✅ **推薦使用**（預設）：
- 一般用戶生成
- 批次生成 (6 張以上)
- 降低成本需求

❌ **不推薦使用**：
- 特殊構圖需求
- 極高品質要求
- 測試新風格

### 精簡版 Prompt 撰寫技巧

```
✅ 好的精簡版：
"Waist up, 25% head, hands visible, 85% vertical fill"
→ 簡潔、關鍵詞明確、包含百分比數值

❌ 不好的精簡版：
"Show the upper body with hands doing gestures..."
→ 太多贅詞、缺乏具體數值
```

---

## 📊 監控指標

### 需要追蹤的數據

| 指標 | 目標值 | 監控方式 |
|------|--------|---------|
| 平均 Prompt 長度 | ~700 字 | 日誌記錄 |
| Token 使用量 | -46% | API 統計 |
| 生成品質 | ≥95% 滿意度 | 用戶反饋 |
| API 成本 | -46% | 帳單分析 |

---

## 🔧 故障排除

### Q: 精簡版生成品質下降？

**方案 1**: 在 Admin 調整 `compact_prompt` 內容
```sql
UPDATE framing_settings 
SET compact_prompt = '更詳細的描述...' 
WHERE framing_id = 'halfbody';
```

**方案 2**: 關閉精簡模式
```sql
UPDATE framing_settings 
SET use_compact = false 
WHERE framing_id = 'halfbody';
```

### Q: 如何為新風格添加精簡版？

在 Admin 頁面：
1. 切換到「風格設定」
2. 新增風格時，同時填寫精簡版描述
3. 保持簡潔（50-80 字為佳）

---

## 📝 總結

### ✅ 優勢

1. **完全可管理**：透過 Admin 頁面調整，無需改代碼
2. **彈性切換**：可隨時切換完整版/精簡版
3. **大幅節省**：Token 使用 -46%，成本 -46%
4. **保持品質**：精簡版仍包含關鍵參數

### 🎯 建議

- **預設使用精簡模式**（`use_compact = true`）
- **定期檢查生成品質**
- **根據反饋調整** `compact_prompt` 內容
- **特殊需求時**才切回完整版

---

## 📞 技術支援

如需調整 Prompt 設定：
1. 訪問 `/admin/style-settings.html`
2. 切換到「構圖設定」Tab
3. 編輯對應的構圖項目
4. 調整「精簡版 Prompt」欄位
5. 點擊「儲存」

所有變更立即生效（有 5 分鐘快取）！


