-- 011_add_shared_goals.sql
-- 添加共享任务支持
-- 共享任务：多个孩子可以同时竞争完成，谁先完成谁获得果实奖励

-- 1. goals 表添加共享任务相关字段
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shared_child_ids UUID[] DEFAULT '{}';

-- 2. 为 shared_child_ids 创建 GIN 索引，加速 "childId = ANY(shared_child_ids)" 查询
CREATE INDEX IF NOT EXISTS idx_goals_shared_child_ids ON goals USING GIN (shared_child_ids);

-- 3. 为 is_shared 创建普通索引
CREATE INDEX IF NOT EXISTS idx_goals_is_shared ON goals (is_shared) WHERE is_shared = TRUE;

-- 说明：
-- is_shared = true 时，该目标为共享任务
-- shared_child_ids 存储所有参与该共享任务的孩子 ID（包含 child_id 字段中的主孩子）
-- 每个参与孩子都有独立的 trees 记录（child_id 不同，goal_id 相同）
-- 每个孩子独立打卡，独立审核，审核通过后各自获得果实
-- 判断谁先完成：以完成日期（UTC+8）为准，不考虑具体时间，允许同一天多个孩子同时完成
