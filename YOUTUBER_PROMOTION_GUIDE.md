# YouTuber 推廣計畫 - 完整部署指南

## 📋 項目概述

這是一個完整的 YouTuber 推廣計畫系統，包括：
- 🎬 YouTuber 申請頁面
- 📝 申請表單和驗證
- 🎯 管理員審核面板
- 💰 自動代幣發放
- 📊 統計和追蹤

## 🎁 活動方案

### 獎勵結構
- **前期代幣：** 50 代幣（申請通過後立即發放）
- **完成獎勵：** 250 代幣（影片通過審核後發放）
- **總計：** 300 代幣（相當於 3 次完整貼圖生成）

### 參加條件
- YouTube 訂閱數 1000+
- 願意拍攝推廣影片
- 提供真實聯絡方式

## 📁 文件清單

### 前端文件
1. **public/youtuber-promotion.html** - 推廣活動頁面
   - 活動介紹
   - 獎勵方案
   - 申請表單
   - FAQ

2. **public/admin/youtuber-applications.html** - 管理員面板
   - 申請列表
   - 詳情查看
   - 批准/拒絕功能
   - 影片審核

### 後端文件
1. **functions/youtuber-promotion.js** - API 函數
   - 提交申請
   - 審核申請
   - 提交影片
   - 審核影片
   - 代幣發放

## 🚀 部署步驟

### 1. 複製文件
```bash
# 複製前端文件
cp public/youtuber-promotion.html public/
cp public/admin/youtuber-applications.html public/admin/

# 複製後端文件
cp functions/youtuber-promotion.js functions/
```

### 2. 更新 Firebase 設定

在 `functions/index.js` 中添加路由：

```javascript
const youtuberPromotion = require('./youtuber-promotion');

// YouTuber 推廣 API
app.post('/api/youtuber-promotion/apply', youtuberPromotion.submitYoutuberApplication);
app.post('/api/youtuber-promotion/approve', youtuberPromotion.approveYoutuberApplication);
app.post('/api/youtuber-promotion/submit-video', youtuberPromotion.submitVideo);
app.post('/api/youtuber-promotion/approve-video', youtuberPromotion.approveVideo);
app.get('/api/youtuber-promotion/applications', youtuberPromotion.getApplications);
app.get('/api/youtuber-promotion/featured-videos', youtuberPromotion.getFeaturedVideos);
```

### 3. 創建 Firestore 集合

在 Firebase Console 中創建以下集合：

**youtuber_applications**
```
- applicationId (string)
- channelName (string)
- channelUrl (string)
- subscriberCount (number)
- email (string)
- phone (string)
- lineId (string)
- channelType (string)
- channelDescription (string)
- filmingPlan (string)
- status (string): pending, approved, rejected, completed
- appliedAt (timestamp)
- approvedAt (timestamp)
- initialTokens (number)
- completionTokens (number)
- videoUrl (string)
- videoTitle (string)
- videoSubmittedAt (timestamp)
- videoApprovalStatus (string)
- featured (boolean)
```

### 4. 更新主頁面

在 `public/index.html` 中添加推廣計畫的連結：

```html
<!-- 在適當位置添加 -->
<a href="youtuber-promotion.html" class="inline-block bg-red-500 text-white font-bold py-3 px-8 rounded-full">
  🎬 YouTuber 推廣計畫
</a>
```

### 5. 更新管理員導航

在 `public/admin/index.html` 中添加：

```html
<a href="youtuber-applications.html" class="block px-4 py-2 hover:bg-gray-700">
  🎬 YouTuber 推廣管理
</a>
```

## 📊 工作流程

### 申請流程
```
1. YouTuber 填寫申請表單
   ↓
2. 系統驗證訂閱數 (1000+)
   ↓
3. 管理員審核申請
   ↓
4. 批准 → 發放 50 代幣
   ↓
5. YouTuber 拍攝影片
   ↓
6. 提交影片進行審核
   ↓
7. 管理員審核影片
   ↓
8. 批准 → 發放 250 代幣 + 在網頁展示
```

## 💡 功能說明

### 申請表單驗證
- ✅ 必填欄位檢查
- ✅ 訂閱數驗證 (1000+)
- ✅ Email 格式驗證
- ✅ 重複申請檢查

### 管理員功能
- 📋 查看所有申請
- 🔍 按狀態篩選
- 🔎 搜尋功能
- ✅ 批准/拒絕申請
- 📹 審核影片
- 💰 自動發放代幣

### 自動化功能
- 📧 LINE 通知
- 💳 代幣自動發放
- 📊 統計追蹤
- 🎯 優秀影片展示

## 🔐 安全考慮

### 驗證機制
- ✅ 訂閱數驗證
- ✅ Email 驗證
- ✅ 重複申請防止
- ✅ 管理員權限檢查

### 代幣安全
- ✅ 交易記錄
- ✅ 餘額追蹤
- ✅ 審計日誌
- ✅ 防止重複發放

## 📱 LINE 整合

### 必要設定
1. 在 `.env` 中設定：
```
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
```

2. 實現 LINE 通知函數：
```javascript
async function sendLineNotification(lineId, message) {
  // 使用 LINE Bot API 發送訊息
}
```

## 🎯 推廣建議

### 推廣渠道
- 📧 Email 通知
- 💬 LINE 官方帳號
- 🌐 官方網站
- 📱 社群媒體

### 推廣內容
- 活動介紹
- 獎勵說明
- 申請流程
- 成功案例

## 📈 監控指標

### 關鍵指標
- 申請數量
- 批准率
- 完成率
- 代幣發放總額
- 影片品質評分

### 報告生成
```javascript
// 獲取統計數據
const stats = await getPromotionStats();
console.log(`
申請總數: ${stats.totalApplications}
已完成: ${stats.completed}
完成率: ${(stats.completed / stats.totalApplications * 100).toFixed(1)}%
代幣發放: ${stats.totalTokensIssued}
`);
```

## 🐛 故障排除

### 常見問題

**Q: 代幣沒有發放？**
A: 檢查用戶是否存在於 `users` 集合中，確保 email 匹配

**Q: LINE 通知沒有送達？**
A: 驗證 LINE_CHANNEL_ACCESS_TOKEN 是否正確設定

**Q: 申請表單提交失敗？**
A: 檢查瀏覽器控制台錯誤，確保 API 路由正確配置

## 📞 支援

如有問題，請：
1. 檢查 Firebase Console 日誌
2. 查看瀏覽器控制台錯誤
3. 驗證 Firestore 集合結構
4. 確認 API 路由配置

## 🎉 完成清單

- [ ] 複製所有文件
- [ ] 更新 Firebase 路由
- [ ] 創建 Firestore 集合
- [ ] 設定 LINE 整合
- [ ] 更新主頁面連結
- [ ] 更新管理員導航
- [ ] 本地測試
- [ ] 部署到生產環境
- [ ] 監控申請情況
- [ ] 收集反饋

---

**版本：** 1.0
**最後更新：** 2024年
**狀態：** ✅ 完成

