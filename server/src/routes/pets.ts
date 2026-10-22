import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware, requireParentRole } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

const router: Router = Router();

const PET_SPECIES = ['tao', 'xigua', 'ping', 'li', 'mei', 'jiao'] as const;
const DEFAULT_STAGE_COSTS = [100, 200, 300, 400, 500];
const MAX_STAGE_COST = 100_000;
const MAX_FEED_AMOUNT = 1_000_000;

type PetSpecies = (typeof PET_SPECIES)[number];
type PetStatus = 'growing' | 'grown';

interface PetRow {
  id: string;
  child_id: string;
  species: PetSpecies;
  stage: number;
  stage_points: number;
  total_points: number;
  status: PetStatus;
  started_at: string;
  grown_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PetSettingsRow {
  stage_costs: number[];
  updated_at: string;
}

const isPetSpecies = (value: unknown): value is PetSpecies =>
  typeof value === 'string' && (PET_SPECIES as readonly string[]).includes(value);

const normalizeCosts = (value: unknown): number[] | null => {
  if (!Array.isArray(value) || value.length !== 5) return null;

  const costs = value.map((item) => Number(item));
  if (!costs.every((cost) => Number.isSafeInteger(cost) && cost > 0 && cost <= MAX_STAGE_COST)) {
    return null;
  }

  return costs;
};

const decoratePet = (pet: PetRow, costs: number[]) => {
  const stageCost = costs[pet.stage] ?? costs[costs.length - 1];
  const totalRequired = costs.reduce((sum, cost) => sum + cost, 0);
  const stageProgress = stageCost > 0
    ? Math.min(100, Math.round((pet.stage_points / stageCost) * 100))
    : 100;
  const totalProgress = totalRequired > 0
    ? Math.min(100, Math.round((pet.total_points / totalRequired) * 100))
    : 0;

  return {
    ...pet,
    stage_cost: stageCost,
    stage_remaining: Math.max(0, stageCost - pet.stage_points),
    stage_progress: stageProgress,
    total_progress: totalProgress,
    next_stage: pet.stage < 4 ? pet.stage + 1 : null,
  };
};

const findChild = async (childId: string, parentId: string) => {
  const { data: child } = await supabase
    .from('children')
    .select('id, parent_id, fruits_balance')
    .eq('id', childId)
    .eq('parent_id', parentId)
    .eq('is_deleted', false)
    .single();

  return child;
};

const getStageCosts = async (parentId: string): Promise<{ costs: number[]; updated_at: string | null }> => {
  const { data, error } = await supabase
    .from('pet_settings')
    .select('stage_costs, updated_at')
    .eq('parent_id', parentId)
    .maybeSingle();

  if (error) {
    throw new Error(`读取宠物成长规则失败: ${error.message}`);
  }

  const row = data as PetSettingsRow | null;
  const costs = normalizeCosts(row?.stage_costs);
  return {
    costs: costs ?? DEFAULT_STAGE_COSTS,
    updated_at: row?.updated_at ?? null,
  };
};

const getActivePet = async (childId: string) => {
  const { data, error } = await supabase
    .from('child_pets')
    .select('*')
    .eq('child_id', childId)
    .eq('status', 'growing')
    .maybeSingle();

  if (error) throw new Error(`读取宠物失败: ${error.message}`);
  return data as PetRow | null;
};

const getCards = async (childId: string) => {
  const { data, error } = await supabase
    .from('child_pets')
    .select('*')
    .eq('child_id', childId)
    .eq('status', 'grown')
    .order('grown_at', { ascending: false });

  if (error) throw new Error(`读取宠物卡片失败: ${error.message}`);
  return (data ?? []) as PetRow[];
};

const remainingToGrow = (pet: PetRow, costs: number[]) => {
  const current = Math.max(0, (costs[pet.stage] ?? 0) - pet.stage_points);
  const future = costs.slice(pet.stage + 1).reduce((sum, cost) => sum + cost, 0);
  return current + future;
};

const mapFeedError = (message: string): { status: number; error: string } => {
  if (message.includes('INSUFFICIENT_POINTS')) {
    return { status: 400, error: '成长积分不足，先去完成打卡任务吧' };
  }
  if (message.includes('PET_ALREADY_GROWN')) {
    return { status: 409, error: '这只宠物已经毕业啦，去领养一只新的吧' };
  }
  if (message.includes('PET_NOT_FOUND')) {
    return { status: 404, error: '宠物不存在' };
  }
  if (message.includes('CHILD_NOT_FOUND')) {
    return { status: 404, error: '孩子不存在' };
  }
  if (message.includes('NOTHING_TO_FEED') || message.includes('INVALID_POINTS')) {
    return { status: 400, error: '喂养积分无效' };
  }
  return { status: 500, error: '喂养失败，请稍后再试' };
};

// ============================================================
// GET /api/v1/children/:childId/pets
// 宠物主页聚合：成长规则 + 进行中宠物 + 已毕业卡片 + 积分余额
// ============================================================
router.get('/:childId/pets', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;

  try {
    const child = await findChild(childId, req.user!.id);
    if (!child) {
      res.status(404).json({ error: '孩子不存在' });
      return;
    }

    const [{ costs, updated_at }, activePet, cards] = await Promise.all([
      getStageCosts(child.parent_id),
      getActivePet(childId),
      getCards(childId),
    ]);

    res.json({
      data: {
        settings: { stage_costs: costs, updated_at },
        active_pet: activePet ? decoratePet(activePet, costs) : null,
        cards: cards.map((pet) => decoratePet(pet, costs)),
        fruits_balance: child.fruits_balance,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '获取宠物信息失败' });
  }
});

// ============================================================
// GET /api/v1/children/:childId/pet-settings
// ============================================================
router.get('/:childId/pet-settings', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;

  try {
    const child = await findChild(childId, req.user!.id);
    if (!child) {
      res.status(404).json({ error: '孩子不存在' });
      return;
    }

    const { costs, updated_at } = await getStageCosts(child.parent_id);
    res.json({ data: { stage_costs: costs, updated_at } });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '获取成长规则失败' });
  }
});

