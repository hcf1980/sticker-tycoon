# AI 模型配置說明

## 環境變數配置

本專案使用兩個不同的 AI 模型：

### 1. AI_MODEL - 圖片生成模型
**用途：** 生成貼圖圖片

**環境變數：**
- `AI_IMAGE_API_URL` - API 端點
- `AI_IMAGE_API_KEY` - API 金鑰
- `AI_MODEL` - 圖片生成模型

**推薦模型：**
```bash
AI_MODEL=gemini-2.0-flash-exp-image-generation
# 或
AI_MODEL=gemini-2.5-flash-image
```

**使用位置：**
- `functions/ai-generator.js` - 貼圖生成
- `functions/grid-generator.js` - 6宮格生成

---

### 2. AI_MODEL_2 - 圖片分析模型
**用途：** 分析圖片風格，提取參數

**環境變數：**
- `AI_IMAGE_API_URL` - API 端點（與 AI_MODEL 共用）
- `AI_IMAGE_API_KEY` - API 金鑰（與 AI_MODEL 共用）
- `AI_MODEL_2` - 圖片分析模型

**推薦模型：**
```bash
AI_MODEL_2=gpt-4o-mini
# 或
AI_MODEL_2=gpt-4o
# 或
AI_MODEL_2=gemini-2.0-flash-exp
```

**使用位置：**
- `functions/analyze-style-image.js` - 圖片風格分析

---

## Netlify 環境變數設定步驟

1. 前往 Netlify Dashboard
2. 選擇你的專案
3. 點擊 **Site settings** → **Environment variables**
4. 添加以下環境變數：

```
AI_IMAGE_API_URL=https://your-api-endpoint.com
AI_IMAGE_API_KEY=your_api_key_here
AI_MODEL=gemini-2.0-flash-exp-image-generation
AI_MODEL_2=gpt-4o-mini
```

---

## 為什麼需要兩個模型？

### AI_MODEL（圖片生成）
- 需要支援 **圖片生成** 功能
- 通常是 Gemini 的 image-generation 模型
- 用於創造新的貼圖圖片

### AI_MODEL_2（圖片分析）
- 需要支援 **Vision API**（圖片理解）
- 可以是 GPT-4o、GPT-4o-mini、Gemini Flash 等
- 用於分析參考圖片的風格
- 不需要生成圖片，只需理解圖片內容

---

## 模型選擇建議

### 預算優先（成本低）
```bash
AI_MODEL=gemini-2.5-flash-image          # 圖片生成
AI_MODEL_2=gpt-4o-mini                   # 圖片分析（便宜快速）
```

### 品質優先
```bash
AI_MODEL=gemini-2.0-flash-exp-image-generation  # 圖片生成
AI_MODEL_2=gpt-4o                                # 圖片分析（更精準）
```

### 全 Gemini（統一供應商）
```bash
AI_MODEL=gemini-2.0-flash-exp-image-generation
AI_MODEL_2=gemini-2.0-flash-exp
```

---

## 測試配置

### 測試圖片生成
1. 在 LINE Bot 中發送「生成貼圖」
2. 檢查 Netlify Functions 日誌
3. 確認使用 `AI_MODEL` 進行生成

### 測試圖片分析
1. 前往風格設置頁面：`/admin/style-settings.html`
2. 上傳圖片並點擊「✨ 分析風格」
3. 檢查瀏覽器 Console
4. 應該看到：`🤖 使用圖片分析模型: gpt-4o-mini (來自 AI_MODEL_2)`

---

## 常見問題

### Q: 可以兩個都用同一個模型嗎？
A: 不建議。圖片生成模型通常不擅長圖片分析，反之亦然。

### Q: AI_MODEL_2 是必須的嗎？
A: 如果不使用圖片分析功能，可以不設置。系統會使用預設值 `gpt-4o-mini`。

### Q: 如果 API 不支援某個模型怎麼辦？
A: 查看 Netlify Functions 日誌中的錯誤訊息，然後更換為 API 支援的模型。

### Q: 可以使用不同的 API 提供商嗎？
A: 目前 `AI_MODEL` 和 `AI_MODEL_2` 共用相同的 API URL 和 Key。如需使用不同供應商，需要修改代碼。

---

## 更新日誌

- **2024-12-12**: 新增 `AI_MODEL_2` 用於圖片分析
- **2024-12-12**: 分離圖片生成和圖片分析的模型配置

