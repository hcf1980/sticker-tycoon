# 🚀 風格設定管理功能部署指南

## 📋 部署步驟

### 步驟 1: 建立資料庫表格

1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 執行以下 SQL：

```sql
-- 複製 database/style_settings_schema.sql 的完整內容
-- 或直接執行以下指令：
```

```bash
# 如果有 Supabase CLI
supabase db push database/style_settings_schema.sql
```

### 步驟 2: 驗證表格建立

在 Supabase Table Editor 確認以下表格存在：
- ✅ `style_settings`
- ✅ `framing_settings`
- ✅ `scene_settings`

### 步驟 3: 部署到 Netlify

```bash
git add .
git commit -m "feat: 新增風格設定管理後台"
git push
```

### 步驟 4: 初始化資料

1. 訪問 `https://your-domain.netlify.app/admin/style-settings.html`
2. 登入管理後台
3. 點擊「🎨 初始化風格設定」
4. 點擊「🖼️ 初始化構圖設定」
5. 點擊「🎀 初始化裝飾風格設定」

---

## 🧪 測試

### 測試 1: 查看風格列表

訪問管理頁面，應該看到 8 種風格：
- 📸 美顏真實
- 🥰 可愛風
- 😎 酷炫風
- 🤣 搞笑風
- ✨ 簡約風
- 🎌 動漫風
- 👾 像素風
- ✏️ 素描風

### 測試 2: 編輯風格

1. 點擊任一風格的「✏️ 編輯」
2. 修改「核心風格」欄位
3. 點擊「💾 儲存變更」
4. 重新載入頁面確認修改已保存

### 測試 3: API 測試

```bash
# 測試 API endpoint
curl https://your-domain.netlify.app/.netlify/functions/get-style-settings?type=all
```

應該返回 JSON 格式的所有設定。

---

## 📊 資料庫權限設定

確保 RLS (Row Level Security) 正確設定：

```sql
-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('style_settings', 'framing_settings', 'scene_settings');

-- 應該顯示 rowsecurity = true
```

---

## 🔧 整合到現有系統

### 選項 1: 自動從資料庫讀取（推薦）

在 `sticker-styles.js` 開頭加入：

```javascript
const { loadStyleSettings } = require('./style-settings-loader');

// 在需要時載入
async function getStyleEnhancer() {
  const dbStyles = await loadStyleSettings();
  return dbStyles || StyleEnhancer; // 如果資料庫沒有，使用預設值
}
```

### 選項 2: 手動同步

1. 在管理後台編輯風格
2. 點擊「📥 匯出設定」
3. 手動更新 `sticker-styles.js` 的 StyleEnhancer

---

## 🎯 使用場景

### 場景 1: 微調風格描述

當發現某個風格生成效果不理想：
1. 進入管理後台
2. 編輯該風格的「核心風格」或「禁止項目」
3. 儲存後立即生效（有快取則 30 分鐘後生效）

### 場景 2: 調整構圖比例

當發現頭部大小不合適：
1. 進入「構圖設定」頁籤
2. 調整「頭部大小百分比」
3. 儲存並測試生成

### 場景 3: 新增裝飾風格

1. 進入「裝飾風格」頁籤
2. 編輯現有風格或新增（需要程式碼支援）
3. 調整裝飾元素和 POP 文字風格

---

## 🐛 常見問題

### Q1: 初始化按鈕沒反應？

**A**: 檢查瀏覽器 Console 是否有錯誤，確認：
- Supabase 連線正常
- 表格已建立
- RLS 權限正確

### Q2: 修改後沒有生效？

**A**: 可能是快取問題：
- 等待 30 分鐘快取過期
- 或重啟 Netlify Functions
- 或在程式碼中呼叫 `clearStyleSettingsCache()`

### Q3: 無法儲存修改？

**A**: 檢查：
- 是否已登入管理後台
- Supabase RLS 權限是否正確
- 網路連線是否正常

---

## 📝 維護建議

### 定期備份

每週執行一次匯出：
```bash
# 在管理後台點擊「📥 匯出設定」
# 或使用 API
curl https://your-domain.netlify.app/.netlify/functions/get-style-settings?type=all > backup.json
```

### 版本控制

重大修改前：
1. 匯出當前設定
2. 記錄修改原因
3. 測試後再正式使用

### 監控效果

修改後觀察：
- 生成的貼圖風格是否更明顯
- 用戶反饋是否改善
- 錯誤率是否降低

---

## 🎉 完成！

風格設定管理功能已部署完成，現在可以從後台靈活調整風格細節了！

**下一步**:
1. 初始化所有設定
2. 測試編輯功能
3. 生成測試貼圖驗證效果
4. 根據實際效果微調參數

