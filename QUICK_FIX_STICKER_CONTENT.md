# 快速修復指南：貼圖內容查看問題

## 問題
貼圖管理後台點擊「查看」時顯示「沒有找到貼圖圖片」

## 根本原因
後端 API 過於嚴格地篩選檔案名稱，要求所有檔案必須以 `sticker_` 開頭，但實際檔案可能有不同的命名規則。

## 修復方案

### 已修改的檔案

#### 1. `functions/admin-cleanup.js` (第 133-154 行)

**舊代碼**:
```javascript
.filter(f => f.name.startsWith('sticker_') && f.name.endsWith('.png'))
```

**新代碼**:
```javascript
.filter(f => {
  if (f.id && !f.name.includes('.')) return false;
  return f.name.toLowerCase().endsWith('.png');
})
```

#### 2. `public/admin/sticker-manager.html` (第 331-374 行)

**改進**:
- 添加調試日誌
- 顯示貼圖組資訊
- 改進錯誤處理
- 添加圖片載入失敗備用圖

## 驗證修復

### 方法 1：檢查瀏覽器控制台
```
F12 → Console → 點擊「查看」
查看是否有日誌輸出
```

### 方法 2：檢查 Netlify 函數日誌
```
Netlify Dashboard → Functions → admin-cleanup
查看日誌輸出
```

### 方法 3：檢查 Storage
```
Supabase → Storage → sticker-images
驗證檔案是否存在
```

## 預期結果

修復後應該看到：
- ✅ 貼圖圖片正常顯示
- ✅ 控制台有調試日誌
- ✅ 顯示貼圖組資訊
- ✅ 檔案名稱顯示在圖片下方

## 如果仍未解決

1. 清除瀏覽器快取 (Ctrl+Shift+Delete)
2. 硬刷新頁面 (Ctrl+Shift+R)
3. 檢查 Storage 中是否有檔案
4. 查看 Netlify 函數日誌
5. 驗證 Supabase 連線

## 部署

```bash
git add .
git commit -m "Fix: 改進貼圖內容查看功能"
git push
```

Netlify 會自動部署。

