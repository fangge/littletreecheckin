import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

const router: Router = Router();

// GET /api/v1/users/:userId/children
router.get('/:userId/children', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  if (req.user!.id !== userId) {
    res.status(403).json({ error: '无权访问此资源' });
    return;
  }

  const { data, error } = await supabase
    .from('children')
    .select('id, name, age, gender, avatar, fruits_balance, created_at')
    .eq('parent_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: '获取孩子列表失败' });
    return;
  }

  res.json({ data: data || [] });
});

// POST /api/v1/users/:userId/children
router.post('/:userId/children', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { name, age, gender } = req.body;

  if (req.user!.id !== userId) {
    res.status(403).json({ error: '无权访问此资源' });
    return;
  }

  if (!name) {
    res.status(400).json({ error: '孩子姓名不能为空' });
    return;
  }

  const { data, error } = await supabase
    .from('children')
    .insert({ parent_id: userId, name, age: age || null, gender: gender || null, fruits_balance: 0 })
    .select('id, name, age, gender, avatar, fruits_balance, created_at')
    .single();

  if (error || !data) {
    res.status(500).json({ error: '添加孩子失败' });
    return;
  }

  res.status(201).json({ data, message: '添加孩子成功' });
});

// PUT /api/v1/users/:userId/children/:childId
router.put('/:userId/children/:childId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, childId } = req.params;
  const { name, age, gender, avatar } = req.body;

  if (req.user!.id !== userId) {
    res.status(403).json({ error: '无权访问此资源' });
    return;
  }

  // 验证孩子属于该家长
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', userId)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (age !== undefined) updateData.age = age;
  if (gender !== undefined) updateData.gender = gender;
  if (avatar !== undefined) updateData.avatar = avatar;

  const { data, error } = await supabase
    .from('children')
    .update(updateData)
    .eq('id', childId)
    .select('id, name, age, gender, avatar, fruits_balance, created_at')
    .single();

  if (error || !data) {
    res.status(500).json({ error: '更新孩子信息失败' });
    return;
  }

  res.json({ data, message: '更新成功' });
});

// DELETE /api/v1/users/:userId/children/:childId
router.delete('/:userId/children/:childId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, childId } = req.params;

  if (req.user!.id !== userId) {
    res.status(403).json({ error: '无权访问此资源' });
    return;
  }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', userId)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  const { error } = await supabase
    .from('children')
    .update({ is_deleted: true })
    .eq('id', childId);

  if (error) {
    res.status(500).json({ error: '删除失败' });
    return;
  }

  res.json({ message: '删除成功' });
});

// GET /api/v1/children/:childId/stats
router.get('/:childId/stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;

  // 验证孩子属于当前家长
  const { data: child } = await supabase
    .from('children')
    .select('id, fruits_balance')
    .eq('id', childId)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  // 获取最近7天任务完成情况（计算森林健康度）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('id, status, checkin_time')
    .eq('child_id', childId)
    .gte('checkin_time', sevenDaysAgo.toISOString());

  const totalRecentTasks = recentTasks?.length || 0;
  const approvedRecentTasks = recentTasks?.filter((t: { status: string }) => t.status === 'approved').length || 0;
  const forestHealth = totalRecentTasks > 0
    ? Math.round((approvedRecentTasks / totalRecentTasks) * 100)
    : 0;

  // 累计完成任务数
  const { count: totalApproved } = await supabase
    .from('tasks')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('status', 'approved');

  // 进行中目标数
  const { count: activeGoals } = await supabase
    .from('goals')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('is_active', true);

  // 已完成树木数
  const { count: completedTrees } = await supabase
    .from('trees')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('status', 'completed');

  res.json({
    data: {
      forestHealth,
      totalApprovedTasks: totalApproved || 0,
      activeGoals: activeGoals || 0,
      completedTrees: completedTrees || 0,
      fruitsBalance: child.fruits_balance,
    },
  });
});

export default router;