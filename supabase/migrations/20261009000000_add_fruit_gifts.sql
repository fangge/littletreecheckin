-- 家长直接赠送果实记录与原子批量发放函数
CREATE TABLE IF NOT EXISTS public.fruit_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  fruits_amount INTEGER NOT NULL CHECK (fruits_amount > 0),
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 1 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fruit_gifts_child_created_at
  ON public.fruit_gifts(child_id, created_at DESC);

ALTER TABLE public.fruit_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fruit_gifts_select_own" ON public.fruit_gifts;
CREATE POLICY "fruit_gifts_select_own" ON public.fruit_gifts
  FOR SELECT TO authenticated
  USING (
    parent_id = (select auth.uid())
    AND child_id IN (
      SELECT id FROM public.children WHERE parent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "fruit_gifts_service_role" ON public.fruit_gifts;
CREATE POLICY "fruit_gifts_service_role" ON public.fruit_gifts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.gift_fruits_rpc(
  p_parent_id UUID,
  p_child_ids UUID[],
  p_fruits_amount INTEGER,
  p_reason TEXT
)
RETURNS TABLE (
  gift_count INTEGER,
  total_fruits INTEGER,
  child_ids UUID[]
) AS $$
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
    SELECT DISTINCT requested_id
    FROM unnest(COALESCE(p_child_ids, ARRAY[]::UUID[])) AS requested_id
    ORDER BY requested_id
  ) INTO v_child_ids;

  v_requested_count := COALESCE(cardinality(v_child_ids), 0);
  IF v_requested_count = 0 THEN
    RAISE EXCEPTION '至少选择一个孩子';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_owned_count
  FROM public.children
  WHERE parent_id = p_parent_id
    AND is_deleted = false
    AND id = ANY(v_child_ids);

  IF v_owned_count <> v_requested_count THEN
    RAISE EXCEPTION '存在无权操作的孩子';
  END IF;

  -- 固定 UUID 顺序加锁，避免并发赠送时产生死锁。
  PERFORM 1
  FROM public.children
  WHERE parent_id = p_parent_id
    AND is_deleted = false
    AND id = ANY(v_child_ids)
  ORDER BY id
  FOR UPDATE;

  FOREACH v_child_id IN ARRAY v_child_ids LOOP
    UPDATE public.children
    SET fruits_balance = fruits_balance + p_fruits_amount
    WHERE id = v_child_id;

    INSERT INTO public.fruit_gifts (parent_id, child_id, fruits_amount, reason)
    VALUES (p_parent_id, v_child_id, p_fruits_amount, v_reason);

    INSERT INTO public.messages (child_id, sender_id, sender_type, text, type, is_read)
    VALUES (
      v_child_id,
      p_parent_id,
      'system',
      format('家长送给你 %s 个果实：%s', p_fruits_amount, v_reason),
      'text',
      false
    );
  END LOOP;

  RETURN QUERY SELECT
    v_requested_count,
    v_requested_count * p_fruits_amount,
    v_child_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
