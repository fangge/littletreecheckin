-- ============================================================
-- 性能优化：RPC 存储过程 + Dashboard 聚合接口
-- 日期：2026-04-27
-- ============================================================

-- ----------------------------------------------------------
-- 1. 统计聚合 RPC 函数（替代应用层拉全量数据过滤）
-- 输入：孩子ID、起止时间
-- 输出：总任务数、已批准数、森林健康度、活跃目标数、完成树木数、果实余额
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_child_stats(
  p_child_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_tasks BIGINT,
  approved_tasks BIGINT,
  forest_health INTEGER,
  active_goals BIGINT,
  completed_trees BIGINT,
  fruits_balance INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(COUNT(t.id), 0)::BIGINT,
    COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'approved'), 0)::BIGINT,
    CASE
      WHEN COUNT(t.id) > 0 THEN ROUND(100.0 * COUNT(t.id) FILTER (WHERE t.status = 'approved') / COUNT(t.id))
      ELSE 0
    END::INTEGER,
    (SELECT COUNT(*)::BIGINT FROM goals WHERE child_id = p_child_id AND is_active = true),
    (SELECT COUNT(*)::BIGINT FROM trees WHERE child_id = p_child_id AND status = 'completed'
      AND updated_at >= p_start_date AND updated_at <= p_end_date),
    c.fruits_balance
  FROM children c
  LEFT JOIN tasks t ON t.child_id = p_child_id
    AND t.checkin_time >= p_start_date
    AND t.checkin_time <= p_end_date
  WHERE c.id = p_child_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------
-- 2. 审核通过事务 RPC 函数（原子化操作，避免中间状态不一致）
-- 输入：任务ID、额外奖励果实数
-- 输出：更新后的任务记录、是否完成树木、错误信息
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_task_rpc(
  p_task_id UUID,
  p_bonus_fruits INTEGER DEFAULT 0
)
RETURNS TABLE (
  task_id UUID,
  goal_title TEXT,
  total_fruits INTEGER,
  tree_completed BOOLEAN,
  error_msg TEXT
) AS $$
DECLARE
  v_task RECORD;
  v_child RECORD;
  v_goal RECORD;
  v_tree RECORD;
  v_base_fruits INTEGER := 10;
  v_total_fruits INTEGER;
  v_progress_increment INTEGER;
  v_new_progress INTEGER;
  v_new_status VARCHAR(20);
  v_tree_completed BOOLEAN := FALSE;
  v_fruit_msg TEXT;
BEGIN
  -- 1. 获取并锁定任务（FOR UPDATE 防止并发）
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_task_id, NULL::TEXT, NULL::INTEGER, FALSE::BOOLEAN, '任务不存在'::TEXT;
    RETURN;
  END IF;
  IF v_task.status <> 'pending' THEN
    RETURN QUERY SELECT p_task_id, NULL::TEXT, NULL::INTEGER, FALSE::BOOLEAN, '任务已审核，无法重复操作'::TEXT;
    RETURN;
  END IF;

  -- 2. 验证孩子存在
  SELECT id, fruits_balance INTO v_child FROM children WHERE id = v_task.child_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_task_id, NULL::TEXT, NULL::INTEGER, FALSE::BOOLEAN, '孩子不存在'::TEXT;
    RETURN;
  END IF;

  -- 3. 获取目标信息
  IF v_task.goal_id IS NOT NULL THEN
    SELECT duration_days, fruits_per_task, title INTO v_goal FROM goals WHERE id = v_task.goal_id;
    IF FOUND THEN
      v_base_fruits := COALESCE(v_goal.fruits_per_task, 10);
    END IF;
  END IF;
  v_total_fruits := v_base_fruits + COALESCE(p_bonus_fruits, 0);

  -- 4. 更新任务状态（原子操作）
  UPDATE tasks SET
    status = 'approved',
    bonus_fruits = p_bonus_fruits
  WHERE id = p_task_id;

  -- 5. 增加果实余额
  UPDATE children SET
    fruits_balance = fruits_balance + v_total_fruits
  WHERE id = v_task.child_id;

  -- 6. 更新树木进度（如有）
  IF v_task.tree_id IS NOT NULL THEN
    SELECT * INTO v_tree FROM trees WHERE id = v_task.tree_id FOR UPDATE;
    IF FOUND AND v_tree.status = 'growing' THEN
      v_progress_increment := round(100.0 / COALESCE(v_goal.duration_days, 30));
      v_new_progress := LEAST(100, v_tree.progress + v_progress_increment);
      v_new_status := CASE WHEN v_new_progress >= 100 THEN 'completed' ELSE 'growing' END;

      UPDATE trees SET progress = v_new_progress, status = v_new_status WHERE id = v_task.tree_id;

      IF v_new_status = 'completed' THEN
        v_tree_completed := TRUE;
        -- 将目标标记为非活跃
        UPDATE goals SET is_active = false WHERE id = v_task.goal_id;
      END IF;
    END IF;
  END IF;

  -- 7. 发送系统消息通知
  v_fruit_msg := CASE WHEN p_bonus_fruits > 0
    THEN format('获得 %s 个果实（含额外奖励 %s 个）', v_total_fruits, p_bonus_fruits)
    ELSE format('获得 %s 个果实', v_total_fruits)
  END;

  INSERT INTO messages (child_id, sender_type, text, type, is_read)
  VALUES (v_task.child_id, 'system',
    format('🎉 太棒了！你的任务"%s"已通过审核，%s！', v_task.title, v_fruit_msg),
    'text', false);

  -- 返回结果
  RETURN QUERY SELECT
    p_task_id,
    v_goal.title,
    v_total_fruits,
    v_tree_completed,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;
