# 成就丛林 (Achievement Jungle)

![](./logo.png)
一款游戏化儿童习惯养成应用。家长为孩子设置每日习惯目标，孩子完成打卡后由家长审核，审核通过后虚拟树木成长并获得果实奖励，果实可在商店兑换实际奖励。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 6 + TailwindCSS v4 + motion/react |
| 后端 | Node.js + Express 4 + TypeScript |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | 自定义 JWT（jsonwebtoken + bcryptjs） |
| 部署 | Vercel Serverless Functions（前后端一体） |
| 包管理 | pnpm |

## 功能概览

- 🌳 **森林主页**：树木成长可视化，支持本月 / 上季度 / 过去一年统计筛选
- ✅ **每日打卡**：孩子提交打卡，家长审核，通过后树木自动成长
- 🎯 **目标设置**：创建/编辑/删除习惯目标，支持多孩子管理
- 🏅 **勋章系统**：根据累计任务、连续打卡等条件自动解锁勋章
- 🛒 **果实商店**：用果实兑换家长设置的实际奖励
- 💬 **消息中心**：家长与孩子互动，系统自动发送审核通知

---

## 文档导航

| 文档 | 说明 |
|------|------|
| [快速开始](docs/getting-started.md) | 安装依赖、配置 Supabase、初始化数据库、启动开发服务器 |
| [项目结构](docs/project-structure.md) | 目录结构说明、前后端架构设计 |
| [数据库设计](docs/database.md) | 10 张业务表的字段说明和关系 |
| [核心业务逻辑](docs/business-logic.md) | 树木成长、审核触发链、勋章系统、时间筛选统计 |
| [API 参考](docs/api-reference.md) | 完整 API 端点列表（含请求/响应示例） |
| [部署指南](docs/deployment.md) | Vercel + Supabase 一体化部署步骤 |

---

## 快速启动

```bash
# 安装依赖
pnpm install
pnpm --prefix server install

# 配置环境变量（参考 docs/getting-started.md）
cp .env.example .env.local

# 初始化数据库（在 Supabase SQL Editor 中执行）
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_seed_data.sql

# 启动开发服务器
pnpm dev          # 前端 http://localhost:3000
pnpm server:dev   # 后端 http://localhost:3001
```

详细步骤请参阅 [快速开始文档](docs/getting-started.md)。

---

## 更新日志

### v2.0 — 后端服务与 Supabase 数据库集成

将纯前端 mock 数据应用升级为具备完整后端服务和数据库持久化的全栈应用。

- ✅ **新增** Express.js 后端服务（`server/` 目录），提供 RESTful API（`/api/v1/`）
- ✅ **新增** Supabase 数据库表结构（10 张核心业务表，见 `supabase/migrations/`）
- ✅ **新增** JWT 用户认证系统（家长注册 / 登录 / 登出）
- ✅ **新增** 孩子信息管理 API（增删改查、多孩子切换）
- ✅ **新增** 树木与目标管理 API（创建目标自动生成树木、进度更新）
- ✅ **新增** 任务打卡与家长审核 API（审核通过自动奖励果实、触发树木成长）
- ✅ **新增** 勋章成就系统 API（根据累计任务、连续打卡等条件自动解锁）
- ✅ **新增** 奖励商店与果实兑换 API（家长管理奖励、孩子兑换）
- ✅ **新增** 家长与孩子消息互动 API（系统自动发送审核通知）
- ✅ **修改** 前端：将 mock 数据替换为真实 API 调用，新增 `src/services/api.ts` 服务层和 `src/contexts/AuthContext.tsx` 全局状态管理

**数据库迁移**：执行 `supabase/migrations/001_initial_schema.sql` → `002_seed_data.sql` → `003_add_daily_count.sql`

---

### v2.1 — 任务进度展示与可配置果实奖励

增强 Dashboard 可见性，并允许家长为每个目标自定义果实奖励数量。

- ✅ **新增** Dashboard 目标卡片显示已完成天数 / 总天数（如 `1/21天`）
- ✅ **新增** 今日已打卡的目标卡片显示绿色"今日已打卡"徽章
- ✅ **新增** 目标设置表单新增"每次获得果实数"字段（默认 10，可自定义）
- ✅ **修改** 后端任务审核逻辑：从 goal 记录读取 `fruits_per_task`，替换硬编码常量
- ✅ **修改** 树木列表 API：响应附带 `completed_days` 和 `checked_in_today` 字段
- ✅ **修改** `GoalData` / `TreeData` 前端类型定义，新增对应字段

