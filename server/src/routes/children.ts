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

// GET /api/v1/children/:childId/stats?period=month|quarter|year
router.get('/:childId/stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;
  const { period } = req.query; // 'month' | 'quarter' | 'year'，默认最近7天

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

  // 根据 period 计算时间范围
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (period) {
    case 'month': {
      // 本月：当月1日到今天
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case 'quarter': {
      // 上季度：上个季度的完整时间段
      const currentQuarter = Math.floor(now.getMonth() / 3);
      if (currentQuarter === 0) {
        // 当前是Q1，上季度是上年Q4
        startDate = new Date(now.getFullYear() - 1, 9, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      } else {
        startDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        endDate = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59);
      }
      break;
    }
    case 'year': {
      // 过去一年：今天往前365天
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    }
    default: {
      // 默认：最近7天
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    }
  }

  // 获取时间范围内的任务（计算森林健康度和完成数）
  const { data: periodTasks } = await supabase
    .from('tasks')
    .select('id, status, checkin_time')
    .eq('child_id', childId)
    .gte('checkin_time', startDate.toISOString())
    .lte('checkin_time', endDate.toISOString());

  const totalPeriodTasks = periodTasks?.length || 0;
  const approvedPeriodTasks = periodTasks?.filter((t: { status: string }) => t.status === 'approved').length || 0;
  const forestHealth = totalPeriodTasks > 0
    ? Math.round((approvedPeriodTasks / totalPeriodTasks) * 100)
    : 0;

  // 进行中目标数（不受时间范围影响）
  const { count: activeGoals } = await supabase
    .from('goals')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('is_active', true);

  // 时间范围内完成的树木数
  const { count: completedTrees } = await supabase
    .from('trees')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('status', 'completed')
    .gte('updated_at', startDate.toISOString())
    .lte('updated_at', endDate.toISOString());

  res.json({
    data: {
      forestHealth,
      totalApprovedTasks: approvedPeriodTasks,
      activeGoals: activeGoals || 0,
      completedTrees: completedTrees || 0,
      fruitsBalance: child.fruits_balance,
    },
  });
});

export default router;