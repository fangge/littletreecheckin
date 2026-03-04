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
