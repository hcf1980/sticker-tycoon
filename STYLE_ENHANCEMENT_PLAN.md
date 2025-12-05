# 🎨 風格差異化增強計畫

## 問題分析

目前風格和構圖的差異不夠明顯，主要問題：

### 1. **風格差異不顯著**
- 雖然有 StyleEnhancer，但 AI 可能沒有充分理解
- 需要更強烈、更具體的視覺指令
- 缺少風格的「禁止項目」來強化差異

### 2. **構圖差異不明顯**
- 全身/半身/大頭/特寫的差異不夠大
- AI 可能忽略構圖指令
- 需要更明確的尺寸和比例要求

### 3. **Prompt 結構問題**
- 太多資訊可能讓 AI 混淆
- 關鍵指令被淹沒在長文中
- 需要更清晰的優先級

---

## 🎯 解決方案

### 方案 1: 強化風格對比（推薦）⭐

為每個風格加入：
1. **極端化的視覺特徵**
2. **明確的禁止項目**
3. **參考藝術家/作品風格**
4. **色彩方案限制**

### 方案 2: 分離式 Prompt 結構

將 Prompt 分成三個優先級：
1. **P0 (最高)**: 風格核心特徵
2. **P1 (中等)**: 構圖和表情
3. **P2 (最低)**: 裝飾和細節

### 方案 3: 使用視覺權重標記

在 Prompt 中使用權重標記：
- `(((極重要)))` - 3層括號
- `((重要))` - 2層括號
- `(普通)` - 1層括號

---

## 📋 具體改進項目

### A. 風格差異化

#### 美顏真實 (realistic)
**強化前**:
```
beauty camera style portrait, soft airbrushed skin
```

**強化後**:
```
(((PHOTOREALISTIC BEAUTY FILTER STYLE)))
- Instagram beauty filter aesthetic
- Smooth porcelain skin with subtle pores
- Natural makeup look (light pink lips, soft blush)
- Professional beauty photography lighting
- Bokeh background blur effect
- High-end smartphone camera quality

FORBIDDEN: cartoon, anime, illustration, painting, sketch
COLOR PALETTE: Natural skin tones, soft pastels
REFERENCE: Beauty influencer selfie style
```

#### 可愛風 (cute)
**強化前**:
```
cute kawaii chibi style, rounded shapes
```

**強化後**:
```
(((KAWAII CHIBI ILLUSTRATION STYLE)))
- Sanrio/Line Friends character design
- Oversized head (head:body = 1:1 ratio)
- Huge sparkling eyes (eyes = 40% of face)
- Tiny nose (just a dot)
- Rounded everything (no sharp angles)
- Pastel color palette only

FORBIDDEN: realistic, detailed anatomy, sharp edges
COLOR PALETTE: Pastel pink, baby blue, mint green, lavender
REFERENCE: Pusheen, Molang, Rilakkuma style
```

#### 酷炫風 (cool)
**強化前**:
```
cool stylish character, bold neon colors
```

**強化後**:
```
(((URBAN STREET STYLE ILLUSTRATION)))
- Cyberpunk neon aesthetic
- Strong rim lighting (neon blue/pink edges)
- Sharp angular features
- Confident pose with attitude
- High contrast shadows (black shadows)
- Graffiti art influence

FORBIDDEN: cute, soft, pastel, rounded
COLOR PALETTE: Neon cyan, hot pink, electric purple, black
REFERENCE: Street art, hip-hop album covers
```

### B. 構圖差異化

#### 全身 (fullbody)
**強化前**:
```
FULL BODY shot from head to feet
```

**強化後**:
```
(((FULL BODY SHOT - HEAD TO TOE)))
MEASUREMENTS:
- Head size: 15% of frame height
- Body length: 80% of frame height
- Feet MUST be visible at bottom
- 5% margin at top and bottom

POSE: Standing, walking, or action pose
CAMERA ANGLE: Straight on, eye-level
FORBIDDEN: Cropped legs, cut-off feet, close-up
```

#### 半身 (halfbody)
**強化前**:
```
UPPER BODY shot from waist up
```

**強化後**:
```
(((HALF BODY SHOT - WAIST UP)))
MEASUREMENTS:
- Head size: 25% of frame height
- Torso: 60% of frame height
- Cut at waist level (belly button visible)
- Hands and arms MUST be in frame

POSE: Gesturing, waving, pointing
CAMERA ANGLE: Slightly below eye-level
FORBIDDEN: Full body, head-only, cut at chest
```

#### 大頭 (portrait)
**強化前**:
```
HEAD AND SHOULDERS portrait shot
```

**強化後**:
```
(((HEAD AND SHOULDERS PORTRAIT)))
MEASUREMENTS:
- Head size: 60% of frame height
- Face fills 50% of frame
- Shoulders visible (cut at mid-chest)
- Neck fully visible

POSE: Face forward, slight head tilt OK
CAMERA ANGLE: Eye-level
FORBIDDEN: Full body, extreme close-up, profile
```

#### 特寫 (closeup)
**強化前**:
```
EXTREME CLOSE-UP on face
```

**強化後**:
```
(((EXTREME FACE CLOSE-UP)))
MEASUREMENTS:
- Face fills 85% of frame
- Eyes at center of frame
- Forehead may be cropped
- Chin visible at bottom

POSE: Direct eye contact with camera
CAMERA ANGLE: Straight on
FORBIDDEN: Shoulders visible, full head, distant
```

---

## 🔧 實作步驟

### Step 1: 更新 StyleEnhancer
在 `sticker-styles.js` 中加入強化版描述

### Step 2: 更新 FramingTemplates
加入精確的尺寸要求和禁止項目

### Step 3: 重構 Prompt 生成器
使用分層結構，優先級清晰

### Step 4: 加入風格驗證
生成後檢查是否符合風格要求

---

## 📊 預期效果

### 風格差異
- 美顏真實 vs 可愛風：**90%+ 可辨識度**
- 酷炫風 vs 簡約風：**85%+ 可辨識度**
- 動漫風 vs 像素風：**95%+ 可辨識度**

### 構圖差異
- 全身 vs 特寫：**100% 可辨識度**
- 半身 vs 大頭：**80%+ 可辨識度**

---

## ⚠️ 注意事項

1. **不要過度複雜化** - 保持 Prompt 清晰
2. **測試每個風格** - 確保 AI 理解
3. **用戶反饋** - 收集實際使用數據
4. **逐步調整** - 不要一次改太多

---

## 🚀 下一步

1. 實作強化版 StyleEnhancer
2. 更新 FramingTemplates
3. 測試生成效果
4. 根據結果微調

