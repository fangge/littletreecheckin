-- ============================================================
-- 推送订阅表
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 确保每个用户只有一个订阅
  CONSTRAINT push_subscriptions_user_id_unique UNIQUE (user_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at_trigger
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- 添加注释
COMMENT ON TABLE push_subscriptions IS '推送订阅信息表';
COMMENT ON COLUMN push_subscriptions.user_id IS '用户ID';
COMMENT ON COLUMN push_subscriptions.subscription IS '推送订阅信息（JSON格式，包含endpoint和keys）';
