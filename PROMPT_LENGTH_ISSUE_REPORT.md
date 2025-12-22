# ⚠️ Prompt 長度問題報告

## 🔴 問題發現

**V7.0 宣稱：「從 1300字 → 700字」**  
**實際測試：2,520 字元！**

---

## 📊 實際 Prompt 組成

### 測試條件
- 風格：cute（可愛風）
- 表情：早安
- 場景：kawaii（夢幻可愛）
- 構圖：halfbody（半身）
- 使用 DeepSeek 優化

### 字元數分解

| 區塊 | 字元數 | 佔比 |
|------|--------|------|
| 1️⃣ 基礎 Prompt (`generatePhotoStickerPromptV2`) | **1,389** | 55.1% |
| 2️⃣ DeepSeek 增強 | 279 | 11.1% |
| 3️⃣ 最終要求 (`absoluteRequirements`) | **852** | 33.8% |
| **總計** | **2,520** | **100%** |

---

## 🔍 問題根源分析

### 問題 1：基礎 Prompt 並未精簡到 700 字元

**`generatePhotoStickerPromptV2()` 實際輸出：1,389 字元**

```javascript
LINE sticker from photo: 
      cute kawaii chibi style, rounded shapes, oversized sparkling eyes,
      soft pastel palette, glossy highlights, warm ambient lighting,
      thick clean outline, high charm factor, simplified sticker-friendly composition
    

🎨 STYLE: (((KAWAII CHIBI ILLUSTRATION STYLE))) - Sanrio/Line Friends character design, super deformed proportions
Lighting: soft ambient lighting, gentle bounce light, warm glow, no harsh shadows | warm cozy atmosphere, heartwarming feeling, adorable charm
Colors: pastel pink, baby blue, mint green, lavender, soft yellows
Avoid: realistic, detailed anatomy, sharp edges, dark colors, gritty textures

😊 EXPRESSION: 早安
stretching arms up, bright morning smile, energetic wake-up pose
Clear pose, readable at small size
POP TEXT: "早安！" (cute rounded text, pastel colors, soft bubble font)

🎀 DECORATIONS: sun rays, sparkles, musical notes
floating hearts, sparkling stars
kawaii pastel style, dreamy soft colors
Dynamic layout, varied sizes

👤 CHARACTER (ID: abc123def456):
- Copy exact face/hair from photo
- Colorful casual outfit
- Consistent across set

🖼️ FRAMING: 半身
Waist up, 25% head, hands visible, 85% vertical fill

📐 SIZE: 370x320px LINE sticker
- Character fills 85-90% of frame
- 10px safe margin
- Transparent background (alpha=0)
- Thick outlines for small size

OUTPUT: 可愛風 style, transparent BG, 370x320px
```

### 問題 2：`absoluteRequirements` 額外增加 852 字元

**位置：**`functions/ai-generator.js` 第 466-484 行

這段在 `generateStickerFromPhotoEnhanced()` 函數中**額外添加**：

```javascript
const absoluteRequirements = `

