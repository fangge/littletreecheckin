# 成就丛林 (Achievement Jungle) — 项目开发规范总览

> 版本 v3.8 | 儿童习惯养成游戏化 PWA

---

## 一、项目简介

游戏化儿童习惯养成应用。家长设置任务 → 孩子打卡 → 家长审核 → 树木成长 + 果实奖励 → 商店兑换。

核心流程：**家长创建目标 → 孩子每日打卡 → 家长审核通过 → 树木成长（进度关联目标时长） → 果实+10 → 勋章自动解锁**

---

## 二、技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 6 + TailwindCSS v4 + motion/react |
| 路由 | React Router v7（路由级代码分割 + 懒加载） |
| 后端 | Node.js + Express 4（`server/` 目录） |
| 数据库/认证 | Supabase (PostgreSQL + Supabase Auth) |
| 部署 | Vercel Serverless（`api/[...path].ts` 代理后端） |
| 包管理 | pnpm |
| PWA | Service Worker + Web App Manifest |
| 文档站 | VitePress（`docs/` 目录） |

---

## 三、目录结构

```
littletreecheckin/
├── src/                          # 前端源码
│   ├── contexts/
│   │   ├── AuthContext.tsx        # 全局认证状态（Supabase Auth + localStorage 缓存）
│   │   ├── ThemeContext.tsx       # 深色模式切换
│   │   └── PendingTasksContext.tsx # 待审核任务角标
│   ├── services/
│   │   └── api.ts                # 统一 API 服务层（fetch 封装 + 类型定义）
│   ├── utils/
│   │   └── requestCache.ts       # 轻量级前端缓存层（TTL + 请求去重）
│   ├── lib/
│   │   └── supabase.ts           # Supabase 客户端（含 autoRefreshToken）
│   ├── hooks/
│   │   └── usePendingTasksCount.ts # 待审核任务数量 Hook
│   ├── components/
│   │   ├── Navigation.tsx         # 底部导航栏（手机）/ 侧边栏（桌面）
│   │   ├── CelebrationPopup.tsx   # 打卡成功庆祝弹窗
│   │   ├── ChildModeBanner.tsx    # 儿童模式横幅提示
│   │   ├── TodayProgressModal.tsx # 今日任务进度弹窗
│   │   └── UpdatePrompt.tsx       # PWA 更新提示
│   ├── views/
│   │   ├── Login.tsx              # 登录
│   │   ├── Register.tsx           # 注册（含孩子信息）
│   │   ├── CheckIn.tsx            # 每日打卡（首页）
│   │   ├── Dashboard.tsx          # 森林主页（树木 + 统计 + 日历 + 时间筛选）
│   │   ├── GoalSetting.tsx        # 目标设置（创建/编辑/删除）
│   │   ├── ParentControl.tsx      # 家长审核（批准/拒绝/撤销）
│   │   ├── Store.tsx              # 果实商店（兑换奖励）
│   │   ├── Medals.tsx             # 勋章墙
│   │   ├── MedalManagement.tsx    # 勋章管理（家长）
│   │   ├── Messages.tsx           # 消息中心
│   │   ├── Profile.tsx            # 个人中心
│   │   ├── RewardsManagement.tsx  # 奖品管理 + 兑换记录
│   │   ├── SharedTaskSummary.tsx  # 共享任务总结（多孩子进度排名）
│   │   ├── FruitsHistory.tsx      # 果实获取记录
│   │   ├── RedemptionHistory.tsx  # 兑换历史
│   │   └── ForgotPassword.tsx     # 密码找回
│   ├── App.tsx                    # 路由 + 认证守卫 + 布局
│   ├── main.tsx                   # 入口（包裹 AuthProvider）
│   └── types.ts                   # 前端视图类型定义
├── api/
│   └── [...path].ts              # Vercel Function 入口（捕获 /api/* 请求）
├── server/                        # 后端源码
│   └── src/
│       ├── app.ts                 # Express 配置（路由 + 中间件），导出 app
│       ├── index.ts               # 本地开发入口（dotenv + listen）
│       ├── types.ts               # 后端类型定义（AuthRequest 等）
│       ├── config/supabase.ts     # Supabase 服务端客户端
│       ├── middleware/auth.ts     # JWT Bearer Token 验证中间件
│       ├── middleware/errorHandler.ts # 统一错误处理
│       ├── routes/{auth,children,trees,goals,tasks,medals,rewards,messages}.ts
│       └── services/medalService.ts # 勋章自动解锁 + 撤销业务逻辑
├── supabase/migrations/           # 数据库迁移文件
├── docs/                          # VitePress 文档站
│   ├── getting-started.md
│   ├── project-structure.md
│   ├── database.md
│   ├── business-logic.md
│   ├── api-reference.md
│   └── deployment.md
├── .env.example                   # 环境变量模板
├── vercel.json                    # Vercel 部署配置
├── package.json                   # 前端 + 脚本入口
├── vite.config.ts                 # Vite 配置（含本地代理）
├── tsconfig.json
├── DESIGN.md                      # 设计系统规范
├── CHANGELOG.md                   # 版本更新日志
└── README.md
```

