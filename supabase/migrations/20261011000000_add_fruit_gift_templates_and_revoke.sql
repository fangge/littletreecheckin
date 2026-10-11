-- 家长赠送果实模板与撤回能力

ALTER TABLE public.fruit_gifts
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked'));

ALTER TABLE public.fruit_gifts
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE public.fruit_gifts
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_fruit_gifts_parent_status_created_at
  ON public.fruit_gifts(parent_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.fruit_gift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 1 AND 200),
  fruits_amount INTEGER NOT NULL CHECK (fruits_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fruit_gift_templates_parent_updated_at
  ON public.fruit_gift_templates(parent_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_fruit_gift_templates_updated_at ON public.fruit_gift_templates;
CREATE TRIGGER update_fruit_gift_templates_updated_at
  BEFORE UPDATE ON public.fruit_gift_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fruit_gift_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fruit_gift_templates_select_own" ON public.fruit_gift_templates;
CREATE POLICY "fruit_gift_templates_select_own" ON public.fruit_gift_templates
  FOR SELECT TO authenticated
  USING (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "fruit_gift_templates_insert_own" ON public.fruit_gift_templates;
CREATE POLICY "fruit_gift_templates_insert_own" ON public.fruit_gift_templates
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "fruit_gift_templates_update_own" ON public.fruit_gift_templates;
CREATE POLICY "fruit_gift_templates_update_own" ON public.fruit_gift_templates
  FOR UPDATE TO authenticated
  USING (parent_id = (select auth.uid()))
  WITH CHECK (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "fruit_gift_templates_delete_own" ON public.fruit_gift_templates;
CREATE POLICY "fruit_gift_templates_delete_own" ON public.fruit_gift_templates
  FOR DELETE TO authenticated
  USING (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "fruit_gift_templates_service_role" ON public.fruit_gift_templates;
CREATE POLICY "fruit_gift_templates_service_role" ON public.fruit_gift_templates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.revoke_fruit_gift_rpc(
  p_parent_id UUID,
  p_gift_id UUID,
  p_revoked_reason TEXT DEFAULT '家长撤回赠送'
)
RETURNS TABLE (
  gift_id UUID,
  child_id UUID,
  fruits_amount INTEGER,
  remaining_balance INTEGER
) AS $$
DECLARE
  v_gift RECORD;
  v_child RECORD;
  v_reason TEXT := trim(COALESCE(p_revoked_reason, '家长撤回赠送'));
BEGIN
  SELECT id, child_id, fruits_amount, status
  INTO v_gift
  FROM public.fruit_gifts
  WHERE id = p_gift_id AND parent_id = p_parent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '赠送记录不存在';
  END IF;

  IF v_gift.status <> 'active' THEN
    RAISE EXCEPTION '该赠送记录已撤回';
  END IF;

  SELECT id, fruits_balance
  INTO v_child
  FROM public.children
  WHERE id = v_gift.child_id
    AND parent_id = p_parent_id
    AND is_deleted = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '孩子不存在';
  END IF;

  IF v_child.fruits_balance < v_gift.fruits_amount THEN
    RAISE EXCEPTION '孩子当前果实余额不足，无法撤回';
  END IF;

  UPDATE public.children
  SET fruits_balance = fruits_balance - v_gift.fruits_amount
  WHERE id = v_child.id;

  UPDATE public.fruit_gifts
  SET status = 'revoked',
      revoked_at = NOW(),
      revoked_reason = v_reason
  WHERE id = v_gift.id;

  INSERT INTO public.messages (child_id, sender_id, sender_type, text, type, is_read)
  VALUES (
    v_child.id,
    p_parent_id,
    'system',
    format('家长收回了之前赠送的 %s 个果实：%s', v_gift.fruits_amount, v_reason),
    'text',
    false
  );

  RETURN QUERY SELECT
    v_gift.id,
    v_child.id,
    v_gift.fruits_amount,
    v_child.fruits_balance - v_gift.fruits_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.revoke_fruit_gift_rpc(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_fruit_gift_rpc(UUID, UUID, TEXT) TO service_role;
