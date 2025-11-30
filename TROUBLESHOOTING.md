# 貼圖大亨 - 問題診斷指南

## 🔍 常見問題排查

### 1. LINE Bot 無回應

#### 檢查清單
- [ ] Webhook URL 是否正確設定？
  ```
  https://YOUR_DOMAIN.netlify.app/.netlify/functions/line-webhook
  ```
- [ ] Webhook 是否已啟用？
- [ ] 環境變數 `LINE_CHANNEL_ACCESS_TOKEN` 和 `LINE_CHANNEL_SECRET` 是否正確？
- [ ] Netlify Functions 是否部署成功？
- [ ] 查看 Netlify Functions 日誌是否有錯誤

#### 測試步驟
```bash
# 1. 測試 Webhook 是否可訪問
curl https://YOUR_DOMAIN.netlify.app/.netlify/functions/line-webhook

# 2. 查看 Netlify 日誌
netlify logs:function line-webhook

# 3. 本地測試
npm run dev
# 使用 ngrok 暴露本地端口
ngrok http 8888
# 更新 LINE Webhook URL 為 ngrok 提供的 URL
```

---

### 2. 貼圖生成失敗

#### 可能原因
1. **AI API Key 無效**
   - 檢查 `AI_IMAGE_API_KEY` 是否正確
   - 確認 API 配額是否用完

2. **Supabase 連接失敗**
   - 檢查 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
   - 確認 Supabase 專案是否暫停

3. **代幣不足**
   - 用戶代幣餘額是否足夠

#### 診斷步驟
```bash
# 1. 測試 AI API
node -e "
const axios = require('axios');
axios.post('YOUR_AI_API_URL/v1/chat/completions', {
  model: 'gemini-2.0-flash-exp-image-generation',
  messages: [{role: 'user', content: 'test'}]
}, {
  headers: {'Authorization': 'Bearer YOUR_API_KEY'}
}).then(r => console.log('✅ AI API OK'))
  .catch(e => console.error('❌ AI API Error:', e.message));
"

# 2. 測試 Supabase
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('YOUR_URL', 'YOUR_KEY');
supabase.from('users').select('count').then(r => console.log('✅ Supabase OK'))
  .catch(e => console.error('❌ Supabase Error:', e.message));
"
```

---

### 3. 圖片處理錯誤

#### 常見錯誤
- `sharp installation error` - Sharp 安裝失敗
- `canvas installation error` - Canvas 安裝失敗

#### 解決方法
```bash
# 重新安裝 Sharp
npm uninstall sharp
npm install --platform=linux --arch=x64 sharp

# 重新安裝 Canvas (需要系統依賴)
# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg
npm install canvas

# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm install canvas
```

---

### 4. Netlify 部署失敗

#### 檢查項目
- [ ] `package.json` 中的依賴版本是否正確
- [ ] Node.js 版本是否符合要求 (>= 18.0.0)
- [ ] 環境變數是否全部設定
- [ ] `netlify.toml` 配置是否正確

#### Build 日誌
```bash
# 查看部署日誌
netlify logs:deploy

# 本地測試 build
npm run build

# 測試 Functions
netlify functions:serve
```

---

### 5. 資料庫錯誤

#### 常見問題
1. **Table not found** - 資料表未建立
2. **RLS policy violation** - Row Level Security 權限問題
3. **Connection timeout** - 連接超時

#### 解決步驟
```sql
-- 1. 檢查資料表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. 檢查 RLS 是否正確設定
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- 3. 檢查 Storage Buckets
SELECT * FROM storage.buckets;
```

---

### 6. 代幣系統問題

#### 診斷查詢
```sql
-- 查詢用戶代幣餘額
SELECT line_user_id, sticker_credits FROM users 
WHERE line_user_id = 'USER_LINE_ID';

-- 查詢代幣交易記錄
SELECT * FROM token_transactions 
WHERE user_id = 'USER_LINE_ID' 
ORDER BY created_at DESC LIMIT 10;

-- 查詢推薦記錄
SELECT * FROM referrals 
WHERE referrer_id = 'USER_LINE_ID' OR referee_id = 'USER_LINE_ID';
```

---

## 🛠️ 開發工具

### 環境變數檢查腳本
創建 `scripts/check-env.js`:
```javascript
const required = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AI_IMAGE_API_KEY',
  'AI_IMAGE_API_URL'
];

console.log('🔍 檢查環境變數...\n');
let missing = [];

required.forEach(key => {
  if (process.env[key]) {
    console.log(`✅ ${key}`);
  } else {
    console.log(`❌ ${key} - 未設定`);
    missing.push(key);
  }
});

if (missing.length === 0) {
  console.log('\n✅ 所有必要環境變數已設定');
  process.exit(0);
} else {
  console.log(`\n❌ 缺少 ${missing.length} 個環境變數`);
  process.exit(1);
}
```

執行：
```bash
node scripts/check-env.js
```

### 資料庫健康檢查腳本
創建 `scripts/check-database.js`:
```javascript
const { getSupabaseClient } = require('../functions/supabase-client');

async function checkDatabase() {
  console.log('🔍 檢查資料庫連接...\n');
  
  const supabase = getSupabaseClient();
  const tables = [
    'users',
    'sticker_sets',
    'stickers',
    'line_events',
    'conversation_states',
    'generation_tasks',
    'token_transactions',
    'referrals',
    'upload_queue',
    'line_pack_tasks',
    'listing_applications'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) throw error;
      console.log(`✅ ${table}`);
    } catch (err) {
      console.log(`❌ ${table} - ${err.message}`);
    }
  }
}

checkDatabase();
```

---

## 📊 監控指標

### 需要監控的指標
1. **函數執行時間**
   - line-webhook: < 5s
   - ai-generator: < 30s
   - image-processor: < 10s

2. **錯誤率**
   - 目標 < 1%

3. **用戶活躍度**
   - DAU (Daily Active Users)
   - 貼圖生成數量
   - 代幣消耗

4. **資料庫效能**
   - 查詢時間 < 100ms
   - 連接池使用率

---

## 🚨 緊急故障處理

### 1. 服務完全中斷
```bash
# 1. 檢查 Netlify 狀態
https://www.netlifystatus.com/

# 2. 回滾到上一個版本
netlify rollback

# 3. 重新部署
netlify deploy --prod
```

### 2. 資料庫故障
```bash
# 1. 檢查 Supabase 狀態
https://status.supabase.com/

# 2. 備份資料（定期執行）
# 在 Supabase Dashboard → Database → Backups

# 3. 降級到只讀模式（暫時方案）
# 修改 Functions 禁止寫入操作
```

### 3. AI API 配額用完
```bash
# 1. 暫停服務（通知用戶）
# 2. 切換到備用 API
# 3. 增加配額或等待重置
```

---

## 📞 技術支援

### 日誌查看
```bash
# Netlify Functions 日誌
netlify logs:function FUNCTION_NAME --follow

# 即時日誌
netlify dev

# 特定時間範圍日誌
netlify logs:function line-webhook --since 1h
```

### 除錯技巧
1. 使用 `console.log` 加入詳細日誌
2. 在本地環境復現問題
3. 使用 LINE Bot 測試帳號
4. 檢查 Supabase Dashboard 的即時資料
5. 使用 Postman 測試 API

---

**最後更新:** 2024

