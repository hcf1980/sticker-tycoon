# YouTuber 推廣計畫 - 快速設置檢查清單

## ✅ 已完成的開發工作

- [x] 前端頁面 (`public/youtuber-promotion.html`) - 348 行
- [x] 測試頁面 (`public/test-youtuber-promotion.html`) - 完整
- [x] API 函數 (`functions/youtuber-promotion-apply.js`) - 168 行
- [x] 資料庫定義 (`supabase-schema.sql`) - 已更新
- [x] Migration 文件 (`supabase/migrations/20250115_youtuber_promotion.sql`)
- [x] 完整文檔（5 個）

## 🚀 立即需要做的 3 個步驟

### ✅ 步驟 1: 在 Supabase 中建立表（5 分鐘）

進入 Supabase Dashboard → SQL Editor，執行此 SQL：

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

**驗證**: 在 Supabase Table Editor 中看到 `youtuber_promotions` 表

### ✅ 步驟 2: 設置環境變數（3 分鐘）

Netlify Dashboard → Site Settings → Environment，添加：
- `SUPABASE_URL` = 你的 Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` = 你的 Service Role Key

**驗證**: 變數已保存

### ✅ 步驟 3: 本地測試（5 分鐘）

```bash
npm run dev
# 訪問 http://localhost:8888/test-youtuber-promotion.html
# 填寫表單並提交
```

**驗證**: 
- 看到成功訊息
- Supabase 中有新記錄

## 📋 完成後的驗證

- [ ] 表已在 Supabase 中建立
- [ ] 環境變數已設置
- [ ] 本地測試成功
- [ ] 可以訪問 `/youtuber-promotion.html`
- [ ] 可以訪問 `/test-youtuber-promotion.html`

## 🎯 部署

完成上述步驟後：

```bash
npm run deploy
```

然後訪問 https://your-domain.com/youtuber-promotion.html

## 📚 文檔

- `YOUTUBER_PROMOTION_SETUP.md` - 詳細設置
- `YOUTUBER_PROMOTION_TROUBLESHOOTING.md` - 故障排除
- `YOUTUBER_PROMOTION_IMPLEMENTATION_SUMMARY.md` - 實現總結

## 🆘 問題？

查看 `YOUTUBER_PROMOTION_TROUBLESHOOTING.md`

