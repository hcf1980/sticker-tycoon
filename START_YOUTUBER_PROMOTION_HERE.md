# 🚀 YouTuber 推廣計畫 - 從這裡開始

## 📌 您遇到的問題

**提交推廣申請時出現：「發生錯誤，請稍後重試」**

## ✅ 好消息

我已經為您完成了整個系統的開發！現在只需要 3 個簡單步驟就能修復這個問題。

## ⚡ 快速修復（15 分鐘）

### 步驟 1: 建立資料庫表（5 分鐘）

進入 **Supabase Dashboard** → **SQL Editor**，執行此 SQL：

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

✅ **驗證**: 在 Supabase Table Editor 中看到 `youtuber_promotions` 表

### 步驟 2: 設置環境變數（3 分鐘）

進入 **Netlify Dashboard** → **Site Settings** → **Environment**

添加：
- `SUPABASE_URL` = 你的 Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` = 你的 Service Role Key

✅ **驗證**: 變數已保存

### 步驟 3: 本地測試（5 分鐘）

```bash
npm run dev
# 訪問 http://localhost:8888/test-youtuber-promotion.html
# 填寫表單並提交
```

✅ **驗證**: 看到成功訊息

## 📊 已完成的工作

| 項目 | 狀態 |
|------|------|
| 前端頁面 | ✅ 完成 |
| API 函數 | ✅ 完成 |
| 資料庫設計 | ✅ 完成 |
| 表單驗證 | ✅ 完成 |
| 錯誤處理 | ✅ 完成 |
| 完整文檔 | ✅ 完成 |

## 📁 新增文件

- `public/youtuber-promotion.html` - 推廣頁面
- `public/test-youtuber-promotion.html` - 測試工具
- `functions/youtuber-promotion-apply.js` - API 函數
- `supabase/migrations/20250115_youtuber_promotion.sql` - 資料庫
- 7 個完整的文檔文件

## 📚 文檔指南

- **快速修復** → `YOUTUBER_PROMOTION_NEXT_STEPS.md`
- **詳細設置** → `YOUTUBER_PROMOTION_SETUP.md`
- **故障排除** → `YOUTUBER_PROMOTION_TROUBLESHOOTING.md`
- **快速清單** → `YOUTUBER_PROMOTION_SETUP_CHECKLIST.md`
- **工作完成** → `YOUTUBER_PROMOTION_WORK_COMPLETED.md`

## 🎯 完成後

```bash
npm run deploy
```

訪問 https://your-domain.com/youtuber-promotion.html

## 🆘 還有問題？

1. 查看 `YOUTUBER_PROMOTION_TROUBLESHOOTING.md`
2. 檢查 Netlify 函數日誌
3. 驗證 Supabase 表是否存在

---

**準備好了嗎？立即開始 3 個步驟！** 🚀

