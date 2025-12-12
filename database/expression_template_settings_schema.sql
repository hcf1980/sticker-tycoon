-- 表情模板設定資料表
CREATE TABLE IF NOT EXISTS expression_template_settings (
  id SERIAL PRIMARY KEY,
  template_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  description TEXT,
  expressions JSONB NOT NULL,  -- 24 個表情的陣列
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入預設表情模板
INSERT INTO expression_template_settings (template_id, name, emoji, description, expressions) VALUES
('basic', '基本日常', '😊', '日常打招呼、常用表情', 
 '["早安", "Hi", "OK", "讚讚", "加油", "謝謝", "晚安", "Yes", "你好", "掰掰", "了解", "收到", "沒問題", "辛苦了", "午安", "好的", "好棒", "太好了", "明天見", "晚點說", "我來了", "等我", "出發", "到了"]'),

('cute', '可愛撒嬌', '🥺', '撒嬌賣萌、可愛互動', 
 '["撒嬌", "害羞", "噓", "啾啾", "嘿嘿嘿", "抱抱", "好想吃", "哭哭", "求求你", "人家", "討厭啦", "好可愛", "委屈", "賣萌", "心心", "愛你", "羞羞", "嘟嘴", "眨眼", "偷笑", "飛吻", "撒花", "轉圈", "比心"]'),

('office', '辦公室', '💼', '工作日常、職場對話', 
 '["OK", "讚讚", "加班中", "累累", "我想想", "Sorry", "等等", "放假", "開會中", "忙碌", "下班", "收到", "處理中", "已完成", "請假", "補班", "喝咖啡", "趕報告", "老闆叫", "午休", "打卡", "週五了", "禮拜一", "衝業績"]'),

('social', '社交常用', '💬', '社交對話、常用回覆', 
 '["Hi", "謝謝", "Sorry", "OK", "Yes", "No", "再見", "等等", "好久不見", "恭喜", "沒關係", "不客氣", "隨時", "改天", "下次", "約嗎", "在哪", "出來玩", "聚一下", "回覆晚", "剛看到", "好喔", "看你", "都可以"]'),

('emotion', '情緒表達', '🎭', '豐富情緒、心情寫照', 
 '["開心", "大笑", "哭哭", "生氣", "驚訝", "傻眼", "害羞", "累累", "超爽", "崩潰", "無奈", "感動", "緊張", "期待", "難過", "煩躁", "興奮", "困惑", "心碎", "陶醉", "不爽", "爆炸", "放空", "翻白眼"]'),

('special', '特殊場合', '🎉', '節日祝賀、特別活動', 
 '["生日快樂", "恭喜", "感謝", "加油", "Yes", "開心", "啾啾", "抱抱", "新年快樂", "聖誕快樂", "情人節", "中秋快樂", "母親節", "父親節", "畢業", "升遷", "結婚快樂", "喬遷", "考試加油", "面試成功", "發大財", "身體健康", "萬事如意", "心想事成"]')

ON CONFLICT (template_id) DO NOTHING;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_expression_templates_active ON expression_template_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_expression_templates_template_id ON expression_template_settings(template_id);

-- 註解
COMMENT ON TABLE expression_template_settings IS '表情模板設定資料表';
COMMENT ON COLUMN expression_template_settings.template_id IS '模板唯一識別碼';
COMMENT ON COLUMN expression_template_settings.expressions IS '24 個表情的 JSON 陣列';

