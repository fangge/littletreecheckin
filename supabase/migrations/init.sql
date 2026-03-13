-- ============================================================
-- 成就丛林 (Achievement Jungle) - 完整数据库初始化脚本
-- 包含所有表结构、种子数据和字段迁移
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

-- 迁移: 添加 daily_count 字段
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS daily_count integer DEFAULT NULL;
COMMENT ON COLUMN goals.daily_count IS '每日需完成次数，NULL 表示不限制';

-- 迁移: 添加 fruits_per_task 字段
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS fruits_per_task INTEGER NOT NULL DEFAULT 10;
COMMENT ON COLUMN goals.fruits_per_task IS '每次任务审核通过后奖励给孩子的果实数量，默认为10';

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

-- 迁移: 添加 bonus_fruits 字段
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS bonus_fruits INTEGER NOT NULL DEFAULT 0;

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

-- ============================================================
-- 种子数据：勋章定义（9枚，与前端 constants.ts 对应）
-- ============================================================
INSERT INTO medals (id, name, icon, color, description, unlock_condition) VALUES
(
  uuid_generate_v4(),
  '早起小标兵',
  'wb_sunny',
  'from-yellow-300 to-primary',
  '连续7天在早上8点前完成打卡',
  '{"type": "early_checkin", "threshold": 7}'
),
(
  uuid_generate_v4(),
  '7天连续达人',
  'local_fire_department',
  'from-orange-400 to-red-500',
  '连续7天完成任务打卡',
  '{"type": "consecutive_days", "threshold": 7}'
),
(
  uuid_generate_v4(),
  '浇水小能手',
  'water_drop',
  'from-blue-400 to-blue-600',
  '累计完成30次任务打卡',
  '{"type": "total_tasks", "threshold": 30}'
),
(
  uuid_generate_v4(),
  '水果采摘员',
  'nutrition',
  'from-slate-300 to-slate-400',
  '完成第一棵树木的培育',
  '{"type": "trees_completed", "threshold": 1}'
),
(
  uuid_generate_v4(),
  '根深蒂固',
  'forest',
  'from-slate-300 to-slate-400',
  '完成5棵树木的培育',
  '{"type": "trees_completed", "threshold": 5}'
),
(
  uuid_generate_v4(),
  '闪亮之星',
  'stars',
  'from-purple-400 to-indigo-600',
  '累计获得500个果实',
  '{"type": "total_fruits", "threshold": 500}'
),
(
  uuid_generate_v4(),
  '环保小英雄',
  'eco',
  'from-emerald-400 to-teal-600',
  '累计完成100次任务打卡',
  '{"type": "total_tasks", "threshold": 100}'
),
(
  uuid_generate_v4(),
  '快速成长期',
  'energy_savings_leaf',
  'from-slate-300 to-slate-400',
  '在一周内完成3个不同目标的打卡',
  '{"type": "weekly_goals", "threshold": 3}'
),
(
  uuid_generate_v4(),
  '顶尖选手',
  'emoji_events',
  'from-slate-300 to-slate-400',
  '累计完成200次任务打卡',
  '{"type": "total_tasks", "threshold": 200}'
);

