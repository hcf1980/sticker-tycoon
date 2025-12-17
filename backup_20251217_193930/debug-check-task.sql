-- 檢查最近的任務狀態
SELECT 
  task_id,
  status,
  progress,
  error_message,
  created_at,
  updated_at,
  completed_at
FROM style_analysis_tasks
ORDER BY created_at DESC
LIMIT 10;

-- 查看特定任務
-- SELECT * FROM style_analysis_tasks WHERE task_id = '9ab72f9c-345b-443d-8210-2b67ab08fbf0';

