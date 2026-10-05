-- MySQL 8 schema for Achievement Jungle on Tencent Cloud Lighthouse.
-- Local authentication tables live in the same MySQL database as the business
-- data. Account UUIDs intentionally remain independent from business tables so
-- imported Supabase-era profiles and children keep their original IDs.

CREATE TABLE IF NOT EXISTS auth_users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(320) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) UNIQUE NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  user_agent VARCHAR(512),
  ip_address VARCHAR(45),
  INDEX idx_auth_sessions_user (user_id),
  INDEX idx_auth_sessions_expiry (expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) UNIQUE NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_password_reset_user (user_id),
  INDEX idx_password_reset_expiry (expires_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(20),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS children (
  id CHAR(36) PRIMARY KEY,
  parent_id CHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  age INTEGER CHECK (age >= 1 AND age <= 18),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  avatar TEXT,
  fruits_balance INTEGER NOT NULL DEFAULT 0 CHECK (fruits_balance >= 0),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_children_parent FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goals (
  id CHAR(36) PRIMARY KEY,
  child_id CHAR(36) NOT NULL,
  title VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  duration_days INTEGER NOT NULL CHECK (duration_days >= 1 AND duration_days <= 365),
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  reward_tree_name VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  daily_count INTEGER,
  fruits_per_task INTEGER NOT NULL DEFAULT 10,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  shared_child_ids JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_goals_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT chk_goals_shared_child_ids_json CHECK (JSON_VALID(shared_child_ids))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trees (
  id CHAR(36) PRIMARY KEY,
  child_id CHAR(36) NOT NULL,
  goal_id CHAR(36),
  name VARCHAR(50) NOT NULL,
  image TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'growing' CHECK (status IN ('growing', 'completed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_trees_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT fk_trees_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id CHAR(36) PRIMARY KEY,
  goal_id CHAR(36) NOT NULL,
  child_id CHAR(36) NOT NULL,
  tree_id CHAR(36),
  title VARCHAR(100) NOT NULL,
  type VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  checkin_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  image_url TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  bonus_fruits INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_tasks_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_tree FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS medals (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(100) NOT NULL,
  description TEXT,
  unlock_condition JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_medals_unlock_condition_json CHECK (JSON_VALID(unlock_condition))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS child_medals (
  id CHAR(36) PRIMARY KEY,
  child_id CHAR(36) NOT NULL,
  medal_id CHAR(36) NOT NULL,
  unlocked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_child_medal (child_id, medal_id),
  CONSTRAINT fk_child_medals_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT fk_child_medals_medal FOREIGN KEY (medal_id) REFERENCES medals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rewards (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  category VARCHAR(20) NOT NULL CHECK (category IN ('activity', 'toy', 'snack')),
  max_redemptions INTEGER CHECK (max_redemptions > 0),
  max_consecutive_redemptions INTEGER CHECK (max_consecutive_redemptions > 0),
  cooldown_days INTEGER CHECK (cooldown_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_rewards_consecutive_cooldown_pair CHECK (
    (max_consecutive_redemptions IS NULL AND cooldown_days IS NULL)
    OR
    (max_consecutive_redemptions IS NOT NULL AND cooldown_days IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id CHAR(36) PRIMARY KEY,
  child_id CHAR(36) NOT NULL,
  reward_id CHAR(36) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  redeemed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  CONSTRAINT fk_reward_redemptions_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT fk_reward_redemptions_reward FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_exchange_settings (
  id CHAR(36) PRIMARY KEY,
  parent_id CHAR(36) NOT NULL,
  fruits_per_yuan INTEGER NOT NULL DEFAULT 100 CHECK (fruits_per_yuan > 0),
  yuan_amount DECIMAL(10, 2) NOT NULL DEFAULT 1.00 CHECK (yuan_amount > 0),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_cash_exchange_parent (parent_id),
  CONSTRAINT fk_cash_exchange_parent FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_redemptions (
  id CHAR(36) PRIMARY KEY,
  child_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NOT NULL,
  fruits_spent INTEGER NOT NULL CHECK (fruits_spent > 0),
  fruits_per_yuan INTEGER NOT NULL CHECK (fruits_per_yuan > 0),
  yuan_amount DECIMAL(10, 2) NOT NULL CHECK (yuan_amount > 0),
  cash_amount DECIMAL(10, 2) NOT NULL CHECK (cash_amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  redeemed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_cash_redemptions_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT fk_cash_redemptions_parent FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY,
  child_id CHAR(36) NOT NULL,
  sender_id CHAR(36),
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('parent', 'child', 'system')),
  text TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'sticker')),
  content TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_messages_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  subscription JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_push_subscription_user (user_id),
  CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT chk_push_subscription_json CHECK (JSON_VALID(subscription))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_children_parent_id ON children(parent_id);
CREATE INDEX idx_goals_child_id ON goals(child_id);
CREATE INDEX idx_goals_is_shared ON goals(is_shared);
CREATE INDEX idx_trees_child_id ON trees(child_id);
CREATE INDEX idx_trees_goal_id ON trees(goal_id);
CREATE INDEX idx_trees_child_status_updated ON trees(child_id, status, updated_at);
CREATE INDEX idx_tasks_child_id ON tasks(child_id);
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_checkin_time ON tasks(goal_id, checkin_time);
CREATE INDEX idx_tasks_child_status_time ON tasks(child_id, status, checkin_time);
CREATE INDEX idx_tasks_child_checkin_time ON tasks(child_id, checkin_time);
CREATE INDEX idx_child_medals_child_id ON child_medals(child_id);
CREATE INDEX idx_reward_redemptions_child_id ON reward_redemptions(child_id);
CREATE INDEX idx_redemptions_child_time ON reward_redemptions(child_id, redeemed_at);
CREATE INDEX idx_redemptions_child_status ON reward_redemptions(child_id, status);
CREATE INDEX idx_redemptions_status_time ON reward_redemptions(status, redeemed_at);
CREATE INDEX idx_cash_exchange_settings_parent_id ON cash_exchange_settings(parent_id);
CREATE INDEX idx_cash_redemptions_child_time ON cash_redemptions(child_id, redeemed_at);
CREATE INDEX idx_cash_redemptions_parent_status_time ON cash_redemptions(parent_id, status, redeemed_at);
CREATE INDEX idx_cash_redemptions_child_status ON cash_redemptions(child_id, status);
CREATE INDEX idx_messages_child_id ON messages(child_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(3);
DROP TRIGGER IF EXISTS update_children_updated_at;
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(3);
DROP TRIGGER IF EXISTS update_goals_updated_at;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(3);
DROP TRIGGER IF EXISTS update_trees_updated_at;
CREATE TRIGGER update_trees_updated_at BEFORE UPDATE ON trees
  FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(3);
DROP TRIGGER IF EXISTS update_tasks_updated_at;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(3);
DROP TRIGGER IF EXISTS update_cash_exchange_settings_updated_at;
CREATE TRIGGER update_cash_exchange_settings_updated_at BEFORE UPDATE ON cash_exchange_settings
  FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(3);
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at;
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(3);
