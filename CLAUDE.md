# 成就丛林 (Achievement Jungle) — AI 项目全景

**一句话**：游戏化儿童习惯养成 PWA。家长设置目标 → 孩子每日打卡 → 家长审核 → 树木成长 + 果实奖励 → 商店兑换奖品 + 勋章解锁。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite 6 + TailwindCSS v4 + React Router v7 |
| 动画 | motion (framer-motion 继任) + Three.js (@react-three/fiber) |
| 图标 | lucide-react (组件) + 自托管 Material SVG (`src/assets/icons/`) |
| 3D 树 | @dgreenheck/ez-tree |
| 后端 | Express 4 + TypeScript (`server/` 独立 pnpm 项目) |
| 数据库 | Supabase PostgreSQL + Supabase Auth + RLS |
| 部署 | Vercel Serverless（`api/[...path].ts` 代理到 Express） |
| 包管理 | pnpm (root + server 各自独立 workspace) |
| PWA | Service Worker (sw.js) + manifest + 版本缓存失效 |

---

## 完整目录结构

```
根目录/
  AGENTS.md / CLAUDE.md      # 项目全景文档（本文件，两个文件内容相同）
  DESIGN.md                   # Pure Sprout 设计系统定义（色彩/排版/圆角/间距）
  CHANGELOG.md                # 版本更新日志
  vercel.json                 # Vercel 部署配置（路由 + PWA 头 + 构建指令）
  vite.config.ts              # Vite: 代码分割、别名 @/*、代理 /api → :3001
  tsconfig.json               # 前端 TS 配置（ES2022, react-jsx, paths @/*）
  package.json                # 根 pnpm workspace + 前端依赖
  index.html                  # SPA 入口
  favicon.ico / logo.png / logo2.png / metadata.json  # PWA 资源

  src/
    main.tsx                  # 入口：PWA 版本检测 + vConsole 调试 + React 挂载
    App.tsx                   # 布局壳：Navigation + ChildModeBanner + Outlet + TodayProgressModal + UpdatePrompt
    router.tsx                # 路由定义：ProtectedRoute / PublicRoute / Suspense 懒加载
    version.ts                # APP_VERSION 常量（发版时更新）
    types.ts                  # 前端类型定义（Tree/Task/Medal/Reward/Message）
    constants.ts              # Mock 数据常量（仅开发占位用，实际数据来自 API）

    lib/
      supabase.ts             # Supabase 客户端（auth: persistSession + autoRefresh）

    services/
      api.ts                  # 统一 API 层：request() 自动注入 Bearer token + cachedGet 缓存

    utils/
      requestCache.ts         # 内存缓存层：TTL 30s + 请求去重 + invalidateChildCache

    hooks/
      usePendingTasksCount.ts # 待审核任务计数（简单封装 usePendingTasks）

    contexts/
      AuthContext.tsx          # 认证状态：user/currentChild/isChildMode + login/register/logout + 儿童模式切换
      ThemeContext.tsx         # 主题：light/dark/system + 系统跟随 + localStorage 持久化
      PendingTasksContext.tsx  # 待审核任务角标：轮询统计 + 自动刷新

    components/
      Navigation.tsx           # 底部/侧边 TabBar（children 选择器 + 导航菜单）
      ChildModeBanner.tsx      # 儿童模式顶部提示条
      Icon.tsx                 # 自托管 SVG 图标组件
      CelebrationPopup.tsx     # 树木完成的庆祝弹窗（Three.js 3D 特效）
      MedalUnlockPopup.tsx     # 勋章解锁弹窗
      TodayProgressModal.tsx   # 今日打卡进度浮层
      ChangelogModal.tsx       # 版本更新日志弹窗
      CheckinCalendar.tsx      # 打卡日历组件
      CheckinDetailPopup.tsx   # 打卡详情弹窗
      MonthlySummaryModal.tsx  # 月度汇总弹窗
      PasswordConfirmModal.tsx # 密码确认弹窗（儿童模式切换/敏感操作）
      PullToRefresh.tsx        # 下拉刷新组件
      UpdatePrompt.tsx         # PWA 更新提示

    views/
      CheckIn.tsx              # 首页：今日任务列表 + 打卡操作
      Dashboard.tsx            # 森林主页：树木列表 + 统计数据 + 目标列表
      ParentControl.tsx        # 家长审核：待审核任务列表 + 批准/拒绝
      Store.tsx                # 果实商店：兑换奖品
      Medals.tsx               # 勋章展示
      MedalManagement.tsx      # 勋章管理（CRUD）
      GoalSetting.tsx          # 目标设置（新增/编辑目标，支持共享任务）
      RewardsManagement.tsx    # 奖品管理 + 兑换审核
      Messages.tsx             # 亲子消息
      Profile.tsx              # 个人资料 + 孩子管理
      Login.tsx / Register.tsx / ForgotPassword.tsx  # 认证页面
      SharedTaskSummary.tsx    # 共享任务进度汇总（多孩子竞争）
      RedemptionHistory.tsx    # 兑换历史
      FruitsHistory.tsx        # 果实获取历史

  server/src/
    index.ts                   # 服务入口（dotenv + listen :3001）
    app.ts                     # Express 应用：CORS + JSON + 路由挂载 + 错误处理
    types.ts                   # 后端类型定义

    config/
      supabase.ts              # Supabase 客户端（service_role key 绕过 RLS）

    middleware/
      auth.ts                  # JWT 验证中间件 + requireParentRole（儿童模式 GET 放行，写操作拦截）
      errorHandler.ts          # 统一错误处理

    routes/
      auth.ts                  # /api/v1/auth/me, register-children
      children.ts              # /api/v1/users/:userId/children CRUD + stats + calendar + fruits-history
      trees.ts                 # /api/v1/children/:childId/trees + dashboard-data + goals CRUD + shared-progress
      tasks.ts                 # /api/v1/children/:childId/tasks + checkin POST + approve/reject/revoke
      goals.ts                 # /api/v1/goals/:goalId PUT/DELETE（goals 的独立写操作路由）
      medals.ts                # /api/v1/medals CRUD + /api/v1/children/:childId/medals
      rewards.ts               # /api/v1/rewards CRUD + redeem + redemptions
      messages.ts              # /api/v1/messages CRUD + mark read

    services/
      medalService.ts          # 勋章解锁引擎：连续打卡/总任务/树木完成/总果实/周目标

  supabase/migrations/
    init.sql                   # 完整初始化脚本（所有表 + RLS + RPC + 种子数据）
    002_performance_indexes.sql  ... 014_fix_tree_progress_recalculation.sql

  api/
    [...path].ts               # Vercel Serverless 入口：将请求代理到 Express
```

