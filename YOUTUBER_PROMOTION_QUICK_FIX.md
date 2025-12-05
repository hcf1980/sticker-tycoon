# YouTuber 推廣計畫 - 快速修復清單

## ✅ 已完成的工作

- [x] 創建 YouTuber 推廣表單頁面 (`public/youtuber-promotion.html`)
- [x] 創建 Netlify 函數 (`functions/youtuber-promotion-apply.js`)
- [x] 添加 Supabase 表定義 (`supabase-schema.sql`)
- [x] 添加 CORS 支援
- [x] 添加完整的表單驗證
- [x] 添加錯誤處理

## 🚀 立即需要做的事

### 1. 在 Supabase 中建立表（必須）

進入 Supabase Dashboard → SQL Editor，執行：

```sql
CREATE TABLE IF NOT EXISTS youtuber_promotions (
  id BIGSERIAL PRIMARY KEY,
  application_id TEXT UNIQUE NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  subscriber_count INTEGER NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  line_id TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  channel_description TEXT NOT NULL,
  filming_plan TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  tokens_awarded INTEGER DEFAULT 0,
  video_url TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_youtuber_promotions_status ON youtuber_promotions(status);
CREATE INDEX IF NOT EXISTS idx_youtuber_promotions_line_id ON youtuber_promotions(line_id);
CREATE INDEX IF NOT EXISTS idx_youtuber_promotions_created_at ON youtuber_promotions(created_at DESC);
```

### 2. 驗證環境變數

在 Netlify Dashboard → Site Settings → Environment 中確認：
- ✅ `SUPABASE_URL` 已設置
- ✅ `SUPABASE_SERVICE_ROLE_KEY` 已設置

### 3. 本地測試

```bash
npm run dev
# 訪問 http://localhost:8888/youtuber-promotion.html
# 填寫表單並提交
```

### 4. 部署

```bash
npm run deploy
```

## 🔍 測試清單

- [ ] 表單頁面可以正常訪問
- [ ] 表單驗證正常工作（訂閱數 < 1000 時拒絕）
- [ ] Email 驗證正常工作
- [ ] 成功提交時顯示成功訊息
- [ ] 失敗時顯示適當的錯誤訊息
- [ ] Supabase 中可以看到新記錄

## 📝 文件

- `YOUTUBER_PROMOTION_SETUP.md` - 完整設置指南
- `YOUTUBER_PROMOTION_TROUBLESHOOTING.md` - 故障排除指南
- `functions/youtuber-promotion-apply.js` - API 實現
- `public/youtuber-promotion.html` - 前端頁面

## 🎯 下一步

1. 建立表 ✅ 本文檔
2. 測試 API
3. 部署到生產環境
4. 監控申請情況
5. 建立管理後台查看申請

## 💡 提示

- 如果表已存在，可以跳過建表步驟
- 本地開發時使用 `npm run dev`
- 生產環境部署後，API 會自動可用
- 檢查 Netlify 函數日誌以排除問題

