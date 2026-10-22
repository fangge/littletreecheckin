-- ============================================================
-- 成就丛林 (Achievement Jungle) — 完整数据库初始化脚本
-- 版本：v3.8（整合所有历史迁移，反映当前最终数据库状态）
-- 执行方式：在 Supabase SQL Editor 中一次性执行本文件即可
-- ============================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 一、辅助函数：自动更新 updated_at 字段
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 二、用户档案表（关联 Supabase Auth）
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    VARCHAR(50) UNIQUE NOT NULL,
  phone       VARCHAR(20),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "profiles_insert_service" ON profiles
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 触发器：注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pet_settings (parent_id)
  VALUES (NEW.id)
  ON CONFLICT (parent_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 三、孩子信息表
-- ============================================================
CREATE TABLE IF NOT EXISTS children (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            VARCHAR(50) NOT NULL,
  age             INTEGER CHECK (age >= 1 AND age <= 18),
  gender          VARCHAR(10) CHECK (gender IN ('male', 'female')),
  avatar          TEXT,
  fruits_balance  INTEGER NOT NULL DEFAULT 0 CHECK (fruits_balance >= 0),
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);

CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "children_select_own" ON children
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = parent_id);

CREATE POLICY "children_insert_own" ON children
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = parent_id);

CREATE POLICY "children_update_own" ON children
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = parent_id)
  WITH CHECK ((select auth.uid()) = parent_id);

CREATE POLICY "children_delete_own" ON children
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = parent_id);

CREATE POLICY "children_service_role" ON children
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 三-A、家长赠送果实记录与模板
-- ============================================================
CREATE TABLE IF NOT EXISTS fruit_gifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  fruits_amount   INTEGER NOT NULL CHECK (fruits_amount > 0),
  reason          TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 1 AND 200),
  status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  revoked_at      TIMESTAMPTZ,
  revoked_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fruit_gifts_child_created_at
  ON fruit_gifts(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fruit_gifts_parent_status_created_at
  ON fruit_gifts(parent_id, status, created_at DESC);

ALTER TABLE fruit_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fruit_gifts_select_own" ON fruit_gifts
  FOR SELECT TO authenticated
  USING (
    parent_id = (select auth.uid())
    AND child_id IN (SELECT id FROM children WHERE parent_id = (select auth.uid()))
  );

CREATE POLICY "fruit_gifts_service_role" ON fruit_gifts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS fruit_gift_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 1 AND 200),
  fruits_amount INTEGER NOT NULL CHECK (fruits_amount > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fruit_gift_templates_parent_updated_at
  ON fruit_gift_templates(parent_id, updated_at DESC);

CREATE TRIGGER update_fruit_gift_templates_updated_at BEFORE UPDATE ON fruit_gift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE fruit_gift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fruit_gift_templates_select_own" ON fruit_gift_templates
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = parent_id);

CREATE POLICY "fruit_gift_templates_insert_own" ON fruit_gift_templates
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = parent_id);

CREATE POLICY "fruit_gift_templates_update_own" ON fruit_gift_templates
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = parent_id)
  WITH CHECK ((select auth.uid()) = parent_id);

CREATE POLICY "fruit_gift_templates_delete_own" ON fruit_gift_templates
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = parent_id);

CREATE POLICY "fruit_gift_templates_service_role" ON fruit_gift_templates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 四、目标/习惯表
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title             VARCHAR(100) NOT NULL,
  icon              VARCHAR(50),
  duration_days     INTEGER NOT NULL CHECK (duration_days >= 1 AND duration_days <= 365),
  duration_minutes  INTEGER NOT NULL DEFAULT 0,
  reward_tree_name  VARCHAR(50),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  daily_count       INTEGER DEFAULT NULL,           -- 每日需完成次数，NULL 表示不限制
  fruits_per_task   INTEGER NOT NULL DEFAULT 10,    -- 每次审核通过奖励果实数
  is_shared         BOOLEAN NOT NULL DEFAULT FALSE, -- 是否为共享任务
  shared_child_ids  UUID[] DEFAULT '{}',            -- 参与共享任务的孩子 ID 列表
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN goals.daily_count IS '每日需完成次数，NULL 表示不限制';
COMMENT ON COLUMN goals.fruits_per_task IS '每次任务审核通过后奖励给孩子的果实数量，默认为10';
COMMENT ON COLUMN goals.is_shared IS '是否为共享任务（多孩子竞争）';
COMMENT ON COLUMN goals.shared_child_ids IS '参与共享任务的所有孩子 ID（含 child_id 字段中的主孩子）';

