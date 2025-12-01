# 🎨 9宮格批次生成系統

## 📖 概述

9宮格批次生成系統是一個創新的 AI 圖片生成優化方案，透過單次生成 1024×1024 的網格圖，再自動裁切成 9 張獨立貼圖，**大幅降低 API 調用成本至原本的 11%**。

---

## 🎯 核心優勢

### 💰 成本節省
- **傳統模式**：1 張貼圖 = 1 次 API 調用
- **9宮格模式**：9 張貼圖 = 1 次 API 調用
- **成本降低**：88.9%

### 📊 效率提升
| 貼圖數量 | 傳統模式 | 9宮格模式 | 節省 |
|---------|---------|----------|------|
| 9 張    | 9 次 API | 1 次 API | 88.9% |
| 18 張   | 18 次 API | 2 次 API | 88.9% |
| 27 張   | 27 次 API | 3 次 API | 88.9% |

### ✨ 技術規格
- **AI 生成尺寸**：1024 × 1024 px
- **網格配置**：3 × 3
- **每格尺寸**：341 × 341 px
- **最終輸出**：370 × 320 px
- **內容區域**：350 × 300 px
- **留白**：10 px（上下左右各 10px）

---

## 🚀 使用方式

### 1️⃣ 在代碼中調用

```javascript
const { generateStickersIntelligent } = require('./sticker-generator-enhanced');

// 準備數據
const photoBase64 = '...'; // 用戶照片 base64
const style = 'cute';      // 貼圖風格
const expressions = [      // 9 個表情
  '開心', '大笑', '驚訝',
  '傷心', '生氣', '加油',
  '讚讚', 'OK', '晚安'
];

// 自動模式（系統自動選擇最優方案）
const results = await generateStickersIntelligent(photoBase64, style, expressions, {
  userId: 'user123',
  setId: 'set456',
  useGridMode: 'auto'  // 'auto' | 'always' | 'never'
});

// 檢查結果
results.forEach(result => {
  console.log(`${result.expression}: ${result.status}`);
  if (result.status === 'completed') {
    console.log(`  Storage: ${result.storagePath}`);
  }
});
```

### 2️⃣ 選項說明

```javascript
{
  userId: 'string',          // 用戶 ID
  setId: 'string',           // 貼圖組 ID
  useGridMode: 'auto',       // 生成模式
                             // - 'auto': 自動選擇（9/18/27 張用網格）
                             // - 'always': 強制使用網格
                             // - 'never': 強制使用傳統模式
  sceneConfig: object,       // 場景配置（可選）
  framingId: 'halfbody'      // 構圖方式
}
```

---

## 📐 技術細節

### 生成流程

```
用戶照片 (任意尺寸)
    ↓
AI 生成 (1024×1024, 3×3 網格)
    ↓
自動裁切 (9 個 341×341 區域)
    ↓
調整尺寸 (350×300 內容區)
    ↓
加入留白 (10px 邊距)
    ↓
最終輸出 (370×320 標準貼圖)
    ↓
上傳 Storage
```

### 裁切座標

```
1024×1024 網格分割：

(0,0)     (341,0)   (682,0)   (1024,0)
   ┌────────┬────────┬────────┐
   │ Cell 1 │ Cell 2 │ Cell 3 │
   │ 341×341│ 341×341│ 341×341│
(0,341)────┼────────┼────────┤
   │ Cell 4 │ Cell 5 │ Cell 6 │
   │        │        │        │
(0,682)────┼────────┼────────┤
   │ Cell 7 │ Cell 8 │ Cell 9 │
   │        │        │        │
   └────────┴────────┴────────┘
(0,1024)                   (1024,1024)
```

---

## 🎨 Prompt 設計

### 關鍵要素

1. **角色一致性**：使用 Character ID 確保同一人物
2. **表情差異化**：明確指定每格的表情
3. **透明背景**：100% 透明，無白底/灰底
4. **無邊框分隔**：網格間無線條，便於裁切
5. **居中對齊**：每格角色置中
6. **風格統一**：所有格子保持相同風格

### Prompt 範例

```
Generate a 3x3 grid of LINE stickers (1024x1024px total).
Each cell contains ONE character from the photo with different expressions.

=== GRID LAYOUT ===
Cell 1: 開心 | Cell 2: 大笑 | Cell 3: 驚訝
Cell 4: 傷心 | Cell 5: 生氣 | Cell 6: 加油
Cell 7: 讚讚 | Cell 8: OK   | Cell 9: 晚安

=== REQUIREMENTS ===
- Same character in ALL 9 cells
- Transparent background
- No grid lines or borders
- Centered in each cell
- Cute style, thick black outlines
```

---

## 💡 最佳實踐

### ✅ 建議做法

1. **優先使用 9 的倍數**：9/18/27 張可充分利用網格模式
2. **保持表情多樣性**：避免重複表情造成混淆
3. **使用 auto 模式**：讓系統自動選擇最優方案
4. **監控生成結果**：檢查 status 確保成功

### ❌ 注意事項

1. **非 9 倍數時**：8/10/12 張建議用傳統模式
2. **表情數量限制**：最少 9 個不同表情
3. **網格間留白**：AI 生成時需保持間距
4. **Storage 容量**：注意 Supabase 儲存空間

---

## 📊 成本對比

### 實際案例

**場景**：生成 27 張貼圖
- **傳統模式**：27 次 × $0.01 = $0.27
- **9宮格模式**：3 次 × $0.01 = $0.03
- **💰 節省**：$0.24（88.9%）

**年度規模**（假設 1000 組）
- **傳統模式**：27,000 次 = $270
- **9宮格模式**：3,000 次 = $30
- **💰 節省**：$240

---

## 🔧 維護與擴展

### 未來可能優化

1. **支援 4×4 網格**：16 張一次生成
2. **動態網格大小**：根據數量自動調整
3. **預覽功能**：生成前預覽網格佈局
4. **批次重試**：失敗格子單獨重新生成

### 監控指標

- 生成成功率
- 裁切準確度
- Storage 使用量
- API 調用次數

---

## 📞 聯絡與支援

如有問題或建議，請聯繫開發團隊。

---

**版本**：v1.0  
**最後更新**：2025-01-27

