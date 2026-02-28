# 技术架构设计：后端服务与 Supabase 集成

## 背景

"成就丛林"是一款面向儿童习惯养成的游戏化应用，家长作为账户持有人管理孩子的目标、任务和奖励。当前前端使用 React + TypeScript + Vite 构建，数据全部为 mock 数据。本设计文档描述后端服务的技术架构决策。

## 目标 / 非目标

**目标：**
- 构建 Express.js RESTful API 服务，覆盖所有业务功能
- 使用 Supabase（PostgreSQL）作为持久化数据库
- 实现 JWT 认证，保护所有需要鉴权的 API
- 前端通过 API 服务层调用后端，替换所有 mock 数据
- 支持图片上传（任务打卡凭证）存储到 Supabase Storage

**非目标：**
- 不实现实时推送（WebSocket/SSE），消息系统采用轮询
- 不实现微信/第三方 OAuth 登录（UI 已有入口但暂不实现）
- 不实现管理后台
- 不实现多语言国际化

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                   前端 (React + Vite)                │
│  src/services/api.ts  ←→  src/contexts/AuthContext  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP REST API
                       ▼
┌─────────────────────────────────────────────────────┐
│              后端 (Express.js + TypeScript)          │
│  server/src/                                        │
│  ├── routes/          # API 路由层                   │
│  ├── controllers/     # 业务控制器                   │
│  ├── middleware/      # 认证/验证中间件               │
│  ├── services/        # 业务逻辑服务                 │
│  └── config/          # Supabase 配置                │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase Client
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Supabase                           │
│  ├── PostgreSQL 数据库（10 张业务表）                │
│  ├── Auth（可选，或使用自定义 JWT）                  │
│  └── Storage（任务打卡图片存储）                     │
└─────────────────────────────────────────────────────┘
```

## 数据库表结构设计

```sql
-- 1. 家长用户表
users (id, username, phone, password_hash, created_at, updated_at)

-- 2. 孩子信息表
children (id, parent_id→users, name, age, gender, avatar, fruits_balance, created_at, updated_at)

-- 3. 目标/习惯表
goals (id, child_id→children, title, icon, duration_days, duration_minutes, reward_tree_name, is_active, created_at, updated_at)

-- 4. 树木表（与目标一一对应）
trees (id, child_id→children, goal_id→goals, name, image, status, level, progress, created_at, updated_at)

-- 5. 任务打卡表（每日实例）
tasks (id, goal_id→goals, child_id→children, tree_id→trees, title, type, status, checkin_time, image_url, progress, created_at, updated_at)

-- 6. 勋章定义表
medals (id, name, icon, color, description, unlock_condition jsonb, created_at)

-- 7. 孩子勋章关联表
child_medals (id, child_id→children, medal_id→medals, unlocked_at)

-- 8. 奖励表
rewards (id, name, price, image, category, is_active, created_at)

-- 9. 奖励兑换记录表
reward_redemptions (id, child_id→children, reward_id→rewards, redeemed_at, status)

-- 10. 消息表
messages (id, sender_id, receiver_id, sender_type, text, type, content, is_read, created_at)
```

## API 路由设计

```
POST   /api/v1/auth/register          # 家长注册
POST   /api/v1/auth/login             # 家长登录
POST   /api/v1/auth/logout            # 登出
GET    /api/v1/auth/me                # 获取当前用户

GET    /api/v1/users/:userId/children         # 获取孩子列表
POST   /api/v1/users/:userId/children         # 添加孩子
PUT    /api/v1/users/:userId/children/:id     # 更新孩子信息
DELETE /api/v1/users/:userId/children/:id     # 删除孩子

GET    /api/v1/children/:childId/trees        # 获取树木列表
POST   /api/v1/children/:childId/goals        # 创建目标（同时创建树木）
PUT    /api/v1/trees/:treeId                  # 更新树木状态

GET    /api/v1/children/:childId/tasks        # 获取任务列表
POST   /api/v1/tasks                          # 创建任务
PUT    /api/v1/tasks/:taskId/checkin          # 任务打卡
PUT    /api/v1/tasks/:taskId/approve          # 家长审核通过
PUT    /api/v1/tasks/:taskId/reject           # 家长拒绝

GET    /api/v1/children/:childId/medals       # 获取勋章列表
GET    /api/v1/rewards                        # 获取奖励列表
POST   /api/v1/rewards/:rewardId/redeem       # 兑换奖励
GET    /api/v1/children/:childId/fruits       # 获取果实余额

GET    /api/v1/children/:childId/messages     # 获取消息列表
POST   /api/v1/messages                       # 发送消息
PUT    /api/v1/messages/:messageId/read       # 标记已读

GET    /api/v1/children/:childId/stats        # 获取统计数据
```

## 关键技术决策

### 决策 1：使用自定义 JWT 而非 Supabase Auth
- **决定**：使用 `jsonwebtoken` + `bcryptjs` 实现自定义认证，Supabase 仅作为数据库使用
- **原因**：前端已有完整的登录/注册 UI，使用自定义 JWT 更灵活，避免 Supabase Auth 的额外复杂性
- **备选方案**：Supabase Auth（需要修改前端认证流程）

### 决策 2：后端独立服务（非 Serverless）
- **决定**：Express.js 独立服务，运行在 `server/` 目录，端口 3001
- **原因**：前端已有 Vite 开发服务器（端口 3000），后端独立运行便于开发调试
- **备选方案**：Next.js API Routes（需要迁移整个前端框架）

### 决策 3：前端通过 API 服务层调用后端
- **决定**：创建 `src/services/api.ts` 统一封装所有 API 调用
- **原因**：集中管理 API 调用，便于错误处理、请求拦截和 token 管理
- **备选方案**：直接在组件中调用 fetch（分散，难以维护）

### 决策 4：任务审核触发果实奖励
- **决定**：家长审核通过任务时，后端自动计算并增加孩子的果实余额，同时更新树木进度
- **原因**：业务逻辑集中在后端，避免前端绕过审核直接修改数据

## 风险与权衡

| 风险 | 缓解措施 |
|------|----------|
| Supabase 连接配置错误 | 提供详细的 .env.example 和配置文档 |
| JWT token 过期处理 | 前端 API 层统一处理 401 响应，跳转登录页 |
| 图片上传大小限制 | 前端压缩图片后再上传，限制 5MB |
| 并发任务审核冲突 | 使用数据库事务保证原子性 |

## 项目目录结构

```
server/
├── src/
│   ├── config/
│   │   └── supabase.ts          # Supabase 客户端配置
│   ├── middleware/
│   │   ├── auth.ts              # JWT 认证中间件
│   │   └── errorHandler.ts      # 统一错误处理
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── children.ts
│   │   ├── trees.ts
│   │   ├── tasks.ts
│   │   ├── medals.ts
│   │   ├── rewards.ts
│   │   └── messages.ts
│   ├── controllers/             # 业务控制器（对应路由）
│   ├── services/                # 业务逻辑（数据库操作）
│   └── index.ts                 # 服务器入口
├── package.json
└── tsconfig.json

supabase/
└── migrations/
    └── 001_initial_schema.sql   # 初始数据库表结构

src/
├── services/
│   └── api.ts                   # 前端 API 服务层
├── contexts/
│   └── AuthContext.tsx          # 认证状态全局管理
└── hooks/
    └── useApi.ts                # API 调用 Hook
```

## 开放问题

- 图片存储：任务打卡图片是否使用 Supabase Storage，还是直接存 URL？（建议 Supabase Storage）
- 消息实时性：是否需要 WebSocket 实时推送？（当前方案为轮询，可后续升级）