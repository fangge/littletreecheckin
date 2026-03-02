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

### 2. 配置 Supabase

#### 2.1 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)，点击 **Start your project** 注册/登录账号（支持 GitHub 登录）

2. 登录后点击右上角 **New project**

3. 填写项目信息：
   - **Organization**：选择你的组织（默认为个人账号）
   - **Name**：填写项目名称，例如 `achievement-jungle`
   - **Database Password**：设置一个强密码（**务必保存好**，后续可能用到）
   - **Region**：选择离你最近的区域，推荐 `Southeast Asia (Singapore)`
   - **Pricing Plan**：选择 `Free`（免费套餐足够开发使用）

4. 点击 **Create new project**，等待约 1-2 分钟项目初始化完成

#### 2.2 获取 API 配置

项目创建完成后，进入项目控制台：

1. 点击左侧菜单 **Project Settings**（齿轮图标）→ **API**

2. 找到以下三个值并复制：

   | 配置项 | 位置 | 用途 |
   |--------|------|------|
   | **Project URL** | `Project URL` 区域 | `SUPABASE_URL` |
   | **anon public** | `Project API keys` → `anon public` | `SUPABASE_ANON_KEY` |
   | **service_role secret** | `Project API keys` → `service_role` → 点击眼睛图标显示 | `SUPABASE_SERVICE_KEY` |

   > ⚠️ **安全提示**：`service_role` key 拥有绕过所有 RLS 策略的权限，**只能在后端服务中使用**，绝对不能暴露在前端代码或公开仓库中。

#### 2.3 配置环境变量

```bash
# 推荐：使用 .env.local（不会被 git 追踪，优先级更高）
cp .env.example .env.local

# 或者使用 .env
cp .env.example .env
```

> 💡 后端同时支持 `.env.local`（优先）和 `.env`，推荐使用 `.env.local` 存放敏感配置。

编辑 `.env` 文件，将上一步获取的值填入：

```env
# Supabase 配置
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co        # Project URL
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...   # anon public key
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6... # service_role key

# JWT 配置（自定义随机字符串，至少 32 位）
JWT_SECRET=my-super-secret-key-change-this-in-production-32chars
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development

# 前端调用后端的地址
VITE_API_URL=http://localhost:3001
```

> 💡 **生成 JWT_SECRET**：可以运行 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成一个安全的随机密钥

### 3. 初始化数据库

#### 3.1 执行建表脚本

1. 在 Supabase 控制台左侧菜单点击 **SQL Editor**

2. 点击右上角 **New query**

3. 复制 [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) 的全部内容，粘贴到编辑器中

4. 点击右下角 **Run**（或按 `Ctrl/Cmd + Enter`）执行

5. 看到 `Success. No rows returned` 表示执行成功

#### 3.2 执行种子数据脚本

1. 再次点击 **New query**

2. 复制 [`supabase/migrations/002_seed_data.sql`](supabase/migrations/002_seed_data.sql) 的全部内容，粘贴到编辑器中

3. 点击 **Run** 执行

4. 执行成功后，可在左侧 **Table Editor** 中查看 `medals` 和 `rewards` 表，确认数据已插入（9 枚勋章 + 6 个奖励）

#### 3.3 验证表结构

执行完成后，在 **Table Editor** 中应能看到以下 10 张表：

```
users · children · goals · trees · tasks
medals · child_medals · rewards · reward_redemptions · messages
```

#### 3.4 配置 Storage（可选，用于任务打卡图片上传）

如需支持图片上传功能：

1. 左侧菜单点击 **Storage**

2. 点击 **New bucket**，填写：
   - **Name**：`task-images`
   - **Public bucket**：开启（允许公开访问图片 URL）

3. 点击 **Save** 创建

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
│   │   └── AuthContext.tsx           # 全局认证状态（JWT + localStorage 缓存）
│   ├── services/
│   │   └── api.ts                    # 统一 API 服务层（fetch 封装 + 类型定义）
│   ├── views/                        # 页面视图
│   │   ├── Login.tsx                 # 家长登录
│   │   ├── Register.tsx              # 家长注册（含孩子信息）
│   │   ├── Dashboard.tsx             # 森林主页（树木列表 + 统计 + 孩子切换）
│   │   ├── CheckIn.tsx               # 每日打卡（含今日状态检测 + 庆祝弹窗）
│   │   ├── GoalSetting.tsx           # 设置/编辑目标（种树/修改/删除）
│   │   ├── ParentControl.tsx         # 家长审核任务（所有孩子合并显示）
│   │   ├── Store.tsx                 # 果实商店（孩子切换 + 兑换）
│   │   ├── Medals.tsx                # 勋章墙（孩子切换）
│   │   ├── Messages.tsx              # 消息中心
│   │   ├── Profile.tsx               # 个人管理中心（孩子管理 + 入口）
│   │   └── RewardsManagement.tsx     # 奖品管理 + 兑换记录（独立页面）
│   ├── components/
│   │   ├── Navigation.tsx            # 底部导航栏
│   │   └── CelebrationPopup.tsx      # 打卡成功庆祝弹窗（根据进度显示不同文案）
│   ├── App.tsx                       # 路由 + 认证守卫
│   ├── main.tsx                      # 入口（包裹 AuthProvider）
│   └── types.ts                      # 前端视图类型定义
│
├── api/                              # Vercel Serverless Functions
│   └── [...path].ts                  # 捕获所有 /api/* 请求，转发给 Express 应用
│
├── server/                           # 后端源码（本地开发 + Vercel Function 共用）
│   ├── src/
│   │   ├── app.ts                    # Express 应用配置（路由/中间件），导出 app
│   │   ├── index.ts                  # 本地开发入口（加载 dotenv + 启动 listen）
│   │   ├── types.ts                  # 后端类型定义（AuthRequest 等）
│   │   ├── config/
│   │   │   └── supabase.ts           # Supabase 客户端（Vercel 环境跳过 dotenv）
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT Bearer Token 验证中间件
│   │   │   └── errorHandler.ts       # 统一错误处理中间件
│   │   ├── routes/
│   │   │   ├── auth.ts               # 认证路由（注册/登录/me/登出）
│   │   │   ├── children.ts           # 孩子管理 + 统计数据路由
│   │   │   ├── trees.ts              # 树木列表 + 目标 CRUD 路由
│   │   │   ├── goals.ts              # 目标更新/删除路由（含勋章撤销）
│   │   │   ├── tasks.ts              # 任务打卡 + 审核路由
│   │   │   ├── medals.ts             # 勋章查询路由
│   │   │   ├── rewards.ts            # 奖励商店 + 兑换 + 奖品 CRUD 路由
│   │   │   └── messages.ts           # 消息发送/查询/已读路由
│   │   └── services/
│   │       └── medalService.ts       # 勋章自动解锁 + 撤销业务逻辑
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # 10 张业务表 + 索引 + 触发器
│       └── 002_seed_data.sql         # 勋章（9枚）和奖励（6个）初始数据
│
├── .env.example                      # 环境变量模板
├── vercel.json                       # Vercel 部署配置（构建 + 路由 + Function）
├── package.json                      # 前端 + 脚本入口
├── vite.config.ts                    # Vite 配置（含本地开发 /api 代理）
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

