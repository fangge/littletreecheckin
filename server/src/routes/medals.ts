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
  const { data: allMedals, error } = await supabase
    .from('medals')
    .select('id, name, icon, color, description, unlock_condition')
    .order('created_at', { ascending: true });

  // 将 unlock_condition 字符串转换为对象
  const medalsWithCondition = allMedals.map((medal: { unlock_condition: string }) => ({
    ...medal,
    unlock_condition: typeof medal.unlock_condition === 'string' 
      ? JSON.parse(medal.unlock_condition) 
      : medal.unlock_condition,
  }));

  if (error || !allMedals) {
    res.status(500).json({ error: '获取勋章列表失败' });
    return;
  }

  // 获取已解锁的勋章
  const { data: unlockedMedals } = await supabase
    .from('child_medals')
    .select('medal_id, unlocked_at')
    .eq('child_id', childId);

  const unlockedMap = new Map(
    (unlockedMedals || []).map((m: { medal_id: string; unlocked_at: string }) => [m.medal_id, m.unlocked_at])
  );

  // 合并数据
  interface MedalRow { id: string; name: string; icon: string; color: string; description: string; unlock_condition: unknown }
  const medals = medalsWithCondition.map((medal: MedalRow) => ({
    ...medal,
    unlocked: unlockedMap.has(medal.id),
    unlocked_at: unlockedMap.get(medal.id) || null,
  }));

  res.json({ data: medals });
});

export default router;