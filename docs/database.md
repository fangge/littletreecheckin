# 数据库设计

共 10 张业务表，均使用 UUID 主键，部署在 Supabase（PostgreSQL）。

## 表结构总览

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 家长账户 | username, phone, password_hash |
| `children` | 孩子信息 | parent_id→users, fruits_balance |
| `goals` | 习惯目标 | child_id→children, duration_days, is_active |
| `trees` | 虚拟树木 | child_id, goal_id→goals, status, level(1-5), progress(0-100) |
| `tasks` | 每日打卡记录 | goal_id, child_id, status(pending/approved/rejected) |
| `medals` | 勋章定义 | name, icon, color, unlock_condition(JSONB) |
| `child_medals` | 孩子已解锁勋章 | child_id, medal_id, unlocked_at |
| `rewards` | 奖励商品 | name, price(果实数), category(activity/toy/snack) |
| `reward_redemptions` | 兑换记录 | child_id, reward_id, status(pending/completed) |
| `messages` | 消息记录 | child_id, sender_type(parent/child/system), type(text/sticker/image) |

## 详细字段说明

### users（家长账户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键，自动生成 |
| username | varchar(50) | 唯一，用于登录 |
| phone | varchar(20) | 可选，唯一 |
| password_hash | varchar(255) | bcrypt 加密存储 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间（触发器自动维护） |

### children（孩子信息）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| parent_id | uuid | 外键 → users.id |
| name | varchar(50) | 孩子姓名 |
| age | integer | 年龄（可选） |
| gender | varchar(10) | male / female（可选） |
| avatar | text | 头像 URL（可选） |
| fruits_balance | integer | 果实余额，默认 0 |
| is_deleted | boolean | 软删除标记，默认 false |

### goals（习惯目标）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| child_id | uuid | 外键 → children.id |
| title | varchar(100) | 目标名称 |
| icon | varchar(50) | Material Symbol 图标名 |
| duration_days | integer | 目标总天数（1-365） |
| duration_minutes | integer | 每日所需分钟数（0 表示不限） |
| reward_tree_name | varchar(50) | 完成后解锁的树木名称 |
| is_active | boolean | 是否进行中，完成后自动设为 false |

### trees（虚拟树木）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| child_id | uuid | 外键 → children.id |
| goal_id | uuid | 外键 → goals.id |
| name | varchar(50) | 树木名称（同 reward_tree_name） |
| image | text | 树木图片 URL |
| status | varchar(20) | growing / completed |
| level | integer | 等级 1-5（随进度自动提升） |
| progress | integer | 成长进度 0-100 |

### tasks（每日打卡记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| goal_id | uuid | 外键 → goals.id |
| child_id | uuid | 外键 → children.id |
| tree_id | uuid | 外键 → trees.id |
| title | varchar(100) | 任务标题（冗余自 goal.title） |
| type | varchar(50) | 任务类型标签 |
| status | varchar(20) | pending / approved / rejected |
| checkin_time | timestamptz | 打卡时间 |
| image_url | text | 打卡图片 URL（可选） |
| progress | integer | 打卡时的树木进度快照 |
| reject_reason | text | 拒绝原因（可选） |

### medals（勋章定义）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| name | varchar(50) | 勋章名称 |
| icon | varchar(50) | Material Symbol 图标名 |
| color | varchar(50) | Tailwind 颜色类名 |
| description | text | 勋章描述 |
| unlock_condition | jsonb | 解锁条件（见业务逻辑文档） |

### rewards（奖励商品）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| name | varchar(100) | 奖品名称 |
| price | integer | 果实价格 |
| image | text | 图片 URL |
| category | varchar(20) | activity / toy / snack |
| is_active | boolean | 是否上架，默认 true |

## 防重复打卡机制

后端在创建任务时会查询当日是否已有打卡记录，同一目标每天只能打卡一次（由 [`server/src/routes/tasks.ts`](../server/src/routes/tasks.ts) 业务逻辑控制）。被拒绝（`rejected`）的任务不计入当日打卡，可重新打卡。

## 迁移文件

| 文件 | 说明 |
|------|------|
| [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql) | 10 张业务表 + 索引 + updated_at 触发器 |
| [`supabase/migrations/002_seed_data.sql`](../supabase/migrations/002_seed_data.sql) | 9 枚勋章 + 6 个奖励初始数据 |