**数据库迁移**：执行 `supabase/migrations/004_add_fruits_per_task.sql`

---

### v2.2 — 响应式布局（多端适配）


将移动端专属布局升级为完整响应式设计，支持手机、平板、桌面端无缝切换。

- ✅ **修改** `src/App.tsx`：移除 `max-w-md` 硬限制，添加 `lg:flex-row` 双列结构，登录/注册页不应用侧边栏偏移
- ✅ **修改** `src/components/Navigation.tsx`：移动端保持底部导航栏，桌面端（≥ 1024px）切换为固定左侧边栏（240px，含 Logo + 竖排导航项）
- ✅ **修改** `src/views/Dashboard.tsx`：树木网格 `2列 → md:3列 → lg:4列`，内容区 `lg:max-w-4xl`，FAB 按钮桌面端隐藏
- ✅ **修改** `src/views/GoalSetting.tsx`：表单内容 `lg:max-w-xl` 居中，固定底部按钮改为 `lg:sticky`
- ✅ **修改** `src/views/Medals.tsx`：勋章网格 `3列 → md:4列 → lg:5列`，内容 `lg:max-w-2xl` 居中
- ✅ **修改** `src/views/Store.tsx` / `CheckIn.tsx` / `ParentControl.tsx` / `Profile.tsx` / `RewardsManagement.tsx`：内容区 `lg:max-w-2xl` 居中，底部 padding 桌面端适配
- ✅ **修改** `src/views/Login.tsx`：桌面端以卡片形式居中显示（`lg:max-w-md lg:rounded-2xl lg:shadow-xl`）

**断点行为**：

| 断点 | 宽度 | 导航 | 内容 |
|------|------|------|------|
| 默认 | < 768px | 底部导航栏 | 全宽，`pb-32` |
| `md` | ≥ 768px | 底部导航栏 | Dashboard 3列网格 |
| `lg` | ≥ 1024px | 左侧边栏（240px） | 内容居中，`pb-8`，Dashboard 4列网格 |

---

### v2.3 — Dashboard 打卡日历控件

在 Dashboard 页面新增月度打卡日历，直观展示孩子的成长足迹，并支持点击查看每日打卡详情。

- ✅ **新增** Dashboard 顶部"我的成长足迹"月度日历控件，支持上/下月切换
- ✅ **新增** 已打卡日期显示绿色叶子图标（`eco`）高亮，今日日期以绿色圆形背景标记
- ✅ **新增** 点击已打卡日期弹出底部浮层，展示当日所有打卡任务列表（任务名称 + 绿色勾选图标）
- ✅ **新增** 后端接口 `GET /api/v1/children/:childId/checkin-calendar?year=&month=`，按 UTC+8 时区聚合打卡数据，排除 rejected 任务
- ✅ **新增** 前端 `CalendarData` / `CalendarTask` 类型定义及 `childrenApi.getCheckinCalendar` 方法
- ✅ **新增** `src/components/CheckinCalendar.tsx` 纯手写日历组件（无第三方依赖）
- ✅ **新增** `src/components/CheckinDetailPopup.tsx` 打卡详情浮层（`motion/react` 底部滑入动画）

**无需数据库迁移**：复用现有 `tasks` 表数据

---

### v2.4 — 家长审核额外奖励果实 & Dashboard 果实数展示

允许家长在审核任务时额外奖励果实，并在 Dashboard 树木卡片上直观展示每次任务的果实收益。

- ✅ **新增** 家长审核待审核任务时，卡片显示该目标的**基础奖励果实数**（如 `基础奖励：5 🍎`）
- ✅ **新增** 家长审核时可通过 `−` / 输入框 / `+` 控件设置**额外奖励果实**（非负整数），实时显示合计果实数
- ✅ **修改** 后端 `PUT /api/v1/tasks/:taskId/approve` 接受可选 `bonus_fruits` 参数，总果实 = 基础 + 额外，系统通知消息注明额外奖励（如 `"获得 8 个果实（含额外奖励 3 个）"`）
- ✅ **修改** 后端任务列表查询：`goals(...)` select 加入 `fruits_per_task`，前端可直接读取
- ✅ **修改** `tasksApi.approve` 接受可选 `bonusFruits` 参数，`TaskData.goals` 类型加入 `fruits_per_task`
- ✅ **新增** Dashboard 树木卡片目标标签行显示 `🍎 N/次` 果实标签（`fruits_per_task > 0` 时）

**无需数据库迁移**：复用现有 `goals.fruits_per_task` 字段

---

### v2.5 — 果实获取记录页面

