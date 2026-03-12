-- 添加 bonus_fruits 字段到 tasks 表，用于记录额外奖励果实数
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS bonus_fruits INTEGER NOT NULL DEFAULT 0;
