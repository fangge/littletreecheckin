# 成就丛林 (Achievement Jungle) — AI 快速接入指南

## 项目简介
游戏化儿童习惯养成 PWA。家长设置任务 → 孩子打卡 → 家长审核 → 树木成长 + 果实奖励 → 商店兑换。

## 技术栈
- **前端**: React 19 + TypeScript + Vite 6 + TailwindCSS v4 + React Router v7
- **后端**: Node.js + Express 4（`server/` 目录）
- **数据库/认证**: Supabase (PostgreSQL + Supabase Auth)
- **部署**: Vercel Serverless（`api/[...path].ts` 代理后端）
- **包管理**: pnpm

## 目录结构
```
src/views/        # 页面组件（路由级懒加载）
src/components/   # 通用组件
src/contexts/     # AuthContext / ThemeContext / PendingTasksContext
src/services/api.ts  # 统一 API 调用层（自动携带 Supabase token）
src/lib/supabase.ts  # Supabase 客户端
server/src/routes/   # Express 路由（auth/tasks/goals/medals/rewards/messages）
supabase/migrations/ # 数据库迁移文件
```

## 核心路由
| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | CheckIn | 每日打卡（首页） |
| `/forest` | Dashboard | 森林主页 + 树木成长 |
| `/medals` | Medals | 勋章系统 |
| `/store` | Store | 果实商店 |
| `/parent-control` | ParentControl | 家长审核 |
| `/add-goal` | GoalSetting | 目标设置 |

## 开发命令
```bash
pnpm start          # 同时启动前端(3000)和后端
pnpm dev            # 仅前端
pnpm server:dev     # 仅后端
pnpm build          # 构建生产版本
pnpm lint           # TypeScript 类型检查
```

## 环境变量（参考 `.env.example`）
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — 前端 Supabase 连接
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — 后端服务端密钥
- `VITE_API_URL` — API 基础路径（本地留空，生产填 Vercel 域名）

## 关键约定
- 所有 API 请求通过 `src/services/api.ts` 的 `request()` 函数，自动注入 Bearer token
- 认证状态由 `AuthContext` 管理，`isParent` 字段区分家长/孩子角色
- 儿童模式（`childMode`）限制访问管理功能，切换需密码确认
- 勋章解锁逻辑在 `server/src/services/medalService.ts`
- 数据库 schema 见 `supabase/migrations/` 和 `docs/database.md`