-- ============================================================
-- 种子数据：初始奖励（与前端 constants.ts 对应）
-- ============================================================
INSERT INTO rewards (id, name, price, image, category, is_active) VALUES
(
  uuid_generate_v4(),
  '30分钟游戏时间',
  200,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCJXo5JmQpCTp3DS_gYEYEKvrpiDTo-5BCO5MUyRYh8MEVJ4cbo1pBRt7sMgtonU_S6ITPrli8ciPJa20Dq8Ahvw0o0B1DBfN12hPlZAOxEZ5IEL8UYAecx4J1_zC5veB1A6FNgwwGlrcCqxSNaDrzQSUh3uBDbWkKK8C9aVsNN5VvkAKGuOv3tVW5hvTzdrFXqvnpwMdWE0u6asOQWF_2euexex29x5Vh9oKS9bLtnl1yAiubCcHoZxdUEw-EQ3BvHWlFlR43IHgYK',
  'activity',
  TRUE
),
(
  uuid_generate_v4(),
  '新玩具',
  1000,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDteOcpm2oHVY0AudRaMksYxFcORLynQEMJ4-rRXxjQcN7P_jyhGitMRO-11dYoUCETOqK286AHm8egxNHJgE3xauHNameN0TDl2zqYiWwH5-HDBwDk0lO_ai7fHoIz1IP5ieAtecU0JYvU90_dwixjEWg5ipFsECSnvwG0nnosG0WshHb4zCzbW7OhdIp0DfBLYx3i_ABw3E8W8-0fmOZiijS4Guxx55G1kslOtYk8z1mSGS-3iPiGATbn3Nei_G3ke1fN7dKrhEev',
  'toy',
  TRUE
),
(
  uuid_generate_v4(),
  '冰淇淋',
  150,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBZKZTS-qPjt6Wj4riS58CMxhcbNjjwvaJeQRfG13CPoUpIvkIgwbmliGgJqGotsGpoINeoqc97MAKl_qG92UkzgrbINCkp6JZb_gWZkGExXoqk18dSD-URxHVO6V9bdwh94Ey9d7389hfQCUJuzrbDJpydHWQMw49_8rmRcPoFKIEiX5VETExqL0bUaQpbM-Deg80T6LNBFQUixuspozGtnPvy-fQgVu7O2Qgsrf9cWaW1dHtJjg4-Ry2eyTRjHY_6J2b1XvthwQKI',
  'snack',
  TRUE
),
(
  uuid_generate_v4(),
  '额外公园游玩',
  300,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBUsLXvqd7DOSeRsLa4Msgk9SvHR-hmD7CiLNXMMhTuM9zD5wjVsnLbwmLTwrNunaA0SRknUFJprO1IkG5ZTcviIH6guzUT_-MTwRRRX0KiQBihfOKcsOwBddGaWIRN3kEpVAqGpU5rbMQZxQZA50422ovV4mAdi6nsuI0yC0mV8NL-AklA8jvTSqIaRugnmUe1HY432ZChx7QUdOSqz8N0CgqbQx1ouk37a4GqyDyu1UiGPhFcvMesEGRGhlu2Q7CRKzQY147QidB7',
  'activity',
  TRUE
),
(
  uuid_generate_v4(),
  '电影之夜',
  500,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCvVh-1dXlrXa13oubvqk8jT-RYChfRmVD8HbPhXIz7E3bw8TtVsC54g706B-YNSz-IaPg8himJe6mJfoezln3VOaYfEglQt8TVAoWXidBRvbIic_6sEDoGYf8j7geF6qZ7eIWSGo08hQ5or7gnO2dDmse6nBA5GlpsHsA0Zfyn7X0qEE3BUVPyzne5VGQTPIQYNYoUa9fwtDD4gYY-ZYzBF6vUgV71wHHBJvUmrZQXqBvblReM43-MfQ7b8XO7Wr5tquBqvQEAPGwN',
  'activity',
  TRUE
),
(
  uuid_generate_v4(),
  '晚睡1小时',
  300,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCHiLlHIfV4lmVGySKG5_QHwAf7ktROvBp_eWErI54w6PF3Tww7Akwy8FEoCODT4yxb731JfT5OHc0Kbh6zStDPSP5sfsWFAhSwXxrIUrhHTvkY81cwG6jypJ7Tmf3saJmV5fqjsFFLGcqbcxq_3C_V4M0iui83-xAzM22AzFb5IJ02nEkyhYvEn7dHbtRqPrwgCE94GHsMJrN7jxyMXKgu1ekIcxVG6XF5Zbq7TnepBvdIaScmXn6ZhudLEctyEaMH2BWdiEVeWTJQ',
  'activity',
  TRUE
);