---

## 四、路由结构

| 路径 | 页面组件 | 说明 |
|------|---------|------|
| `/` | CheckIn | **首页**，每日打卡（需登录） |
| `/forest` | Dashboard | 成长树森林 + 打卡日历（需登录） |
| `/messages` | Messages | 消息中心（需登录） |
| `/medals` | Medals | 勋章成就墙（需登录） |
| `/medals/manage` | MedalManagement | 勋章管理（需登录，家长权限） |
| `/store` | Store | 果实商店（需登录） |
| `/store/fruits-history` | FruitsHistory | 果实获取记录（需登录） |
| `/store/redemption-history` | RedemptionHistory | 兑换历史（需登录） |
| `/profile` | Profile | 个人中心（需登录） |
| `/parent-control` | ParentControl | 家长审核（需登录） |
| `/rewards-management` | RewardsManagement | 奖品管理（需登录） |
| `/add-goal` | GoalSetting | 目标设置（需登录） |
| `/shared-task/:goalId` | SharedTaskSummary | 共享任务总结（需登录） |
| `/login` | Login | 登录 |
| `/register` | Register | 注册 |
| `/forgot-password` | ForgotPassword | 密码找回 |

**儿童模式限制路径**：`/parent-control`、`/add-goal`、`/rewards-management`

---

## 五、架构核心约定

### 5.1 前后端一体化

```
api/[...path].ts → Vercel Function 入口（捕获 /api/* 请求）
       → 导入
server/src/app.ts → Express 应用（路由 + 中间件配置）
       → 使用
server/src/routes/*.ts → 各业务路由模块
       → 调用
server/src/config/supabase.ts → Supabase 客户端（service_role 密钥，绕过 RLS）
```

本地开发时 `server/src/index.ts` 直接启动 Express 服务器，Vite 通过代理将 `/api` 请求转发到 `localhost:3001`，行为与生产环境完全一致。

### 5.2 前端 API 调用层

- 所有 API 请求统一通过 `src/services/api.ts` 的 `request()` 函数
- `request()` 自动从 Supabase session 获取最新 `access_token` 注入 `Authorization: Bearer` 头
- GET 请求使用 `cachedGet()` 包装，默认 30 秒 TTL 缓存（消除重复请求）
- 写操作（打卡/审核）后调用 `invalidateChildDataCache(childId)` 清除对应缓存

### 5.3 认证系统

- 由 `AuthContext` 全局管理，监听 `supabase.auth.onAuthStateChange`
- `isParent` 字段区分家长/孩子角色
- 儿童模式（`isChildMode`）限制访问管理功能，切换需密码确认
- Token 由 Supabase 客户端自动刷新，`STORAGE_KEYS` 常量管理 localStorage

### 5.4 前端缓存层（`src/utils/requestCache.ts`）

