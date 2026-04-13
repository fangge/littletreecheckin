-- ============================================================
-- 认证安全增强迁移
-- 1. Refresh Tokens 表（双令牌机制）
-- 2. 密码重置表（密码找回功能）
-- 3. RLS 行级安全策略（基础版）
-- ============================================================

-- ============================================================
-- 1. Refresh Tokens 表
-- 用于存储 refresh token，支持双令牌机制
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- 索引：快速查询用户的所有 token
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
-- 索引：快速验证 token
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- 定期清理过期 token 的函数（可由 Supabase cron 或应用层调用）
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM refresh_tokens
  WHERE expires_at < NOW() OR revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Password Resets 表（密码重置）
-- ============================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- 清理过期的密码重置记录
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM password_resets
  WHERE (expires_at < NOW()) OR (used = TRUE AND used_at < NOW() - INTERVAL '24 hours');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. 基础 RLS 策略（行级安全）
-- 注意：当前使用 Service Key 模式，RLS 作为额外防护层
-- 完整的 RLS 需要在 Supabase 中启用并配置 Auth UID 映射
-- ============================================================

-- 启用关键表的 RLS（可选增强）
-- 当前架构通过后端中间件控制权限，以下为 RLS 参考实现

-- 用户只能看到自己的孩子数据
-- CREATE POLICY "parents_can_see_own_children" ON children
--   FOR SELECT USING (
--     auth.uid()::text = parent_id::text
--   );

-- 用户只能修改自己的孩子数据
-- CREATE POLICY "parents_can_update_own_children" ON children
--   FOR UPDATE USING (
--     auth.uid()::text = parent_id::text
--   );

-- 任务只能被关联的孩子/家长操作
-- CREATE POLICY "users_can_see_own_tasks" ON tasks
--   FOR SELECT USING (
--     child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
--   );

-- ============================================================
-- 4. 登录失败次数限制表（防暴力破解）
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,  -- 用户名或手机号或 IP
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier, attempted_at);

-- 检查是否被锁定的函数
CREATE OR REPLACE FUNCTION is_login_locked(p_identifier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  recent_failures INTEGER;
BEGIN
  -- 统计最近 15 分钟内的失败次数
  SELECT COUNT(*) INTO recent_failures
  FROM login_attempts
  WHERE identifier = p_identifier
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  -- 5 次失败后锁定
  RETURN recent_failures >= 5;
END;
$$ LANGUAGE plpgsql;

-- 记录登录尝试的函数
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_identifier TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO login_attempts (identifier, ip_address, success)
  VALUES (p_identifier, p_ip_address, p_success);
END;
$$ LANGUAGE plpgsql;

-- 清理旧的登录记录（保留7天）
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM login_attempts
  WHERE attempted_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