---

## 完整路由表

| 路径 | 组件 | 访问控制 | 说明 |
|------|------|----------|------|
| `/` | CheckIn | ProtectedRoute | 首页每日打卡 |
| `/forest` | Dashboard | ProtectedRoute | 森林主页（树木 + 统计 + 目标） |
| `/messages` | Messages | ProtectedRoute | 亲子消息 |
| `/medals` | Medals | ProtectedRoute | 勋章展示 |
| `/medals/manage` | MedalManagement | ProtectedRoute | 勋章 CRUD 管理 |
| `/store` | Store | ProtectedRoute | 果实商店兑换 |
| `/store/fruits-history` | FruitsHistory | ProtectedRoute | 果实获取历史 |
| `/store/redemption-history` | RedemptionHistory | ProtectedRoute | 兑换历史 |
| `/profile` | Profile | ProtectedRoute | 个人资料 + 孩子管理 |
| `/parent-control` | ParentControl | ProtectedRoute + ChildModeRestricted | 家长审核 |
| `/rewards-management` | RewardsManagement | ProtectedRoute + ChildModeRestricted | 奖品管理 |
| `/add-goal` | GoalSetting | ProtectedRoute + ChildModeRestricted | 新建/编辑目标 |
| `/shared-task/:goalId` | SharedTaskSummary | ProtectedRoute | 共享任务竞争进度 |
| `/login` | Login | PublicRoute（已登录→重定向） | 登录页 |
| `/register` | Register | PublicRoute | 注册页 |
| `/forgot-password` | ForgotPassword | PublicRoute | 密码找回 |
| `*` | → `/` | - | 404 兜底 |

