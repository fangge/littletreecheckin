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