在果实商店新增果实获取记录入口，并提供独立的果实获取明细页面，让孩子和家长清晰了解每次任务审核通过后的果实收益历史。

- ✅ **新增** 果实商店余额卡片右侧添加"获取记录"按钮，点击跳转到果实获取记录页面
- ✅ **新增** `src/views/FruitsHistory.tsx` 果实获取记录页面：顶部橙色渐变余额摘要卡片 + 全量获取明细列表（按时间倒序）
- ✅ **新增** 明细列表每条记录展示：目标彩色图标、任务名称、打卡时间（`YYYY-MM-DD HH:mm`）、获得果实数（`+N 🍎`）
- ✅ **新增** 后端接口 `GET /api/v1/children/:childId/fruits-history`，返回所有已审核通过任务的果实获取记录，含权限校验
- ✅ **新增** 前端 `FruitsHistoryItem` 类型定义及 `childrenApi.getFruitsHistory` 方法
- ✅ **修改** `ViewType` 加入 `'fruits-history'`，`App.tsx` 新增对应路由 case

**无需数据库迁移**：复用现有 `tasks` 表和 `goals.fruits_per_task` 字段

---

### v2.6 — 儿童模式

新增儿童模式，家长可一键切换，限制孩子的操作范围，防止误触编辑目标或访问家长管理功能，切换均需账户密码二次确认。

- ✅ **新增** `POST /api/v1/auth/verify-password` 后端接口，使用 `bcrypt.compare` 验证当前登录用户密码（不生成新 token，受 JWT 中间件保护）
- ✅ **新增** `src/components/PasswordConfirmModal.tsx` 通用密码确认弹窗组件（支持显示/隐藏密码、加载状态、错误提示）
- ✅ **新增** `src/components/ChildModeBanner.tsx` 儿童模式顶部提示横幅，含"退出儿童模式"快捷按钮
- ✅ **修改** `src/contexts/AuthContext.tsx`：新增 `isChildMode` 状态（`localStorage` 持久化，key: `child_mode`）、`enableChildMode()` / `disableChildMode()` 方法，登出时自动清除
- ✅ **修改** `src/services/api.ts`：`authApi` 新增 `verifyPassword()` 方法
- ✅ **修改** `src/views/Profile.tsx`：新增儿童模式切换卡片（开启/关闭均弹出密码确认弹窗）；儿童模式下隐藏"家长审核"和"奖品与兑换管理"入口
- ✅ **修改** `src/views/Dashboard.tsx`：儿童模式下隐藏 CTA 横幅、树木卡片编辑按钮、"添加新目标"卡片、FAB 浮动按钮
- ✅ **修改** `src/components/Navigation.tsx`：儿童模式下过滤"家长中心"导航项（移动端底部导航和桌面端侧边栏均生效）
- ✅ **修改** `src/App.tsx`：新增路由守卫 `handleViewChange()`，儿童模式下访问 `parent-control`、`add-goal`、`rewards-management` 时自动重定向至 `forest`；全局渲染 `ChildModeBanner`

**无需数据库迁移**：儿童模式状态仅存储在前端 `localStorage`

---

### v2.7 — 补打卡功能 & 布局偏移修复

新增打卡日期选择功能，支持为过去日期补打卡；同时修复多任务场景下内容向右偏移的布局问题。

- ✅ **新增** 打卡页面日期选择器（胶囊样式，显示"打卡日期：今天/X月X日"），点击弹出原生日期选择器，`max` 限制为今天，不可选择未来日期
- ✅ **新增** 补打卡逻辑：选择历史日期后，打卡按钮文案变为"补打卡 · X月X日"，标题/副标题/状态提示均动态适配
- ✅ **修改** `tasksApi.checkin()` 新增可选第 4 参数 `checkinDate?: string`，传入时使用指定日期 + 当前时分秒构造打卡时间
- ✅ **修改** 后端 `POST /api/v1/tasks` 重复打卡检查：从固定检查"今天"改为检查传入 `checkin_time` 对应的日期，支持对历史日期的补打卡去重
- ✅ **修改** 前端任务映射 key 从 `goal_id` 改为 `日期_goal_id`，支持多日期打卡记录并发管理
- ✅ **修复** 树木选择器容器新增 `max-w-sm`，与其他内容区域宽度约束一致，解决多任务时内容向右偏移的布局问题
- ✅ **修复** 外层容器新增 `min-w-0 w-full`，防止 flex 子元素撑开父容器导致布局异常

**无需数据库迁移**：复用现有 `tasks` 表的 `checkin_time` 字段