### 儿童模式受限路径
在 `App.tsx` 中硬编码：`/parent-control`, `/add-goal`, `/rewards-management`。儿童模式下访问这些路径会被 `useEffect` 重定向到 `/`。

---

## 核心业务流

### 1. 认证流程
```
注册: supabase.auth.signUp → (自动 trigger create profile) → POST /api/v1/auth/register-children (创建孩子)
登录: supabase.auth.signInWithPassword → 自动获取 session → AuthContext fetchUserProfile (/api/v1/auth/me) → 恢复当前孩子
登出: supabase.auth.signOut → AuthContext 监听 SIGNED_OUT → 清理状态 → 跳转 /login
Token 刷新: supabase-js 自动处理；前端 request() 从不手动管理 token，每次从 getSession 获取最新
```

### 2. 打卡 → 审核 → 奖励全链路
```
孩子打卡:
  POST /api/v1/tasks { goal_id, child_id } → status='pending'
  → 防重复：同日+同 goal 已有非 rejected 记录则 409
  → 共享任务：额外检查是否有其他孩子已打卡

家长审核通过:
  PUT /api/v1/tasks/:taskId/approve → approve_task_rpc (PL/pgSQL 事务)
    → UPDATE task status='approved' + bonus_fruits
    → UPDATE children.fruits_balance += (base_fruits + bonus_fruits)
    → recalculate_tree_progress (基于 approved distinct 日期数)
    → 若树木 100%: tree.status='completed', goal.is_active=false
    → INSERT 系统消息通知
  → 异步触发 checkAndUnlockMedals (勋章检测)

家长审核拒绝:
  PUT /api/v1/tasks/:taskId/reject { reason } → status='rejected'

家长撤销:
  PUT /api/v1/tasks/:taskId/revoke → status→pending, 扣除果实, 重算树木进度, 发送消息
```

### 3. 树木进度计算
- **不再使用增量式**（每次 +100/duration_days）。改用 `recalculate_tree_progress` RPC，基于该树下 `approved` 任务的 **distinct 日期数** 重新计算。
- progress = MIN(100, ROUND(100 × approvedDistinctDays / duration_days))
- 进度 ≥100 → status='completed' → goal.is_active=false

### 4. 勋章解锁引擎
`server/src/services/medalService.ts` — 每次获取勋章列表时自动触发检测。条件类型：
| 条件类型 | 说明 | 阈值示例 |
|---------|------|---------|
| consecutive_days | 连续打卡天数（只看日期，UTC+8） | 7 |
| total_tasks | 累计 approved 任务数 | 30 / 100 / 200 |
| trees_completed | 完成树木数 | 1 / 5 |
| total_fruits | 累计获得果实数 | 500 |
| weekly_goals | 一周内完成的不同目标数 | 3 |

种子数据有 9 枚勋章（见 `init.sql`）。

### 5. 共享任务（竞争模式）
- `goals.is_shared=true` + `shared_child_ids` 包含多个孩子
- 每个孩子有独立 `trees` 记录，独立打卡 + 独立审核
- 额外防重复：同一共享任务同一天，只有第一个完成的孩子能打卡（409）
- 果实发放：每个孩子审核通过都获得果实（各自独立）
- 判断胜者：以完成日期（UTC+8）为准，同一天完成则并列
- 共享任务完成判断：completed_days >= duration_days

### 6. 商店兑换
```
POST /api/v1/rewards/:rewardId/redeem { child_id }
 → 检查余额 → 扣除果实 → 创建 reward_redemptions(status='pending')
 → 家长在 RewardsManagement 确认发放 (PUT .../complete) 或撤回 (PUT .../cancel)
```

---