CREATE INDEX IF NOT EXISTS idx_goals_child_id ON goals(child_id);
CREATE INDEX IF NOT EXISTS idx_goals_shared_child_ids ON goals USING GIN (shared_child_ids);
CREATE INDEX IF NOT EXISTS idx_goals_is_shared ON goals (is_shared) WHERE is_shared = TRUE;

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 五、树木表（与目标一一对应）
-- ============================================================
CREATE TABLE IF NOT EXISTS trees (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  goal_id     UUID REFERENCES goals(id) ON DELETE SET NULL,
  name        VARCHAR(50) NOT NULL,
  image       TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'growing' CHECK (status IN ('growing', 'completed')),
  progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trees_child_id ON trees(child_id);
CREATE INDEX IF NOT EXISTS idx_trees_goal_id ON trees(goal_id);
CREATE INDEX IF NOT EXISTS idx_trees_child_status_updated ON trees(child_id, status, updated_at);

CREATE TRIGGER update_trees_updated_at BEFORE UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 六、任务打卡表（每日实例）
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id       UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  tree_id       UUID REFERENCES trees(id) ON DELETE SET NULL,
  title         VARCHAR(100) NOT NULL,
  type          VARCHAR(100),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  checkin_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url     TEXT,
  progress      INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  bonus_fruits  INTEGER NOT NULL DEFAULT 0,  -- 家长额外奖励果实数
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN tasks.bonus_fruits IS '家长审核时额外奖励的果实数，0 表示无额外奖励';

CREATE INDEX IF NOT EXISTS idx_tasks_child_id ON tasks(child_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_checkin_time ON tasks(goal_id, checkin_time);
CREATE INDEX IF NOT EXISTS idx_tasks_child_status_time ON tasks(child_id, status, checkin_time DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_child_checkin_time ON tasks(child_id, checkin_time DESC);

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 七、宠物养成系统
-- 6 种水果宠物 × 5 个成长阶段，使用孩子现有果实余额作为成长积分
-- ============================================================
-- ------------------------------------------------------------
-- 1. 家长级成长规则：每个阶段需要的积分
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pet_settings (
  parent_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_costs  INTEGER[] NOT NULL DEFAULT ARRAY[100, 200, 300, 400, 500]::INTEGER[],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_settings_stage_costs_len CHECK (COALESCE(array_length(stage_costs, 1), 0) = 5),
  CONSTRAINT pet_settings_stage_costs_not_null CHECK (array_position(stage_costs, NULL::INTEGER) IS NULL),
  CONSTRAINT pet_settings_stage_costs_positive CHECK (
    stage_costs[1] > 0 AND
    stage_costs[2] > 0 AND
    stage_costs[3] > 0 AND
    stage_costs[4] > 0 AND
    stage_costs[5] > 0
  )
);

DROP TRIGGER IF EXISTS update_pet_settings_updated_at ON public.pet_settings;
CREATE TRIGGER update_pet_settings_updated_at BEFORE UPDATE ON public.pet_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.pet_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_settings_select_own" ON public.pet_settings
  FOR SELECT TO authenticated
  USING (parent_id = (SELECT auth.uid()));

CREATE POLICY "pet_settings_service_role" ON public.pet_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------
-- 2. 孩子正在养的宠物 & 已毕业的宠物卡片
--    同一时间每个孩子只能有一只 status = 'growing' 的宠物
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.child_pets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id      UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  species       TEXT NOT NULL CHECK (species IN ('tao', 'xigua', 'ping', 'li', 'mei', 'jiao')),
  stage         SMALLINT NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 4),
  stage_points  INTEGER NOT NULL DEFAULT 0 CHECK (stage_points >= 0),
  total_points  INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  status        TEXT NOT NULL DEFAULT 'growing' CHECK (status IN ('growing', 'grown')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grown_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT child_pets_grown_at_consistency CHECK (
    (status = 'grown' AND grown_at IS NOT NULL) OR
    (status = 'growing' AND grown_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_child_pets_one_growing
  ON public.child_pets(child_id)
  WHERE status = 'growing';

CREATE INDEX IF NOT EXISTS idx_child_pets_child_status
  ON public.child_pets(child_id, status, grown_at DESC);

DROP TRIGGER IF EXISTS update_child_pets_updated_at ON public.child_pets;
CREATE TRIGGER update_child_pets_updated_at BEFORE UPDATE ON public.child_pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.child_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "child_pets_select_own" ON public.child_pets
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM public.children WHERE parent_id = (SELECT auth.uid())));

CREATE POLICY "child_pets_service_role" ON public.child_pets
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------
-- 3. 喂养流水（审计与成长记录）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pet_feedings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id              UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  pet_id                UUID NOT NULL REFERENCES public.child_pets(id) ON DELETE CASCADE,
  points                INTEGER NOT NULL CHECK (points > 0),
  stage_before          SMALLINT NOT NULL CHECK (stage_before BETWEEN 0 AND 4),
  stage_after           SMALLINT NOT NULL CHECK (stage_after BETWEEN 0 AND 4),
  stage_points_before   INTEGER NOT NULL CHECK (stage_points_before >= 0),
  stage_points_after    INTEGER NOT NULL CHECK (stage_points_after >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_feedings_child_time
  ON public.pet_feedings(child_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pet_feedings_pet_time
  ON public.pet_feedings(pet_id, created_at DESC);

ALTER TABLE public.pet_feedings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_feedings_select_own" ON public.pet_feedings
  FOR SELECT TO authenticated
  USING (parent_id = (SELECT auth.uid()));

CREATE POLICY "pet_feedings_service_role" ON public.pet_feedings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------
-- 4. 喂养宠物：扣积分 + 推进阶段 + 毕业（原子操作）
--    参数 p_points 为本次希望投入的积分；函数只扣除实际消耗的积分，
--    超出当前阶段升级所需的积分不会被扣除。
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.feed_pet(
  p_child_id UUID,
  p_pet_id UUID,
  p_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id       UUID;
  v_balance         INTEGER;
  v_pet             public.child_pets%ROWTYPE;
  v_new_pet         public.child_pets%ROWTYPE;
  v_costs           INTEGER[];
  v_stage           SMALLINT;
  v_stage_points    INTEGER;
  v_stage_before    SMALLINT;
  v_points_before   INTEGER;
  v_remaining       INTEGER;
  v_consumed        INTEGER := 0;
  v_cost            INTEGER;
  v_need            INTEGER;
  v_status          TEXT := 'growing';
  v_grown_at        TIMESTAMPTZ := NULL;
  v_new_balance     INTEGER;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'INVALID_POINTS' USING ERRCODE = 'P0001';
  END IF;

  SELECT parent_id, fruits_balance
    INTO v_parent_id, v_balance
    FROM public.children
   WHERE id = p_child_id AND is_deleted = FALSE
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHILD_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_pet
    FROM public.child_pets
   WHERE id = p_pet_id AND child_id = p_child_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PET_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_pet.status <> 'growing' THEN
    RAISE EXCEPTION 'PET_ALREADY_GROWN' USING ERRCODE = 'P0001';
  END IF;

  SELECT stage_costs
    INTO v_costs
    FROM public.pet_settings
   WHERE parent_id = v_parent_id;

  IF v_costs IS NULL OR array_length(v_costs, 1) <> 5 THEN
    v_costs := ARRAY[100, 200, 300, 400, 500]::INTEGER[];
  END IF;

  v_stage := v_pet.stage;
  v_stage_points := v_pet.stage_points;
  v_stage_before := v_stage;
  v_points_before := v_stage_points;
  v_remaining := p_points;

  WHILE v_remaining > 0 AND v_stage <= 4 LOOP
    v_cost := v_costs[v_stage + 1];
    v_need := v_cost - v_stage_points;

    IF v_need <= 0 THEN
      IF v_stage < 4 THEN
        v_stage := v_stage + 1;
        v_stage_points := 0;
        CONTINUE;
      ELSE
        v_stage_points := v_cost;
        v_status := 'grown';
        v_remaining := 0;
        EXIT;
      END IF;
    END IF;

    IF v_remaining >= v_need THEN
      v_consumed := v_consumed + v_need;
      v_remaining := v_remaining - v_need;
      v_stage_points := 0;

      IF v_stage < 4 THEN
        v_stage := v_stage + 1;
      ELSE
        v_stage_points := v_cost;
        v_status := 'grown';
        v_remaining := 0;
      END IF;
    ELSE
      v_stage_points := v_stage_points + v_remaining;
      v_consumed := v_consumed + v_remaining;
      v_remaining := 0;
    END IF;
  END LOOP;

  IF v_consumed <= 0 THEN
    RAISE EXCEPTION 'NOTHING_TO_FEED' USING ERRCODE = 'P0001';
  END IF;

  IF v_balance < v_consumed THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS' USING ERRCODE = 'P0001';
  END IF;

  IF v_status = 'grown' THEN
    v_grown_at := NOW();
  END IF;

  v_new_balance := v_balance - v_consumed;

  UPDATE public.children
     SET fruits_balance = v_new_balance
   WHERE id = p_child_id;

  UPDATE public.child_pets
     SET stage = v_stage,
         stage_points = v_stage_points,
         total_points = total_points + v_consumed,
         status = v_status,
         grown_at = v_grown_at
   WHERE id = p_pet_id
   RETURNING * INTO v_new_pet;

  INSERT INTO public.pet_feedings (
    parent_id, child_id, pet_id, points,
    stage_before, stage_after, stage_points_before, stage_points_after
  ) VALUES (
    v_parent_id, p_child_id, p_pet_id, v_consumed,
    v_stage_before, v_stage, v_points_before, v_stage_points
  );

  RETURN jsonb_build_object(
    'pet', to_jsonb(v_new_pet),
    'fruits_balance', v_new_balance,
    'spent', v_consumed,
    'stage_up', v_stage > v_stage_before,
    'completed', v_status = 'grown'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.feed_pet(UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feed_pet(UUID, UUID, INTEGER) TO service_role;

-- ------------------------------------------------------------
-- 5. 家长调整阶段积分后，按新的规则重新计算进行中宠物的阶段
--    从 total_points 重新分配，因此调低门槛可能让宠物提前毕业，
--    调高门槛也可能让宠物回到较早的阶段。
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_pet_stage(p_child_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id     UUID;
  v_pet           public.child_pets%ROWTYPE;
  v_new_pet       public.child_pets%ROWTYPE;
  v_costs         INTEGER[];
  v_remaining     INTEGER;
  v_stage         SMALLINT := 0;
  v_stage_points  INTEGER := 0;
  v_status        TEXT := 'growing';
  v_cost          INTEGER;
  i               INTEGER;
BEGIN
  SELECT parent_id INTO v_parent_id
    FROM public.children
   WHERE id = p_child_id AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT *
    INTO v_pet
    FROM public.child_pets
   WHERE child_id = p_child_id AND status = 'growing'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT stage_costs
    INTO v_costs
    FROM public.pet_settings
   WHERE parent_id = v_parent_id;

  IF v_costs IS NULL OR array_length(v_costs, 1) <> 5 THEN
    v_costs := ARRAY[100, 200, 300, 400, 500]::INTEGER[];
  END IF;

  v_remaining := v_pet.total_points;

  FOR i IN 0..4 LOOP
    v_cost := v_costs[i + 1];

    IF v_remaining >= v_cost THEN
      v_remaining := v_remaining - v_cost;

      IF i = 4 THEN
        v_stage := 4;
        v_stage_points := v_cost;
        v_status := 'grown';
      ELSE
        v_stage := i + 1;
        v_stage_points := 0;
      END IF;
    ELSE
      v_stage := i;
      v_stage_points := v_remaining;
      v_remaining := 0;
      EXIT;
    END IF;

    IF v_status = 'grown' THEN
      EXIT;
    END IF;
  END LOOP;

  UPDATE public.child_pets
     SET stage = v_stage,
         stage_points = v_stage_points,
         status = v_status,
         grown_at = CASE WHEN v_status = 'grown' THEN COALESCE(grown_at, NOW()) ELSE NULL END
   WHERE id = v_pet.id
   RETURNING * INTO v_new_pet;

  RETURN jsonb_build_object(
    'pet', to_jsonb(v_new_pet),
    'auto_completed', v_status = 'grown'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_pet_stage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_pet_stage(UUID) TO service_role;

-- ============================================================
-- 九、奖励表
-- ============================================================
CREATE TABLE IF NOT EXISTS rewards (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                        VARCHAR(100) NOT NULL,
  price                       INTEGER NOT NULL CHECK (price > 0),
  category                    VARCHAR(20) NOT NULL CHECK (category IN ('activity', 'toy', 'snack')),
  max_redemptions             INTEGER CHECK (max_redemptions > 0),
  max_consecutive_redemptions INTEGER CHECK (max_consecutive_redemptions > 0),
  cooldown_days               INTEGER CHECK (cooldown_days > 0),
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rewards_consecutive_cooldown_pair_check CHECK (
    (max_consecutive_redemptions IS NULL AND cooldown_days IS NULL)
    OR
    (max_consecutive_redemptions IS NOT NULL AND cooldown_days IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_rewards_parent_id ON rewards(parent_id);

-- RLS
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rewards_select_own" ON rewards
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = parent_id);

CREATE POLICY "rewards_service_role" ON rewards
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 十、奖励兑换记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  reward_id   UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_child_id ON reward_redemptions(child_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_child_time ON reward_redemptions(child_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_child_status ON reward_redemptions(child_id, status);
CREATE INDEX IF NOT EXISTS idx_redemptions_status_time ON reward_redemptions(status, redeemed_at DESC);

-- RLS
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_redemptions_select_own" ON reward_redemptions
  FOR SELECT TO authenticated
  USING (
    child_id IN (SELECT id FROM children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM rewards WHERE parent_id = (select auth.uid()))
  );

CREATE POLICY "reward_redemptions_insert_own" ON reward_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM rewards WHERE parent_id = (select auth.uid()))
  );

CREATE POLICY "reward_redemptions_update_own" ON reward_redemptions
  FOR UPDATE TO authenticated
  USING (
    child_id IN (SELECT id FROM children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM rewards WHERE parent_id = (select auth.uid()))
  )
  WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM rewards WHERE parent_id = (select auth.uid()))
  );

CREATE POLICY "reward_redemptions_delete_own" ON reward_redemptions
  FOR DELETE TO authenticated
  USING (
    child_id IN (SELECT id FROM children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM rewards WHERE parent_id = (select auth.uid()))
  );

CREATE POLICY "reward_redemptions_service_role" ON reward_redemptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 十一、现金兑换配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_exchange_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fruits_per_yuan INTEGER NOT NULL DEFAULT 100 CHECK (fruits_per_yuan > 0),
  yuan_amount     NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (yuan_amount > 0),
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id)
);

CREATE INDEX IF NOT EXISTS idx_cash_exchange_settings_parent_id ON cash_exchange_settings(parent_id);

CREATE TRIGGER update_cash_exchange_settings_updated_at BEFORE UPDATE ON cash_exchange_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cash_exchange_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_exchange_settings_select_own" ON cash_exchange_settings
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = parent_id);

CREATE POLICY "cash_exchange_settings_insert_own" ON cash_exchange_settings
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = parent_id);

CREATE POLICY "cash_exchange_settings_update_own" ON cash_exchange_settings
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = parent_id)
  WITH CHECK ((select auth.uid()) = parent_id);

CREATE POLICY "cash_exchange_settings_service_role" ON cash_exchange_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 十二、现金兑换记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_redemptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fruits_spent    INTEGER NOT NULL CHECK (fruits_spent > 0),
  fruits_per_yuan INTEGER NOT NULL CHECK (fruits_per_yuan > 0),
  yuan_amount     NUMERIC(10, 2) NOT NULL CHECK (yuan_amount > 0),
  cash_amount     NUMERIC(10, 2) NOT NULL CHECK (cash_amount > 0),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_redemptions_child_time ON cash_redemptions(child_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_redemptions_parent_status_time ON cash_redemptions(parent_id, status, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_redemptions_child_status ON cash_redemptions(child_id, status);

ALTER TABLE cash_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_redemptions_select_own" ON cash_redemptions
  FOR SELECT TO authenticated
  USING (parent_id = (select auth.uid()));

CREATE POLICY "cash_redemptions_insert_own" ON cash_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = (select auth.uid()) AND child_id IN (SELECT id FROM children WHERE parent_id = (select auth.uid())));

CREATE POLICY "cash_redemptions_update_own" ON cash_redemptions
  FOR UPDATE TO authenticated
  USING (parent_id = (select auth.uid()))
  WITH CHECK (parent_id = (select auth.uid()));

CREATE POLICY "cash_redemptions_delete_own" ON cash_redemptions
  FOR DELETE TO authenticated
  USING (parent_id = (select auth.uid()));

CREATE POLICY "cash_redemptions_service_role" ON cash_redemptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 十三、消息表
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  sender_id   UUID,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('parent', 'child', 'system')),
  text        TEXT,
  type        VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'sticker')),
  content     TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_child_id ON messages(child_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- 家长赠送果实事务函数
CREATE OR REPLACE FUNCTION gift_fruits_rpc(
  p_parent_id UUID,
  p_child_ids UUID[],
  p_fruits_amount INTEGER,
  p_reason TEXT
)
RETURNS TABLE (gift_count INTEGER, total_fruits INTEGER, child_ids UUID[]) AS $$
DECLARE
  v_child_ids UUID[];
  v_requested_count INTEGER;
  v_owned_count INTEGER;
  v_child_id UUID;
  v_reason TEXT := trim(COALESCE(p_reason, ''));
BEGIN
  IF p_fruits_amount IS NULL OR p_fruits_amount <= 0 THEN
    RAISE EXCEPTION '赠送果实数必须是大于0的整数';
  END IF;
  IF v_reason = '' OR char_length(v_reason) > 200 THEN
    RAISE EXCEPTION '赠送原因长度必须为1到200个字符';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT requested_child_id
    FROM unnest(COALESCE(p_child_ids, ARRAY[]::UUID[])) AS requested(requested_child_id)
    ORDER BY requested_child_id
  ) INTO v_child_ids;

  v_requested_count := COALESCE(cardinality(v_child_ids), 0);
  IF v_requested_count = 0 THEN
    RAISE EXCEPTION '至少选择一个孩子';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_owned_count
  FROM children
  WHERE parent_id = p_parent_id AND is_deleted = false AND id = ANY(v_child_ids);
  IF v_owned_count <> v_requested_count THEN
    RAISE EXCEPTION '存在无权操作的孩子';
  END IF;

  PERFORM 1 FROM children
  WHERE parent_id = p_parent_id AND is_deleted = false AND id = ANY(v_child_ids)
  ORDER BY id FOR UPDATE;

  FOREACH v_child_id IN ARRAY v_child_ids LOOP
    UPDATE children SET fruits_balance = fruits_balance + p_fruits_amount WHERE id = v_child_id;
    INSERT INTO fruit_gifts (parent_id, child_id, fruits_amount, reason)
    VALUES (p_parent_id, v_child_id, p_fruits_amount, v_reason);
    INSERT INTO messages (child_id, sender_id, sender_type, text, type, is_read)
    VALUES (v_child_id, p_parent_id, 'system', format('家长送给你 %s 个果实：%s', p_fruits_amount, v_reason), 'text', false);
  END LOOP;

  RETURN QUERY SELECT v_requested_count, v_requested_count * p_fruits_amount, v_child_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION gift_fruits_rpc(UUID, UUID[], INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION gift_fruits_rpc(UUID, UUID[], INTEGER, TEXT) TO service_role;

-- 家长撤回赠送果实事务函数
CREATE OR REPLACE FUNCTION revoke_fruit_gift_rpc(
  p_parent_id UUID,
  p_gift_id UUID,
  p_revoked_reason TEXT DEFAULT '家长撤回赠送'
)
RETURNS TABLE (gift_id UUID, child_id UUID, fruits_amount INTEGER, remaining_balance INTEGER) AS $$
DECLARE
  v_gift RECORD;
  v_child RECORD;
  v_reason TEXT := trim(COALESCE(p_revoked_reason, '家长撤回赠送'));
BEGIN
  SELECT id, child_id, fruits_amount, status INTO v_gift
  FROM fruit_gifts WHERE id = p_gift_id AND parent_id = p_parent_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '赠送记录不存在'; END IF;
  IF v_gift.status <> 'active' THEN RAISE EXCEPTION '该赠送记录已撤回'; END IF;

  SELECT id, fruits_balance INTO v_child
  FROM children
  WHERE id = v_gift.child_id AND parent_id = p_parent_id AND is_deleted = false
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '孩子不存在'; END IF;
  IF v_child.fruits_balance < v_gift.fruits_amount THEN
    RAISE EXCEPTION '孩子当前果实余额不足，无法撤回';
  END IF;

  UPDATE children SET fruits_balance = fruits_balance - v_gift.fruits_amount WHERE id = v_child.id;
  UPDATE fruit_gifts SET status = 'revoked', revoked_at = NOW(), revoked_reason = v_reason WHERE id = v_gift.id;
  INSERT INTO messages (child_id, sender_id, sender_type, text, type, is_read)
  VALUES (v_child.id, p_parent_id, 'system', format('家长收回了之前赠送的 %s 个果实：%s', v_gift.fruits_amount, v_reason), 'text', false);

  RETURN QUERY SELECT v_gift.id, v_child.id, v_gift.fruits_amount, v_child.fruits_balance - v_gift.fruits_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION revoke_fruit_gift_rpc(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revoke_fruit_gift_rpc(UUID, UUID, TEXT) TO service_role;

-- ============================================================
-- 十二、推送订阅表
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "push_subscriptions_update_own" ON push_subscriptions
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "push_subscriptions_service_role" ON push_subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 十三、RPC 函数
-- ============================================================

-- 1. 统计聚合函数（Dashboard 数据）
CREATE OR REPLACE FUNCTION get_child_stats(
  p_child_id   UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date   TIMESTAMPTZ
)
RETURNS TABLE (
  total_tasks     BIGINT,
  approved_tasks  BIGINT,
  forest_health   INTEGER,
  active_goals    BIGINT,
  completed_trees BIGINT,
  fruits_balance  INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(COUNT(t.id), 0)::BIGINT,
    COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'approved'), 0)::BIGINT,
    CASE
      WHEN COUNT(t.id) > 0
        THEN ROUND(100.0 * COUNT(t.id) FILTER (WHERE t.status = 'approved') / COUNT(t.id))
      ELSE 0
    END::INTEGER,
    (SELECT COUNT(*)::BIGINT FROM goals WHERE child_id = p_child_id AND is_active = true),
    (SELECT COUNT(*)::BIGINT FROM trees
      WHERE child_id = p_child_id AND status = 'completed'
        AND updated_at >= p_start_date AND updated_at <= p_end_date),
    c.fruits_balance
  FROM children c
  LEFT JOIN tasks t ON t.child_id = p_child_id
    AND t.checkin_time >= p_start_date
    AND t.checkin_time <= p_end_date
  WHERE c.id = p_child_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. 审核通过事务函数（原子化操作）
CREATE OR REPLACE FUNCTION approve_task_rpc(
  p_task_id     UUID,
  p_bonus_fruits INTEGER DEFAULT 0
)
RETURNS TABLE (
  task_id        UUID,
  goal_title     VARCHAR(100),
  total_fruits   INTEGER,
  tree_completed BOOLEAN,
  error_msg      TEXT
) AS $$
DECLARE
  v_task              RECORD;
  v_child             RECORD;
  v_goal              RECORD;
  v_tree              RECORD;
  v_base_fruits       INTEGER := 10;
  v_total_fruits      INTEGER;
  v_progress_increment INTEGER;
  v_new_progress      INTEGER;
  v_new_status        VARCHAR(20);
  v_tree_completed    BOOLEAN := FALSE;
  v_fruit_msg         TEXT;
BEGIN
  -- 1. 获取并锁定任务（FOR UPDATE 防止并发）
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_task_id, NULL::VARCHAR(100), NULL::INTEGER, FALSE::BOOLEAN, '任务不存在'::TEXT;
    RETURN;
  END IF;
  IF v_task.status <> 'pending' THEN
    RETURN QUERY SELECT p_task_id, NULL::VARCHAR(100), NULL::INTEGER, FALSE::BOOLEAN, '任务已审核，无法重复操作'::TEXT;
    RETURN;
  END IF;

  -- 2. 验证孩子存在
  SELECT id, fruits_balance INTO v_child FROM children WHERE id = v_task.child_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_task_id, NULL::VARCHAR(100), NULL::INTEGER, FALSE::BOOLEAN, '孩子不存在'::TEXT;
    RETURN;
  END IF;

  -- 3. 获取目标信息
  IF v_task.goal_id IS NOT NULL THEN
    SELECT duration_days, fruits_per_task, title INTO v_goal FROM goals WHERE id = v_task.goal_id;
    IF FOUND THEN
      v_base_fruits := COALESCE(v_goal.fruits_per_task, 10);
    END IF;
  END IF;
  v_total_fruits := v_base_fruits + COALESCE(p_bonus_fruits, 0);

  -- 4. 更新任务状态
  UPDATE tasks SET
    status       = 'approved',
    bonus_fruits = COALESCE(p_bonus_fruits, 0)
  WHERE id = p_task_id;

  -- 5. 增加果实余额
  UPDATE children SET
    fruits_balance = fruits_balance + v_total_fruits
  WHERE id = v_task.child_id;

  -- 6. 更新树木进度（如有）
  IF v_task.tree_id IS NOT NULL THEN
    SELECT * INTO v_tree FROM trees WHERE id = v_task.tree_id FOR UPDATE;
    IF FOUND AND v_tree.status = 'growing' THEN
      v_progress_increment := round(100.0 / COALESCE(v_goal.duration_days, 30));
      v_new_progress       := LEAST(100, v_tree.progress + v_progress_increment);
      v_new_status         := CASE WHEN v_new_progress >= 100 THEN 'completed' ELSE 'growing' END;

      UPDATE trees SET progress = v_new_progress, status = v_new_status WHERE id = v_task.tree_id;

      IF v_new_status = 'completed' THEN
        v_tree_completed := TRUE;
        UPDATE goals SET is_active = false WHERE id = v_task.goal_id;
      END IF;
    END IF;
  END IF;

  -- 7. 发送系统消息通知
  v_fruit_msg := CASE WHEN COALESCE(p_bonus_fruits, 0) > 0
    THEN format('获得 %s 个果实（含额外奖励 %s 个）', v_total_fruits, p_bonus_fruits)
    ELSE format('获得 %s 个果实', v_total_fruits)
  END;

  INSERT INTO messages (child_id, sender_type, text, type, is_read)
  VALUES (
    v_task.child_id,
    'system',
    format('🎉 太棒了！你的任务"%s"已通过审核，%s！', v_task.title, v_fruit_msg),
    'text',
    false
  );

  RETURN QUERY SELECT
    p_task_id,
    v_goal.title::VARCHAR(100),
    v_total_fruits,
    v_tree_completed,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. 果实兑换人民币事务函数（原子扣减果实 + 创建待发放记录）
DROP FUNCTION IF EXISTS redeem_cash_rpc(UUID, INTEGER);

CREATE OR REPLACE FUNCTION redeem_cash_rpc(
  p_child_id UUID,
  p_fruits_spent INTEGER
)
RETURNS TABLE (
  redemption_id UUID,
  fruits_spent INTEGER,
  fruits_per_yuan INTEGER,
  yuan_amount NUMERIC(10, 2),
  cash_amount NUMERIC(10, 2),
  remaining_balance INTEGER,
  error_msg TEXT
) AS $$
DECLARE
  v_child RECORD;
  v_setting RECORD;
  v_cash_amount NUMERIC(10, 2);
  v_redemption_id UUID;
BEGIN
  IF p_fruits_spent IS NULL OR p_fruits_spent <= 0 THEN
    RETURN QUERY SELECT NULL::UUID, 0, 0, 0::NUMERIC(10, 2), 0::NUMERIC(10, 2), 0, '兑换果实数必须大于0'::TEXT;
    RETURN;
  END IF;

  SELECT id, parent_id, fruits_balance
  INTO v_child
  FROM children
  WHERE id = p_child_id AND is_deleted = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 0, 0, 0::NUMERIC(10, 2), 0::NUMERIC(10, 2), 0, '孩子不存在'::TEXT;
    RETURN;
  END IF;

  SELECT ces.fruits_per_yuan, ces.yuan_amount, ces.is_enabled
  INTO v_setting
  FROM cash_exchange_settings AS ces
  WHERE ces.parent_id = v_child.parent_id;

  IF NOT FOUND THEN
    INSERT INTO cash_exchange_settings AS ces (parent_id, fruits_per_yuan, yuan_amount, is_enabled)
    VALUES (v_child.parent_id, 100, 1.00, true)
    RETURNING ces.fruits_per_yuan, ces.yuan_amount, ces.is_enabled INTO v_setting;
  END IF;

  IF v_setting.is_enabled IS NOT TRUE THEN
    RETURN QUERY SELECT NULL::UUID, 0, v_setting.fruits_per_yuan, v_setting.yuan_amount, 0::NUMERIC(10, 2), v_child.fruits_balance, '现金兑换暂未开启'::TEXT;
    RETURN;
  END IF;

  IF v_child.fruits_balance < p_fruits_spent THEN
    RETURN QUERY SELECT NULL::UUID, p_fruits_spent, v_setting.fruits_per_yuan, v_setting.yuan_amount, 0::NUMERIC(10, 2), v_child.fruits_balance, '果实余额不足'::TEXT;
    RETURN;
  END IF;

  v_cash_amount := ROUND((p_fruits_spent::NUMERIC / v_setting.fruits_per_yuan * v_setting.yuan_amount)::NUMERIC, 2);

  IF v_cash_amount <= 0 THEN
    RETURN QUERY SELECT NULL::UUID, p_fruits_spent, v_setting.fruits_per_yuan, v_setting.yuan_amount, 0::NUMERIC(10, 2), v_child.fruits_balance, '兑换金额必须大于0'::TEXT;
    RETURN;
  END IF;

  UPDATE children
  SET fruits_balance = fruits_balance - p_fruits_spent
  WHERE id = p_child_id;

  INSERT INTO cash_redemptions (child_id, parent_id, fruits_spent, fruits_per_yuan, yuan_amount, cash_amount, status)
  VALUES (p_child_id, v_child.parent_id, p_fruits_spent, v_setting.fruits_per_yuan, v_setting.yuan_amount, v_cash_amount, 'pending')
  RETURNING id INTO v_redemption_id;

  RETURN QUERY SELECT
    v_redemption_id,
    p_fruits_spent,
    v_setting.fruits_per_yuan,
    v_setting.yuan_amount,
    v_cash_amount,
    v_child.fruits_balance - p_fruits_spent,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 十四、种子数据
-- 勋章系统已移除。
-- 宠物成长规则使用内置默认值 100 / 200 / 300 / 400 / 500，
-- 家长首次保存时会写入 pet_settings；新注册家长会自动获得一行默认设置。
-- ============================================================
