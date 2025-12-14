# 🚀 部署清單 - Admin 風格設定同步修復

## 部署前 (Pre-deployment)

### 代碼檢查
- [x] 所有文件都無語法錯誤
- [x] 所有 async/await 都正確配對
- [x] 所有 fallback 邏輯都完整
- [x] 無新的循環依賴

### 功能檢查
- [x] 風格選擇正確（已驗證）
- [x] 構圖選擇正確（已修復）
- [x] 表情選擇正確（已驗證）
- [x] 裝飾選擇正確（已修復）

### 相容性檢查
- [x] 向後相容性完整
- [x] 無 API 變更
- [x] 無數據庫結構變更
- [x] 無環境變數新增

---

## 部署步驟 (Deployment Steps)

### 步驟 1: 代碼推送
```bash
git add functions/handlers/create-handler.js
git commit -m "fix: Admin 風格設定動態同步（構圖、裝飾）"
git push origin main
```

### 步驟 2: 等待 CI/CD
- ⏳ GitHub Actions 運行（通常 5-10 分鐘）
- ✅ 測試通過
- ✅ Netlify Functions 自動部署

### 步驟 3: 驗證部署
```
https://sticker-tycoon.netlify.app
- Functions 部署完成
- 無錯誤日誌
```

---

## 部署後 (Post-deployment)

### 功能驗證 (3 個測試場景)

#### 測試 1: 構圖選擇同步
1. Admin 後台修改構圖名稱
   - 例：「全身」改為「full-body」
2. 在 LINE 開始創建流程
   - 上傳照片 → 選擇風格
3. 驗證構圖選擇
   - ✅ 應看到新名稱

#### 測試 2: 裝飾風格同步  
1. Admin 後台修改裝飾名稱
   - 例：「簡約風」改為「minimal」
2. 在 LINE 完成創建流程
   - 風格 → 構圖 → 表情
3. 驗證裝飾選擇
   - ✅ 應看到新名稱

#### 測試 3: 風格選擇同步
1. Admin 修改風格 Emoji 或描述
2. 用戶上傳照片
3. 驗證風格選擇
   - ✅ 應看到更新

---

## 監控 (Monitoring)

### 檢查項目
- [ ] 檢查 Netlify Functions 日誌
  - 查看是否有 ERROR 或 EXCEPTION
  - 查找「從資料庫載入...失敗」

- [ ] 檢查 Supabase 活動
  - framing_settings 查詢記錄
  - scene_settings 查詢記錄

- [ ] 檢查用戶反饋
  - 是否有人報告舊設定
  - 是否有人報告無法選擇

### 如見異常
```
問題：用戶仍看到舊設定
解決：檢查 Supabase 連接

問題：收到 500 錯誤
解決：查看 Functions 日誌

問題：性能下降
解決：檢查 DB 查詢數量
```

---

## 回滾計劃 (Rollback Plan)

### 如需回滾（不太可能）
```bash
# 1. 恢復代碼
git revert <commit-hash>
git push origin main

# 2. 等待自動部署

# 3. 驗證回滾完成
```

**預期時間**: 5-10 分鐘

---

## 監控要點 (Key Metrics)

| 指標 | 目標 | 工具 |
|------|------|------|
| 部署時間 | < 15 分鐘 | Netlify Dashboard |
| 函數執行時間 | < 2 秒 | Netlify Analytics |
| DB 查詢成功率 | > 99.5% | Supabase Logs |
| 用戶轉換率 | 無變化 | LINE Bot 統計 |

---

## 溝通清單 (Communication)

- [ ] 技術團隊：已更新代碼文檔
- [ ] QA 團隊：提供測試步驟
- [ ] 產品團隊：說明新功能（Admin 設定即時生效）
- [ ] 用戶：無通知需要（改進透明）

---

## 最終檢查表 (Final Checklist)

### 部署前
- [x] 代碼審查完成
- [x] 所有測試通過
- [x] 文檔已更新
- [x] 無破壞性變更

### 部署中
- [ ] CI/CD 成功
- [ ] 沒有部署警告
- [ ] Functions 順利上線

### 部署後
- [ ] 功能驗證完成
- [ ] 無錯誤日誌
- [ ] 用戶反饋正常
- [ ] 性能指標正常

---

## 緊急聯絡

如部署出現問題：
1. 檢查 Netlify Dashboard
2. 查看 Functions 日誌
3. 確認 Supabase 連接
4. 必要時執行回滾

---

**部署日期**: ____
**部署人**: ____
**驗證人**: ____

✅ **部署狀態**: 待執行

