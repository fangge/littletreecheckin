-- 将勋章定义按家长隔离。历史系统勋章会复制到已有家长，并保留孩子的解锁状态。

ALTER TABLE public.medals
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_medals_parent_id ON public.medals(parent_id);

ALTER TABLE public.medals ENABLE ROW LEVEL SECURITY;

CREATE TEMP TABLE medal_legacy_map (
  legacy_medal_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  new_medal_id UUID NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  legacy_medal RECORD;
  parent_record RECORD;
  copied_medal_id UUID;
BEGIN
  FOR legacy_medal IN
    SELECT id, name, icon, color, description, unlock_condition, created_at
    FROM public.medals
    WHERE parent_id IS NULL
  LOOP
    FOR parent_record IN SELECT id FROM auth.users LOOP
      INSERT INTO public.medals (
        parent_id, name, icon, color, description, unlock_condition, created_at
      )
      VALUES (
        parent_record.id,
        legacy_medal.name,
        legacy_medal.icon,
        legacy_medal.color,
        legacy_medal.description,
        legacy_medal.unlock_condition,
        legacy_medal.created_at
      )
      RETURNING id INTO copied_medal_id;

      INSERT INTO medal_legacy_map (legacy_medal_id, parent_id, new_medal_id)
      VALUES (legacy_medal.id, parent_record.id, copied_medal_id);
    END LOOP;
  END LOOP;
END;
$$;

UPDATE public.child_medals AS child_medal
SET medal_id = mapping.new_medal_id
FROM medal_legacy_map AS mapping
JOIN public.children AS child
  ON child.parent_id = mapping.parent_id
WHERE child_medal.medal_id = mapping.legacy_medal_id
  AND child_medal.child_id = child.id;

DELETE FROM public.medals
WHERE parent_id IS NULL;

ALTER TABLE public.medals
  ALTER COLUMN parent_id SET NOT NULL;

DROP POLICY IF EXISTS "medals_select_visible" ON public.medals;
CREATE POLICY "medals_select_own" ON public.medals
  FOR SELECT TO authenticated
  USING (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "medals_service_role" ON public.medals;
CREATE POLICY "medals_service_role" ON public.medals
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.child_medals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "child_medals_select_own" ON public.child_medals;
CREATE POLICY "child_medals_select_own" ON public.child_medals
  FOR SELECT TO authenticated
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND medal_id IN (SELECT id FROM public.medals WHERE parent_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "child_medals_insert_own" ON public.child_medals;
CREATE POLICY "child_medals_insert_own" ON public.child_medals
  FOR INSERT TO authenticated
  WITH CHECK (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND medal_id IN (SELECT id FROM public.medals WHERE parent_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "child_medals_update_own" ON public.child_medals;
CREATE POLICY "child_medals_update_own" ON public.child_medals
  FOR UPDATE TO authenticated
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND medal_id IN (SELECT id FROM public.medals WHERE parent_id = (select auth.uid()))
  )
  WITH CHECK (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND medal_id IN (SELECT id FROM public.medals WHERE parent_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "child_medals_delete_own" ON public.child_medals;
CREATE POLICY "child_medals_delete_own" ON public.child_medals
  FOR DELETE TO authenticated
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = (select auth.uid()))
    AND medal_id IN (SELECT id FROM public.medals WHERE parent_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "child_medals_service_role" ON public.child_medals;
CREATE POLICY "child_medals_service_role" ON public.child_medals
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 新用户获得自己的系统勋章副本；不再自动创建内置默认奖品。
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

  INSERT INTO public.medals (parent_id, name, icon, color, description, unlock_condition)
  SELECT NEW.id, seed.name, seed.icon, seed.color, seed.description, seed.unlock_condition::jsonb
  FROM (VALUES
    ('早起小标兵', 'wb_sunny', 'from-yellow-300 to-primary', '连续7天在早上8点前完成打卡', '{"type":"early_checkin","threshold":7}'),
    ('7天连续达人', 'local_fire_department', 'from-orange-400 to-red-500', '连续7天完成任务打卡', '{"type":"consecutive_days","threshold":7}'),
    ('浇水小能手', 'water_drop', 'from-blue-400 to-blue-600', '累计完成30次任务打卡', '{"type":"total_tasks","threshold":30}'),
    ('水果采摘员', 'nutrition', 'from-slate-300 to-slate-400', '完成第一棵树木的培育', '{"type":"trees_completed","threshold":1}'),
    ('根深蒂固', 'forest', 'from-slate-300 to-slate-400', '完成5棵树木的培育', '{"type":"trees_completed","threshold":5}'),
    ('闪亮之星', 'stars', 'from-purple-400 to-indigo-600', '累计获得500个果实', '{"type":"total_fruits","threshold":500}'),
    ('环保小英雄', 'eco', 'from-emerald-400 to-teal-600', '累计完成100次任务打卡', '{"type":"total_tasks","threshold":100}'),
    ('快速成长期', 'energy_savings_leaf', 'from-slate-300 to-slate-400', '在一周内完成3个不同目标的打卡', '{"type":"weekly_goals","threshold":3}'),
    ('顶尖选手', 'emoji_events', 'from-slate-300 to-slate-400', '累计完成200次任务打卡', '{"type":"total_tasks","threshold":200}')
  ) AS seed(name, icon, color, description, unlock_condition);

  RETURN NEW;
END;
$$;
