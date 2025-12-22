# ✅ Prompt V8.0 部署檢查清單

## 📋 部署前檢查

### 1. 代碼修改確認

- [x] **functions/sticker-styles.js**
  - [x] `generatePhotoStickerPromptV2()` 已精簡
  - [x] 所有 8 種風格的 `promptBase` 已精簡
  - [x] 所有 8 種風格的 `StyleEnhancer` 已精簡
  - [x] 添加了 Prompt 長度監控（console.log）
  - [x] 註解更新為 V8.0

- [x] **functions/ai-generator.js**
  - [x] `absoluteRequirements` 已精簡（852 → 142 字元）
  - [x] 添加 `ENABLE_DEEPSEEK` 環境變數支援
  - [x] 添加 Prompt 長度記錄

### 2. 測試驗證

- [x] **執行測試腳本**
  ```bash
  node test-actual-prompt-length.js
  ```
  - [x] 基礎 Prompt ≤ 600 字元
  - [x] 總計（含 DeepSeek）≤ 1000 字元
  - [x] 總計（不含 DeepSeek）≤ 750 字元

- [x] **檢查所有風格**
  - [x] realistic（美顏真實）
  - [x] cute（可愛風）
  - [x] cool（酷炫風）
  - [x] funny（搞笑風）
  - [x] simple（簡約風）
  - [x] anime（動漫風）
  - [x] pixel（像素風）
  - [x] sketch（素描風）

### 3. 文件準備

- [x] **FINAL_OPTIMIZATION_REPORT.md** - 完整優化報告
- [x] **PROMPT_V8_OPTIMIZATION_SUMMARY.md** - 優化總結
- [x] **PROMPT_V8_USAGE.md** - 使用說明
- [x] **DEPLOYMENT_CHECKLIST.md** - 部署檢查清單（本文件）

---

## 🚀 部署步驟

### Step 1: 提交代碼

```bash
git add functions/sticker-styles.js functions/ai-generator.js
git commit -m "feat: Prompt V8.0 優化 - 從 2520 字元降至 700-980 字元"
git push origin main
```

### Step 2: 設定環境變數（可選）

如果想使用精簡模式（~700 字元），在部署平台設定：

**Netlify:**
1. 進入 Site settings → Environment variables
2. 添加：`ENABLE_DEEPSEEK` = `false`
3. 重新部署

**其他平台:**
- 在環境變數設定中添加 `ENABLE_DEEPSEEK=false`

**預設行為（不設定）:**
- 使用高品質模式（~980 字元）
- DeepSeek 優化啟用

### Step 3: 部署驗證

部署後檢查：

1. **查看部署日誌**
   - 確認沒有錯誤
   - 確認文件正確載入

2. **測試生成功能**
   - 上傳一張照片
   - 選擇風格和表情
   - 開始生成
   - 檢查 console 日誌中的 Prompt 長度

3. **檢查生成結果**
   - 貼圖是否正常生成
   - 風格是否正確
   - 表情是否符合預期
   - 透明背景是否正確

---

## 📊 預期結果

### Prompt 長度

| 模式 | 預期長度 | 實際測試 | 狀態 |
|------|---------|---------|------|
| 基礎 Prompt | ~560 字元 | 560 字元 | ✅ |
| + DeepSeek | ~840 字元 | 839 字元 | ✅ |
| + absoluteRequirements | ~980 字元 | 981 字元 | ✅ |
| 不使用 DeepSeek | ~700 字元 | 702 字元 | ✅ |

### 生成成功率

- **V7.0 舊版**: ~60-70%（Prompt 太長導致失敗）
- **V8.0 新版**: 預期 >90%（Prompt 優化）

---

## 🐛 故障排除

### 問題 1: 部署後仍然生成失敗

**可能原因：**
- Prompt 仍然太長
- API 限制

**解決方案：**
1. 檢查 console 日誌中的 Prompt 長度
2. 如果 >1000 字元，設定 `ENABLE_DEEPSEEK=false`
3. 確認使用精簡版 FRAMING（52 字元）

### 問題 2: 表情不夠生動

**可能原因：**
- DeepSeek 優化被關閉

**解決方案：**
1. 確認 `ENABLE_DEEPSEEK` 未設定或設為 `true`
2. 檢查 DeepSeek API 是否可用

### 問題 3: 風格不明顯

**可能原因：**
- `promptBase` 或 `StyleEnhancer` 過度精簡

**解決方案：**
1. 檢查特定風格的 `promptBase`
2. 如需要，可以適度增加描述（但注意長度）
3. 從資料庫動態載入風格設定（`loadStylesFromDatabase()`）

---

## 📈 監控指標

部署後持續監控：

### 1. Prompt 長度
- 查看 console 日誌
- 確保 <1000 字元

### 2. 生成成功率
- 記錄成功/失敗次數
- 目標：>90% 成功率

### 3. 生成品質
- 風格是否正確
- 表情是否符合
- 透明背景是否正確

### 4. API 成本
- 監控 API 調用次數
- 精簡 Prompt 可能降低成本

---

## ✅ 部署完成確認

部署完成後，確認以下項目：

- [ ] 代碼成功部署
- [ ] 環境變數設定正確（如有）
- [ ] 測試生成功能正常
- [ ] Console 顯示 Prompt 長度
- [ ] Prompt 長度 <1000 字元
- [ ] 生成的貼圖品質良好
- [ ] 透明背景正確
- [ ] 風格符合預期
- [ ] 表情符合預期

---

## 📞 支援

如有問題，請參考：

1. **PROMPT_V8_USAGE.md** - 使用說明
2. **FINAL_OPTIMIZATION_REPORT.md** - 優化報告
3. **test-actual-prompt-length.js** - 測試腳本

---

## 🎉 完成！

**Prompt V8.0 已準備好部署！**

- ✅ Prompt 從 2,520 字元降至 702-981 字元
- ✅ 節省 61-72% 長度
- ✅ 避免生成失敗
- ✅ 提高 AI 效能

**祝部署順利！** [object Object]
