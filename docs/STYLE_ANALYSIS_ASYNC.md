# AI 風格分析器 - 異步處理架構

## 🎯 問題背景

原本的圖片分析功能會遇到 Netlify Functions 的 10 秒超時限制，導致分析失敗並出現 504 錯誤。

## ✨ 解決方案：Background Function + 輪詢模式

採用與貼圖生成相同的架構，將長時間運行的任務轉為後台處理。

### 架構圖

```
用戶上傳圖片
    ↓
前端 API (analyze-style-image.js)
    ↓
創建任務 → 立即返回 taskId (< 1 秒)
    ↓
觸發 Background Worker (analyze-style-image-background.js)
    ↓
後台執行分析 (最多 15 分鐘)
    ↓
前端輪詢查詢結果 (每 2 秒)
    ↓
獲取分析結果並填入表單
```

### 文件說明

#### 1. `functions/analyze-style-image.js`
**快速 API**（10 秒內完成）
- **POST**: 創建分析任務，返回 `taskId`
- **GET**: 查詢任務狀態 `?taskId=xxx`

#### 2. `functions/analyze-style-image-background.js`
**Background Worker**（最多 15 分鐘）
- 檔名以 `-background` 結尾，Netlify 自動識別
- 執行實際的 AI 圖片分析
- 更新任務進度到數據庫

#### 3. `supabase/migrations/20240118_create_style_analysis_tasks.sql`
**數據庫表結構**
- `style_analysis_tasks` 表：存儲任務狀態、進度、結果
- 自動清理 24 小時前的舊任務

#### 4. `public/admin/style-settings.js`
**前端輪詢邏輯**
- `analyzeStyleImage()`: 提交任務
- `pollTaskStatus()`: 輪詢查詢結果（最多 2 分鐘）
- 實時顯示進度百分比

## 🚀 使用流程

### 1. 數據庫設置
在 Supabase SQL Editor 執行：
```sql
-- 見 supabase/migrations/20240118_create_style_analysis_tasks.sql
```

### 2. 環境變數（已在 Netlify 設置）
```bash
AI_IMAGE_API_KEY=your_api_key
AI_IMAGE_API_URL=https://your-api-endpoint
AI_MODEL=gemini-2.0-flash-exp
```

### 3. 部署
```bash
git push origin main
```
Netlify 會自動識別 `-background` 結尾的函數並啟用 15 分鐘超時。

## 📊 任務狀態流程

```
pending (0%)
    ↓
processing (10% → 30% → 70%)
    ↓
completed (100%) ← 成功
    or
failed ← 失敗
```

## 🔧 技術細節

### 輪詢參數
- **間隔**: 2 秒
- **最大嘗試**: 60 次（共 2 分鐘）
- **超時處理**: 顯示友好錯誤訊息

### 進度更新點
- 10%: 任務開始
- 30%: API 請求發送
- 70%: AI 回應接收
- 100%: 解析完成

### 錯誤處理
- API 錯誤：記錄詳細錯誤訊息
- 超時錯誤：提示用戶稍後再試
- 網絡錯誤：自動重試

## 🎨 用戶體驗

### 分析過程顯示
```
🔄 正在提交分析任務...
    ↓
🤖 AI 分析中，請稍候（預計 30-60 秒）...
    ↓
🤖 AI 分析中... 30%
    ↓
🤖 AI 分析中... 70%
    ↓
✅ 分析完成！風格參數已自動填入
```

### 自動填入字段
- ✅ 核心風格 (coreStyle)
- ✅ 光線描述 (lighting)
- ✅ 構圖細節 (composition)
- ✅ 筆觸技巧 (brushwork)
- ✅ 氛圍情緒 (mood)
- ✅ 色彩方案 (colorPalette)
- ✅ 中文描述 (description)

## 🔍 監控與調試

### 查看日誌
```bash
# Netlify Functions 日誌
netlify functions:log analyze-style-image-background
```

### 數據庫查詢
```sql
-- 查看最近任務
SELECT * FROM style_analysis_tasks 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看失敗任務
SELECT * FROM style_analysis_tasks 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

## ✅ 優勢

1. **無超時問題**: Background Function 可運行 15 分鐘
2. **用戶體驗好**: 實時顯示進度，不會卡住
3. **完整分析**: AI 有充足時間完成深度分析
4. **容錯性強**: 網絡波動不影響任務執行
5. **可擴展**: 未來可加入更多分析功能

## 📝 注意事項

- Background Function 需要檔名以 `-background` 結尾
- 輪詢間隔不要太短，避免過多請求
- 定期清理舊任務，避免數據庫膨脹
- 確保 Supabase 表已正確創建

## 🔗 相關文件

- [Netlify Background Functions 文檔](https://docs.netlify.com/functions/background-functions/)
- [貼圖生成 Background Worker](./functions/sticker-generator-worker-background.js)
- [打包 Background Worker](./functions/pack-for-line-background.js)

