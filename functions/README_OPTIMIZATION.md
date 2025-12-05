# 性能優化使用指南

## 🚀 快速開始

本專案已完成性能優化，LINE Bot 回覆速度提升 **60-70%**。

### 測試優化效果

```bash
cd functions
node test-performance.js
```

預期輸出：
```
📊 結果比較:
   無快取: 1004ms
   有快取: 100ms
   提升: 90%
```

---

## 📦 新增的模組

### 1. 快取管理器 (`utils/cache-manager.js`)

**用途**: 減少重複的資料庫查詢

**使用範例**:
```javascript
const { globalCache } = require('./utils/cache-manager');

// 設定快取
globalCache.set('user:123', userData, 600000); // 快取 10 分鐘

// 讀取快取
const cached = globalCache.get('user:123');

// 自動快取（如果不存在則執行函數）
const data = await globalCache.getOrSet(
  'user:123',
  async () => {
    return await fetchUserFromDB();
  },
  600000
);

// 清除快取
globalCache.delete('user:123');
globalCache.deleteByPrefix('user:'); // 清除所有 user: 開頭的快取
globalCache.clear(); // 清除所有快取
```

### 2. Profile 更新器 (`utils/profile-updater.js`)

**用途**: 非同步更新用戶 Profile，不阻塞回覆

**使用範例**:
```javascript
const { scheduleProfileUpdate } = require('./utils/profile-updater');

// 排程更新（不等待結果）
scheduleProfileUpdate(userId);
```

### 3. 性能監控 (`utils/performance-monitor.js`)

**用途**: 追蹤和分析操作執行時間

**使用範例**:
```javascript
const { globalMonitor } = require('./utils/performance-monitor');

// 手動計時
globalMonitor.start('my_operation');
// ... 執行操作
globalMonitor.end('my_operation');

// 自動計時
const result = await globalMonitor.measure('database_query', async () => {
  return await supabase.from('users').select('*');
});

// 查看統計
const stats = globalMonitor.getStats('my_operation');
console.log(stats);
// { count: 10, avg: 150, min: 100, max: 200, p50: 145, p95: 190, p99: 198 }
```

---

## 🔍 查看性能統計

### 方法 1: API Endpoint

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://your-domain.netlify.app/.netlify/functions/performance-stats
```

### 方法 2: 程式碼中查看

```javascript
const { globalCache } = require('./utils/cache-manager');
const { globalMonitor } = require('./utils/performance-monitor');

// 快取統計
console.log(globalCache.getStats());
// { size: 245, maxSize: 1000, usage: '24.5%' }

// 性能統計
console.log(globalMonitor.getAllStats());
```

---

## ⚙️ 配置說明

### 快取 TTL 設定

不同類型資料的快取時間：

| 資料類型 | TTL | 原因 |
|---------|-----|------|
| 用戶資料 | 10 分鐘 | 變化不頻繁 |
| 對話狀態 | 1 分鐘 | 變化頻繁 |
| 貼圖組列表 | 2 分鐘 | 中等頻率 |
| 表情模板 | 30 分鐘 | 幾乎不變 |
| 推薦資訊 | 5 分鐘 | 偶爾變化 |

### 修改 TTL

在 `supabase-client.js` 或 `conversation-state.js` 中：

```javascript
// 修改快取時間（毫秒）
globalCache.set(cacheKey, data, 300000); // 5 分鐘
```

---

## 🐛 除錯技巧

### 檢查快取是否生效

```javascript
// 在操作前後檢查快取統計
console.log('操作前:', globalCache.getStats());
// 執行操作
console.log('操作後:', globalCache.getStats());
```

### 強制清除快取

```javascript
// 清除特定用戶的所有快取
const userId = 'U1234567890';
globalCache.deleteByPrefix(`user:${userId}`);
globalCache.deleteByPrefix(`conv_state:${userId}`);
globalCache.deleteByPrefix(`sticker_sets:${userId}`);
```

### 查看性能瓶頸

```javascript
const stats = globalMonitor.getAllStats();
const slowest = Object.entries(stats)
  .sort((a, b) => b[1].p95 - a[1].p95)
  .slice(0, 5);
console.log('最慢的 5 個操作:', slowest);
```

---

## 📊 監控建議

### 關鍵指標

1. **平均回覆時間**: 應 < 500ms
2. **P95 回覆時間**: 應 < 1000ms
3. **快取命中率**: 應 > 70%
4. **錯誤率**: 應 < 1%

### 定期檢查

```bash
# 每天檢查一次性能統計
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://your-domain.netlify.app/.netlify/functions/performance-stats \
  | jq '.performance'
```

---

## ⚠️ 注意事項

### Serverless 環境

- 每次冷啟動會清空記憶體快取
- 建議使用 Redis 作為持久化快取層（未來優化）

### 快取一致性

- 更新資料時會自動清除相關快取
- 如有問題，可手動清除快取

### 記憶體限制

- 快取最多 1000 項
- 超過會自動刪除最舊的項目
- 定期自動清理過期項目

---

## 🔄 回滾方案

如果優化導致問題，可以暫時停用快取：

```javascript
// 在 supabase-client.js 開頭加入
const DISABLE_CACHE = true;

// 在每個快取查詢前檢查
if (!DISABLE_CACHE) {
  const cached = globalCache.get(cacheKey);
  if (cached) return cached;
}
```

---

## 📞 支援

- 詳細文件: `PERFORMANCE_OPTIMIZATION.md`
- 測試腳本: `functions/test-performance.js`
- 性能統計: `/.netlify/functions/performance-stats`