// ============================================================
// PUT /api/v1/children/:childId/pet-settings
// 家长调整 5 个阶段分别需要的积分；调整后重新计算进行中宠物的阶段
// ============================================================
router.put(
  '/:childId/pet-settings',
  authMiddleware,
  requireParentRole,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { childId } = req.params;
    const costs = normalizeCosts(req.body?.stage_costs);

    if (!costs) {
      res.status(400).json({ error: '请为 5 个成长阶段分别填写 1 ~ 100000 的整数积分' });
      return;
    }

    try {
      const child = await findChild(childId, req.user!.id);
      if (!child) {
        res.status(404).json({ error: '孩子不存在' });
        return;
      }

      const { error: upsertError } = await supabase
        .from('pet_settings')
        .upsert({ parent_id: child.parent_id, stage_costs: costs }, { onConflict: 'parent_id' });

      if (upsertError) {
        res.status(500).json({ error: `保存成长规则失败: ${upsertError.message}` });
        return;
      }

      const { data: recalculated, error: recalcError } = await supabase
        .rpc('recalculate_pet_stage', { p_child_id: childId });

      if (recalcError) {
        res.status(500).json({ error: `成长规则已保存，但重新计算宠物阶段失败: ${recalcError.message}` });
        return;
      }

      const recalc = recalculated as { pet?: PetRow; auto_completed?: boolean } | null;
      const pet = recalc?.pet ? decoratePet(recalc.pet, costs) : null;

      res.json({
        data: {
          settings: { stage_costs: costs, updated_at: new Date().toISOString() },
          pet,
          auto_completed: Boolean(recalc?.auto_completed),
        },
        message: '成长规则已更新',
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : '保存成长规则失败' });
    }
  },
);

