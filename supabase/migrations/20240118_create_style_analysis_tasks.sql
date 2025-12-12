-- 創建風格分析任務表
CREATE TABLE IF NOT EXISTS style_analysis_tasks (
  id BIGSERIAL PRIMARY KEY,
  task_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  result JSONB, -- 分析結果
  error_message TEXT,
  usage JSONB, -- API 使用統計
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_style_analysis_tasks_task_id ON style_analysis_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_style_analysis_tasks_status ON style_analysis_tasks(status);
CREATE INDEX IF NOT EXISTS idx_style_analysis_tasks_created_at ON style_analysis_tasks(created_at);

-- 自動刪除 24 小時前的舊任務（定期清理）
CREATE OR REPLACE FUNCTION cleanup_old_style_analysis_tasks()
RETURNS void AS $$
BEGIN
  DELETE FROM style_analysis_tasks
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 添加註釋
COMMENT ON TABLE style_analysis_tasks IS 'AI 風格分析任務表';
COMMENT ON COLUMN style_analysis_tasks.task_id IS '任務唯一識別碼';
COMMENT ON COLUMN style_analysis_tasks.status IS '任務狀態：pending, processing, completed, failed';
COMMENT ON COLUMN style_analysis_tasks.progress IS '處理進度 (0-100)';
COMMENT ON COLUMN style_analysis_tasks.result IS '分析結果 JSON';

