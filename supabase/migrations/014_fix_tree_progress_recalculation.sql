-- ============================================================
-- 修复树木进度计算逻辑
-- 问题：progress 是增量式的（每次 +100/duration_days），
--       撤销时不递减（除非已完成），同一天多次批准会重复计数
-- 修复：progress 改为基于实际已批准任务的不同日期数 重新计算
-- ============================================================

-- 1. 辅助函数：重新计算指定树木的进度（基于实际已批准的 distinct 日期数）
CREATE OR REPLACE FUNCTION recalculate_tree_progress(p_tree_id UUID)
RETURNS void AS $$
DECLARE
  v_goal_id UUID;
  v_duration_days INTEGER;
  v_approved_days_count INTEGER;
  v_new_progress INTEGER;
  v_new_status VARCHAR(20);
BEGIN
  -- 获取树关联的 goal_id
  SELECT goal_id INTO v_goal_id FROM trees WHERE id = p_tree_id;
  IF NOT FOUND OR v_goal_id IS NULL THEN
    RETURN;
  END IF;

  -- 获取目标的 duration_days
  SELECT duration_days INTO v_duration_days FROM goals WHERE id = v_goal_id;
  IF NOT FOUND OR v_duration_days IS NULL OR v_duration_days <= 0 THEN
    RETURN;
  END IF;

  -- 统计该树下所有已批准任务的 distinct 日期数（UTC+8 时区）
  SELECT COUNT(DISTINCT to_char(checkin_time AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD'))::INTEGER
  INTO v_approved_days_count
  FROM tasks
  WHERE tree_id = p_tree_id AND status = 'approved';

  -- 计算新进度：已批准天数 / 目标天数 * 100
  v_new_progress := LEAST(100, ROUND(100.0 * v_approved_days_count / v_duration_days));
  v_new_status := CASE WHEN v_new_progress >= 100 THEN 'completed' ELSE 'growing' END;

  -- 更新树木
  UPDATE trees SET progress = v_new_progress, status = v_new_status WHERE id = p_tree_id;

  -- 如果状态变为 completed，同步更新 goal.is_active = false
  IF v_new_status = 'completed' THEN
    UPDATE goals SET is_active = false WHERE id = v_goal_id;
  END IF;

  RAISE NOTICE 'Tree % progress recalculated: % days / % days = %%% (status=%)',
    p_tree_id, v_approved_days_count, v_duration_days, v_new_progress, v_new_status;
END;
$$ LANGUAGE plpgsql;

-- 2. 重写 approve_task_rpc：去掉增量式 progress，改用 recalculate_tree_progress
DROP FUNCTION IF EXISTS approve_task_rpc(UUID, INTEGER);

CREATE OR REPLACE FUNCTION approve_task_rpc(
  p_task_id UUID,
  p_bonus_fruits INTEGER DEFAULT 0
)
RETURNS TABLE (
  task_id UUID,
  goal_title VARCHAR(100),
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
  v_tree_completed BOOLEAN := FALSE;
  v_fruit_msg TEXT;
  v_old_tree_status VARCHAR(20);
BEGIN
  -- 1. 获取并锁定任务（FOR UPDATE 防止并发）
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_task_id, NULL::VARCHAR(100), NULL::INTEGER, FALSE::BOOLEAN, '任务不存在'::TEXT;
    RETURN;
  END IF;
  IF v_task.status <> 'pending' THEN
    RETURN QUERY SELECT p_task_id, NULL::VARCHAR(100), NULL::INTEGER, FALSE::BOOLEAN, '任务已审核，无法重复操作'::TEXT;
    RETURN;
  END IF;

  -- 2. 验证孩子存在
  SELECT id, fruits_balance INTO v_child FROM children WHERE id = v_task.child_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_task_id, NULL::VARCHAR(100), NULL::INTEGER, FALSE::BOOLEAN, '孩子不存在'::TEXT;
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
    bonus_fruits = COALESCE(p_bonus_fruits, 0)
  WHERE id = p_task_id;

  -- 5. 增加果实余额
  UPDATE children SET
    fruits_balance = fruits_balance + v_total_fruits
  WHERE id = v_task.child_id;

  -- 6. 重新计算树木进度（基于实际已批准的不同日期数）
  IF v_task.tree_id IS NOT NULL THEN
    SELECT status INTO v_old_tree_status FROM trees WHERE id = v_task.tree_id FOR UPDATE;
    IF FOUND AND v_old_tree_status = 'growing' THEN
      -- 先更新任务完成（让 recalculate_tree_progress 能统计到最新状态）
      PERFORM recalculate_tree_progress(v_task.tree_id);

      -- 检查是否已完成
      SELECT status INTO v_old_tree_status FROM trees WHERE id = v_task.tree_id;
      IF v_old_tree_status = 'completed' THEN
        v_tree_completed := TRUE;
      END IF;
    END IF;
  END IF;

  -- 7. 发送系统消息通知
  v_fruit_msg := CASE WHEN COALESCE(p_bonus_fruits, 0) > 0
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
    v_goal.title::VARCHAR(100),
    v_total_fruits,
    v_tree_completed,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;
