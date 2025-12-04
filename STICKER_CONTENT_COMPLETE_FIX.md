# 貼圖內容查看功能 - 完整修復報告

## 問題描述
貼圖管理後台無法顯示貼圖組內的貼圖圖片，顯示「沒有找到貼圖圖片」。

## 根本原因
代碼在多個地方過於嚴格地篩選檔案名稱，要求所有檔案必須以 `sticker_` 開頭且以 `.png` 結尾。但實際檔案可能有不同的命名規則。

## 修復內容

### 1. `functions/admin-cleanup.js` (第 133-154 行)
**函數**: `getStickerSetDetail()`
**改進**: 移除 `sticker_` 前綴要求，改為只篩選 PNG 檔案

### 2. `functions/supabase-client.js` (第 272-281 行)
**函數**: `scanAndCreateStickerRecords()`
**改進**: 同上，改進檔案篩選邏輯

### 3. `public/admin/sticker-manager.html` (第 331-374 行)
**函數**: `showDetail()`
**改進**:
- 添加詳細調試日誌
- 顯示貼圖組基本資訊
- 改進錯誤訊息
- 添加圖片載入失敗備用圖

## 新的篩選邏輯

```javascript
const stickerFiles = files.filter(f => {
  // 排除資料夾（資料夾沒有副檔名）
  if (f.id && !f.name.includes('.')) return false;
  // 只接受 PNG 檔案
  return f.name.toLowerCase().endsWith('.png');
});
```

## 支援的檔案格式

修復後支援以下檔案名稱格式：
- ✅ `sticker_001.png`
- ✅ `sticker_1.png`
- ✅ `001.png`
- ✅ `image_001.png`
- ✅ `任何名稱.png`

## 測試方法

### 1. 瀏覽器控制台
```
F12 → Console → 點擊「查看」
查看日誌輸出
```

### 2. 預期日誌
```
[showDetail] Loading details for setId: xxx
[getStickerSetDetail] files found: N
[getStickerSetDetail] filtered stickers: N
```

## 部署步驟

```bash
git add .
git commit -m "Fix: 改進貼圖內容查看功能 - 支援多種檔案命名格式"
git push
```

## 驗證清單

- [ ] 修改了 admin-cleanup.js
- [ ] 修改了 supabase-client.js
- [ ] 修改了 sticker-manager.html
- [ ] 提交代碼
- [ ] Netlify 自動部署
- [ ] 清除瀏覽器快取
- [ ] 測試貼圖查看功能
- [ ] 檢查瀏覽器控制台日誌