=== 🔒 FINAL OUTPUT REQUIREMENTS ===
1. BACKGROUND: 100% TRANSPARENT (alpha=0) - NO white, NO gray, NO color
2. T-SHIRT: Solid pure white (#FFFFFF) - NO patterns, NO stripes
3. CHARACTER: Same as photo, ID: ${characterID}
4. STYLE: Apply ${style} style distinctly
5. OUTLINES: Thick black (2-3px)
6. FRAMING: ${framingName}構圖 - ${framingFocus}
7. TEXT: NONE
8. NO FRAMES: NO circular frame, NO border, NO avatar style, NO vignette

CRITICAL:
- Background MUST be transparent (PNG cutout style)
- Character must be FREE-FLOATING, NO circular frames
- STRICTLY follow ${framingName} framing: ${framingFocus}
- Skin tone MUST be warm peachy-beige, consistent across all stickers

Generate the ${style} style ${framingName} sticker NOW.`;

finalPrompt += absoluteRequirements;  // ← 這裡追加！
```

**問題：**
- 這段與基礎 Prompt 中的規則**大量重複**
- 例如：透明背景、構圖、尺寸等都重複說明

### 問題 3：DeepSeek 增強也會增加長度

如果啟用 DeepSeek（預設啟用），會再增加 ~200-300 字元

---

## [object Object]7.0「超精簡版」的誤解

### 註解說明（第 779-792 行）

```javascript
/**
 * 🎯 生成照片貼圖的優化 Prompt V7.0（超精簡版）
 * ...
 * ✨ 優化: 從 1300字 → 700字，提高 AI 效能
 * 📊 精簡策略：
 *   - 移除冗長說明文字
 *   - 合併重複規則
 *   - 只保留核心參數
 *   - 使用更簡潔的表達
 */
```

**實際情況：**
- ✅ FRAMING 確實精簡了（720 → 52 字元）
- ❌ 但整體 Prompt 並未達到 700 字元
- ❌ `absoluteRequirements` 重複了很多規則
- ❌ 最終輸出 2,520 字元（是目標的 3.6 倍）

---

## 🎯 真正的優化建議

### 優先級 1：移除 `absoluteRequirements` 的重複內容

**現在的問題：**
- 基礎 Prompt 已經說明了透明背景、尺寸、構圖
- `absoluteRequirements` 又重複說明一次

**建議：**
```javascript
// 精簡版 absoluteRequirements（~200 字元）
const absoluteRequirements = `

=== CRITICAL FINAL CHECKS ===
- Transparent BG (alpha=0), NO white/gray
- Character ID: ${characterID} (same face)
- ${framingName} framing strictly
- Warm peachy-beige skin tone
- NO circular frames/borders`;
```

**節省：852 → 200 = 節省 652 字元**

---

### 優先級 2：精簡基礎 Prompt 的固定文字

**現在：**
```
📐 SIZE: 370x320px LINE sticker
- Character fills 85-90% of frame
- 10px safe margin
- Transparent background (alpha=0)
- Thick outlines for small size

OUTPUT: 可愛風 style, transparent BG, 370x320px
```

**建議：**
```
📐 370x320px, 85-90% fill, transparent BG, thick outlines
```

**節省：~150 字元**

---

### 優先級 3：精簡裝飾描述

**現在：**
```
🎀 DECORATIONS: sun rays, sparkles, musical notes
floating hearts, sparkling stars
kawaii pastel style, dreamy soft colors
Dynamic layout, varied sizes
```

**建議：**
```
🎀 DECO: sun rays, sparkles, hearts, stars (kawaii pastel, varied sizes)
```

**節省：~80 字元**

---

## 📊 優化後預估

| 項目 | 現在 | 優化後 | 節省 |
|------|------|--------|------|
| 基礎 Prompt | 1,389 | ~950 | -439 |
| DeepSeek 增強 | 279 | 279 | 0 |
| absoluteRequirements | 852 | ~200 | -652 |
| **總計** | **2,520** | **~1,429** | **-1,091** |

**仍然超過 700 字元目標，但至少減少 43%**

---

## 🔧 建議的修改方案

### 方案 A：激進精簡（目標 700 字元）

移除所有冗餘，只保留核心：
- 移除 emoji 標題
- 移除重複說明
- 使用縮寫
- 移除 `absoluteRequirements`

### 方案 B：溫和優化（目標 1,200 字元）

保持可讀性，移除明顯重複：
- 精簡 `absoluteRequirements`
- 合併相似規則
- 保留核心描述

### 方案 C：分層 Prompt（推薦）

根據 AI 模型能力動態調整：
- Gemini 2.5 Flash：使用完整版（理解力強）
- 其他模型：使用精簡版

---

## ✅ 立即可做的改進

1. **修改 `absoluteRequirements`**（`ai-generator.js` 第 466-484 行）
2. **精簡固定模板文字**（`sticker-styles.js` 第 821-851 行）
3. **添加 Prompt 長度監控**（記錄實際使用的字元數）

需要我幫您實施這些優化嗎？

