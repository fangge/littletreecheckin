-- ============================================================
-- 新增「挑战任务」类型
-- 规则：在规定天数内连续打卡不能断，完成后一次性获得果实。
-- ============================================================

-- 1. goals 表新增 is_challenge 标记
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS is_challenge BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN goals.is_challenge IS '是否为挑战任务（连续打卡不能断，完成后一次性获得果实）';

-- 2. 重新实现树木进度计算：
--    - 普通/共享任务：按已批准任务的不同日期数计算
--    - 挑战任务：按截至最新日期的连续打卡天数计算
CREATE OR REPLACE FUNCTION recalculate_tree_progress(p_tree_id UUID)
RETURNS void AS $$
DECLARE
  v_goal_id UUID;
  v_duration_days INTEGER;
  v_is_challenge BOOLEAN;
  v_approved_days_count INTEGER;
  v_streak_days INTEGER := 0;
  v_new_progress INTEGER;
  v_new_status VARCHAR(20);
  v_cur_date DATE;
  v_prev_date DATE;
BEGIN
  SELECT goal_id INTO v_goal_id FROM trees WHERE id = p_tree_id;
  IF NOT FOUND OR v_goal_id IS NULL THEN
    RETURN;
  END IF;

  SELECT duration_days, is_challenge INTO v_duration_days, v_is_challenge
  FROM goals WHERE id = v_goal_id;
  IF NOT FOUND OR v_duration_days IS NULL OR v_duration_days <= 0 THEN
    RETURN;
  END IF;

  IF v_is_challenge IS TRUE THEN
    -- 连续打卡：从最新已批准日期往前数，遇断档即停止
    FOR v_cur_date IN
      SELECT DISTINCT (checkin_time AT TIME ZONE 'Asia/Shanghai')::date AS checkin_date
      FROM tasks
      WHERE tree_id = p_tree_id AND status = 'approved'
      ORDER BY checkin_date DESC
    LOOP
      IF v_prev_date IS NULL THEN
        v_streak_days := 1;
      ELSIF v_prev_date - v_cur_date = 1 THEN
        v_streak_days := v_streak_days + 1;
      ELSE
        EXIT;
      END IF;
      v_prev_date := v_cur_date;
    END LOOP;
    v_approved_days_count := v_streak_days;
  ELSE
    SELECT COUNT(DISTINCT (checkin_time AT TIME ZONE 'Asia/Shanghai')::date)::INTEGER
    INTO v_approved_days_count
    FROM tasks
    WHERE tree_id = p_tree_id AND status = 'approved';
  END IF;

  v_new_progress := LEAST(100, ROUND(100.0 * v_approved_days_count / v_duration_days));
  v_new_status := CASE WHEN v_new_progress >= 100 THEN 'completed' ELSE 'growing' END;

  UPDATE trees SET progress = v_new_progress, status = v_new_status WHERE id = p_tree_id;

  IF v_new_status = 'completed' THEN
    UPDATE goals SET is_active = false WHERE id = v_goal_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. 重新实现审核通过函数：
--    - 挑战任务审核时不发果实，完成时一次性发放 fruits_per_task
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
  v_base_fruits INTEGER := 10;
  v_total_fruits INTEGER;
  v_tree_completed BOOLEAN := FALSE;
  v_old_tree_status VARCHAR(20);
  v_fruit_msg TEXT;
BEGIN
  -- 1. 获取并锁定任务
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_task_id, NULL::VARCHAR(100), NULL::INTEGER, FALSE::BOOLEAN, '任务不存在'::TEXT;
    RETURN;
  END IF;
  IF v_task.status <> 'pending' THEN
    RETURN QUERY SELECT p_task_id, NULL::VARCHAR(100), NULL::INTEGER, FALSE::BOOLEAN, '任务已审核，无法重复操作'::TEXT;
    RETURN;
  END IF;

  -- 2. 锁定孩子
  SELECT id, fruits_balance INTO v_child FROM children WHERE id = v_task.child_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_task_id, NULL::VARCHAR(100), NULL::INTEGER, FALSE::BOOLEAN, '孩子不存在'::TEXT;
    RETURN;
  END IF;

  -- 3. 获取目标信息
  IF v_task.goal_id IS NOT NULL THEN
    SELECT duration_days, fruits_per_task, title, is_challenge
    INTO v_goal
    FROM goals
    WHERE id = v_task.goal_id;
    IF FOUND THEN
      v_base_fruits := COALESCE(v_goal.fruits_per_task, 10);
    END IF;
  END IF;

  IF v_goal.is_challenge IS TRUE THEN
    v_total_fruits := 0;
  ELSE
    v_total_fruits := v_base_fruits + COALESCE(p_bonus_fruits, 0);
  END IF;

  -- 4. 更新任务状态
  UPDATE tasks SET
    status = 'approved',
    bonus_fruits = COALESCE(p_bonus_fruits, 0)
  WHERE id = p_task_id;

  -- 5. 非挑战任务：立即发放果实
  IF v_goal.is_challenge IS NOT TRUE THEN
    UPDATE children SET
      fruits_balance = fruits_balance + v_total_fruits
    WHERE id = v_task.child_id;
  END IF;

  -- 6. 重新计算树木进度
  IF v_task.tree_id IS NOT NULL THEN
    SELECT status INTO v_old_tree_status FROM trees WHERE id = v_task.tree_id FOR UPDATE;
    IF FOUND AND v_old_tree_status = 'growing' THEN
      PERFORM recalculate_tree_progress(v_task.tree_id);

      SELECT status INTO v_old_tree_status FROM trees WHERE id = v_task.tree_id;
      IF v_old_tree_status = 'completed' THEN
        v_tree_completed := TRUE;

        -- 挑战任务：完成时一次性发放果实
        IF v_goal.is_challenge IS TRUE THEN
          v_total_fruits := COALESCE(v_goal.fruits_per_task, 10);
          UPDATE children SET
            fruits_balance = fruits_balance + v_total_fruits
          WHERE id = v_task.child_id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 7. 发送系统消息通知
  IF v_goal.is_challenge IS TRUE THEN
    IF v_tree_completed THEN
      v_fruit_msg := format('完成挑战，获得 %s 个果实', v_total_fruits);
    ELSE
      v_fruit_msg := '挑战打卡已通过，连续打卡不能断，完成后才能获得果实';
    END IF;
  ELSIF COALESCE(p_bonus_fruits, 0) > 0 THEN
    v_fruit_msg := format('获得 %s 个果实（含额外奖励 %s 个）', v_total_fruits, p_bonus_fruits);
  ELSE
    v_fruit_msg := format('获得 %s 个果实', v_total_fruits);
  END IF;

  INSERT INTO messages (child_id, sender_type, text, type, is_read)
  VALUES (v_task.child_id, 'system',
    format('🎉 太棒了！你的任务"%s"已通过审核，%s！', v_task.title, v_fruit_msg),
    'text', false);

  RETURN QUERY SELECT
    p_task_id,
    v_goal.title::VARCHAR(100),
    v_total_fruits,
    v_tree_completed,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;