## API 端点速查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/auth/me` | 当前用户信息 + 孩子列表 |
| POST | `/api/v1/auth/register-children` | 注册后创建孩子 |
| GET/POST/PUT/DELETE | `/api/v1/users/:userId/children` | 孩子 CRUD |
| GET | `/api/v1/children/:childId/stats` | 统计数据（?period=month/quarter/year） |
| GET | `/api/v1/children/:childId/checkin-calendar` | 打卡日历（?year=&month=） |
| GET | `/api/v1/children/:childId/fruits-history` | 果实获取历史 |
| GET | `/api/v1/children/:childId/dashboard-data` | 聚合接口：树木+目标+统计 |
| GET | `/api/v1/children/:childId/trees` | 树木列表 |
| GET/POST | `/api/v1/children/:childId/goals` | 目标列表 / 创建目标 |
| PUT/DELETE | `/api/v1/goals/:goalId` | 更新/删除目标 |
| GET | `/api/v1/goals/:goalId/shared-progress` | 共享任务进度 |
| GET | `/api/v1/children/:childId/tasks` | 任务列表（?status=&goal_id=&limit=） |
| POST | `/api/v1/tasks` | 打卡 |
| PUT | `/api/v1/tasks/:taskId/approve` | 审核通过（?bonus_fruits=） |
| PUT | `/api/v1/tasks/:taskId/reject` | 审核拒绝 |
| PUT | `/api/v1/tasks/:taskId/revoke` | 撤销批准 |
| GET | `/api/v1/children/:childId/medals` | 勋章列表（自动检测解锁） |
| GET/POST/PUT/DELETE | `/api/v1/medals` | 勋章 CRUD |
| GET | `/api/v1/rewards` | 奖励列表（?category=） |
| POST | `/api/v1/rewards/:rewardId/redeem` | 兑换 |
| GET/POST/PUT/DELETE | `/api/v1/rewards` | 奖励 CRUD |
| GET | `/api/v1/rewards/children/:childId/fruits` | 果实余额 |
| GET | `/api/v1/rewards/children/:childId/redemptions` | 兑换记录 |
| GET | `/api/v1/rewards/redemptions/batch` | 批量兑换记录 |
| PUT | `/api/v1/rewards/redemptions/:id/complete` | 确认发放 |
| PUT | `/api/v1/rewards/redemptions/:id/cancel` | 撤回兑换 |
| GET | `/api/v1/rewards/all` | 全部奖品（含已下架） |
| GET | `/api/v1/children/:childId/messages` | 消息列表（分页） |
| GET | `/api/v1/children/:childId/messages/unread-count` | 未读计数 |
| POST | `/api/v1/messages` | 发送消息 |
| PUT | `/api/v1/messages/:id/read` | 标记已读 |
| PUT | `/api/v1/children/:childId/messages/read-all` | 全部已读 |

---

## 数据库 Schema（关键表）

| 表 | 核心字段 | 说明 |
|----|---------|------|
| profiles | id(UUID PK→auth.users), username, phone | 用户档案，注册 trigger 自动创建 |
| children | parent_id→auth.users, name, age, gender, fruits_balance, is_deleted | 孩子，软删除 |
| goals | child_id, title, duration_days, duration_minutes, fruits_per_task, is_active, is_shared, shared_child_ids(UUID[]) | 习惯目标（含共享任务） |
| trees | child_id, goal_id, name, status(growing/completed), progress(0-100) | 每目标每孩子一棵树 |
| tasks | goal_id, child_id, tree_id, title, status(pending/approved/rejected), checkin_time, bonus_fruits | 每日打卡记录 |
| medals | name, icon, color, description, unlock_condition(JSONB) | 勋章定义 |
| child_medals | child_id, medal_id, unlocked_at, UNIQUE(child_id, medal_id) | 孩子 x 勋章关联 |
| rewards | name, price, category, is_active | 商店奖品 |
| reward_redemptions | child_id, reward_id, status(pending/completed) | 兑换记录 |
| messages | child_id, sender_type(parent/child/system), text, type(text/image/sticker), is_read | 亲子消息 |
| push_subscriptions | user_id, subscription(JSONB) | Push 推送订阅 |

### 数据库 RPC 函数
- `get_child_stats(p_child_id, p_start_date, p_end_date)` — 聚合统计
- `approve_task_rpc(p_task_id, p_bonus_fruits)` — 审核事务（原子化）
- `recalculate_tree_progress(p_tree_id)` — 基于 distinct 日期重算树木进度

