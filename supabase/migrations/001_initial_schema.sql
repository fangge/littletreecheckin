-- ============================================================
-- 成就丛林 (Achievement Jungle) - 初始数据库表结构
-- ============================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 家长用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. 孩子信息表
-- ============================================================
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  age INTEGER CHECK (age >= 1 AND age <= 18),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  avatar TEXT,
  fruits_balance INTEGER NOT NULL DEFAULT 0 CHECK (fruits_balance >= 0),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_children_parent_id ON children(parent_id);

-- ============================================================
-- 3. 目标/习惯表
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  duration_days INTEGER NOT NULL CHECK (duration_days >= 1 AND duration_days <= 365),
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  reward_tree_name VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_child_id ON goals(child_id);

-- ============================================================
-- 4. 树木表（与目标一一对应）
-- ============================================================
CREATE TABLE IF NOT EXISTS trees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  name VARCHAR(50) NOT NULL,
  image TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'growing' CHECK (status IN ('growing', 'completed')),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trees_child_id ON trees(child_id);
CREATE INDEX idx_trees_goal_id ON trees(goal_id);

-- ============================================================
-- 5. 任务打卡表（每日实例）
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES trees(id) ON DELETE SET NULL,
  title VARCHAR(100) NOT NULL,
  type VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  checkin_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_child_id ON tasks(child_id);
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX idx_tasks_status ON tasks(status);
-- 打卡时间索引（重复打卡防护由后端业务逻辑控制）
CREATE INDEX idx_tasks_checkin_time ON tasks(goal_id, checkin_time);

-- ============================================================
-- 6. 勋章定义表
-- ============================================================
CREATE TABLE IF NOT EXISTS medals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(100) NOT NULL,
  description TEXT,
  unlock_condition JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. 孩子勋章关联表
-- ============================================================
CREATE TABLE IF NOT EXISTS child_medals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  medal_id UUID NOT NULL REFERENCES medals(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, medal_id)
);

CREATE INDEX idx_child_medals_child_id ON child_medals(child_id);

-- ============================================================
-- 8. 奖励表
-- ============================================================
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  image TEXT,
  category VARCHAR(20) NOT NULL CHECK (category IN ('activity', 'toy', 'snack')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. 奖励兑换记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed'))
);

CREATE INDEX idx_reward_redemptions_child_id ON reward_redemptions(child_id);

-- ============================================================
-- 10. 消息表
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('parent', 'child', 'system')),
  text TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'sticker')),
  content TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_child_id ON messages(child_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- ============================================================
-- 自动更新 updated_at 触发器函数
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trees_updated_at BEFORE UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();