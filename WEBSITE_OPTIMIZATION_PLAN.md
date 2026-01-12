# 🎨 網站文字大小與一致性優化計劃

## ✅ 已完成項目

### CSS 設計系統
- [x] 建立 CSS 變數系統（文字大小、顏色、間距）
- [x] 統一標題層級（H1-H5）
- [x] 統一按鈕樣式（大、中、小）
- [x] 統一標籤樣式（tech, purple, green, yellow）
- [x] 建立重點標示系統（漸變、發光、高亮框）
- [x] 響應式文字大小調整

### 首頁優化（進行中）
- [x] Hero 標題 - 使用 text-h1
- [x] Hero 描述 - 使用 text-large
- [x] CTA 按鈕 - 使用 btn-large
- [x] 優惠碼卡片 - 使用 text-h5 和 text-small
- [x] Features 區塊標題 - 使用 section-title
- [x] Feature 卡片標題 - 開始優化

## 📋 待優化項目

### 首頁 (index.html)
1. **Feature Cards** - 4個功能卡片
   - 標題統一使用 `text-h4`
   - 描述統一使用 `text-body`
   
2. **早安圖區塊**
   - 主標題使用 `text-h2`
   - 描述使用 `text-large`
   - 列表項目使用 `text-body`

3. **Gallery Section**
   - 標題使用 `section-title`
   - 卡片標題使用 `text-h3`
   - 價格使用 `text-xl font-bold`

4. **Styles Section**
   - 標題使用 `section-title`
   - 風格卡片標題使用 `text-base font-semibold`

5. **Pricing Section**
   - 標題使用 `section-title`
   - 價格數字使用 `text-5xl font-extrabold`
   - 說明文字使用 `text-small`

6. **CTA Section**
   - 主標題使用 `text-h1`
   - 描述使用 `text-xl`

### 購買說明頁 (token-guide.html)
1. Hero 區塊
2. 新用戶優惠卡片
3. 張數消耗說明
4. 購買方案卡片
5. 購買流程

### 手機版購買說明 (token-guide-mobile.html)
1. 標題層級
2. 價格卡片
3. 說明文字

## 🎯 優化原則

### 文字大小一致性
```
超大標題（Hero）     → text-h1 (48px/32px mobile)
區塊標題（Section）  → text-h2 (36px/28px mobile)
卡片標題（Card）     → text-h3 (24px/20px mobile)
小標題（Sub）        → text-h4 (20px/18px mobile)
重要說明             → text-large (20px)
標準內文             → text-body (16px)
次要資訊             → text-small (14px)
標註文字             → text-tiny (12px)
```

### 顏色使用一致性
```
主要內容    → text-primary (白色)
次要內容    → text-secondary (灰藍)
輔助資訊    → text-muted (深灰)
重點標示    → text-cyan (青色)
特殊強調    → text-purple (紫色)
成功/推薦   → text-green (綠色)
警告/注意   → text-yellow (黃色)
```

### 按鈕使用一致性
```
主要 CTA        → btn-neon-solid btn-large
次要 CTA        → btn-neon-outline btn-large
標準按鈕        → btn-neon-solid btn-medium
小型按鈕        → btn-neon-outline btn-small
```

### 標籤使用一致性
```
主要標籤        → tag-tech tag-large
推薦標籤        → tag-green
新功能標籤      → tag-purple
警告標籤        → tag-yellow
```

## 📊 優化效果預期

### 視覺層級清晰度
- ⭐⭐⭐⭐⭐ 標題層級分明
- ⭐⭐⭐⭐⭐ 重點一目了然
- ⭐⭐⭐⭐⭐ 閱讀流暢度提升

### 品牌一致性
- ⭐⭐⭐⭐⭐ 設計語言統一
- ⭐⭐⭐⭐⭐ 專業度提升
- ⭐⭐⭐⭐⭐ 用戶體驗改善

## 🚀 執行順序

1. ✅ 完成 CSS 設計系統
2. 🔄 優化首頁（進行中）
3. ⏳ 優化購買說明頁
4. ⏳ 優化手機版頁面
5. ⏳ 測試響應式效果
6. ⏳ 最終檢查與調整

