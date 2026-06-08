-- ============================================================
-- 一次性数据修复脚本：扣除共享任务中错误发放的果实
-- 背景：012 迁移前，共享任务每次审核通过都会立即给果实，
--       正确逻辑应为完成全部天数/次数（树木进度=100%）后才给。
-- 
-- 使用方式：
--   1. 先执行【第一步：预览】，确认扣除数量无误
--   2. 再执行【第二步：执行扣除】
--   3. 最后执行【第三步：验证结果】
-- ============================================================


-- ============================================================
-- 第一步：预览（只查询，不修改）
-- 查看每个孩子在每个共享任务中错误收到的果实数量
-- ============================================================
WITH task_fruits AS (
  SELECT
    t.child_id,
    t.goal_id,
    g.title        AS goal_title,
    g.fruits_per_task,
    COALESCE(t.bonus_fruits, 0) AS bonus_fruits,
    t.updated_at,
    tr.status      AS tree_status
  FROM tasks t
  JOIN goals g  ON t.goal_id  = g.id
  LEFT JOIN trees tr ON tr.goal_id = g.id AND tr.child_id = t.child_id
  WHERE g.is_shared = TRUE
    AND t.status    = 'approved'
),
-- 每个孩子每个目标的最后一次审核果实（已完成时保留这一次）
last_task AS (
  SELECT DISTINCT ON (child_id, goal_id)
    child_id,
    goal_id,
    fruits_per_task + bonus_fruits AS last_fruits
  FROM task_fruits
  ORDER BY child_id, goal_id, updated_at DESC
),
deductions AS (
  SELECT
    tf.child_id,
    tf.goal_id,
    tf.goal_title,
    MAX(tf.tree_status)                              AS tree_status,
    SUM(tf.fruits_per_task + tf.bonus_fruits)        AS total_given,
    CASE
      WHEN MAX(tf.tree_status) = 'completed' THEN
        -- 树木已完成：保留最后一次审核的果实，扣除其余
        SUM(tf.fruits_per_task + tf.bonus_fruits) - lt.last_fruits
      ELSE
        -- 树木未完成：全部扣除（不应该给任何果实）
        SUM(tf.fruits_per_task + tf.bonus_fruits)
    END                                              AS fruits_to_deduct
  FROM task_fruits tf
  JOIN last_task lt ON lt.child_id = tf.child_id AND lt.goal_id = tf.goal_id
  GROUP BY tf.child_id, tf.goal_id, tf.goal_title, lt.last_fruits
)
SELECT
  d.child_id,
  c.name                                                    AS child_name,
  c.fruits_balance                                          AS current_balance,
  d.goal_title,
  d.tree_status,
  d.total_given                                             AS fruits_incorrectly_given,
  d.fruits_to_deduct,
  GREATEST(0, c.fruits_balance - d.fruits_to_deduct)        AS balance_after_deduction
FROM deductions d
JOIN children c ON d.child_id = c.id
WHERE d.fruits_to_deduct > 0
ORDER BY c.name, d.goal_title;


-- ============================================================
-- 第二步：执行扣除（确认预览无误后再取消注释并执行）
-- ============================================================
/*
WITH task_fruits AS (
  SELECT
    t.child_id,
    t.goal_id,
    g.fruits_per_task,
    COALESCE(t.bonus_fruits, 0) AS bonus_fruits,
    t.updated_at,
    tr.status AS tree_status
  FROM tasks t
  JOIN goals g  ON t.goal_id  = g.id
  LEFT JOIN trees tr ON tr.goal_id = g.id AND tr.child_id = t.child_id
  WHERE g.is_shared = TRUE
    AND t.status    = 'approved'
),
last_task AS (
  SELECT DISTINCT ON (child_id, goal_id)
    child_id,
    goal_id,
    fruits_per_task + bonus_fruits AS last_fruits
  FROM task_fruits
  ORDER BY child_id, goal_id, updated_at DESC
),
deductions AS (
  SELECT
    tf.child_id,
    tf.goal_id,
    CASE
      WHEN MAX(tf.tree_status) = 'completed' THEN
        SUM(tf.fruits_per_task + tf.bonus_fruits) - lt.last_fruits
      ELSE
        SUM(tf.fruits_per_task + tf.bonus_fruits)
    END AS fruits_to_deduct
  FROM task_fruits tf
  JOIN last_task lt ON lt.child_id = tf.child_id AND lt.goal_id = tf.goal_id
  GROUP BY tf.child_id, tf.goal_id, lt.last_fruits
),
child_totals AS (
  SELECT child_id, SUM(fruits_to_deduct) AS total_deduct
  FROM deductions
  WHERE fruits_to_deduct > 0
  GROUP BY child_id
)
UPDATE children c
SET fruits_balance = GREATEST(0, c.fruits_balance - ct.total_deduct)
FROM child_totals ct
WHERE c.id = ct.child_id;
*/


-- ============================================================
-- 第三步：验证结果（执行扣除后运行，确认余额已更新）
-- ============================================================
/*
SELECT
  c.id,
  c.name,
  c.fruits_balance AS balance_after_fix
FROM children c
WHERE c.id IN (
  SELECT DISTINCT t.child_id
  FROM tasks t
  JOIN goals g ON t.goal_id = g.id
  WHERE g.is_shared = TRUE AND t.status = 'approved'
)
ORDER BY c.name;
*/
