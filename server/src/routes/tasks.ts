import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';
import { checkAndUnlockMedals } from '../services/medalService.js';

const router: Router = Router();

// GET /api/v1/children/:childId/tasks
router.get('/:childId/tasks', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;
  const { status } = req.query;

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
    .from('tasks')
    .select(`
      id, goal_id, title, type, status, checkin_time, image_url, progress, reject_reason, created_at,
      goals(title, icon),
      trees(name, image)
    `)
    .eq('child_id', childId)
    .order('checkin_time', { ascending: false });

  if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
    query = query.eq('status', status as string);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: '获取任务列表失败' });
    return;
  }

  res.json({ data: data || [] });
});

// 获取 UTC+8 时区的今天日期字符串（YYYY-MM-DD）
const getUTC8Today = (): string => {
  const now = new Date();
  const utc8Offset = 8 * 60 * 60 * 1000;
  const utc8Now = new Date(now.getTime() + utc8Offset);
  return utc8Now.toISOString().split('T')[0];
};

// POST /api/v1/tasks  (任务打卡)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goal_id, child_id, image_url, checkin_time } = req.body;

  if (!goal_id || !child_id) {
    res.status(400).json({ error: '目标ID和孩子ID不能为空' });
    return;
  }

  // 验证目标存在且属于该孩子
  const { data: goal } = await supabase
    .from('goals')
    .select('id, title, is_active, child_id')
    .eq('id', goal_id)
    .eq('child_id', child_id)
    .single();

  if (!goal) {
    res.status(404).json({ error: '目标不存在' });
    return;
  }

  if (!goal.is_active) {
    res.status(400).json({ error: '该目标已完成，无法继续打卡' });
    return;
  }

  // 获取孩子姓名（用于 type 字段显示）
  const { data: childInfo } = await supabase
    .from('children')
    .select('name')
    .eq('id', child_id)
    .single();

  // 检查今日是否已打卡（排除已拒绝的任务，允许重新打卡）
  // 使用 UTC+8 时区的今天，避免跨时区导致的日期判断错误
  const today = getUTC8Today();
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('goal_id', goal_id)
    .neq('status', 'rejected')
    .gte('checkin_time', `${today}T00:00:00+08:00`)
    .lte('checkin_time', `${today}T23:59:59.999+08:00`)
    .single();

  if (existingTask) {
    const msg = existingTask.status === 'approved'
      ? '今日任务已审核通过，无需重复打卡'
      : '今日已打卡，请等待家长审核';
    res.status(409).json({ error: msg });
    return;
  }

  // 获取关联树木
  const { data: tree } = await supabase
    .from('trees')
    .select('id, progress')
    .eq('goal_id', goal_id)
    .single();

  const childName = childInfo?.name || '孩子';

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      goal_id,
      child_id,
      tree_id: tree?.id || null,
      title: goal.title,
      type: `${childName}的每日习惯`,
      status: 'pending',
      // 优先使用前端传来的本地时间（带时区偏移），否则使用服务器 UTC+8 时间
      checkin_time: checkin_time || (() => {
        const now = new Date();
        const utc8Offset = 8 * 60 * 60 * 1000;
        const localDate = new Date(now.getTime() + utc8Offset);
        return localDate.toISOString().replace('Z', '+08:00');
      })(),
      image_url: image_url || null,
      progress: tree?.progress || 0,
    })
    .select('id, title, type, status, checkin_time, image_url, progress, created_at')
    .single();

  if (error || !task) {
    res.status(500).json({ error: '打卡失败' });
    return;
  }

  res.status(201).json({ data: task, message: '打卡成功，等待家长审核' });
});

// PUT /api/v1/tasks/:taskId/approve  (家长审核通过)
router.put('/:taskId/approve', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;

  // 获取任务信息
  const { data: task } = await supabase
    .from('tasks')
    .select('id, status, child_id, goal_id, tree_id')
    .eq('id', taskId)
    .single();

  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  if (task.status !== 'pending') {
    res.status(400).json({ error: '任务已审核，无法重复操作' });
    return;
  }

  // 验证家长有权审核（孩子属于该家长）
  const { data: child } = await supabase
    .from('children')
    .select('id, fruits_balance')
    .eq('id', task.child_id)
    .single();

  if (!child) {
    res.status(403).json({ error: '无权审核此任务' });
    return;
  }

  // 1. 更新任务状态
  const { data: updatedTask, error: taskError } = await supabase
    .from('tasks')
    .update({ status: 'approved' })
    .eq('id', taskId)
    .select('id, title, type, status, checkin_time, image_url, progress, created_at')
    .single();

  if (taskError || !updatedTask) {
    res.status(500).json({ error: '审核失败' });
    return;
  }

  // 2. 从 goal 读取 fruits_per_task 和 duration_days（一次查询，供后续步骤复用）
  let fruitsEarned = 10;
  let durationDays = 30;
  if (task.goal_id) {
    const { data: goalInfo } = await supabase
      .from('goals')
      .select('duration_days, fruits_per_task')
      .eq('id', task.goal_id)
      .single();
    if (goalInfo) {
      fruitsEarned = goalInfo.fruits_per_task ?? 10;
      durationDays = goalInfo.duration_days || 30;
    }
  }

  // 增加果实余额
  await supabase
    .from('children')
    .update({ fruits_balance: child.fruits_balance + fruitsEarned })
    .eq('id', task.child_id);

  // 3. 更新树木成长进度
  if (task.tree_id) {
    const { data: tree } = await supabase
      .from('trees')
      .select('id, progress, level, status, goal_id')
      .eq('id', task.tree_id)
      .single();

    if (tree && tree.status === 'growing') {
      const progressIncrement = Math.round(100 / durationDays);
      const newProgress = Math.min(100, tree.progress + progressIncrement);
      const newLevel = Math.min(5, Math.floor(newProgress / 20) + 1);
      const newStatus = newProgress >= 100 ? 'completed' : 'growing';

      await supabase
        .from('trees')
        .update({ progress: newProgress, level: newLevel, status: newStatus })
        .eq('id', task.tree_id);

      // 如果树木完成，将目标标记为非活跃
      if (newStatus === 'completed') {
        await supabase
          .from('goals')
          .update({ is_active: false })
          .eq('id', task.goal_id);
      }
    }
  }

  // 4. 发送系统消息通知
  await supabase.from('messages').insert({
    child_id: task.child_id,
    sender_type: 'system',
    text: `🎉 太棒了！你的任务"${updatedTask.title}"已通过审核，获得 ${fruitsEarned} 个果实！`,
    type: 'text',
    is_read: false,
  });

  // 5. 检查并解锁勋章（异步，不阻塞响应）
  checkAndUnlockMedals(task.child_id).catch(console.error);

  res.json({ data: updatedTask, message: '审核通过' });
});

// PUT /api/v1/tasks/:taskId/reject  (家长拒绝)
router.put('/:taskId/reject', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { reason } = req.body;

  const { data: task } = await supabase
    .from('tasks')
    .select('id, status, child_id')
    .eq('id', taskId)
    .single();

  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  if (task.status !== 'pending') {
    res.status(400).json({ error: '任务已审核，无法重复操作' });
    return;
  }

  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update({ status: 'rejected', reject_reason: reason || null })
    .eq('id', taskId)
    .select('id, title, type, status, checkin_time, image_url, progress, reject_reason, created_at')
    .single();

  if (error || !updatedTask) {
    res.status(500).json({ error: '操作失败' });
    return;
  }

  res.json({ data: updatedTask, message: '已拒绝' });
});

export default router;