> 防重复打卡：后端在创建任务时会查询当日是否已有打卡记录，同一目标每天只能打卡一次（由 [`server/src/routes/tasks.ts`](server/src/routes/tasks.ts) 业务逻辑控制）。

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

### 目标管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/children/:childId/goals` | 获取目标列表（含关联树木） |
| PUT | `/api/v1/goals/:goalId` | 更新目标（支持修改归属孩子） |
| DELETE | `/api/v1/goals/:goalId` | 删除目标（含关联任务/树木/勋章撤销） |

### 奖励商店
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/rewards` | 获取上架奖励列表（支持 `?category=activity/toy/snack`） |
| GET | `/api/v1/rewards/all` | 获取所有奖励（含已下架，供家长管理） |
| POST | `/api/v1/rewards` | 创建奖品 |
| PUT | `/api/v1/rewards/:rewardId` | 更新奖品（名称/价格/分类/上下架） |
| DELETE | `/api/v1/rewards/:rewardId` | 软删除奖品（设置 is_active=false） |
| GET | `/api/v1/rewards/children/:childId/fruits` | 查询果实余额 |
| POST | `/api/v1/rewards/:rewardId/redeem` | 兑换奖励（自动扣除果实） |
| GET | `/api/v1/rewards/children/:childId/redemptions` | 查询兑换历史 |
| PUT | `/api/v1/rewards/redemptions/:id/complete` | 家长确认奖励已发放 |

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
pnpm build            # 构建前端生产包（输出到 dist/）
pnpm server:dev       # 启动后端开发服务器（端口 3001，热重载）
pnpm server:start     # 启动后端生产服务器
```

---

## 线上部署

本项目使用 **Vercel Serverless Functions** 方案，前端静态文件和后端 API 全部部署在 Vercel，**只需要 Vercel + Supabase 两个平台**，无需额外的后端服务器。

| 服务 | 平台 | 说明 |
|------|------|------|
| 前端 + 后端 API | [Vercel](https://vercel.com) | 前端静态文件 + `/api/*` 由 Serverless Function 处理 |
| 数据库 | [Supabase](https://supabase.com) | PostgreSQL，已配置，免费套餐 |

### 工作原理

```
Vercel 部署后：
  前端请求 /api/v1/auth/login
       ↓
  Vercel 路由匹配 /api/(.*) → api/[...path].ts（Serverless Function）
       ↓
  Express 应用处理请求 → 调用 Supabase 数据库
```

本地开发时，Vite 代理将 `/api` 请求转发到 `localhost:3001`，行为与生产环境一致。

### 部署步骤

1. 将代码推送到 GitHub 仓库

2. 在 [Vercel](https://vercel.com) 导入该仓库，Vercel 会自动读取 [`vercel.json`](vercel.json) 配置

3. 在 Vercel 项目设置 → **Environment Variables** 中添加以下变量：

   | 变量名 | 说明 |
   |--------|------|
   | `SUPABASE_URL` | Supabase 项目 URL |
   | `SUPABASE_SERVICE_KEY` | Supabase service_role key（仅后端使用） |
   | `JWT_SECRET` | JWT 签名密钥（至少 32 位随机字符串） |
   | `JWT_EXPIRES_IN` | JWT 有效期，如 `7d` |
   | `NODE_ENV` | 设置为 `production` |

4. 点击 **Deploy** 完成部署，前端和后端 API 同时上线

### 生产环境注意事项

- `JWT_SECRET` 使用强随机密钥：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `SUPABASE_SERVICE_KEY` 只在 Vercel 环境变量中设置，**不要**提交到代码仓库
- 无需设置 `VITE_API_URL`，前端使用相对路径 `/api/...`，Vercel 自动路由到 Serverless Function

---

## 可用脚本（开发环境）

```bash
pnpm dev              # 启动前端开发服务器（端口 3000）
pnpm build            # 构建前端生产包（输出到 dist/）
pnpm server:dev       # 启动后端开发服务器（端口 3001，热重载）
pnpm server:start     # 启动后端生产服务器
