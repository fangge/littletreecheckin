-- ============================================================
-- 修复共享任务果实发放逻辑
-- 共享任务审核通过时不立即给果实，只有完成全部天数/次数（树木进度=100%）时才给
-- 日期：2026-06-08
-- ============================================================

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
  v_progress_increment INTEGER;
  v_new_progress INTEGER;
  v_new_status VARCHAR(20);
  v_tree_completed BOOLEAN := FALSE;
  v_fruit_msg TEXT;
  v_is_shared BOOLEAN := FALSE;
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

  -- 3. 获取目标信息（含 is_shared 字段）
  IF v_task.goal_id IS NOT NULL THEN
    SELECT duration_days, fruits_per_task, title, is_shared INTO v_goal FROM goals WHERE id = v_task.goal_id;
    IF FOUND THEN
      v_base_fruits := COALESCE(v_goal.fruits_per_task, 10);
      v_is_shared := COALESCE(v_goal.is_shared, FALSE);
    END IF;
  END IF;
  v_total_fruits := v_base_fruits + COALESCE(p_bonus_fruits, 0);

  -- 4. 更新任务状态（原子操作）
  UPDATE tasks SET
    status = 'approved',
    bonus_fruits = COALESCE(p_bonus_fruits, 0)
  WHERE id = p_task_id;

  -- 5. 非共享任务：审核通过立即给果实
  --    共享任务：等树木完成（进度=100%）后才给果实
  IF NOT v_is_shared THEN
    UPDATE children SET
      fruits_balance = fruits_balance + v_total_fruits
    WHERE id = v_task.child_id;
  END IF;

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

        -- 共享任务：树木完成时才给果实
        IF v_is_shared THEN
          UPDATE children SET
            fruits_balance = fruits_balance + v_total_fruits
          WHERE id = v_task.child_id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 7. 发送系统消息通知
  IF v_is_shared THEN
    -- 共享任务：审核通过但未完成时，不提果实；完成时才提
    IF v_tree_completed THEN
      v_fruit_msg := CASE WHEN COALESCE(p_bonus_fruits, 0) > 0
        THEN format('获得 %s 个果实（含额外奖励 %s 个）', v_total_fruits, p_bonus_fruits)
        ELSE format('获得 %s 个果实', v_total_fruits)
      END;
      INSERT INTO messages (child_id, sender_type, text, type, is_read)
      VALUES (v_task.child_id, 'system',
        format('🏆 恭喜！你率先完成了共享任务"%s"，%s！', v_task.title, v_fruit_msg),
        'text', false);
    ELSE
      INSERT INTO messages (child_id, sender_type, text, type, is_read)
      VALUES (v_task.child_id, 'system',
        format('✅ 太棒了！你的任务"%s"已通过审核，继续加油，完成任务后可获得果实奖励！', v_task.title),
        'text', false);
    END IF;
  ELSE
    -- 普通任务：审核通过立即提果实
    v_fruit_msg := CASE WHEN COALESCE(p_bonus_fruits, 0) > 0
      THEN format('获得 %s 个果实（含额外奖励 %s 个）', v_total_fruits, p_bonus_fruits)
      ELSE format('获得 %s 个果实', v_total_fruits)
    END;
    INSERT INTO messages (child_id, sender_type, text, type, is_read)
    VALUES (v_task.child_id, 'system',
      format('🎉 太棒了！你的任务"%s"已通过审核，%s！', v_task.title, v_fruit_msg),
      'text', false);
  END IF;

  -- 返回结果
  RETURN QUERY SELECT
    p_task_id,
    v_goal.title,
    v_total_fruits,
    v_tree_completed,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;
