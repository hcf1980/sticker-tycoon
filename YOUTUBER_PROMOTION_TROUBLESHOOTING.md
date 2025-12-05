# YouTuber 推廣計畫 - 故障排除指南

## 問題 1: 提交申請時出現「發生錯誤，請稍後重試」

### 原因分析

1. **Supabase 表不存在**
   - 錯誤代碼: `TABLE_NOT_FOUND` (PGRST116)
   - 解決方案: 在 Supabase Dashboard 執行 SQL 建立表

2. **環境變數未設置**
   - 缺少 `SUPABASE_URL` 或 `SUPABASE_SERVICE_ROLE_KEY`
   - 檢查 Netlify 環境變數設置

3. **網路連接問題**
   - Supabase 服務不可用
   - 檢查 Supabase 狀態頁面

### 解決步驟

#### 步驟 1: 檢查 Supabase 表是否存在

在 Supabase Dashboard 的 SQL 編輯器中執行：
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'youtuber_promotions';
```

如果沒有結果，執行建表 SQL（見 YOUTUBER_PROMOTION_SETUP.md）

#### 步驟 2: 檢查環境變數

在 Netlify Dashboard 中：
1. 進入 Site Settings → Environment
2. 確認以下變數已設置：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

#### 步驟 3: 檢查 Netlify 函數日誌

在 Netlify Dashboard 中：
1. 進入 Functions
2. 點擊 `youtuber-promotion-apply`
3. 查看最近的日誌

#### 步驟 4: 本地測試

```bash
# 設置環境變數
export SUPABASE_URL="your_url"
export SUPABASE_SERVICE_ROLE_KEY="your_key"

# 運行本地開發服務器
npm run dev

# 測試 API
curl -X POST http://localhost:8888/api/youtuber-promotion/apply \
  -H "Content-Type: application/json" \
  -d '{
    "channelName": "Test",
    "channelUrl": "https://youtube.com/@test",
    "subscriberCount": 1000,
    "email": "test@example.com",
    "lineId": "@test",
    "channelType": "tech",
    "channelDescription": "Test",
    "filmingPlan": "Test"
  }'
```

## 問題 2: 表已存在但仍然出錯

### 可能原因

1. **表結構不完整**
   - 某些欄位缺失
   - 索引未建立

2. **權限問題**
   - Supabase 角色權限不足

### 解決方案

重新建立表：

```sql
-- 先刪除舊表（如果存在）
DROP TABLE IF EXISTS youtuber_promotions CASCADE;

-- 重新建立
CREATE TABLE youtuber_promotions (
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

-- 建立索引
CREATE INDEX idx_youtuber_promotions_status ON youtuber_promotions(status);
CREATE INDEX idx_youtuber_promotions_line_id ON youtuber_promotions(line_id);
CREATE INDEX idx_youtuber_promotions_created_at ON youtuber_promotions(created_at DESC);
```

## 問題 3: 驗證錯誤

### 訂閱數少於 1000
- 確保輸入的訂閱數 >= 1000

### Email 格式不正確
- 確保 Email 格式為 `user@domain.com`

### 缺少必填欄位
- 檢查表單中所有帶 * 的欄位都已填寫

## 聯絡支援

如果以上步驟都無法解決問題，請提供：
1. 錯誤訊息的完整內容
2. Netlify 函數日誌
3. 提交的表單資料（不含敏感信息）

