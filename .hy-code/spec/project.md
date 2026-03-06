# 成就丛林 (Achievement Jungle) — 项目上下文

## 项目简介

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

## 核心业务概念

- **孩子（Child）**：家长账号下可管理多个孩子
- **目标（Goal）**：家长为孩子设置的习惯目标（如"每天阅读20分钟"），包含持续天数、每日时长、每日次数等配置
- **树木（Tree）**：每个目标对应一棵虚拟树，随打卡进度成长
- **任务（Task）**：孩子每次打卡生成一条任务记录，状态为 pending/approved/rejected
- **果实（Fruit）**：审核通过后奖励的虚拟货币，可在商店兑换
- **勋章（Medal）**：根据累计任务、连续打卡等条件自动解锁

## 目录结构约定

```
src/
  views/        # 页面级组件（Dashboard、CheckIn、GoalSetting 等）
  components/   # 可复用 UI 组件
  services/     # API 调用层（api.ts）
  contexts/     # React Context（AuthContext）
  types.ts      # 前端类型定义

server/src/
  routes/       # Express 路由（按资源分文件）
  services/     # 业务逻辑服务
  middleware/   # 认证、错误处理中间件
```

## 编码规范

- 使用 TailwindCSS 类名进行样式设计，避免内联 CSS
- 事件处理函数以 `handle` 前缀命名（如 `handleClick`）
- 使用 `const` 箭头函数代替 `function` 声明
- 时区统一使用 UTC+8（Asia/Shanghai）
- API 路径前缀：`/api/v1/`

## 数据库关键表

- `users`：家长账号
- `children`：孩子信息（关联 user）
- `goals`：习惯目标（关联 child）
- `trees`：虚拟树木（关联 goal）
- `tasks`：打卡记录（关联 goal、child），含 `checkin_time`、`status` 字段
- `medals`：勋章定义
- `child_medals`：孩子已解锁勋章
- `rewards`：家长设置的奖励
- `reward_redemptions`：兑换记录
