# 🎭 管理後台風格設定功能說明

## 📋 功能概述

新增的風格設定管理功能讓管理員可以直接從後台調整：
- 🎨 **風格設定** (8種風格)
- 🖼️ **構圖設定** (4種構圖)
- 🎀 **裝飾風格** (7種裝飾)

---

## 🚀 快速開始

### 1. 建立資料庫表格

在 Supabase SQL Editor 執行：

```sql
-- 複製 database/style_settings_schema.sql 的內容並執行
```

### 2. 訪問管理後台

```
https://your-domain.netlify.app/admin/style-settings.html
```

### 3. 初始化設定

首次使用時點擊「初始化」按鈕，將預設值寫入資料庫。

---

## 📊 資料表結構

### style_settings (風格設定)
```
- style_id: 風格ID (realistic, cute, cool...)
- name: 風格名稱
- emoji: 表情符號
- core_style: 核心風格定義
- lighting: 光線描述
- composition: 構圖描述
- brushwork: 筆觸描述
- mood: 氛圍描述
- color_palette: 色彩方案
- forbidden: 禁止項目
- reference: 參考風格
```

### framing_settings (構圖設定)
```
- framing_id: 構圖ID (fullbody, halfbody, portrait, closeup)
- name: 構圖名稱
- head_size_percentage: 頭部大小百分比
- prompt_addition: Prompt 附加內容
- character_focus: 角色焦點描述
```

### scene_settings (裝飾風格)
```
- scene_id: 裝飾ID (none, pop, kawaii...)
- name: 裝飾名稱
- decoration_style: 裝飾風格描述
- decoration_elements: 裝飾元素 (JSON)
- pop_text_style: POP文字風格
```

---

## 🎯 使用方式

### 編輯風格

1. 點擊風格卡片的「✏️ 編輯」按鈕
2. 修改各項設定
3. 點擊「💾 儲存變更」

### 調整重點

#### 風格差異化
- **核心風格**: 使用 `(((三層括號)))` 強調關鍵特徵
- **禁止項目**: 明確列出該風格不允許的元素
- **色彩方案**: 限定專屬色彩增強識別度

#### 構圖精確化
- **頭部大小**: 調整百分比控制構圖
  - 全身: 15%
  - 半身: 25%
  - 大頭: 60%
  - 特寫: 85%

### 匯出設定

點擊「📥 匯出設定」下載 JSON 備份。

---

## 🔧 整合到生成流程

風格設定會自動被 `sticker-styles.js` 使用：

```javascript
// 從資料庫讀取（如果有）
const dbStyles = await fetchStyleSettings();

// 否則使用程式碼預設值
const styles = dbStyles || defaultStyles;
```

---

## 📝 新增檔案

1. ✅ `public/admin/style-settings.html` - 管理頁面
2. ✅ `public/admin/style-settings.js` - 前端邏輯
3. ✅ `database/style_settings_schema.sql` - 資料庫結構
4. ✅ `functions/get-style-settings.js` - API endpoint

---

## ⚠️ 注意事項

1. **權限**: 需要管理員登入才能編輯
2. **備份**: 修改前建議先匯出備份
3. **測試**: 修改後建議生成測試貼圖驗證效果
4. **快取**: 修改後可能需要清除快取才能生效

---

## 🎉 完成！

現在你可以從管理後台直接調整風格細節，無需修改程式碼！

