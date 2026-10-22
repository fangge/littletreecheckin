-- ============================================================
-- 宠物养成系统
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

-- ------------------------------------------------------------
-- 6. 新注册家长自动创建默认成长规则
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 7. 现有家长默认使用 100 / 200 / 300 / 400 / 500
--    首次保存设置时会自动 upsert，无需预先写入
-- ------------------------------------------------------------
