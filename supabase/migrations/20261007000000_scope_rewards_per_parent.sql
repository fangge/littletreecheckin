-- 将奖品目录从全局数据改为按家长隔离。
-- 历史版本的 rewards 没有 owner；为每个已有家长复制奖品，
-- 并把该家长孩子的历史兑换记录指向副本，保留兑换历史。

ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rewards_parent_id
  ON public.rewards(parent_id);

CREATE TEMP TABLE reward_legacy_map (
  legacy_reward_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  new_reward_id UUID NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  legacy_reward RECORD;
  parent_record RECORD;
  copied_reward_id UUID;
BEGIN
  FOR legacy_reward IN
    SELECT id, name, price, category, max_redemptions,
           max_consecutive_redemptions, cooldown_days, is_active, created_at
    FROM public.rewards
    WHERE parent_id IS NULL
  LOOP
    FOR parent_record IN SELECT id FROM auth.users LOOP
      INSERT INTO public.rewards (
        parent_id,
        name,
        price,
        category,
        max_redemptions,
        max_consecutive_redemptions,
        cooldown_days,
        is_active,
        created_at
      )
      VALUES (
        parent_record.id,
        legacy_reward.name,
        legacy_reward.price,
        legacy_reward.category,
        legacy_reward.max_redemptions,
        legacy_reward.max_consecutive_redemptions,
        legacy_reward.cooldown_days,
        legacy_reward.is_active,
        legacy_reward.created_at
      )
      RETURNING id INTO copied_reward_id;

      INSERT INTO reward_legacy_map (legacy_reward_id, parent_id, new_reward_id)
      VALUES (legacy_reward.id, parent_record.id, copied_reward_id);
    END LOOP;
  END LOOP;
END;
$$;

UPDATE public.reward_redemptions AS redemption
SET reward_id = mapping.new_reward_id
FROM reward_legacy_map AS mapping
JOIN public.children AS child
  ON child.parent_id = mapping.parent_id
WHERE redemption.reward_id = mapping.legacy_reward_id
  AND redemption.child_id = child.id;

DELETE FROM public.rewards
WHERE parent_id IS NULL;

ALTER TABLE public.rewards
  ALTER COLUMN parent_id SET NOT NULL;

DROP POLICY IF EXISTS "rewards_select_authenticated" ON public.rewards;
CREATE POLICY "rewards_select_own" ON public.rewards
  FOR SELECT TO authenticated
  USING (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "rewards_service_role" ON public.rewards;
CREATE POLICY "rewards_service_role" ON public.rewards
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "reward_redemptions_select_own" ON public.reward_redemptions;
CREATE POLICY "reward_redemptions_select_own" ON public.reward_redemptions
  FOR SELECT TO authenticated
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM public.rewards WHERE parent_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "reward_redemptions_insert_own" ON public.reward_redemptions;
CREATE POLICY "reward_redemptions_insert_own" ON public.reward_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM public.rewards WHERE parent_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "reward_redemptions_update_own" ON public.reward_redemptions;
CREATE POLICY "reward_redemptions_update_own" ON public.reward_redemptions
  FOR UPDATE TO authenticated
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM public.rewards WHERE parent_id = (select auth.uid()))
  )
  WITH CHECK (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM public.rewards WHERE parent_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "reward_redemptions_delete_own" ON public.reward_redemptions;
CREATE POLICY "reward_redemptions_delete_own" ON public.reward_redemptions
  FOR DELETE TO authenticated
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND reward_id IN (SELECT id FROM public.rewards WHERE parent_id = (select auth.uid()))
  );

-- 新注册用户不再自动获得内置默认奖品。
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

  RETURN NEW;
END;
$$;
