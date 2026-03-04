-- Add fruits_per_task column to goals table
-- This allows parents to configure how many fruits a child earns per approved task
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS fruits_per_task INTEGER NOT NULL DEFAULT 10;

COMMENT ON COLUMN goals.fruits_per_task IS '每次任务审核通过后奖励给孩子的果实数量，默认为10';