# 🎨 AI 風格提取器功能說明

## 功能概述

在**風格設定**頁面的編輯模態框中，新增了「AI 風格提取器」功能。管理員可以上傳任何參考圖片，AI 會自動分析圖片的藝術風格，並將分析結果填入風格參數欄位。

## 使用方法

### 1. 開啟風格編輯頁面
- 前往 **管理後台 → 風格設定**
- 點擊任何風格的「✏️ 編輯」按鈕

### 2. 使用 AI 風格提取器
1. 在編輯模態框頂部，找到紫色的「AI 風格提取器」區塊
2. 點擊「📸 選擇參考圖片」按鈕
3. 從電腦選擇一張參考圖片（支援 JPG、PNG 等格式）
4. 圖片預覽會顯示在下方
5. 點擊「✨ 分析風格」按鈕
6. 等待 AI 分析（約 5-10 秒）
7. 分析完成後，以下欄位會自動填入：
   - ✅ 核心風格 (Core Style)
   - ✅ 光線 (Lighting)
   - ✅ 構圖 (Composition)
   - ✅ 筆觸 (Brushwork)
   - ✅ 氛圍 (Mood)
   - ✅ 色彩方案 (Color Palette)
   - ✅ 描述

### 3. 調整並儲存
- AI 分析結果是建議值，您可以進一步修改和優化
- 檢查各欄位內容是否符合需求
- 點擊「💾 儲存變更」完成

## 技術原理

### 前端
- 使用 `FileReader API` 將圖片轉換為 base64
- 呼叫 `/.netlify/functions/analyze-style-image` API
- 接收分析結果並自動填入表單

### 後端
- **API 端點**: `/functions/analyze-style-image.js`
- **AI 模型**: OpenAI GPT-4 Vision (gpt-4o)
- **分析內容**:
  - 藝術風格類型
  - 光線特徵
  - 構圖方式
  - 筆觸/紋理
  - 整體氛圍
  - 色彩方案

### 提示工程
API 使用專業的系統提示詞，確保 AI 輸出：
- 符合 Stable Diffusion 提示詞格式
- 英文專業術語
- 可重現的視覺特徵
- 結構化 JSON 格式

## 範例

### 輸入圖片
上傳一張可愛的卡通貼圖

### AI 分析輸出
```json
{
  "coreStyle": "KAWAII CHIBI ILLUSTRATION STYLE - Sanrio/Line Friends character design",
  "lighting": "soft diffused lighting, minimal shadows, bright and cheerful",
  "composition": "centered character, simple background, kawaii proportions",
  "brushwork": "smooth vector-style lines, clean edges, flat color fills",
  "mood": "happy, cute, friendly, uplifting",
  "colorPalette": "pastel pink, baby blue, mint green, soft yellow, white",
  "description": "超可愛的 Q 版插畫風格，類似三麗鷗角色"
}
```

## 優勢

### ✅ 快速建立風格
- 不需要手動撰寫複雜的風格描述
- 幾秒鐘就能完成風格參數設定

### ✅ 專業分析
- AI 使用專業藝術術語
- 符合 AI 繪圖引擎的提示詞格式

### ✅ 彈性調整
- AI 結果僅作為起點
- 管理員可以進一步優化和個性化

### ✅ 學習工具
- 透過 AI 分析，學習如何描述藝術風格
- 理解不同風格的關鍵特徵

## 注意事項

1. **圖片大小**: 建議上傳 1MB 以內的圖片，太大可能影響處理速度
2. **圖片品質**: 清晰的圖片能獲得更準確的分析
3. **風格明確性**: 風格特徵明確的圖片分析效果更好
4. **結果檢查**: AI 分析結果僅供參考，建議人工檢查和調整
5. **API 成本**: 每次分析會消耗 OpenAI API 額度

## 相關文件

- **前端代碼**: `public/admin/style-settings.js`
- **API 端點**: `functions/analyze-style-image.js`
- **編輯頁面**: `public/admin/style-settings.html`

## 更新日誌

- **2024-01-XX**: 首次發布 AI 風格提取器功能
- 支援上傳圖片分析
- 自動填入 7 個風格參數欄位
- 整合 OpenAI GPT-4 Vision API

