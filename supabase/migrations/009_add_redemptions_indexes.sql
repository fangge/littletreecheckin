-- ============================================================
-- 性能优化：为 reward_redemptions 表添加复合索引
-- 日期：2026-05-10
-- 用途：加速兑换记录查询，特别是按孩子ID和时间/状态的组合查询
-- ============================================================

-- 1. 支持按孩子ID + 兑换时间倒序查询（兑换记录列表的核心查询）
-- 使用场景：家长查看某个孩子的兑换历史
CREATE INDEX IF NOT EXISTS idx_redemptions_child_time 
ON reward_redemptions(child_id, redeemed_at DESC);

-- 2. 支持按孩子ID + 状态筛选（待发放/已完成）
-- 使用场景：家长筛选待处理的兑换记录
CREATE INDEX IF NOT EXISTS idx_redemptions_child_status 
ON reward_redemptions(child_id, status);

-- 3. 支持按状态 + 兑换时间查询（家长查看所有待处理记录）
-- 使用场景：批量处理所有孩子的待发放奖品
CREATE INDEX IF NOT EXISTS idx_redemptions_status_time 
ON reward_redemptions(status, redeemed_at DESC);

-- 4. 支持批量查询多个孩子的兑换记录（配合 IN 查询）
-- 使用场景：批量接口 /api/v1/rewards/redemptions/batch
-- 注意：PostgreSQL 的 B-tree 索引对 IN 查询也有效，child_id 列已包含在上述索引中

-- 索引说明：
-- - idx_redemptions_child_time: 覆盖最常见的查询模式（按孩子查历史）
-- - idx_redemptions_child_status: 支持状态筛选（如只看待发放）
-- - idx_redemptions_status_time: 支持全局待处理列表
-- - 这些索引会显著提升查询性能，特别是在数据量增长后
