# ⚡ 管理後台風格設定 - 快速參考

## 🚀 5 分鐘快速上手

### 1️⃣ 建立資料庫 (1 分鐘)
```sql
-- 在 Supabase SQL Editor 執行
-- 複製 database/style_settings_schema.sql 內容
```

### 2️⃣ 訪問管理頁面 (1 分鐘)
```
https://your-domain.netlify.app/admin/style-settings.html
```

### 3️⃣ 初始化設定 (1 分鐘)
```
點擊「🎨 初始化風格設定」
點擊「🖼️ 初始化構圖設定」
點擊「🎀 初始化裝飾風格設定」
```

### 4️⃣ 編輯風格 (2 分鐘)
```
選擇風格 → 點擊「✏️ 編輯」→ 修改 → 「💾 儲存」
```

---

## 📊 三大設定類型

| 類型 | 數量 | 用途 |
|------|------|------|
| 🎨 風格 | 8種 | 控制整體藝術風格 |
| 🖼️ 構圖 | 4種 | 控制人物大小比例 |
| 🎀 裝飾 | 7種 | 控制裝飾元素 |

---

## 🎯 常用操作

### 強化風格差異
```
編輯 → 核心風格 → 加入 (((三層括號)))
編輯 → 禁止項目 → 加入更多禁止詞
編輯 → 色彩方案 → 限定專屬色彩
```

### 調整構圖比例
```
編輯 → 頭部大小百分比 → 調整數值
全身: 15%
半身: 25%
大頭: 60%
特寫: 85%
```

### 備份設定
```
點擊「📥 匯出設定」→ 下載 JSON
```

---

## 🔧 檔案位置

```
public/admin/
  └── style-settings.html    # 管理頁面
  └── style-settings.js      # 前端邏輯

database/
  └── style_settings_schema.sql  # 資料庫結構

functions/
  └── get-style-settings.js      # API
  └── style-settings-loader.js   # 載入器
```

---

## 📝 編輯範例

### 範例 1: 讓可愛風更可愛
```
核心風格: (((SUPER KAWAII CHIBI)))
禁止項目: realistic, serious, dark, gritty
色彩方案: pastel pink, baby blue, mint
```

### 範例 2: 讓酷炫風更酷
```
核心風格: (((CYBERPUNK NEON STREET)))
禁止項目: cute, soft, pastel, gentle
色彩方案: neon cyan, hot pink, black
```

---

## ⚠️ 注意事項

- ✅ 修改前先備份
- ✅ 修改後測試生成
- ✅ 快取 30 分鐘生效
- ✅ 需要管理員登入

---

## 🎉 完成！

現在可以從後台靈活調整風格了！

**相關文件**:
- 詳細指南: `ADMIN_STYLE_SETTINGS_GUIDE.md`
- 部署指南: `ADMIN_STYLE_DEPLOYMENT.md`
- 完整總結: `ADMIN_STYLE_SUMMARY.md`

