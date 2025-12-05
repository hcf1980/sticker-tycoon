# YouTuber 推廣計畫 - 設置指南

## 1. 在 Supabase 中建立表

在 Supabase Dashboard 的 SQL 編輯器中執行以下 SQL：

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

## 2. 設置 RLS 政策（可選）

如果需要行級安全性，可以添加以下政策：

```sql
ALTER TABLE youtuber_promotions ENABLE ROW LEVEL SECURITY;

-- 允許所有人插入新申請
CREATE POLICY "Allow anyone to insert" ON youtuber_promotions
  FOR INSERT WITH CHECK (true);

-- 只允許管理員查看和更新
CREATE POLICY "Allow admins to view" ON youtuber_promotions
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
```

## 3. API 端點

- **URL**: `/api/youtuber-promotion/apply`
- **方法**: POST
- **請求體**:
```json
{
  "channelName": "頻道名稱",
  "channelUrl": "https://youtube.com/@channel",
  "subscriberCount": 5000,
  "email": "email@example.com",
  "phone": "0912345678",
  "lineId": "@abc123",
  "channelType": "tech",
  "channelDescription": "頻道介紹",
  "filmingPlan": "拍片計畫"
}
```

## 4. 測試

使用 curl 測試：
```bash
curl -X POST http://localhost:8888/api/youtuber-promotion/apply \
  -H "Content-Type: application/json" \
  -d '{
    "channelName": "Test Channel",
    "channelUrl": "https://youtube.com/@test",
    "subscriberCount": 1000,
    "email": "test@example.com",
    "lineId": "@test123",
    "channelType": "tech",
    "channelDescription": "Test",
    "filmingPlan": "Test plan"
  }'
```

## 5. 故障排除

- **錯誤: 表不存在** → 執行上面的 SQL 建立表
- **錯誤: 缺少環境變數** → 確保 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 已設置
- **錯誤: 發生錯誤，請稍後重試** → 檢查 Netlify 函數日誌

