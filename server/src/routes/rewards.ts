import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

const router: Router = Router();

const CASH_DEFAULT_FRUITS_PER_YUAN = 100;
const CASH_DEFAULT_YUAN_AMOUNT = 1;

const toCashAmount = (value: unknown): number => Number(Number(value || 0).toFixed(2));

const sortByRedeemedAtDesc = <T extends { redeemed_at: string }>(items: T[]): T[] =>
  items.sort((a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime());

const getOwnedChildIds = async (parentId: string, requestedChildIds: string[]) => {
  const { data, error } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', parentId)
    .eq('is_deleted', false)
    .in('id', requestedChildIds);

  if (error) return [];
  return (data || []).map(child => child.id as string);
};

const getCashSettingForParent = async (parentId: string) => {
  const { data: existing, error } = await supabase
    .from('cash_exchange_settings')
    .select('id, parent_id, fruits_per_yuan, yuan_amount, is_enabled, updated_at')
    .eq('parent_id', parentId)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('cash_exchange_settings')
    .insert({
      parent_id: parentId,
      fruits_per_yuan: CASH_DEFAULT_FRUITS_PER_YUAN,
      yuan_amount: CASH_DEFAULT_YUAN_AMOUNT,
      is_enabled: true,
    })
    .select('id, parent_id, fruits_per_yuan, yuan_amount, is_enabled, updated_at')
    .single();

  if (createError) throw createError;
  return created;
};

// GET /api/v1/rewards
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { category } = req.query;

  let query = supabase
    .from('rewards')
    .select('id, name, price, category')
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

// GET /api/v1/rewards/cash/settings
router.get('/cash/settings', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: '认证已过期，请重新登录' });
    return;
  }

  try {
    const setting = await getCashSettingForParent(req.user.id);
    res.json({ data: setting });
  } catch (error) {
    console.error('获取现金兑换配置失败:', error);
    res.status(500).json({ error: '获取现金兑换配置失败' });
  }
});

// PUT /api/v1/rewards/cash/settings
router.put('/cash/settings', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: '认证已过期，请重新登录' });
    return;
  }

  const fruitsPerYuan = Number(req.body.fruits_per_yuan);
  const yuanAmount = Number(req.body.yuan_amount);
  const isEnabled = req.body.is_enabled;

  if (!Number.isInteger(fruitsPerYuan) || fruitsPerYuan <= 0) {
    res.status(400).json({ error: '兑换比例必须是大于0的整数' });
    return;
  }

  if (!Number.isFinite(yuanAmount) || yuanAmount <= 0) {
    res.status(400).json({ error: '兑换金额必须大于0' });
    return;
  }

  if (isEnabled !== undefined && typeof isEnabled !== 'boolean') {
    res.status(400).json({ error: '开启状态必须是布尔值' });
    return;
  }

  const { data, error } = await supabase
    .from('cash_exchange_settings')
    .upsert({
      parent_id: req.user.id,
      fruits_per_yuan: fruitsPerYuan,
      yuan_amount: toCashAmount(yuanAmount),
      is_enabled: isEnabled ?? true,
    }, { onConflict: 'parent_id' })
    .select('id, parent_id, fruits_per_yuan, yuan_amount, is_enabled, updated_at')
    .single();

  if (error || !data) {
    res.status(500).json({ error: '保存现金兑换配置失败' });
    return;
  }

  res.json({ data, message: '现金兑换配置已保存' });
});

// POST /api/v1/rewards/cash/redeem
router.post('/cash/redeem', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { child_id, fruits_spent } = req.body;
  const fruitsSpent = Number(fruits_spent);

  if (!child_id) {
    res.status(400).json({ error: '孩子ID不能为空' });
    return;
  }

  if (!Number.isInteger(fruitsSpent) || fruitsSpent <= 0) {
    res.status(400).json({ error: '兑换果实数必须是大于0的整数' });
    return;
  }

  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id')
    .eq('id', child_id)
    .eq('parent_id', req.user?.id)
    .eq('is_deleted', false)
    .single();

  if (childError || !child) {
    res.status(403).json({ error: '无权为该孩子发起现金兑换' });
    return;
  }

  const { data, error } = await supabase.rpc('redeem_cash_rpc', {
    p_child_id: child_id,
    p_fruits_spent: fruitsSpent,
  });

  const result = Array.isArray(data) ? data[0] : data;

  if (error || !result) {
    console.error('现金兑换失败:', error);
    res.status(500).json({ error: '现金兑换失败' });
    return;
  }

  if (result.error_msg) {
    res.status(400).json({ error: result.error_msg, data: result });
    return;
  }

  res.status(201).json({
    data: {
      redemption_id: result.redemption_id,
      fruits_spent: result.fruits_spent,
      fruits_per_yuan: result.fruits_per_yuan,
      yuan_amount: toCashAmount(result.yuan_amount),
      cash_amount: toCashAmount(result.cash_amount),
      remaining_balance: result.remaining_balance,
    },
    message: `成功提交现金兑换，${result.fruits_spent} 个果实可兑换 ¥${toCashAmount(result.cash_amount).toFixed(2)}`,
  });
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

  const [rewardRes, cashRes] = await Promise.all([
    supabase
      .from('reward_redemptions')
      .select(`
        id, child_id, redeemed_at, status,
        rewards(name, price, category)
      `)
      .eq('child_id', childId),
    supabase
      .from('cash_redemptions')
      .select('id, child_id, redeemed_at, status, fruits_spent, fruits_per_yuan, yuan_amount, cash_amount')
      .eq('child_id', childId),
  ]);

  if (rewardRes.error || cashRes.error) {
    res.status(500).json({ error: '获取兑换记录失败' });
    return;
  }

  const rewardItems = (rewardRes.data || []).map(item => ({
    ...item,
    redemption_type: 'reward' as const,
  }));

  const cashItems = (cashRes.data || []).map(item => ({
    ...item,
    redemption_type: 'cash' as const,
    cash_amount: toCashAmount(item.cash_amount),
  }));

  res.json({ data: sortByRedeemedAtDesc([...rewardItems, ...cashItems]) });
});

