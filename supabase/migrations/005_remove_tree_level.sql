-- 删除 trees 表中的 level 字段
-- level 字段是 progress 的冗余派生值（每 20% 进度提升 1 级），在业务中无实质作用
ALTER TABLE trees DROP COLUMN IF EXISTS level;
