# 成就丛林 (Achievement Jungle)

一款游戏化儿童习惯养成应用。家长为孩子设置每日习惯目标，孩子完成打卡后由家长审核，审核通过后虚拟树木成长并获得果实奖励，果实可在商店兑换实际奖励。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 6 + TailwindCSS v4 + motion/react |
| 后端 | Node.js + Express 4 + TypeScript |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | 自定义 JWT（jsonwebtoken + bcryptjs） |
| 包管理 | pnpm |

---

## 快速开始

### 1. 克隆并安装依赖

```bash
# 安装前端依赖
pnpm install

# 安装后端依赖
pnpm --prefix server install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Supabase 配置（在 https://supabase.com 创建项目后获取）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development

# 前端调用后端的地址
VITE_API_URL=http://localhost:3001
```

### 3. 初始化数据库

在 [Supabase 控制台](https://supabase.com) → SQL Editor 中**依次**执行：

```sql
-- 第一步：创建所有业务表和触发器
-- 文件：supabase/migrations/001_initial_schema.sql

-- 第二步：插入初始勋章（9枚）和奖励（6个）种子数据
-- 文件：supabase/migrations/002_seed_data.sql
```

### 4. 启动开发服务器

```bash
# 终端 1：启动前端（http://localhost:3000）
pnpm dev

# 终端 2：启动后端（http://localhost:3001）
pnpm server:dev
```

健康检查：`GET http://localhost:3001/health`

---

## 项目结构

```
littletreecheckin/
├── src/                              # 前端源码
│   ├── contexts/
│   │   └── AuthContext.tsx           # 全局认证状态（JWT + localStorage）
│   ├── services/
│   │   └── api.ts                    # 统一 API 服务层（fetch 封装）
│   ├── views/                        # 页面视图
│   │   ├── Login.tsx                 # 家长登录
│   │   ├── Register.tsx              # 家长注册（含孩子信息）
│   │   ├── Dashboard.tsx             # 森林主页（树木列表 + 统计）
│   │   ├── CheckIn.tsx               # 每日打卡
│   │   ├── GoalSetting.tsx           # 设置新目标（种树）
│   │   ├── ParentControl.tsx         # 家长审核任务
│   │   ├── Store.tsx                 # 果实商店
│   │   ├── Medals.tsx                # 勋章墙
│   │   ├── Messages.tsx              # 消息中心
│   │   └── Profile.tsx               # 个人资料
│   ├── components/
│   │   ├── Navigation.tsx            # 底部导航栏
│   │   └── CelebrationPopup.tsx      # 庆祝动画
│   ├── App.tsx                       # 路由 + 认证守卫
│   ├── main.tsx                      # 入口（包裹 AuthProvider）
│   └── types.ts                      # 前端类型定义
│
├── server/                           # 后端源码
│   ├── src/
│   │   ├── index.ts                  # Express 服务器入口（端口 3001）
│   │   ├── types.ts                  # 后端类型定义（AuthRequest 等）
│   │   ├── config/
│   │   │   └── supabase.ts           # Supabase 客户端（service key）
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT Bearer Token 验证中间件
│   │   │   └── errorHandler.ts       # 统一错误处理中间件
│   │   ├── routes/
│   │   │   ├── auth.ts               # 认证路由（注册/登录/me/登出）
│   │   │   ├── children.ts           # 孩子管理 + 统计数据路由
│   │   │   ├── trees.ts              # 树木列表 + 目标创建路由
│   │   │   ├── tasks.ts              # 任务打卡 + 审核路由
│   │   │   ├── medals.ts             # 勋章查询路由
│   │   │   ├── rewards.ts            # 奖励商店 + 兑换路由
│   │   │   └── messages.ts           # 消息发送/查询/已读路由
│   │   └── services/
│   │       └── medalService.ts       # 勋章自动解锁业务逻辑
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # 10 张业务表 + 索引 + 触发器
│       └── 002_seed_data.sql         # 勋章和奖励初始数据
│
├── .env.example                      # 环境变量模板
├── package.json                      # 前端 + 脚本入口
├── vite.config.ts
└── tsconfig.json
```

---

## 数据库表结构

共 10 张业务表，均使用 UUID 主键：

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

> 防重复打卡：`tasks` 表有唯一索引 `(goal_id, DATE(checkin_time))`，同一目标每天只能打卡一次。

---

## 核心业务逻辑

### 树木成长

树木进度与目标时长（`duration_days`）直接挂钩：

```
每次审核通过增量 = Math.round(100 / duration_days)
```

| 目标时长 | 每次增量 | 完成所需次数 |
|----------|----------|-------------|
| 5 天 | 20% | 5 次 |
| 10 天 | 10% | 10 次 |
| 21 天 | 5% | ~21 次 |
| 30 天 | 3% | ~34 次 |

树木等级随进度自动提升（最高 Lv.5）：

| 进度 | 等级 |
|------|------|
| 0–19% | Lv.1 |
| 20–39% | Lv.2 |
| 40–59% | Lv.3 |
| 60–79% | Lv.4 |
| 80–100% | Lv.5 |

### 审核通过触发链

家长审核通过一个任务时，后端原子执行：

1. 更新任务状态 → `approved`
2. 孩子果实余额 +10
3. 关联树木进度 += `Math.round(100 / duration_days)`
4. 树木等级自动更新
5. 进度达到 100% → 树木状态改为 `completed`，目标标记为非活跃
6. 发送系统消息通知孩子
7. 异步检查并解锁符合条件的勋章

### 勋章解锁条件类型

| 条件类型 | 说明 |
|----------|------|
| `consecutive_days` | 连续打卡天数 |
| `total_tasks` | 累计完成任务数 |
| `trees_completed` | 累计完成树木数 |
| `total_fruits` | 累计获得果实数 |

---

## 完整 API 端点

所有需要认证的接口须在 Header 中携带：`Authorization: Bearer <token>`

### 认证
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/v1/auth/register` | ✗ | 家长注册（含孩子信息） |
| POST | `/api/v1/auth/login` | ✗ | 家长登录，返回 JWT |
| GET | `/api/v1/auth/me` | ✓ | 获取当前用户和孩子列表 |
| POST | `/api/v1/auth/logout` | ✓ | 登出 |

### 孩子管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/users/:userId/children` | 获取孩子列表 |
| POST | `/api/v1/users/:userId/children` | 添加孩子 |
| PUT | `/api/v1/users/:userId/children/:childId` | 更新孩子信息 |
| DELETE | `/api/v1/users/:userId/children/:childId` | 软删除孩子 |
| GET | `/api/v1/children/:childId/stats` | 获取统计数据（森林健康度等） |

### 树木与目标
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/children/:childId/trees` | 获取树木列表（支持 `?status=growing/completed`） |
| POST | `/api/v1/children/:childId/goals` | 创建目标（自动种树） |
| PUT | `/api/v1/trees/:treeId` | 更新树木信息 |

### 任务打卡
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/children/:childId/tasks` | 获取任务列表（支持 `?status=pending/approved/rejected`） |
| POST | `/api/v1/tasks` | 任务打卡（每日限一次） |
| PUT | `/api/v1/tasks/:taskId/approve` | 家长审核通过（触发完整奖励链） |
| PUT | `/api/v1/tasks/:taskId/reject` | 家长拒绝（可附带原因） |

### 勋章
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/children/:childId/medals` | 获取全部勋章（含已解锁/未解锁状态） |

### 奖励商店
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/rewards` | 获取奖励列表（支持 `?category=activity/toy/snack`） |
| GET | `/api/v1/rewards/children/:childId/fruits` | 查询果实余额 |
| POST | `/api/v1/rewards/:rewardId/redeem` | 兑换奖励（自动扣除果实） |
| GET | `/api/v1/rewards/children/:childId/redemptions` | 查询兑换历史 |

### 消息
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/children/:childId/messages` | 获取消息列表（支持分页 `?page=1&limit=20`） |
| GET | `/api/v1/children/:childId/messages/unread-count` | 查询未读消息数 |
| POST | `/api/v1/messages` | 发送消息（text/sticker/image） |
| PUT | `/api/v1/messages/:messageId/read` | 标记单条消息已读 |
| PUT | `/api/v1/children/:childId/messages/read-all` | 批量标记全部已读 |

---

## 可用脚本

```bash
pnpm dev              # 启动前端开发服务器（端口 3000）
pnpm build            # 构建前端生产包
pnpm server:dev       # 启动后端开发服务器（端口 3001，热重载）
pnpm server:start     # 启动后端生产服务器