// GET /api/v1/rewards/redemptions/batch?child_ids=uuid1,uuid2,uuid3
// 批量获取多个孩子的兑换记录（性能优化：避免 N+1 查询）
router.get('/redemptions/batch', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { child_ids } = req.query;

  if (!child_ids || typeof child_ids !== 'string') {
    res.status(400).json({ error: '缺少 child_ids 参数' });
    return;
  }

  const requestedChildIds = child_ids.split(',').filter(Boolean);

  if (requestedChildIds.length === 0) {
    res.json({ data: [] });
    return;
  }

  const childIdArray = req.user?.id
    ? await getOwnedChildIds(req.user.id, requestedChildIds)
    : requestedChildIds;

  if (childIdArray.length === 0) {
    res.json({ data: [] });
    return;
  }

  const [rewardRes, cashRes] = await Promise.all([
    supabase
      .from('reward_redemptions')
      .select(`
        id, child_id, redeemed_at, status,
        rewards(name, price, category),
        children(name)
      `)
      .in('child_id', childIdArray),
    supabase
      .from('cash_redemptions')
      .select('id, child_id, redeemed_at, status, fruits_spent, fruits_per_yuan, yuan_amount, cash_amount, children(name)')
      .in('child_id', childIdArray),
  ]);

  if (rewardRes.error || cashRes.error) {
    res.status(500).json({ error: '获取兑换记录失败' });
    return;
  }

  const rewardItems = (rewardRes.data || []).map(item => ({
    ...item,
    redemption_type: 'reward' as const,
  }));

  const cashItems = (cashRes.data || []).map(item => ({
    ...item,
    redemption_type: 'cash' as const,
    cash_amount: toCashAmount(item.cash_amount),
  }));

  res.json({ data: sortByRedeemedAtDesc([...rewardItems, ...cashItems]) });
});

// PUT /api/v1/rewards/redemptions/:redemptionId/complete  (家长确认奖励已发放)
router.put('/redemptions/:redemptionId/complete', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { redemptionId } = req.params;

  const { error } = await supabase
    .from('reward_redemptions')
    .update({ status: 'completed' })
    .eq('id', redemptionId);

  if (error) {
    res.status(500).json({ error: '确认失败' });
    return;
  }

  res.json({ message: '已确认奖励发放' });
});

// PUT /api/v1/rewards/cash/redemptions/:redemptionId/complete  (家长确认现金已发放)
router.put('/cash/redemptions/:redemptionId/complete', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { redemptionId } = req.params;

  const { data: redemption, error: fetchError } = await supabase
    .from('cash_redemptions')
    .select('id, status, parent_id')
    .eq('id', redemptionId)
    .single();

  if (fetchError || !redemption) {
    res.status(404).json({ error: '现金兑换记录不存在' });
    return;
  }

  if (req.user?.id && redemption.parent_id !== req.user.id) {
    res.status(403).json({ error: '无权操作该兑换记录' });
    return;
  }

  if (redemption.status !== 'pending') {
    res.status(400).json({ error: '只能确认待发放的现金兑换记录' });
    return;
  }

  const { error } = await supabase
    .from('cash_redemptions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', redemptionId);

  if (error) {
    res.status(500).json({ error: '确认现金发放失败' });
    return;
  }

  res.json({ message: '已确认现金发放' });
});

