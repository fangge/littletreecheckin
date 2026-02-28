import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

const router: Router = Router();

// GET /api/v1/rewards
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { category } = req.query;

  let query = supabase
    .from('rewards')
    .select('id, name, price, image, category')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (category && ['activity', 'toy', 'snack'].includes(category as string)) {
    query = query.eq('category', category as string);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: '获取奖励列表失败' });
    return;
  }

  res.json({ data: data || [] });
});

// GET /api/v1/children/:childId/fruits
router.get('/children/:childId/fruits', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;

  const { data: child, error } = await supabase
    .from('children')
    .select('fruits_balance')
    .eq('id', childId)
    .eq('is_deleted', false)
    .single();

  if (error || !child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  res.json({ data: { fruits_balance: child.fruits_balance } });
});

// POST /api/v1/rewards/:rewardId/redeem
router.post('/:rewardId/redeem', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { rewardId } = req.params;
  const { child_id } = req.body;

  if (!child_id) {
    res.status(400).json({ error: '孩子ID不能为空' });
    return;
  }

  // 获取奖励信息
  const { data: reward } = await supabase
    .from('rewards')
    .select('id, name, price, is_active')
    .eq('id', rewardId)
    .single();

  if (!reward) {
    res.status(404).json({ error: '奖励不存在' });
    return;
  }

  if (!reward.is_active) {
    res.status(400).json({ error: '该奖励已下架' });
    return;
  }

  // 获取孩子果实余额
  const { data: child } = await supabase
    .from('children')
    .select('id, fruits_balance')
    .eq('id', child_id)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  if (child.fruits_balance < reward.price) {
    res.status(400).json({
      error: '果实余额不足',
      data: { current_balance: child.fruits_balance, required: reward.price },
    });
    return;
  }

  // 扣除果实并创建兑换记录
  const { error: updateError } = await supabase
    .from('children')
    .update({ fruits_balance: child.fruits_balance - reward.price })
    .eq('id', child_id);

  if (updateError) {
    res.status(500).json({ error: '兑换失败' });
    return;
  }

  const { data: redemption, error: redemptionError } = await supabase
    .from('reward_redemptions')
    .insert({ child_id, reward_id: rewardId, status: 'pending' })
    .select('id, redeemed_at, status')
    .single();

  if (redemptionError || !redemption) {
    // 回滚果实
    await supabase
      .from('children')
      .update({ fruits_balance: child.fruits_balance })
      .eq('id', child_id);
    res.status(500).json({ error: '兑换记录创建失败' });
    return;
  }

  res.status(201).json({
    data: {
      redemption,
      reward_name: reward.name,
      fruits_spent: reward.price,
      remaining_balance: child.fruits_balance - reward.price,
    },
    message: `成功兑换"${reward.name}"，消耗 ${reward.price} 个果实`,
  });
});

// GET /api/v1/children/:childId/redemptions
router.get('/children/:childId/redemptions', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;

  const { data, error } = await supabase
    .from('reward_redemptions')
    .select(`
      id, redeemed_at, status,
      rewards(name, image, price, category)
    `)
    .eq('child_id', childId)
    .order('redeemed_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: '获取兑换记录失败' });
    return;
  }

  res.json({ data: data || [] });
});

export default router;