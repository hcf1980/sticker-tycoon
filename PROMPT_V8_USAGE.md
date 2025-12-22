# 🎯 Prompt V8.0 使用說明

## 📊 快速概覽

**V8.0 已將 Prompt 從 2,520 字元優化至 702-981 字元！**

| 模式 | Prompt 長度 | 適用場景 |
|------|------------|---------|
| **精簡模式** | ~700 字元 | API 限制嚴格、節省成本 |
| **高品質模式** | ~980 字元 | 推薦使用、表情更生動 |

---

## 🚀 快速開始

### 1. 預設使用（高品質模式）

無需任何設定，系統預設使用高品質模式：
- ✅ 啟用 DeepSeek 動態優化
- ✅ Prompt 長度：~980 字元
- ✅ 表情更生動、多樣化

### 2. 切換到精簡模式

如果需要更短的 Prompt（~700 字元），設定環境變數：

```bash
# 在 .env 文件中添加
ENABLE_DEEPSEEK=false
```

或在部署平台（如 Netlify）設定環境變數：
```
ENABLE_DEEPSEEK = false
```

---

## 📏 Prompt 長度監控

系統會自動在 console 記錄 Prompt 長度：

```javascript
console.log(`[object Object] 560 字元`);  // 基礎 Prompt
console.log(`   [object Object] 981 字元`);  // 最終 Prompt
```

---

## 🔍 測試 Prompt 長度

執行測試腳本查看實際 Prompt：

```bash
node test-actual-prompt-length.js
```

**輸出範例：**
```
🔍 測試實際生成時的 Prompt 長度
======================================================================
📏 Prompt 長度: 560 字元

🎯 最終完整 Prompt 統計：
📏 基礎 Prompt:             560 字元
📏 DeepSeek 增強:           279 字元
📏 最終要求:                142 字元
────────────────────────────────────────
📏 總計:                    981 字元
```

---

## 🎨 支援的風格

所有 8 種風格都已優化：

1. ✅ **realistic**（美顏真實）- 美顏相機風
2. ✅ **cute**（可愛風）- 圓潤可愛、大眼睛
3. ✅ **cool**（酷炫風）- 帥氣、動感、潮流
4. ✅ **funny**（搞笑風）- 誇張表情、幽默
5. ✅ **simple**（簡約風）- 線條簡潔、極簡
6. ✅ **anime**（動漫風）- 日系動漫、漫畫
7. ✅ **pixel**（像素風）- 復古像素、8-bit
8. ✅ **sketch**（素描風）- 逼真鉛筆素描

---

## 📝 實際 Prompt 範例

### cute 風格 + 早安表情

```
LINE sticker 370x320px: kawaii chibi, rounded, big sparkling eyes, pastel colors, glossy, thick outline

Kawaii chibi style, Sanrio/Line Friends design
Light: soft ambient, warm glow
Colors: pastel pink, baby blue, mint, lavender
Avoid: realistic, sharp edges, dark colors

早安: stretching arms up, bright morning smile, energetic wake-up pose "早安！"
Deco: sun rays, sparkles, musical notes, floating hearts, sparkling stars

ID:abc123def456 - Same face from photo
Waist up, 25% head, hands visible, 85% vertical fill

Transparent BG, 85-90% fill, thick outlines
```

**長度：560 字元**

---

## ⚙️ 環境變數說明

### `ENABLE_DEEPSEEK`

控制是否使用 DeepSeek 動態優化表情描述。

| 值 | 效果 | Prompt 長度 |
|----|------|------------|
| `true`（預設）| 啟用 DeepSeek 優化 | ~980 字元 |
| `false` | 關閉 DeepSeek 優化 | ~700 字元 |

**設定方式：**

1. **本地開發**（`.env` 文件）：
   ```bash
   ENABLE_DEEPSEEK=false
   ```

2. **Netlify 部署**：
   - 進入 Site settings → Environment variables
   - 添加 `ENABLE_DEEPSEEK` = `false`

3. **其他平台**：
   - 在平台的環境變數設定中添加

---

## 🐛 故障排除

### 問題：Prompt 太長導致生成失敗

**解決方案：**
1. 設定 `ENABLE_DEEPSEEK=false` 關閉 DeepSeek 優化
2. 檢查是否使用了精簡版 FRAMING（應該是 52 字元，不是 720 字元）
3. 執行測試腳本確認實際長度：`node test-actual-prompt-length.js`

### 問題：想要更生動的表情

**解決方案：**
1. 確保 `ENABLE_DEEPSEEK=true`（或不設定，使用預設值）
2. DeepSeek 會為每個表情生成獨特的動作描述

### 問題：如何查看實際發送的 Prompt

**解決方案：**
1. 查看 console 日誌，會顯示 Prompt 長度
2. 執行測試腳本：`node test-actual-prompt-length.js`
3. 查看完整 Prompt 內容

---

## 📚 相關文件

- **FINAL_OPTIMIZATION_REPORT.md** - 完整優化報告
- **PROMPT_V8_OPTIMIZATION_SUMMARY.md** - 優化總結
- **PROMPT_LENGTH_ISSUE_REPORT.md** - 問題分析報告
- **test-actual-prompt-length.js** - 測試腳本

---

## ✅ 確認清單

部署前請確認：

- [x] 所有風格的 `promptBase` 已精簡
- [x] 所有風格的 `StyleEnhancer` 已精簡
- [x] `absoluteRequirements` 已精簡（142 字元）
- [x] 添加了 Prompt 長度監控
- [x] 添加了 `ENABLE_DEEPSEEK` 環境變數支援
- [x] 測試腳本確認 Prompt 長度 < 1000 字元

---

## 🎉 完成！

**V8.0 優化已完成，Prompt 長度控制在 700-980 字元之間，避免生成失敗！** ✅

