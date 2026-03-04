import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

// 删除目标后重新校验并清理不再满足条件的勋章
const revokeInvalidMedals = async (childId: string): Promise<void> => {
  // 获取所有勋章定义
  const { data: allMedals } = await supabase
    .from('medals')
    .select('id, unlock_condition');

  if (!allMedals || allMedals.length === 0) return;

  // 获取孩子已解锁的勋章
  const { data: unlockedMedals } = await supabase
    .from('child_medals')
    .select('id, medal_id')
    .eq('child_id', childId);

  if (!unlockedMedals || unlockedMedals.length === 0) return;

  // 重新计算孩子统计数据
  const { count: totalApproved } = await supabase
    .from('tasks')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('status', 'approved');

  const { count: completedTrees } = await supabase
    .from('trees')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('status', 'completed');

  const { data: childData } = await supabase
    .from('children')
    .select('fruits_balance')
    .eq('id', childId)
    .single();

  // 计算连续打卡天数
  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('checkin_time')
    .eq('child_id', childId)
    .eq('status', 'approved')
    .order('checkin_time', { ascending: false })
    .limit(30);

  let consecutiveDays = 0;
  if (recentTasks && recentTasks.length > 0) {
    const dates = new Set(
      recentTasks.map((t: { checkin_time: string }) =>
        new Date(t.checkin_time).toISOString().split('T')[0]
      )
    );
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      if (dates.has(date.toISOString().split('T')[0])) {
        consecutiveDays++;
      } else {
        break;
      }
    }
  }

  const stats = {
    total_tasks: totalApproved || 0,
    trees_completed: completedTrees || 0,
    total_fruits: childData?.fruits_balance || 0,
    consecutive_days: consecutiveDays,
  };

  // 找出不再满足条件的已解锁勋章
  const medalMap = new Map(allMedals.map((m: { id: string; unlock_condition: { type: string; threshold: number } }) => [m.id, m.unlock_condition]));
  const toRevoke: string[] = [];

  for (const unlocked of unlockedMedals) {
    const condition = medalMap.get(unlocked.medal_id) as { type: string; threshold: number } | undefined;
    if (!condition) continue;

    let stillValid = false;
    switch (condition.type) {
      case 'total_tasks': stillValid = stats.total_tasks >= condition.threshold; break;
      case 'trees_completed': stillValid = stats.trees_completed >= condition.threshold; break;
      case 'total_fruits': stillValid = stats.total_fruits >= condition.threshold; break;
      case 'consecutive_days':
      case 'early_checkin': stillValid = stats.consecutive_days >= condition.threshold; break;
      default: stillValid = true;
    }

    if (!stillValid) {
      toRevoke.push(unlocked.id);
    }
  }

  // 批量删除不再满足条件的勋章
  if (toRevoke.length > 0) {
    await supabase.from('child_medals').delete().in('id', toRevoke);
  }
};

const router: Router = Router();

// PUT /api/v1/goals/:goalId  (更新目标信息)
router.put('/:goalId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId } = req.params;
  const { title, icon, duration_days, duration_minutes, daily_count, reward_tree_name, child_id, fruits_per_task } = req.body;

  if (duration_days !== undefined && (duration_days < 1 || duration_days > 365)) {
    res.status(400).json({ error: '持续天数必须在1-365之间' });
    return;
  }

  // 验证目标存在
  const { data: goal } = await supabase
    .from('goals')
    .select('id, child_id, reward_tree_name')
    .eq('id', goalId)
    .single();

  if (!goal) {
    res.status(404).json({ error: '目标不存在' });
    return;
  }

  // 如果要修改归属孩子，验证新孩子存在
  if (child_id && child_id !== goal.child_id) {
    const { data: childData } = await supabase
      .from('children')
      .select('id')
      .eq('id', child_id)
      .eq('is_deleted', false)
      .single();
    if (!childData) {
      res.status(404).json({ error: '目标孩子不存在' });
      return;
    }
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (icon !== undefined) updateData.icon = icon;
  if (duration_days !== undefined) updateData.duration_days = duration_days;
  if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
  if (daily_count !== undefined) updateData.daily_count = daily_count === 0 ? null : daily_count;
  if (reward_tree_name !== undefined) updateData.reward_tree_name = reward_tree_name;
  if (child_id !== undefined) updateData.child_id = child_id;
  if (fruits_per_task !== undefined && fruits_per_task > 0) updateData.fruits_per_task = Math.round(fruits_per_task);

  const { data: updatedGoal, error: goalError } = await supabase
    .from('goals')
    .update(updateData)
    .eq('id', goalId)
    .select('id, title, icon, duration_days, duration_minutes, daily_count, reward_tree_name, is_active, fruits_per_task, created_at, child_id')
    .single();

  if (goalError || !updatedGoal) {
    res.status(500).json({ error: '更新目标失败' });
    return;
  }

  // 同步更新关联树木的名称（如果 reward_tree_name 有变化）
  if (reward_tree_name !== undefined && reward_tree_name !== goal.reward_tree_name) {
    await supabase.from('trees').update({ name: reward_tree_name }).eq('goal_id', goalId);
  }

  // 同步更新关联树木和任务的 child_id（如果归属孩子变化）
  if (child_id && child_id !== goal.child_id) {
    await supabase.from('trees').update({ child_id }).eq('goal_id', goalId);
    await supabase.from('tasks').update({ child_id }).eq('goal_id', goalId);
  }

  res.json({ data: updatedGoal, message: '目标更新成功' });
});

// DELETE /api/v1/goals/:goalId  (删除目标及关联数据)
router.delete('/:goalId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId } = req.params;

  const { data: goal } = await supabase
    .from('goals')
    .select('id, child_id')
    .eq('id', goalId)
    .single();

  if (!goal) {
    res.status(404).json({ error: '目标不存在' });
    return;
  }

  // 依次删除关联数据
  await supabase.from('tasks').delete().eq('goal_id', goalId);
  await supabase.from('trees').delete().eq('goal_id', goalId);

  const { error } = await supabase.from('goals').delete().eq('id', goalId);

  if (error) {
    res.status(500).json({ error: '删除目标失败' });
    return;
  }

  // 删除目标后重新校验并清理不再满足条件的勋章（异步，不阻塞响应）
  revokeInvalidMedals(goal.child_id).catch(console.error);

  res.json({ message: '目标已删除' });
});

export default router;