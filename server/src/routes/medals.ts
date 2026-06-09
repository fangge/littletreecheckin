import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';
import { checkAndUnlockMedals } from '../services/medalService.js';

const router: Router = Router();

// GET /api/v1/children/:childId/medals
router.get('/:childId/medals', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;

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

  // 先检查并更新勋章状态
  await checkAndUnlockMedals(childId);

  // 获取所有勋章定义
  interface MedalRow { id: string; name: string; icon: string; color: string; description: string; unlock_condition: unknown }
  const { data: allMedals, error } = await supabase
    .from('medals')
    .select('id, name, icon, color, description, unlock_condition')
    .order('created_at', { ascending: true });

  if (error || !allMedals) {
    res.status(500).json({ error: '获取勋章列表失败' });
    return;
  }

  // 将 unlock_condition 字符串转换为对象
  const medalsWithCondition = (allMedals as MedalRow[]).map((medal) => ({
    ...medal,
    unlock_condition: typeof medal.unlock_condition === 'string'
      ? JSON.parse(medal.unlock_condition)
      : medal.unlock_condition,
  }));

  // 获取已解锁的勋章
  const { data: unlockedMedals } = await supabase
    .from('child_medals')
    .select('medal_id, unlocked_at')
    .eq('child_id', childId);

  const unlockedMap = new Map(
    (unlockedMedals || []).map((m: { medal_id: string; unlocked_at: string }) => [m.medal_id, m.unlocked_at])
  );

  // 合并数据
  const medals = medalsWithCondition.map((medal) => ({
    ...medal,
    unlocked: unlockedMap.has(medal.id),
    unlocked_at: unlockedMap.get(medal.id) || null,
  }));

  res.json({ data: medals });
});

// GET /api/v1/medals - 获取所有勋章定义（管理用）
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: allMedals, error } = await supabase
    .from('medals')
    .select('id, name, icon, color, description, unlock_condition, created_at')
    .order('created_at', { ascending: true });

  if (error || !allMedals) {
    res.status(500).json({ error: '获取勋章列表失败' });
    return;
  }

  const medals = allMedals.map((medal) => ({
    ...medal,
    unlock_condition: typeof medal.unlock_condition === 'string'
      ? JSON.parse(medal.unlock_condition)
      : medal.unlock_condition,
  }));

  res.json({ data: medals });
});

// POST /api/v1/medals - 创建勋章
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, icon, color, description, unlock_condition } = req.body;

  if (!name || !icon || !color || !unlock_condition) {
    res.status(400).json({ error: '缺少必要字段：name, icon, color, unlock_condition' });
    return;
  }

  const { data, error } = await supabase
    .from('medals')
    .insert([{ name, icon, color, description, unlock_condition }])
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: '创建勋章失败' });
    return;
  }

  res.status(201).json({ data });
});

// PUT /api/v1/medals/:id - 更新勋章
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, icon, color, description, unlock_condition } = req.body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (icon !== undefined) updateData.icon = icon;
  if (color !== undefined) updateData.color = color;
  if (description !== undefined) updateData.description = description;
  if (unlock_condition !== undefined) updateData.unlock_condition = unlock_condition;

  const { data, error } = await supabase
    .from('medals')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: '更新勋章失败' });
    return;
  }

  res.json({ data });
});

// DELETE /api/v1/medals/:id - 删除勋章
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // 先删除关联的 child_medals 记录
  await supabase.from('child_medals').delete().eq('medal_id', id);

  const { error } = await supabase
    .from('medals')
    .delete()
    .eq('id', id);

  if (error) {
    res.status(500).json({ error: '删除勋章失败' });
    return;
  }

  res.json({ message: '删除成功' });
});

export default router;