- `cachedRequest<T>()`: TTL 缓存 + 请求去重（同一 URL 并发时只发一次）
- `invalidateChildCache(childId)`: 清除指定孩子的所有缓存
- 默认 TTL: 30 秒，用于避免页面切换、下拉刷新等场景的重复网络请求
- **缓存清除时机**：打卡提交后、审核操作后、数据刷新时

---

## 六、核心业务逻辑

### 6.1 树木成长

```
每次审核通过增量 = Math.round(100 / duration_days)
```

| 目标时长 | 每次增量 | 完成所需次数 |
|----------|---------|-------------|
| 5 天 | 20% | 5 次 |
| 10 天 | 10% | 10 次 |
| 21 天 | 5% | ~21 次 |
| 30 天 | 3% | ~34 次 |

树木等级随进度自动提升（最高 Lv.5）：0-19% → Lv.1 / 20-39% → Lv.2 / 40-59% → Lv.3 / 60-79% → Lv.4 / 80-100% → Lv.5

### 6.2 审核通过触发链（原子执行）

1. 更新任务状态 → `approved`
2. 孩子果实余额 +10（或额外奖励）
3. 关联树木进度 += `Math.round(100 / duration_days)`
4. 树木等级自动更新
5. 进度达 100% → 树木状态改为 `completed`，目标标记为非活跃
6. 发送系统消息通知孩子
7. 异步检查并解锁符合条件的勋章

### 6.3 勋章系统

**解锁条件类型**：`consecutive_days`（连续打卡）/ `total_tasks`（累计任务）/ `trees_completed`（累计树木）/ `total_fruits`（累计果实）

**勋章撤销**：删除目标时检查关联任务是否曾触发勋章；若删除后统计不再满足条件，自动撤销对应勋章（由 `medalService.ts` 处理）

### 6.4 打卡规则

- 同一目标每天只能打卡一次（后端查询当日记录防重复）
- 被拒（`rejected`）的任务不计入当日打卡，孩子可重新提交
- 支持补打卡（选择历史日期）
- 打卡时间以服务器接收请求的时间为准

### 6.5 果实经济

| 事件 | 果实变化 |
|------|---------|
| 任务审核通过 | +10 |
| 额外奖励 | +bonus_fruits |
| 兑换奖励 | -奖品价格 |

果实余额存储在 `children.fruits_balance`，兑换时后端原子检查余额是否充足

### 6.6 统计与时间筛选

| 筛选项 | `period` 值 | 时间范围 |
|--------|-------------|---------|
| 本月 | `month` | 当月 1 日 ~ 今天 |
| 上季度 | `quarter` | 上个季度完整时间段 |
| 过去一年 | `year` | 今天往前 365 天 |
| 默认 | 无参数 | 最近 7 天 |

受时间范围影响：森林健康度（`forestHealth`）/ 累计任务数（`totalApprovedTasks`）/ 已完成树木数（`completedTrees`）
不受影响：活跃目标数（`activeGoals`）/ 果实余额（`fruitsBalance`）

### 6.7 消息系统

`sender_type`：`parent` / `child` / `system`
消息 `type`：`text` / `sticker` / `image`

---

## 七、后端 API 概览

| 模块 | 端点前缀 | 主要功能 |
|------|---------|---------|
| 认证 | `/api/v1/auth` | 登录/注册/me/登出 |
| 孩子 | `/api/v1/users/:userId/children` | 孩子 CRUD + 统计 |
| 树木 | `/api/v1/children/:childId/trees` | 树木列表 + 仪表盘聚合 |
| 目标 | `/api/v1/children/:childId/goals` | 目标 CRUD + 共享进度 |
| 任务 | `/api/v1/tasks` | 打卡 + 审核（批准/拒绝/撤销） |
| 勋章 | `/api/v1/medals` | 勋章 CRUD + 查询 |
| 奖励 | `/api/v1/rewards` | 奖品管理 + 兑换 |
| 消息 | `/api/v1/messages` | 消息发送/查询/已读 |

响应格式：`{ data: T }` 或 `{ error: string, details?: string }`

---

## 八、设计系统约定

详见 [DESIGN.md](./DESIGN.md) 和 [docs 文档站]()。

### 8.1 品牌与色调

