-- ============================================================
-- 增加果实兑换人民币能力
-- 1. cash_exchange_settings: 家长配置果实与人民币兑换比例
-- 2. cash_redemptions: 孩子现金兑换记录
-- 3. redeem_cash_rpc: 原子扣减果实并创建现金兑换记录
-- ============================================================

CREATE TABLE IF NOT EXISTS cash_exchange_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fruits_per_yuan INTEGER NOT NULL DEFAULT 100 CHECK (fruits_per_yuan > 0),
  yuan_amount NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (yuan_amount > 0),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id)
);

CREATE INDEX IF NOT EXISTS idx_cash_exchange_settings_parent_id
ON cash_exchange_settings(parent_id);

ALTER TABLE cash_exchange_settings
ADD COLUMN IF NOT EXISTS yuan_amount NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (yuan_amount > 0);

DROP TRIGGER IF EXISTS update_cash_exchange_settings_updated_at ON cash_exchange_settings;
CREATE TRIGGER update_cash_exchange_settings_updated_at BEFORE UPDATE ON cash_exchange_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cash_exchange_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_exchange_settings_select_own" ON cash_exchange_settings;
CREATE POLICY "cash_exchange_settings_select_own" ON cash_exchange_settings
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = parent_id);

DROP POLICY IF EXISTS "cash_exchange_settings_insert_own" ON cash_exchange_settings;
CREATE POLICY "cash_exchange_settings_insert_own" ON cash_exchange_settings
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = parent_id);

DROP POLICY IF EXISTS "cash_exchange_settings_update_own" ON cash_exchange_settings;
CREATE POLICY "cash_exchange_settings_update_own" ON cash_exchange_settings
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = parent_id)
  WITH CHECK ((select auth.uid()) = parent_id);

DROP POLICY IF EXISTS "cash_exchange_settings_service_role" ON cash_exchange_settings;
CREATE POLICY "cash_exchange_settings_service_role" ON cash_exchange_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cash_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fruits_spent INTEGER NOT NULL CHECK (fruits_spent > 0),
  fruits_per_yuan INTEGER NOT NULL CHECK (fruits_per_yuan > 0),
  yuan_amount NUMERIC(10, 2) NOT NULL CHECK (yuan_amount > 0),
  cash_amount NUMERIC(10, 2) NOT NULL CHECK (cash_amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_redemptions_child_time
ON cash_redemptions(child_id, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_redemptions_parent_status_time
ON cash_redemptions(parent_id, status, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_redemptions_child_status
ON cash_redemptions(child_id, status);

ALTER TABLE cash_redemptions
ADD COLUMN IF NOT EXISTS yuan_amount NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (yuan_amount > 0);

ALTER TABLE cash_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_redemptions_select_own" ON cash_redemptions;
CREATE POLICY "cash_redemptions_select_own" ON cash_redemptions
  FOR SELECT TO authenticated
  USING (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "cash_redemptions_insert_own" ON cash_redemptions;
CREATE POLICY "cash_redemptions_insert_own" ON cash_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = (select auth.uid()) AND child_id IN (SELECT id FROM children WHERE parent_id = (select auth.uid())));

DROP POLICY IF EXISTS "cash_redemptions_update_own" ON cash_redemptions;
CREATE POLICY "cash_redemptions_update_own" ON cash_redemptions
  FOR UPDATE TO authenticated
  USING (parent_id = (select auth.uid()))
  WITH CHECK (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "cash_redemptions_delete_own" ON cash_redemptions;
CREATE POLICY "cash_redemptions_delete_own" ON cash_redemptions
  FOR DELETE TO authenticated
  USING (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "cash_redemptions_service_role" ON cash_redemptions;
CREATE POLICY "cash_redemptions_service_role" ON cash_redemptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 给每个已有家长创建默认兑换配置：100 果实 = 1 元
INSERT INTO cash_exchange_settings (parent_id, fruits_per_yuan, yuan_amount, is_enabled)
SELECT id, 100, 1.00, TRUE FROM auth.users
ON CONFLICT (parent_id) DO NOTHING;

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
