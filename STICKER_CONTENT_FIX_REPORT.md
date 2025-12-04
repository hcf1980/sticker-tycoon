# 貼圖內容查看功能修復報告

## 問題概述
貼圖管理後台無法顯示貼圖組內的貼圖圖片，顯示「沒有找到貼圖圖片」。

## 修復內容

### 1. 後端修復 (`functions/admin-cleanup.js`)

**修改位置**: 第 133-154 行

**改進點**:
- ✅ 移除了過於嚴格的檔案名稱篩選 (`sticker_` 前綴要求)
- ✅ 改為只篩選 `.png` 檔案
- ✅ 添加了調試日誌以診斷問題
- ✅ 改進了資料夾排除邏輯

**新邏輯**:
```javascript
.filter(f => {
  // 排除資料夾（資料夾沒有副檔名）
  if (f.id && !f.name.includes('.')) return false;
  // 只接受 PNG 檔案
  return f.name.toLowerCase().endsWith('.png');
})
```

### 2. 前端改進 (`public/admin/sticker-manager.html`)

**修改位置**: 第 331-374 行

**改進點**:
- ✅ 添加了詳細的調試日誌
- ✅ 顯示貼圖組基本資訊（ID、狀態、數量）
- ✅ 添加了圖片載入失敗的備用圖片
- ✅ 改進了錯誤訊息提示
- ✅ 顯示檔案名稱

## 測試步驟

### 1. 檢查瀏覽器控制台
- 打開貼圖管理頁面
- 按 F12 開啟開發者工具
- 查看 Console 標籤
- 點擊「查看」按鈕
- 觀察日誌輸出

### 2. 驗證修復
- 應該看到 `[showDetail] Loading details for setId: xxx`
- 應該看到 `[getStickerSetDetail] files found: N`
- 應該看到 `[getStickerSetDetail] filtered stickers: N`

### 3. 檢查 Storage 結構
- 登入 Supabase 控制台
- 進入 Storage > sticker-images
- 驗證貼圖檔案是否存在
- 檢查檔案名稱格式

## 可能的原因

如果修復後仍無法顯示貼圖：

1. **Storage 中沒有檔案**
   - 檢查 `sticker-images` bucket 中是否有檔案
   - 驗證 set_id 資料夾是否存在

2. **檔案權限問題**
   - 檢查 Storage 公開存取設定
   - 驗證 RLS 政策

3. **URL 構建錯誤**
   - 檢查 SUPABASE_URL 環境變數
   - 驗證 URL 格式是否正確

## 部署步驟

1. 提交代碼更改
2. 推送到 Git 倉庫
3. Netlify 自動部署
4. 清除瀏覽器快取
5. 重新測試

## 後續監控

- 監控瀏覽器控制台日誌
- 檢查 Netlify 函數日誌
- 驗證 Storage 使用情況

