import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

// 辅助：验证孩子属于当前家长
const verifyChildOwnership = async (childId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('is_deleted', false)
    .single();
  return !!data;
};

const router: Router = Router();

// GET /api/v1/children/:childId/trees
router.get('/:childId/trees', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;
  const { status } = req.query;

  // 验证孩子属于当前家长
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  let query = supabase
    .from('trees')
    .select('id, name, image, status, level, progress, goal_id, created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (status && (status === 'growing' || status === 'completed')) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: '获取树木列表失败' });
    return;
  }

  const trees = data || [];
  const goalIds = trees.map(t => t.goal_id).filter(Boolean) as string[];

  if (goalIds.length === 0) {
    res.json({ data: trees.map(t => ({ ...t, completed_days: 0, checked_in_today: false })) });
    return;
  }

  // 批量查询已完成天数（approved 任务数）
  const { data: approvedTasks } = await supabase
    .from('tasks')
    .select('goal_id')
    .in('goal_id', goalIds)
    .eq('status', 'approved');

  // 批量查询今日签到状态（非 rejected 的今日任务）
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTasks } = await supabase
    .from('tasks')
    .select('goal_id')
    .in('goal_id', goalIds)
    .neq('status', 'rejected')
    .gte('checkin_time', `${today}T00:00:00.000Z`)
    .lte('checkin_time', `${today}T23:59:59.999Z`);

  // 统计每个 goal 的已完成天数
  const completedDaysMap = new Map<string, number>();
  for (const task of approvedTasks || []) {
    if (task.goal_id) {
      completedDaysMap.set(task.goal_id, (completedDaysMap.get(task.goal_id) || 0) + 1);
    }
  }

  // 统计今日已签到的 goal
  const checkedInTodaySet = new Set<string>(
    (todayTasks || []).map((t: { goal_id: string }) => t.goal_id).filter(Boolean)
  );

  const enrichedTrees = trees.map(tree => ({
    ...tree,
    completed_days: tree.goal_id ? (completedDaysMap.get(tree.goal_id) || 0) : 0,
    checked_in_today: tree.goal_id ? checkedInTodaySet.has(tree.goal_id) : false,
  }));

  res.json({ data: enrichedTrees });
});

// POST /api/v1/children/:childId/goals  (创建目标，同时创建树木)
router.post('/:childId/goals', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;
  const { title, icon, duration_days, duration_minutes, daily_count, reward_tree_name, fruits_per_task } = req.body;

  if (!title || !duration_days) {
    res.status(400).json({ error: '目标标题和持续天数不能为空' });
    return;
  }

  if (duration_days < 1 || duration_days > 365) {
    res.status(400).json({ error: '持续天数必须在1-365之间' });
    return;
  }

  // 验证孩子属于当前家长
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  // 创建目标
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .insert({
      child_id: childId,
      title,
      icon: icon || null,
      duration_days,
      duration_minutes: duration_minutes || 0,
      daily_count: daily_count || null,
      reward_tree_name: reward_tree_name || title,
      is_active: true,
      fruits_per_task: fruits_per_task && fruits_per_task > 0 ? Math.round(fruits_per_task) : 10,
    })
    .select('id, title, icon, duration_days, duration_minutes, daily_count, reward_tree_name, is_active, fruits_per_task, created_at')
    .single();

  if (goalError || !goal) {
    res.status(500).json({ error: '创建目标失败' });
    return;
  }

  // 自动创建关联树木
  const { data: tree, error: treeError } = await supabase
    .from('trees')
    .insert({
      child_id: childId,
      goal_id: goal.id,
      name: reward_tree_name || title,
      image: null,
      status: 'growing',
      level: 1,
      progress: 0,
    })
    .select('id, name, image, status, level, progress, goal_id, created_at')
    .single();

  if (treeError || !tree) {
    // 回滚：删除已创建的目标
    await supabase.from('goals').delete().eq('id', goal.id);
    res.status(500).json({ error: '创建树木失败' });
    return;
  }

  res.status(201).json({
    data: { goal, tree },
    message: '目标创建成功，树木已种下',
  });
});

