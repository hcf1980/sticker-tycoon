# 貼圖內容無法查看問題分析

## 問題描述
在貼圖管理後台點擊「查看」按鈕時，彈出的 Modal 顯示「沒有找到貼圖圖片」，無法查看貼圖組內的貼圖內容。

## 根本原因

### 位置：`functions/admin-cleanup.js` 第 138-143 行

```javascript
const stickers = (files || [])
  .filter(f => f.name.startsWith('sticker_') && f.name.endsWith('.png'))
  .map(f => ({
    name: f.name,
    url: `${process.env.SUPABASE_URL}/storage/v1/object/public/sticker-images/${setId}/${f.name}`
  }));
```

### 問題分析

1. **檔案篩選過於嚴格**
   - 代碼假設所有貼圖檔案名稱都以 `sticker_` 開頭且以 `.png` 結尾
   - 但實際貼圖檔案可能有不同的命名規則

2. **可能的檔案名稱格式**
   - `sticker_001.png` ✓ 符合
   - `sticker_1.png` ✓ 符合
   - `0001.png` ✗ 不符合
   - `image_001.png` ✗ 不符合
   - `001.png` ✗ 不符合

3. **Storage 資料夾結構問題**
   - 可能檔案存儲在子資料夾中
   - 列出時需要遞迴查詢

## 解決方案

### 方案 1：放寬檔案篩選條件（推薦）

```javascript
const stickers = (files || [])
  .filter(f => f.name.endsWith('.png') && !f.name.startsWith('.'))
  .map(f => ({
    name: f.name,
    url: `${process.env.SUPABASE_URL}/storage/v1/object/public/sticker-images/${setId}/${f.name}`
  }));
```

### 方案 2：新增調試日誌

在返回前添加日誌以診斷問題：

```javascript
console.log('SetId:', setId);
console.log('Files found:', files);
console.log('Filtered stickers:', stickers);
```

### 方案 3：檢查是否有子資料夾

```javascript
const stickers = (files || [])
  .filter(f => {
    // 排除資料夾，只要檔案
    if (f.id && !f.name.includes('.')) return false;
    // 接受所有 PNG 檔案
    return f.name.endsWith('.png');
  })
  .map(f => ({
    name: f.name,
    url: `${process.env.SUPABASE_URL}/storage/v1/object/public/sticker-images/${setId}/${f.name}`
  }));
```

## 建議修改

1. 更新檔案篩選邏輯
2. 添加錯誤日誌
3. 測試不同的檔案命名格式
4. 驗證 Storage 資料夾結構

