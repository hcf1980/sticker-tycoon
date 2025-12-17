# 🚀 專案優化 - 快速執行指南

## 📋 當前問題
- ✗ 根目錄有 **34+ 個 MD 文檔**（過多！）
- ✗ 文檔結構混亂（重複、分散）
- ✗ 某些代碼可能有效能問題
- ✗ SQL 文件分散各處

## ✅ 優化目標
- ✓ 根目錄 MD ≤ 3 個
- ✓ 所有文檔移到 `docs/` 目錄
- ✓ 刪除重複/無效文件
- ✓ 優化代碼效能

---

## 🎯 立即執行（5 分鐘）

### Step 1: 查看優化報告
```bash
open PROJECT_OPTIMIZATION_REPORT.md
```
或直接閱讀，了解將要刪除的文件。

### Step 2: 執行自動清理腳本
```bash
# 給予執行權限
chmod +x scripts/cleanup-project.sh

# 執行清理
./scripts/cleanup-project.sh
```

**腳本會做什麼？**
- ✓ 自動備份所有要刪除的文件
- ✓ 刪除 26+ 個重複/無效文檔
- ✓ 創建新的 `docs/` 結構
- ✓ 移動文檔到正確位置
- ✓ 整理 SQL 文件到 `database/archive/`

### Step 3: 驗證結果
```bash
# 檢查根目錄 MD 數量（應該 ≤ 5）
ls *.md | wc -l

# 檢查新的文檔結構
tree docs/

# 檢查備份
ls backup_*/
```

---

## 📊 預期效果

| 項目 | 優化前 | 優化後 |
|------|-------|-------|
| 根目錄 MD | 34+ 個 | ≤ 3 個 ✅ |
| 文檔結構 | 混亂 | 清晰 ✅ |
| 專案大小 | 大 | 更小 ✅ |
| 維護性 | 困難 | 簡單 ✅ |

---

## 🗂️ 清理清單

### 將被刪除的文件（已備份）

#### 綠色主題文檔（6 個）
- GREEN_THEME_COMPLETION_SUMMARY.md
- GREEN_THEME_CONVERSION_REPORT.md
- GREEN_THEME_QUICK_START.md
- VISUAL_COMPARISON_REPORT.md
- VISUAL_PREVIEW_GUIDE.md
- README_GREEN_THEME.md

#### Logo 文檔（4 個）
- LOGO_CHANGES_VISUAL.md
- LOGO_FILES_CHECKLIST.md
- LOGO_UPDATE_SUMMARY.md
- QUICK_START_LOGO.md

#### 修復文檔（10 個）
- ANALYSIS_STICKER_CONSISTENCY_ISSUE.md
- DOWNLOAD_TIMEOUT_FIX.md
- FIX_500_ERROR_GUIDE.md
- FIX_SUMMARY.md
- README_FIX.md
- RICH_MENU_FIX_SUMMARY.md
- SCENE_CONFIG_FIX_REPORT.md
- URGENT_FIX_500_ERROR.sql
- debug-check-task.sql
- 問題修復完成通知.md

#### 測試文檔（3 個）
- QUICK_TEST_GUIDE.md
- TEST_GENERATING_STATUS.md
- check_deployment.md

#### 其他（3 個）
- MODIFICATIONS_SUMMARY.md
- FINAL_CHECKLIST.md
- update-framing-prompts.js

**總計**: 26+ 個文件將被移除/整理

---

## 🔄 回滾方法

如果需要恢復：
```bash
# 從備份恢復所有文件
cp backup_*/* ./

# 或恢復特定文件
cp backup_*/GREEN_THEME_CONVERSION_REPORT.md ./
```

---

## 📁 優化後的結構

```
sticker-tycoon/
├── README.md ✅（主要入口）
├── START_HERE.md ✅（快速開始）
├── CHANGELOG.md ✅（更新日誌）
├── package.json
├── netlify.toml
│
├── docs/ ✅
│   ├── setup/
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   ├── LOGO_SETUP.md
│   │   └── TROUBLESHOOTING.md
│   ├── features/
│   │   ├── PROMPT_OPTIMIZATION.md
│   │   ├── GRID_GENERATOR.md
│   │   └── STYLE_ANALYSIS.md
│   ├── api/
│   │   ├── AI_MODEL_CONFIG.md
│   │   └── LINE_PAY_INTEGRATION.md
│   └── archive/
│       └── （舊文檔）
│
├── database/ ✅
│   ├── schema/
│   ├── migrations/
│   └── archive/
│
├── functions/ ✅
└── public/ ✅
```

---

## ⚡ 代碼效能優化（可選）

### 優化 1: 批次查詢
```bash
# 檢查代碼中的 N+1 查詢問題
grep -r "for.*await.*select" functions/
```

### 優化 2: 增加資料庫索引
```bash
# 執行索引優化 SQL
# 見 PROJECT_OPTIMIZATION_REPORT.md 第 3.4 節
```

### 優化 3: 快取時間調整
```bash
# 檢查快取設定
grep -r "globalCache.set" functions/
```

---

## 📝 執行後檢查清單

- [ ] 根目錄 MD 文件 ≤ 5 個
- [ ] `docs/` 目錄結構正確
- [ ] 備份目錄已創建
- [ ] SQL 文件在 `database/` 目錄
- [ ] 專案可正常啟動 (`npm run dev`)
- [ ] 提交變更到 Git

---

## 🎉 完成！

**預計節省**:
- 文件數量: -70%
- 專案大小: -5-10%
- 維護時間: -50%

**下一步**:
1. 檢查新的文檔結構
2. 更新 README.md
3. 提交到 Git
4. （可選）執行代碼效能優化

---

**詳細報告**: 查看 `PROJECT_OPTIMIZATION_REPORT.md`

