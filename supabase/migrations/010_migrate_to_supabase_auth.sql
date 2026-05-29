-- ============================================================
-- 010: 迁移到 Supabase Auth
-- 将自定义用户认证系统迁移到 Supabase 原生 Auth
-- ============================================================

-- Step 1: 创建 profiles 表，关联 auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的 profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

-- 用户只能更新自己的 profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- 后端 service role 可以插入（注册时创建 profile）
CREATE POLICY "profiles_insert_service" ON profiles
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Step 2: 修改 children 表，parent_id 改为引用 auth.users
-- ============================================================
-- 旧认证系统的用户数据无法自动迁移到 auth.users，
-- 因此需要先清空依赖旧 users 表的所有数据，再更改外键约束。
-- CASCADE 会自动清空所有依赖 children 的子表
-- （goals, trees, tasks, child_medals, reward_redemptions, messages 等）
TRUNCATE TABLE children CASCADE;

-- 删除旧的外键约束
ALTER TABLE children DROP CONSTRAINT IF EXISTS children_parent_id_fkey;

-- 添加新的外键约束，引用 auth.users
ALTER TABLE children
  ADD CONSTRAINT children_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: 创建触发器，用户注册时自动创建 profile
-- ============================================================
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

-- 确保触发器存在
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: 删除旧的认证相关表
-- ============================================================
-- 删除 refresh_tokens 表（Supabase Auth 自行管理 session）
DROP TABLE IF EXISTS refresh_tokens;

-- 删除 password_resets 表（Supabase Auth 自行管理密码重置）
DROP TABLE IF EXISTS password_resets;

-- 删除 login_attempts 表（旧的暴力破解防护，Supabase Auth 内置此功能）
DROP TABLE IF EXISTS login_attempts;

-- 删除 push_subscriptions 表（将在下方重建，改为引用 auth.users）
DROP TABLE IF EXISTS push_subscriptions;

-- 删除旧的 users 表（已被 auth.users + profiles 取代）
-- CASCADE 会自动处理所有剩余的 FK 依赖（refresh_tokens, password_resets 等）
DROP TABLE IF EXISTS users CASCADE;

-- 重建 push_subscriptions 表，改为引用 auth.users
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

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

-- Step 5: 为 children 表启用 RLS
-- ============================================================
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- 家长只能查看自己的孩子
CREATE POLICY "children_select_own" ON children
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = parent_id);

-- 家长只能插入自己的孩子
CREATE POLICY "children_insert_own" ON children
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = parent_id);

-- 家长只能更新自己的孩子
CREATE POLICY "children_update_own" ON children
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = parent_id)
  WITH CHECK ((select auth.uid()) = parent_id);

-- 家长只能删除自己的孩子
CREATE POLICY "children_delete_own" ON children
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = parent_id);

-- service_role 可以访问所有数据（后端使用）
CREATE POLICY "children_service_role" ON children
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 6: 为 rewards 和 reward_redemptions 表启用 RLS
-- ============================================================
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- rewards 是全局商品目录，所有已认证用户均可查看
CREATE POLICY "rewards_select_authenticated" ON rewards
  FOR SELECT TO authenticated
  USING (true);

-- 只有 service_role 可以管理商品
CREATE POLICY "rewards_service_role" ON rewards
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_redemptions_select_own" ON reward_redemptions
  FOR SELECT TO authenticated
  USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = (select auth.uid())
    )
  );

CREATE POLICY "reward_redemptions_insert_own" ON reward_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (
    child_id IN (
      SELECT id FROM children WHERE parent_id = (select auth.uid())
    )
  );

CREATE POLICY "reward_redemptions_update_own" ON reward_redemptions
  FOR UPDATE TO authenticated
  USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = (select auth.uid())
    )
  );

CREATE POLICY "reward_redemptions_delete_own" ON reward_redemptions
  FOR DELETE TO authenticated
  USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = (select auth.uid())
    )
  );

CREATE POLICY "reward_redemptions_service_role" ON reward_redemptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
