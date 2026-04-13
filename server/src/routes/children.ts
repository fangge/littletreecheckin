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

// GET /api/v1/children/:childId/checkin-calendar?year=&month=
router.get('/:childId/checkin-calendar', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;
  const { year, month } = req.query;

  const yearNum = parseInt(year as string, 10);
  const monthNum = parseInt(month as string, 10);

  if (!yearNum || !monthNum || monthNum < 1 || monthNum > 12) {
    res.status(400).json({ error: '请提供有效的 year 和 month 参数' });
    return;
  }

  // 验证孩子属于当前认证用户
  const { data: child } = await supabase
    .from('children')
    .select('id, parent_id')
    .eq('id', childId)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  if (child.parent_id !== req.user!.id) {
    res.status(403).json({ error: '无权访问此资源' });
    return;
  }

  // 计算月份的 UTC+8 时间范围
  // 月份第一天 00:00:00 UTC+8 = 前一天 16:00:00 UTC
  const startUtc = new Date(Date.UTC(yearNum, monthNum - 1, 1) - 8 * 60 * 60 * 1000);
  // 月份最后一天 23:59:59 UTC+8 = 当天 15:59:59 UTC
  const endUtc = new Date(Date.UTC(yearNum, monthNum, 1) - 8 * 60 * 60 * 1000);

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, status, checkin_time, goal_id, goals(title)')
    .eq('child_id', childId)
    .neq('status', 'rejected')
    .gte('checkin_time', startUtc.toISOString())
    .lt('checkin_time', endUtc.toISOString())
    .order('checkin_time', { ascending: true });

  if (error) {
    res.status(500).json({ error: '获取打卡日历数据失败' });
    return;
  }

  // 将 checkin_time 转换为 UTC+8 日期字符串，按日期分组
  const tasksByDate: Record<string, Array<{
    id: string;
    title: string;
    status: string;
    checkin_time: string;
    goal_title?: string;
  }>> = {};

  for (const task of tasks || []) {
    // 将 UTC 时间转换为 UTC+8 日期
    const utcDate = new Date(task.checkin_time);
    const utc8Date = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
    const dateStr = utc8Date.toISOString().slice(0, 10); // YYYY-MM-DD

    if (!tasksByDate[dateStr]) {
      tasksByDate[dateStr] = [];
    }

    const goalsData = task.goals as unknown as { title: string } | null;
    tasksByDate[dateStr].push({
      id: task.id,
      title: task.title,
      status: task.status,
      checkin_time: task.checkin_time,
      goal_title: goalsData?.title,
    });
  }

  const checkinDates = Object.keys(tasksByDate).sort();

  res.json({
    data: {
      checkin_dates: checkinDates,
      tasks_by_date: tasksByDate,
    },
  });
});

// GET /api/v1/children/:childId/fruits-history
router.get('/:childId/fruits-history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;

  // 验证孩子属于当前认证用户
  const { data: child } = await supabase
    .from('children')
    .select('id, parent_id, fruits_balance')
    .eq('id', childId)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  if (child.parent_id !== req.user!.id) {
    res.status(403).json({ error: '无权访问此资源' });
    return;
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, checkin_time, bonus_fruits, goals(icon, fruits_per_task)')
    .eq('child_id', childId)
    .eq('status', 'approved')
    .order('checkin_time', { ascending: false });

  if (error) {
    res.status(500).json({ error: '获取果实获取记录失败' });
    return;
  }

  const items = (tasks || []).map((task: Record<string, any>) => ({
    id: task.id,
    title: task.title,
    checkin_time: task.checkin_time,
    fruits_earned: task.goals?.fruits_per_task ?? 10,
    bonus_fruits: task.bonus_fruits ?? 0,
    goal_icon: task.goals?.icon ?? null,
  }));

  res.json({ data: items, fruits_balance: child.fruits_balance });
});

export default router;