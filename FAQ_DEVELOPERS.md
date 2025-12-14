# 🆘 開發者常見問題解答 (FAQ)

## Q1: 為什麼需要這個修復？

**A:** Admin 後台修改設定後，LINE 用戶仍看到舊設定。原因是構圖和裝飾使用硬編碼的常數，無法即時讀取數據庫更新。

---

## Q2: 修復影響哪些功能？

**A:** 只影響使用者創建貼圖的流程中的 4 個選擇階段：
- ✅ 風格選擇（已修復）
- ✅ 構圖選擇（修復）
- ✅ 表情模板（已修復）
- ✅ 裝飾風格（修復）

其他功能不受影響。

---

## Q3: 是否需要修改數據庫？

**A:** 不需要。所有必要的表和欄位都已存在：
- framing_settings (已存在)
- scene_settings (已存在)
- 都有 is_active 欄位

---

## Q4: 性能會受影響嗎？

**A:** 影響非常小：
- 每個流程階段增加 1 次 DB 查詢
- 完整流程只需 4-5 次查詢（可接受）
- 使用 Supabase 內部快取優化

---

## Q5: 如果 DB 故障怎麼辦？

**A:** 有 fallback 機制：
```javascript
if (error) {
  return Object.values(FramingTemplates); // 使用舊常數
}
```
系統不會崩潰，只是無法讀取最新設定。

---

## Q6: 需要重新部署嗎？

**A:** 是的：
1. 推送代碼
2. Netlify 自動部署
3. 無需數據庫遷移
4. 無需環境變數更新

---

## Q7: 向後相容嗎？

**A:** 100% 相容：
- 所有現有功能保留
- 只修改讀取邏輯
- 舊設定仍可使用
- 無 API 變更

---

## Q8: 如何測試？

**A:** 簡單 3 步測試：

1. Admin 修改構圖設定名稱
2. 在 LINE 開始創建貼圖
3. 檢查是否看到新名稱 ✅

---

## Q9: 調試時如何追蹤？

**A:** 查看瀏覽器控制台日誌：
```javascript
console.log(`✅ 從資料庫載入 ${count} 個...`);
console.error('❌ 從資料庫載入...失敗');
console.log('資料庫無...設定，使用預設值');
```

---

## Q10: 哪些文件被修改？

**A:** 只有一個文件：
```
functions/handlers/create-handler.js
  - 修改 4 個函數
  - 新增 4 個函數
```

無其他文件受影響。

---

## Q11: 回滾有多難？

**A:** 非常簡單：

1. 恢復 create-handler.js 到之前版本
2. 移除 getActiveFramings, getFramingById, 
   getActiveScenes, getSceneById 函數
3. 將 async 改回普通函數
4. 移除 await 關鍵字

---

## Q12: Admin 修改後多快生效？

**A:** 立即生效 - 不需要：
- ✅ 清快取
- ✅ 重啟服務
- ✅ 等待
- ✅ 任何手動操作

下次用戶進入該流程階段就是最新設定。

---

## 🔗 相關文檔

- FINAL_SUMMARY.md - 完整總結
- VERIFICATION_CHECKLIST.md - 驗證清單
- CODE_CHANGES_SUMMARY.md - 代碼對比
- QUICK_REFERENCE.md - 快速參考

---

## 📞 需要幫助？

修復包含完整的錯誤消息和 console 日誌，可追蹤問題。

