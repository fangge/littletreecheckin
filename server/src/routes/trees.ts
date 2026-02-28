import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

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

  res.json({ data: data || [] });
});

// POST /api/v1/children/:childId/goals  (创建目标，同时创建树木)
router.post('/:childId/goals', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;
  const { title, icon, duration_days, duration_minutes, reward_tree_name } = req.body;

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
      reward_tree_name: reward_tree_name || title,
      is_active: true,
    })
    .select('id, title, icon, duration_days, duration_minutes, reward_tree_name, is_active, created_at')
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

export default router;