-- ============================================================
-- 性能优化：复合索引迁移
-- 日期：2026-04-27
-- 用途：加速统计接口、范围查询等高频操作
-- ============================================================

-- 1. tasks 表：支持按 child_id + 时间范围 + status 的混合查询（统计接口核心查询）
CREATE INDEX IF NOT EXISTS idx_tasks_child_status_time
ON tasks(child_id, status, checkin_time DESC);

-- 2. trees 表：支持按 child_id + 状态 + 更新时间的树木完成统计
CREATE INDEX IF NOT EXISTS idx_trees_child_status_updated
ON trees(child_id, status, updated_at);

-- 3. tasks 表：支持按 child_id + 打卡时间倒序的日历/历史查询
CREATE INDEX IF NOT EXISTS idx_tasks_child_checkin_time
ON tasks(child_id, checkin_time DESC);