// ============================================================
// POST /api/v1/children/:childId/pets
// 领养一只宠物（同一时间只能养一只）
// ============================================================
router.post('/:childId/pets', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;
  const species = req.body?.species;

  if (!isPetSpecies(species)) {
    res.status(400).json({ error: '请选择一种宠物' });
    return;
  }

  try {
    const child = await findChild(childId, req.user!.id);
    if (!child) {
      res.status(404).json({ error: '孩子不存在' });
      return;
    }

    const activePet = await getActivePet(childId);
    if (activePet) {
      res.status(409).json({ error: '当前还有宠物在成长，先陪它毕业吧' });
      return;
    }

    const { data, error } = await supabase
      .from('child_pets')
      .insert({
        child_id: childId,
        species,
        stage: 0,
        stage_points: 0,
        total_points: 0,
        status: 'growing',
      })
      .select('*')
      .single();

    if (error || !data) {
      // 并发领养时唯一索引会拦截第二只
      if (error?.code === '23505') {
        res.status(409).json({ error: '当前还有宠物在成长，先陪它毕业吧' });
        return;
      }
      res.status(500).json({ error: `领养失败: ${error?.message ?? '未知错误'}` });
      return;
    }

    const { costs } = await getStageCosts(child.parent_id);
    res.status(201).json({
      data: {
        pet: decoratePet(data as PetRow, costs),
        fruits_balance: child.fruits_balance,
      },
      message: '领养成功',
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '领养失败' });
  }
});

// ============================================================
// POST /api/v1/children/:childId/pets/:petId/feed
// 用成长积分喂养宠物（积分即孩子的果实余额）
// ============================================================
router.post('/:childId/pets/:petId/feed', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId, petId } = req.params;
  const requestedPoints = Number(req.body?.points);

  if (!Number.isSafeInteger(requestedPoints) || requestedPoints <= 0 || requestedPoints > MAX_FEED_AMOUNT) {
    res.status(400).json({ error: '请填写有效的喂养积分' });
    return;
  }

  try {
    const child = await findChild(childId, req.user!.id);
    if (!child) {
      res.status(404).json({ error: '孩子不存在' });
      return;
    }

    const { costs } = await getStageCosts(child.parent_id);
    const activePet = await getActivePet(childId);

    if (!activePet || activePet.id !== petId) {
      res.status(404).json({ error: '宠物不存在或已经毕业' });
      return;
    }

    // 不允许一次投入超过“升到毕业”所需的总积分，避免额外扣费
    const points = Math.min(requestedPoints, remainingToGrow(activePet, costs));

    if (points <= 0) {
      res.status(400).json({ error: '这只宠物已经完成全部成长啦' });
      return;
    }

    if (child.fruits_balance < points) {
      res.status(400).json({
        error: `成长积分不足，当前有 ${child.fruits_balance} 积分，本次需要 ${points} 积分`,
        data: { current_balance: child.fruits_balance, required: points },
      });
      return;
    }

    const { data, error } = await supabase.rpc('feed_pet', {
      p_child_id: childId,
      p_pet_id: petId,
      p_points: points,
    });

    if (error) {
      const mapped = mapFeedError(error.message);
      res.status(mapped.status).json({ error: mapped.error });
      return;
    }

    const result = data as {
      pet: PetRow;
      fruits_balance: number;
      spent: number;
      stage_up: boolean;
      completed: boolean;
    } | null;

    if (!result?.pet) {
      res.status(500).json({ error: '喂养失败，请稍后再试' });
      return;
    }

    res.json({
      data: {
        ...result,
        pet: decoratePet(result.pet, costs),
      },
      message: result.completed ? '宠物毕业啦！' : result.stage_up ? '宠物进化啦！' : '喂养成功',
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '喂养失败' });
  }
});

export default router;