// PUT /api/v1/trees/:treeId
router.put('/:treeId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { treeId } = req.params;
  const { name, image } = req.body;

  const { data: tree } = await supabase
    .from('trees')
    .select('id, child_id')
    .eq('id', treeId)
    .single();

  if (!tree) {
    res.status(404).json({ error: '树木不存在' });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (image !== undefined) updateData.image = image;

  const { data, error } = await supabase
    .from('trees')
    .update(updateData)
    .eq('id', treeId)
    .select('id, name, image, status, level, progress, goal_id, created_at')
    .single();

  if (error || !data) {
    res.status(500).json({ error: '更新树木失败' });
    return;
  }

  res.json({ data, message: '更新成功' });
});

// GET /api/v1/children/:childId/goals  (获取孩子的目标列表)
router.get('/:childId/goals', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;
  const { active } = req.query;

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  let query = supabase
    .from('goals')
    .select(`
      id, title, icon, duration_days, duration_minutes, daily_count, reward_tree_name, is_active, fruits_per_task, created_at,
      trees(id, name, image, status, level, progress)
    `)
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (active === 'true') {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: '获取目标列表失败' });
    return;
  }

  res.json({ data: data || [] });
});

// PUT /api/v1/goals/:goalId  (更新目标信息)
router.put('/goals/:goalId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId } = req.params;
  const { title, icon, duration_days, duration_minutes, reward_tree_name, child_id } = req.body;

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
    const childExists = await verifyChildOwnership(child_id);
    if (!childExists) {
      res.status(404).json({ error: '目标孩子不存在' });
      return;
    }
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (icon !== undefined) updateData.icon = icon;
  if (duration_days !== undefined) updateData.duration_days = duration_days;
  if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
  if (reward_tree_name !== undefined) updateData.reward_tree_name = reward_tree_name;
  if (child_id !== undefined) updateData.child_id = child_id;

  const { data: updatedGoal, error: goalError } = await supabase
    .from('goals')
    .update(updateData)
    .eq('id', goalId)
    .select('id, title, icon, duration_days, duration_minutes, reward_tree_name, is_active, created_at, child_id')
    .single();

  if (goalError || !updatedGoal) {
    res.status(500).json({ error: '更新目标失败' });
    return;
  }

  // 同步更新关联树木的名称（如果 reward_tree_name 有变化）
  if (reward_tree_name !== undefined && reward_tree_name !== goal.reward_tree_name) {
    await supabase
      .from('trees')
      .update({ name: reward_tree_name })
      .eq('goal_id', goalId);
  }

  // 同步更新关联树木和任务的 child_id（如果归属孩子变化）
  if (child_id && child_id !== goal.child_id) {
    await supabase.from('trees').update({ child_id }).eq('goal_id', goalId);
    await supabase.from('tasks').update({ child_id }).eq('goal_id', goalId);
  }

  res.json({ data: updatedGoal, message: '目标更新成功' });
});

// DELETE /api/v1/goals/:goalId  (删除目标及关联数据)
router.delete('/goals/:goalId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goalId } = req.params;

  // 验证目标存在
  const { data: goal } = await supabase
    .from('goals')
    .select('id, child_id')
    .eq('id', goalId)
    .single();

  if (!goal) {
    res.status(404).json({ error: '目标不存在' });
    return;
  }

  // 删除关联任务
  await supabase.from('tasks').delete().eq('goal_id', goalId);

  // 删除关联树木
  await supabase.from('trees').delete().eq('goal_id', goalId);

  // 删除目标
  const { error } = await supabase.from('goals').delete().eq('id', goalId);

  if (error) {
    res.status(500).json({ error: '删除目标失败' });
    return;
  }

  res.json({ message: '目标已删除' });
});

export default router;