- **品牌理念**：The Pure Sprout（纯芽）— 将个人成长类比为培育花园
- **主色**：Sprout Green (`#006e18`)，仅用于主要操作、进度指示和成功状态
- **背景**：大面积白色 + Mint 底色（`#F7FCF9`）卡片区分
- **文字**：高对比度炭灰色
- **字体**：英文 Plus Jakarta Sans，中文 Noto Sans SC
- **风格**：极简主义 + 触感柔和，对儿童友好且家长欣赏

### 8.2 组件规范

- 按钮：胶囊形（pill-shape），主按钮 Sprout Green 背景 + Charcoal 文字
- 进度环：粗描边（8px+），圆头端点
- 复选框：大圆形开关，选中时 Sprout Green 填充 + 白色勾号
- 输入框：胶囊形软薄荷背景
- 卡片：大圆角（32px+），白色或薄荷色表面，最小高度 88px
- 间距：8px 基准单位，使用 `lg`(40px) 和 `xl`(64px) 垂直间距
- 阴影：使用 Tonal Layers 和 Soft Mint Glows 替代传统阴影

---

## 九、开发命令

```bash
pnpm start              # 同时启动前端(3000)和后端
pnpm dev                # 仅前端
pnpm server:dev         # 仅后端
pnpm build              # 构建生产版本
pnpm lint               # TypeScript 类型检查
pnpm docs:dev           # 文档站开发
pnpm clean              # 清除构建产物
```

---

## 十、环境变量（参考 `.env.example`）

| 变量 | 用途 |
|------|------|
| `VITE_SUPABASE_URL` | 前端 Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | 前端 Supabase 匿名密钥 |
| `SUPABASE_URL` | 后端 Supabase 连接地址 |
| `SUPABASE_SERVICE_ROLE_KEY` | 后端服务端密钥 |
| `VITE_API_URL` | API 基础路径（本地留空，生产填 Vercel 域名） |

---

## 十一、修改规范

### 文件名与命名
- **React 组件**：PascalCase，如 `CheckIn.tsx`、`GoalSetting.tsx`
- **服务/工具**：camelCase，如 `api.ts`、`requestCache.ts`
- **Context**：`XxxContext.tsx`，提供 `useXxx()` Hook
- **后端路由**：kebab-case 文件名，如 `auth.ts`、`medalService.ts`
- **数据库迁移**：前缀数字 + 描述，如 `001_initial_schema.sql`

### 代码模式
- **新页面**：在 `src/views/` 创建组件 → 在路由表中注册 → 如需 API 则在 `api.ts` 添加接口
- **新全局状态**：在 `src/contexts/` 创建 Context → 在 `main.tsx` 包裹 Provider
- **新后端接口**：在 `server/src/routes/` 添加路由 → 在 `server/src/app.ts` 挂载
- **数据库变更**：在 `supabase/migrations/` 创建新的迁移文件
- **前端组件**：放在 `src/components/`，页面视图放在 `src/views/`

### 分包与导入
- 页面组件使用 React.lazy + suspense 实现路由级懒加载
- Context、components 使用命名导出，views 使用默认导出
- 所有 API 调用必须通过 `api.ts` 统一层，禁止直接 `fetch`

---

## 十二、关键文件速查

| 文件 | 作用 |
|------|------|
| `src/App.tsx` | 路由布局 + 认证守卫 + 导航 |
| `src/main.tsx` | 入口文件 |
| `src/services/api.ts` | 统一 API 层（含类型定义） |
| `src/utils/requestCache.ts` | 前端缓存层（TTL + 去重） |
| `src/lib/supabase.ts` | Supabase 客户端 |
| `src/contexts/AuthContext.tsx` | 全局认证 + 当前孩子状态 |
| `server/src/app.ts` | Express 应用入口 |
| `server/src/routes/*.ts` | 各业务路由 |
| `server/src/services/medalService.ts` | 勋章业务逻辑 |
| `supabase/migrations/*.sql` | 数据库迁移文件 |
| `DESIGN.md` | 设计系统规范 |
