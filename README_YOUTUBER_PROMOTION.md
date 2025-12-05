# YouTuber 推廣計畫系統

## 📖 簡介

這是一個完整的 YouTuber 推廣計畫系統，允許 YouTuber 申請推廣計畫、獲得代幣獎勵。

## 🚀 快速開始

### 第 1 步：建立資料庫表（5 分鐘）

在 Supabase Dashboard 的 SQL Editor 中執行：

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

### 第 2 步：設置環境變數（3 分鐘）

在 Netlify Dashboard 中設置：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 第 3 步：本地測試（5 分鐘）

```bash
npm run dev
# 訪問 http://localhost:8888/test-youtuber-promotion.html
```

### 第 4 步：部署

```bash
npm run deploy
```

## 📁 文件結構

```
public/
├── youtuber-promotion.html          # 推廣頁面
└── test-youtuber-promotion.html     # 測試頁面

functions/
└── youtuber-promotion-apply.js      # API 端點

supabase/
└── migrations/
    └── 20250115_youtuber_promotion.sql

文檔:
├── YOUTUBER_PROMOTION_SETUP.md              # 詳細設置
├── YOUTUBER_PROMOTION_TROUBLESHOOTING.md    # 故障排除
├── YOUTUBER_PROMOTION_SETUP_CHECKLIST.md    # 快速清單
├── YOUTUBER_PROMOTION_FINAL_SUMMARY.md      # 最終總結
└── README_YOUTUBER_PROMOTION.md             # 本文件
```

## 🔗 API 端點

**POST** `/api/youtuber-promotion/apply`

### 請求

```json
{
  "channelName": "string",
  "channelUrl": "string",
  "subscriberCount": number,
  "email": "string",
  "phone": "string (optional)",
  "lineId": "string",
  "channelType": "string",
  "channelDescription": "string",
  "filmingPlan": "string"
}
```

### 成功回應 (200)

```json
{
  "message": "✅ 申請成功！...",
  "applicationId": "uuid"
}
```

### 失敗回應

- 400: 驗證失敗
- 409: 已有待審核申請
- 500: 伺服器錯誤

## ✨ 功能

- ✅ 完整的表單驗證
- ✅ 訂閱數檢查 (>= 1000)
- ✅ Email 格式驗證
- ✅ 重複申請檢查
- ✅ 詳細的錯誤訊息
- ✅ CORS 支援
- ✅ 環境變數檢查

## 📚 文檔

- **YOUTUBER_PROMOTION_SETUP.md** - 完整設置指南
- **YOUTUBER_PROMOTION_TROUBLESHOOTING.md** - 故障排除
- **YOUTUBER_PROMOTION_SETUP_CHECKLIST.md** - 快速檢查清單
- **YOUTUBER_PROMOTION_FINAL_SUMMARY.md** - 最終總結

## 🆘 遇到問題？

1. 查看 `YOUTUBER_PROMOTION_TROUBLESHOOTING.md`
2. 檢查 Netlify 函數日誌
3. 驗證 Supabase 表是否存在
4. 檢查環境變數是否正確設置

## 📝 許可證

MIT

