-- 为 goals 表添加 daily_count（每日次数）字段
-- 可选字段，NULL 表示不限制次数

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS daily_count integer DEFAULT NULL;

COMMENT ON COLUMN goals.daily_count IS '每日需完成次数，NULL 表示不限制';