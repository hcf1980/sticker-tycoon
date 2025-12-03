# 代碼修改對比

## 修改位置: `functions/grid-generator.js`

### 修改 1: 背景檢測邏輯 (第 464-476 行)

#### ❌ 舊代碼 (有問題)
```javascript
const isBackgroundColor = (r, g, b, tolerance = 25) => {
  // 純白背景 (最常見)
  const isWhite = r > 240 && g > 240 && b > 240;
  // 近白色
  const isNearWhite = r > 230 && g > 230 && b > 230 &&
                      Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
  // 淺灰背景
  const isLightGray = r > 200 && r < 240 && g > 200 && g < 240 && b > 200 && b < 240 &&
                      Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
  // 棋盤格深色 (#999, #AAA, #BBB, #CCC)
  const isCheckerGray = r > 140 && r < 210 && g > 140 && g < 210 && b > 140 && b < 210 &&
                        Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
  return isWhite || isNearWhite || isLightGray || isCheckerGray;
};
```

#### ✅ 新代碼 (已修復)
```javascript
// ✅ v2: 更嚴格的背景顏色檢測（避免誤刪角色區域）
const isBackgroundColor = (r, g, b) => {
  // ✅ 只移除純白背景（RGB 都 > 250）
  // 這樣可以保留角色的眼白、牙齒、衣服等亮色區域
  const isPureWhite = r > 250 && g > 250 && b > 250;

  // ✅ 只移除特定的棋盤格顏色（精確匹配）
  // 避免誤刪膚色、頭髮等灰色調
  const isCheckerboardLight = r === 204 && g === 204 && b === 204;  // #CCCCCC
  const isCheckerboardDark = r === 153 && g === 153 && b === 153;   // #999999

  return isPureWhite || isCheckerboardLight || isCheckerboardDark;
};
```

**改進點**:
- RGB > 250 (更嚴格) vs RGB > 240 (太寬泛)
- 精確匹配棋盤格 vs 範圍匹配
- 移除 isNearWhite (誤刪膚色)
- 移除 isLightGray (誤刪頭髮)

---

### 修改 2: 邊緣採樣點 (第 478-513 行)

#### ❌ 舊代碼 (只 8 個點)
```javascript
const edgeColors = [];
const samplePoints = [
  [0, 0], [width-1, 0], [0, height-1], [width-1, height-1], // 四角
  [Math.floor(width/2), 0], [Math.floor(width/2), height-1], // 上下中
  [0, Math.floor(height/2)], [width-1, Math.floor(height/2)] // 左右中
];

for (const [x, y] of samplePoints) {
  const idx = (y * width + x) * channels;
  edgeColors.push({ r: pixels[idx], g: pixels[idx+1], b: pixels[idx+2] });
}

const bgEdgeCount = edgeColors.filter(c => isBackgroundColor(c.r, c.g, c.b)).length;
const bgRatio = bgEdgeCount / edgeColors.length;
console.log(`    🔍 邊緣背景檢測：${bgEdgeCount}/${edgeColors.length} 點為背景色`);

if (bgRatio < 0.5) {
  console.log(`    ⏭️ 邊緣非背景色，跳過去背`);
  return imageBuffer;
}
```

#### ✅ 新代碼 (20+ 個點)
```javascript
// ✅ v2: 增加邊緣採樣點（從 8 個增加到 20+ 個）
const edgeColors = [];
const samplePoints = [];

// 四角
samplePoints.push([0, 0], [width-1, 0], [0, height-1], [width-1, height-1]);

// 上下邊緣均勻採樣
const xStep = Math.max(1, Math.floor(width / 5));
for (let x = 0; x < width; x += xStep) {
  samplePoints.push([x, 0]);
  samplePoints.push([x, height-1]);
}

// 左右邊緣均勻採樣
const yStep = Math.max(1, Math.floor(height / 5));
for (let y = 0; y < height; y += yStep) {
  samplePoints.push([0, y]);
  samplePoints.push([width-1, y]);
}

for (const [x, y] of samplePoints) {
  const idx = (y * width + x) * channels;
  edgeColors.push({ r: pixels[idx], g: pixels[idx+1], b: pixels[idx+2] });
}

// ✅ v2: 提高觸發閾值（從 0.5 改為 0.8）
// 只有 80% 以上的邊緣點都是背景色，才執行去背
const bgEdgeCount = edgeColors.filter(c => isBackgroundColor(c.r, c.g, c.b)).length;
const bgRatio = bgEdgeCount / edgeColors.length;
console.log(`    🔍 邊緣背景檢測：${bgEdgeCount}/${edgeColors.length} 點為背景色（比例：${(bgRatio*100).toFixed(1)}%）`);

if (bgRatio < 0.8) {
  console.log(`    ⏭️ 邊緣非背景色（< 80%），跳過去背`);
  return imageBuffer;
}
```

**改進點**:
- 採樣點: 8 個 → 20+ 個 (均勻分佈)
- 觸發閾值: 0.5 → 0.8 (更保守)
- 更詳細的日誌輸出

---

## 📊 參數對比表

| 參數 | 舊值 | 新值 | 說明 |
|------|------|------|------|
| isPureWhite 閾值 | > 240 | > 250 | 更嚴格 |
| isNearWhite | 存在 | ❌ 刪除 | 避免誤刪膚色 |
| isLightGray | 存在 | ❌ 刪除 | 避免誤刪頭髮 |
| isCheckerGray | 範圍匹配 | 精確匹配 | 更精確 |
| 採樣點數 | 8 | 20+ | 更全面 |
| 觸發閾值 | 0.5 (50%) | 0.8 (80%) | 更保守 |

---

## 🎯 效果預期

### 修復前的問題
```
生成的貼圖:
- 眼白區域: 白斑 ❌
- 牙齒區域: 白斑 ❌
- 衣服亮部: 白斑 ❌
- 頭髮邊緣: 模糊 ❌
```

### 修復後的效果
```
生成的貼圖:
- 眼白區域: 清晰保留 ✅
- 牙齒區域: 清晰保留 ✅
- 衣服亮部: 清晰保留 ✅
- 頭髮邊緣: 清晰銳利 ✅
- 棋盤格背景: 完全移除 ✅
```

