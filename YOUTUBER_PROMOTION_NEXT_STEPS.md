# YouTuber 推廣計畫 - 下一步行動指南

## 🎯 問題診斷

您遇到的問題：**提交申請時出現「發生錯誤，請稍後重試」**

### 原因分析

這個錯誤通常由以下原因導致：

1. ❌ **Supabase 表不存在** ← 最可能的原因
2. ❌ 環境變數未設置
3. ❌ Supabase 連接失敗
4. ❌ 資料庫權限問題

## ✅ 解決方案（3 個簡單步驟）

### 步驟 1️⃣: 建立 Supabase 表（5 分鐘）

**進入 Supabase Dashboard：**

1. 登入 https://supabase.com
2. 選擇你的專案
3. 進入 SQL Editor
4. 複製並執行以下 SQL：

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

**驗證：** 在 Table Editor 中看到 `youtuber_promotions` 表

### 步驟 2️⃣: 設置環境變數（3 分鐘）

**進入 Netlify Dashboard：**

1. 選擇你的網站
2. Site Settings → Environment
3. 添加以下變數：
   - `SUPABASE_URL` = 你的 Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = 你的 Service Role Key

**驗證：** 變數已保存

### 步驟 3️⃣: 本地測試（5 分鐘）

```bash
npm run dev
# 訪問 http://localhost:8888/test-youtuber-promotion.html
# 填寫表單並提交
```

**驗證：** 看到成功訊息，Supabase 中有新記錄

## 📋 完成檢查清單

- [ ] 表已在 Supabase 中建立
- [ ] 環境變數已在 Netlify 中設置
- [ ] 本地測試成功
- [ ] 可以訪問 `/youtuber-promotion.html`
- [ ] 可以提交申請
- [ ] 申請出現在 Supabase 中

## 🚀 部署

完成上述步驟後：

```bash
npm run deploy
```

然後訪問 https://your-domain.com/youtuber-promotion.html

## 📚 更多幫助

- **詳細設置** → `YOUTUBER_PROMOTION_SETUP.md`
- **故障排除** → `YOUTUBER_PROMOTION_TROUBLESHOOTING.md`
- **快速清單** → `YOUTUBER_PROMOTION_SETUP_CHECKLIST.md`
- **工作完成報告** → `YOUTUBER_PROMOTION_WORK_COMPLETED.md`

## 🎉 成功後

系統已準備好投入生產！開始接受 YouTuber 申請。

