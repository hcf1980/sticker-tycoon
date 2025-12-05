# LINE Bot 性能優化報告

## 📊 優化概述

本次優化針對 LINE Bot 的回覆速度進行了全面改進，預期可將回覆時間從 **1-2 秒降至 300-500ms**，提升 **60-70%** 的響應速度。

---

## 🎯 主要優化項目

### 1. **記憶體快取層 (Cache Layer)**
- **檔案**: `functions/utils/cache-manager.js`
- **功能**: 
  - 快取用戶資料、對話狀態、貼圖組列表等常用資料
  - 自動過期機制（TTL）
  - 容量管理（最多 1000 項）
  - 支援前綴批次刪除

**快取策略**:
- 用戶資料: 10 分鐘
- 對話狀態: 1 分鐘
- 貼圖組列表: 2 分鐘
- 表情模板: 30 分鐘
- 推薦資訊: 5 分鐘

### 2. **非同步 Profile 更新**
- **檔案**: `functions/utils/profile-updater.js`
- **改進**: 
  - 移除主流程中的 LINE API Profile 查詢
  - 使用非同步背景更新
  - 1 小時內不重複更新同一用戶
  - 不阻塞用戶回覆

**效果**: 減少 200-500ms 的 LINE API 呼叫延遲

### 3. **並行處理優化**
- **檔案**: `functions/line-webhook.js`
- **改進**:
  - 使用 `Promise.all` 並行執行獨立操作
  - 多個事件使用 `Promise.allSettled` 並行處理
  - 記錄 token 和建立用戶並行執行

**範例**:
```javascript
// 優化前（序列執行）
await recordReplyToken(replyToken);
await getOrCreateUser(userId);
// 總時間: 200ms + 150ms = 350ms

// 優化後（並行執行）
await Promise.all([
  recordReplyToken(replyToken),
  getOrCreateUser(userId)
]);
// 總時間: max(200ms, 150ms) = 200ms
```

### 4. **資料庫查詢優化**
- **檔案**: `functions/supabase-client.js`
- **改進**:
  - 加入快取層減少重複查詢
  - 非關鍵操作改為非同步執行
  - 代幣交易記錄改為非阻塞

**優化的函數**:
- `getOrCreateUser()` - 快取 + 非同步更新
- `getUserStickerSets()` - 快取 2 分鐘
- `getStickerSet()` - 快取 3 分鐘
- `getUserTokenBalance()` - 使用快取的用戶資料
- `getUserReferralInfo()` - 快取 5 分鐘
- `getConversationState()` - 快取 1 分鐘
- `getExpressionTemplates()` - 快取 30 分鐘

### 5. **性能監控系統**
- **檔案**: `functions/utils/performance-monitor.js`
- **功能**:
  - 自動追蹤關鍵操作執行時間
  - 計算 P50、P95、P99 百分位數
  - 提供性能統計 API

**查看統計**:
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://your-domain.netlify.app/.netlify/functions/performance-stats
```

---

## 📈 預期效果

### 回覆速度改善
| 操作類型 | 優化前 | 優化後 | 改善幅度 |
|---------|--------|--------|----------|
| 簡單文字回覆 | 800-1200ms | 200-400ms | **70%** ↓ |
| 查詢貼圖列表 | 1500-2000ms | 400-600ms | **65%** ↓ |
| 代幣查詢 | 600-900ms | 150-300ms | **70%** ↓ |
| 創建貼圖流程 | 1000-1500ms | 300-500ms | **65%** ↓ |

### 資料庫負載降低
- 查詢次數減少: **60-70%**
- 重複查詢避免: **90%+**
- 並行查詢效率: **40-50%** 提升

### 用戶體驗提升
- 回覆更即時，減少等待感
- 高峰時段更穩定
- 降低 timeout 風險

---

## 🔧 使用方式

### 快取管理

**手動清除快取**:
```javascript
const { globalCache } = require('./utils/cache-manager');

// 清除特定用戶的快取
globalCache.delete(globalCache.generateKey('user', userId));

// 清除所有貼圖組快取
globalCache.deleteByPrefix('sticker_sets:');

// 清除所有快取
globalCache.clear();
```

**查看快取統計**:
```javascript
const stats = globalCache.getStats();
console.log(stats);
// { size: 245, maxSize: 1000, usage: '24.5%' }
```

### 性能監控

**手動計時**:
```javascript
const { globalMonitor } = require('./utils/performance-monitor');

globalMonitor.start('my_operation');
// ... 執行操作
globalMonitor.end('my_operation');
```

**包裝函數自動計時**:
```javascript
const result = await globalMonitor.measure('database_query', async () => {
  return await supabase.from('users').select('*');
});
```

---

## ⚠️ 注意事項

### 快取一致性
- 更新資料時記得清除相關快取
- 已在 `createStickerSet`、`updateStickerSetStatus` 等函數中自動處理

### 記憶體使用
- 快取最多保存 1000 項
- 自動清理過期項目
- Serverless 環境下每次冷啟動會重置

### Profile 更新
- 1 小時內不重複更新同一用戶
- 如需強制更新，可直接呼叫 `updateUserProfileAsync(userId)`

---

## 📝 後續優化建議

1. **Redis 快取層**
   - 考慮使用 Redis 替代記憶體快取
   - 支援跨實例共享
   - 更好的持久化

2. **資料庫索引優化**
   - 檢查常用查詢的索引
   - 考慮複合索引

3. **CDN 快取**
   - 靜態資源使用 CDN
   - Flex Message 模板快取

4. **批次操作**
   - 合併多個小查詢
   - 使用 Supabase RPC

5. **連線池管理**
   - 優化資料庫連線
   - 考慮連線池大小

---

## 🧪 測試建議

### 性能測試
```bash
# 使用 Apache Bench 測試
ab -n 100 -c 10 https://your-webhook-url

# 使用 wrk 測試
wrk -t4 -c100 -d30s https://your-webhook-url
```

### 監控指標
- 平均回覆時間
- P95 回覆時間
- 快取命中率
- 資料庫查詢次數
- 錯誤率

---

## 📞 支援

如有問題或建議，請查看:
- 性能統計: `/.netlify/functions/performance-stats`
- 日誌: Netlify Functions Logs
- 快取狀態: 在程式碼中呼叫 `globalCache.getStats()`