// PUT /api/v1/rewards/redemptions/:redemptionId/cancel  (家长撤回兑换)
router.put('/redemptions/:redemptionId/cancel', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { redemptionId } = req.params;

  // 1. 获取兑换记录信息
  const { data: redemption, error: fetchError } = await supabase
    .from('reward_redemptions')
    .select('child_id, rewards(price), status')
    .eq('id', redemptionId)
    .single();

  if (fetchError || !redemption) {
    res.status(404).json({ error: '兑换记录不存在' });
    return;
  }

  // 2. 检查状态，只能撤回待发放的记录
  if (redemption.status !== 'pending') {
    res.status(400).json({ error: '只能撤回待发放的兑换记录' });
    return;
  }

  const price = (redemption.rewards as any)?.price || 0;

  // 3. 获取当前孩子的果实余额
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('fruits_balance')
    .eq('id', redemption.child_id)
    .single();

  if (childError || !child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  // 4. 返还果实给孩子
  const { error: updateError } = await supabase
    .from('children')
    .update({ fruits_balance: child.fruits_balance + price })
    .eq('id', redemption.child_id);

  if (updateError) {
    res.status(500).json({ error: '返还果实失败' });
    return;
  }

  // 5. 删除兑换记录
  const { error: deleteError } = await supabase
    .from('reward_redemptions')
    .delete()
    .eq('id', redemptionId);

  if (deleteError) {
    res.status(500).json({ error: '删除兑换记录失败' });
    return;
  }

  res.json({ message: '已撤回兑换，果实已返还' });
});

// PUT /api/v1/rewards/cash/redemptions/:redemptionId/cancel  (家长撤回现金兑换)
router.put('/cash/redemptions/:redemptionId/cancel', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { redemptionId } = req.params;

  const { data: redemption, error: fetchError } = await supabase
    .from('cash_redemptions')
    .select('child_id, parent_id, fruits_spent, status')
    .eq('id', redemptionId)
    .single();

  if (fetchError || !redemption) {
    res.status(404).json({ error: '现金兑换记录不存在' });
    return;
  }

  if (req.user?.id && redemption.parent_id !== req.user.id) {
    res.status(403).json({ error: '无权操作该兑换记录' });
    return;
  }

  if (redemption.status !== 'pending') {
    res.status(400).json({ error: '只能撤回待发放的现金兑换记录' });
    return;
  }

  const { data: child, error: childError } = await supabase
    .from('children')
    .select('fruits_balance')
    .eq('id', redemption.child_id)
    .single();

  if (childError || !child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  const { error: updateError } = await supabase
    .from('children')
    .update({ fruits_balance: child.fruits_balance + redemption.fruits_spent })
    .eq('id', redemption.child_id);

  if (updateError) {
    res.status(500).json({ error: '返还果实失败' });
    return;
  }

  const { error: deleteError } = await supabase
    .from('cash_redemptions')
    .delete()
    .eq('id', redemptionId);

  if (deleteError) {
    res.status(500).json({ error: '删除现金兑换记录失败' });
    return;
  }

  res.json({ message: '已撤回现金兑换，果实已返还' });
});

// POST /api/v1/rewards  (创建奖品)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, price, category } = req.body;

  if (!name || !price || !category) {
    res.status(400).json({ error: '名称、价格和分类不能为空' });
    return;
  }

  if (!['activity', 'toy', 'snack'].includes(category)) {
    res.status(400).json({ error: '分类必须是 activity/toy/snack 之一' });
    return;
  }

  if (price <= 0) {
    res.status(400).json({ error: '价格必须大于0' });
    return;
  }

  const { data, error } = await supabase
    .from('rewards')
    .insert({ name, price, category, is_active: true })
    .select('id, name, price, category, is_active')
    .single();

  if (error || !data) {
    res.status(500).json({ error: '创建奖品失败' });
    return;
  }

  res.status(201).json({ data, message: '奖品创建成功' });
});

// PUT /api/v1/rewards/:rewardId  (更新奖品)
router.put('/:rewardId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { rewardId } = req.params;
  const { name, price, category, is_active } = req.body;

  const { data: existing } = await supabase
    .from('rewards')
    .select('id')
    .eq('id', rewardId)
    .single();

  if (!existing) {
    res.status(404).json({ error: '奖品不存在' });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (price !== undefined) updateData.price = price;
  if (category !== undefined) updateData.category = category;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data, error } = await supabase
    .from('rewards')
    .update(updateData)
    .eq('id', rewardId)
    .select('id, name, price, category, is_active')
    .single();

  if (error || !data) {
    res.status(500).json({ error: '更新奖品失败' });
    return;
  }

  res.json({ data, message: '奖品更新成功' });
});

// DELETE /api/v1/rewards/:rewardId  (硬删除奖品，关联兑换记录由 ON DELETE CASCADE 自动清理)
router.delete('/:rewardId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { rewardId } = req.params;

  const { data: existing } = await supabase
    .from('rewards')
    .select('id')
    .eq('id', rewardId)
    .single();

  if (!existing) {
    res.status(404).json({ error: '奖品不存在' });
    return;
  }

  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId);

  if (error) {
    res.status(500).json({ error: '删除奖品失败' });
    return;
  }

  res.json({ message: '奖品已删除' });
});

// GET /api/v1/rewards/all  (获取所有奖品，含已下架，供家长管理)
router.get('/all', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('id, name, price, category, is_active')
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: '获取奖品列表失败' });
    return;
  }

  res.json({ data: data || [] });
});

export default router;