### 关键索引
- `idx_tasks_child_status_time` / `idx_tasks_child_checkin_time` — 加速任务查询
- `idx_goals_shared_child_ids` (GIN) + `idx_goals_is_shared` — 加速共享任务查询
- `idx_redemptions_child_time` / `idx_redemptions_child_status` — 加速兑换查询

---

## 数据流架构

```
[浏览器] → React SPA → request() (src/services/api.ts)
                        → supabase.auth.getSession() 获取 token
                        → Authorization: Bearer <token>
                        → fetch(/api/v1/...)

[Vercel] → api/[...path].ts → import app (Express)
                              → authMiddleware → supabase.auth.getUser(token) 验证 JWT
                              → requireParentRole → 写操作拦截儿童
                              → supabase (service_role key) → PostgreSQL
```

### 请求缓存层
`src/utils/requestCache.ts`：
- 基于 URL 的内存缓存，TTL 30s
- 请求去重：同一 URL 并发只发一次请求
- `invalidateChildCache(childId)` — 打卡/审核后清除该孩子所有缓存
- `cachedGet` (在 api.ts 中) — 读操作自动走缓存，写操作走原始 `request()`

---

## 开发命令

```bash
pnpm start          # 同时启动前端(:3000) + 后端(:3001)
pnpm dev            # 仅前端
pnpm server:dev     # 仅后端 (tsx watch)
pnpm build          # Vite 生产构建
pnpm lint           # tsc --noEmit 类型检查
pnpm docs:dev       # VitePress 文档
```

---

## 环境变量

| 变量 | 用途 | 位置 |
|------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 前端 `src/lib/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名 key | 前端 `src/lib/supabase.ts` |
| `SUPABASE_URL` | Supabase 项目 URL | 后端 `server/src/config/supabase.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key（绕过 RLS） | 后端 `server/src/config/supabase.ts` |
| `VITE_API_URL` | API 基础路径（本地留空，生产填 Vercel 域名） | 前端 `src/services/api.ts` |
| `VITE_APP_VERSION` | 构建时注入时间戳用于 PWA 缓存失效 | `vite.config.ts` 自动生成 |

---

## 关键约定与注意事项

1. **认证**：Supabase Auth JWT，由 `src/services/api.ts` 的 `request()` 自动从 `getSession()` 注入。后端 `authMiddleware` 用 `supabase.auth.getUser(token)` 验证。
2. **儿童模式**：通过重新登录验证密码来切换（`enableChildMode`/`disableChildMode`）。前端路由重定向 `App.tsx` 中的受限路径；后端 `requireParentRole` 在写操作时拦截。
3. **时区**：所有涉日期的逻辑统一使用 UTC+8（Asia/Shanghai）。`getUTC8Today()` 在后端多处使用。
4. **共享任务果实发放**：非共享任务直接发放；共享任务只有树木完成后的最后一次打卡才显示果实（前端 `fruits-history` 接口处理）。
5. **树木进度回退**：撤销审核时调用 `recalculate_tree_progress`，基于真实 approved distinct 日期数重算，如果树木之前已完成则恢复为 growing。
6. **勋章校验**：删除目标后会异步执行 `revokeInvalidMedals`，清除不再满足条件的已解锁勋章。
7. **PWA**：根目录 `sw.js` 提供服务 Worker。`vite.config.ts` 的 `pwaVersionPlugin` 构建时自动替换缓存版本号。`main.tsx` 检测版本变化时清除旧缓存并重载页面。
8. **调试**：URL 添加 `?debug=1` 加载 vConsole 移动端调试面板。
9. **设计系统**：Pure Sprout（见 `DESIGN.md`）— Plus Jakarta Sans / Noto Sans SC 字体，Sprout Green (#006e18) 为主色，全圆角 pill 风格，Mint-tinted 表面色。
10. **代码分割**：Vite 手动 chunk — `react-vendor`（react/react-dom/router）、`motion`、`three-vendor`。路由级 `lazy()` 懒加载。
11. **双文件同步**：`AGENTS.md` 和 `CLAUDE.md` 内容完全相同，需要同时更新。
