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
      id, title, type, status, checkin_time, image_url, progress, reject_reason, created_at,
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

// POST /api/v1/tasks  (任务打卡)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { goal_id, child_id, image_url } = req.body;

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

  // 检查今日是否已打卡（利用数据库唯一索引）
  const today = new Date().toISOString().split('T')[0];
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('id')
    .eq('goal_id', goal_id)
    .gte('checkin_time', `${today}T00:00:00.000Z`)
    .lte('checkin_time', `${today}T23:59:59.999Z`)
    .single();

  if (existingTask) {
    res.status(409).json({ error: '今日已打卡，请等待家长审核' });
    return;
  }

  // 获取关联树木
  const { data: tree } = await supabase
    .from('trees')
    .select('id, progress')
    .eq('goal_id', goal_id)
    .single();

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      goal_id,
      child_id,
      tree_id: tree?.id || null,
      title: goal.title,
      type: `${child_id}的每日习惯`,
      status: 'pending',
      checkin_time: new Date().toISOString(),
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

  // 2. 增加果实余额（每次审核通过奖励10个果实）
  const FRUITS_PER_TASK = 10;
  await supabase
    .from('children')
    .update({ fruits_balance: child.fruits_balance + FRUITS_PER_TASK })
    .eq('id', task.child_id);

  // 3. 更新树木成长进度
  if (task.tree_id) {
    const { data: tree } = await supabase
      .from('trees')
      .select('id, progress, level, status, goal_id')
      .eq('id', task.tree_id)
      .single();

    if (tree && tree.status === 'growing') {
      // 获取目标总天数
      const { data: goal } = await supabase
        .from('goals')
        .select('duration_days')
        .eq('id', task.goal_id)
        .single();

      const durationDays = goal?.duration_days || 30;
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
    text: `🎉 太棒了！你的任务"${updatedTask.title}"已通过审核，获得 ${FRUITS_PER_TASK} 个果实！`,
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