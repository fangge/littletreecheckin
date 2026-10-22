import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

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
    .select('id, child_id, reward_tree_name, is_shared, shared_child_ids')
    .eq('id', goalId)
    .single();

  if (!goal) {
    res.status(404).json({ error: '目标不存在' });
    return;
  }

  const { data: ownedGoalChild } = await supabase
    .from('children')
    .select('id')
    .eq('id', goal.child_id)
    .eq('parent_id', req.user!.id)
    .eq('is_deleted', false)
    .single();

  if (!ownedGoalChild) {
    res.status(403).json({ error: '无权操作该目标' });
    return;
  }

  const currentParticipantIds = goal.is_shared
    ? [...new Set([goal.child_id, ...(goal.shared_child_ids || [])])]
    : [goal.child_id];
  const effectiveParticipantIds = goal.is_shared
    ? [...new Set([child_id || goal.child_id, ...(goal.shared_child_ids || [])])]
    : [child_id || goal.child_id];
  const { data: ownedParticipants } = await supabase
    .from('children')
    .select('id')
    .in('id', [...new Set([...currentParticipantIds, ...effectiveParticipantIds])])
    .eq('parent_id', req.user!.id)
    .eq('is_deleted', false);
  if (!ownedParticipants || ownedParticipants.length !== new Set([...currentParticipantIds, ...effectiveParticipantIds]).size) {
    res.status(403).json({ error: '无权操作该目标' });
    return;
  }

  // 如果要修改归属孩子，验证新孩子存在
  if (child_id && child_id !== goal.child_id) {
    const { data: childData } = await supabase
      .from('children')
      .select('id')
      .eq('id', child_id)
      .eq('parent_id', req.user!.id)
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
    .eq('child_id', goal.child_id)
    .select('id, title, icon, duration_days, duration_minutes, daily_count, reward_tree_name, is_active, fruits_per_task, created_at, child_id')
    .single();

  if (goalError || !updatedGoal) {
    res.status(500).json({ error: '更新目标失败' });
    return;
  }

  // 同步更新关联树木的名称（如果 reward_tree_name 有变化）
  if (reward_tree_name !== undefined && reward_tree_name !== goal.reward_tree_name) {
    await supabase.from('trees').update({ name: reward_tree_name }).eq('goal_id', goalId).in('child_id', currentParticipantIds);
  }

  // 同步更新关联树木和任务的 child_id（如果归属孩子变化）
  if (child_id && child_id !== goal.child_id) {
    await supabase.from('trees').update({ child_id }).eq('goal_id', goalId).in('child_id', currentParticipantIds);
    await supabase.from('tasks').update({ child_id }).eq('goal_id', goalId).in('child_id', currentParticipantIds);
  }

  res.json({ data: updatedGoal, message: '目标更新成功' });
});

// DELETE /api/v1/goals/:goalId  (删除目标及关联数据)
router.delete('/:goalId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId } = req.params;

  const { data: goal } = await supabase
    .from('goals')
    .select('id, child_id, is_shared, shared_child_ids')
    .eq('id', goalId)
    .single();

  if (!goal) {
    res.status(404).json({ error: '目标不存在' });
    return;
  }

  const { data: ownedGoalChild } = await supabase
    .from('children')
    .select('id')
    .eq('id', goal.child_id)
    .eq('parent_id', req.user!.id)
    .eq('is_deleted', false)
    .single();

  if (!ownedGoalChild) {
    res.status(403).json({ error: '无权删除该目标' });
    return;
  }

  const participantIds = goal.is_shared
    ? [...new Set([goal.child_id, ...(goal.shared_child_ids || [])])]
    : [goal.child_id];
  const { data: ownedParticipants } = await supabase
    .from('children')
    .select('id')
    .in('id', participantIds)
    .eq('parent_id', req.user!.id)
    .eq('is_deleted', false);
  if (!ownedParticipants || ownedParticipants.length !== participantIds.length) {
    res.status(403).json({ error: '无权删除该目标' });
    return;
  }

  // 依次删除关联数据
  await supabase.from('tasks').delete().eq('goal_id', goalId).in('child_id', participantIds);
  await supabase.from('trees').delete().eq('goal_id', goalId).in('child_id', participantIds);

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('child_id', goal.child_id);

  if (error) {
    res.status(500).json({ error: '删除目标失败' });
    return;
  }


  res.json({ message: '目标已删除' });
});

export default router;
