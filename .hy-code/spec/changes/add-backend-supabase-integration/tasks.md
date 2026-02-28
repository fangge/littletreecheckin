# 实施任务清单

## 0. 准备工作

- [ ] 0.1 读取调研文档 `../../../Library/Application Support/Code/User/globalStorage/huya-fed.huya-cline/tasks/26ff0976-2655-4087-b347-03b1cecb8d45/成就丛林前后端一体化实现方案.md` 以了解任务分析和调研结果
- [ ] 0.2 在 Supabase 控制台创建新项目，获取 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_KEY`
- [ ] 0.3 创建 `.env` 文件（基于 `.env.example`），填入 Supabase 配置和 JWT_SECRET

## 1. 数据库初始化

- [ ] 1.1 创建 `supabase/migrations/001_initial_schema.sql`，包含所有 10 张业务表的建表语句
- [ ] 1.2 在 SQL 中添加外键约束、索引（parent_id、child_id、goal_id 等高频查询字段）
- [ ] 1.3 创建 `supabase/migrations/002_seed_data.sql`，预置 9 枚勋章定义和初始奖励数据
- [ ] 1.4 在 Supabase 控制台执行迁移脚本，验证表结构创建成功
- [ ] 1.5 配置 Supabase Storage bucket（用于任务打卡图片存储）

## 2. 后端基础架构

- [ ] 2.1 创建 `server/package.json`，添加依赖：`@supabase/supabase-js`、`express`、`jsonwebtoken`、`bcryptjs`、`cors`、`dotenv`、`multer`
- [ ] 2.2 创建 `server/tsconfig.json`，配置 TypeScript 编译选项
- [ ] 2.3 创建 `server/src/config/supabase.ts`，初始化 Supabase 客户端（使用 service key）
- [ ] 2.4 创建 `server/src/index.ts`，配置 Express 应用、CORS、JSON 解析、路由挂载
- [ ] 2.5 创建 `server/src/middleware/auth.ts`，实现 JWT 验证中间件
- [ ] 2.6 创建 `server/src/middleware/errorHandler.ts`，实现统一错误处理中间件
- [ ] 2.7 在根 `package.json` 中添加 `server:dev` 脚本（`tsx watch server/src/index.ts`）

## 3. 认证 API（auth）

- [ ] 3.1 创建 `server/src/routes/auth.ts`，定义认证路由
- [ ] 3.2 实现 `POST /api/v1/auth/register`：验证参数、bcrypt 加密密码、创建 users 记录、创建 children 记录、返回 JWT
- [ ] 3.3 实现 `POST /api/v1/auth/login`：查询用户、bcrypt 比对密码、返回 JWT 和用户信息
- [ ] 3.4 实现 `GET /api/v1/auth/me`：解析 JWT、返回用户信息和孩子列表
- [ ] 3.5 测试认证 API（使用 curl 或 Postman）

## 4. 孩子管理 API（children-management）

- [ ] 4.1 创建 `server/src/routes/children.ts`，定义孩子管理路由
- [ ] 4.2 实现 `GET /api/v1/users/:userId/children`：查询家长的孩子列表
- [ ] 4.3 实现 `POST /api/v1/users/:userId/children`：创建孩子记录
- [ ] 4.4 实现 `PUT /api/v1/users/:userId/children/:childId`：更新孩子信息
- [ ] 4.5 实现 `DELETE /api/v1/users/:userId/children/:childId`：软删除孩子
- [ ] 4.6 实现 `GET /api/v1/children/:childId/stats`：计算并返回统计数据（森林健康度、任务完成数等）

## 5. 森林树木 API（forest-trees）

- [ ] 5.1 创建 `server/src/routes/trees.ts`，定义树木路由
- [ ] 5.2 实现 `GET /api/v1/children/:childId/trees`：查询孩子的树木列表，支持 status 筛选
- [ ] 5.3 实现 `POST /api/v1/children/:childId/goals`：创建目标，同时自动创建关联树木记录
- [ ] 5.4 实现 `PUT /api/v1/trees/:treeId`：更新树木信息

## 6. 任务打卡 API（task-checkin）

- [ ] 6.1 创建 `server/src/routes/tasks.ts`，定义任务路由
- [ ] 6.2 实现 `GET /api/v1/children/:childId/tasks`：查询任务列表，支持 status 筛选
- [ ] 6.3 实现 `POST /api/v1/tasks`：创建任务打卡记录，检查当日重复打卡
- [ ] 6.4 实现 `PUT /api/v1/tasks/:taskId/approve`：审核通过逻辑（事务：更新任务状态 + 增加果实 + 更新树木进度 + 检查勋章）
- [ ] 6.5 实现 `PUT /api/v1/tasks/:taskId/reject`：审核拒绝逻辑
- [ ] 6.6 配置 multer 中间件，实现图片上传到 Supabase Storage（`POST /api/v1/upload/image`）

## 7. 勋章系统 API（medals）

- [ ] 7.1 创建 `server/src/routes/medals.ts`，定义勋章路由
- [ ] 7.2 实现 `GET /api/v1/children/:childId/medals`：查询孩子勋章列表（合并已解锁和未解锁）
- [ ] 7.3 实现 `server/src/services/medalService.ts`：勋章解锁检查逻辑（在任务审核通过后调用）

## 8. 奖励商店 API（rewards-store）

- [ ] 8.1 创建 `server/src/routes/rewards.ts`，定义奖励路由
- [ ] 8.2 实现 `GET /api/v1/rewards`：查询奖励列表，支持 category 筛选
- [ ] 8.3 实现 `GET /api/v1/children/:childId/fruits`：查询果实余额
- [ ] 8.4 实现 `POST /api/v1/rewards/:rewardId/redeem`：兑换奖励（事务：检查余额 + 扣除果实 + 创建兑换记录）

## 9. 消息系统 API（messages）

- [ ] 9.1 创建 `server/src/routes/messages.ts`，定义消息路由
- [ ] 9.2 实现 `GET /api/v1/children/:childId/messages`：查询消息列表，支持分页
- [ ] 9.3 实现 `POST /api/v1/messages`：发送消息
- [ ] 9.4 实现 `PUT /api/v1/messages/:messageId/read`：标记消息已读
- [ ] 9.5 实现 `GET /api/v1/children/:childId/messages/unread-count`：查询未读消息数

## 10. 前端 API 服务层

- [ ] 10.1 安装前端依赖：`pnpm add axios`（或使用原生 fetch）
- [ ] 10.2 创建 `src/services/api.ts`：封装所有 API 调用，统一处理 token 注入和错误响应
- [ ] 10.3 创建 `src/contexts/AuthContext.tsx`：管理登录状态、用户信息、token 存储（localStorage）
- [ ] 10.4 创建 `src/hooks/useApi.ts`：封装 API 调用的 loading/error 状态管理

## 11. 前端视图集成

- [ ] 11.1 修改 `src/views/Login.tsx`：接入 `POST /api/v1/auth/login`，成功后存储 token
- [ ] 11.2 修改 `src/views/Register.tsx`：接入 `POST /api/v1/auth/register`，支持动态添加孩子
- [ ] 11.3 修改 `src/views/Dashboard.tsx`：替换 TREES mock 数据，调用 `/api/v1/children/:childId/trees`
- [ ] 11.4 修改 `src/views/CheckIn.tsx`：替换 TASKS mock 数据，调用任务相关 API
- [ ] 11.5 修改 `src/views/GoalSetting.tsx`：接入 `POST /api/v1/children/:childId/goals`
- [ ] 11.6 修改 `src/views/ParentControl.tsx`：接入任务审核 API（approve/reject）
- [ ] 11.7 修改 `src/views/Store.tsx`：替换 REWARDS mock 数据，接入兑换 API
- [ ] 11.8 修改 `src/views/Medals.tsx`：替换 MEDALS mock 数据，调用勋章 API
- [ ] 11.9 修改 `src/views/Messages.tsx`：替换 MESSAGES mock 数据，调用消息 API
- [ ] 11.10 修改 `src/App.tsx`：添加路由守卫（未登录时跳转到 login 页）

## 12. 测试与验证

- [ ] 12.1 端到端测试：注册 → 添加孩子 → 创建目标 → 打卡 → 审核 → 查看树木成长
- [ ] 12.2 验证果实余额正确增减
- [ ] 12.3 验证勋章自动解锁逻辑
- [ ] 12.4 验证奖励兑换和余额扣除
- [ ] 12.5 验证消息发送和已读标记
- [ ] 12.6 验证 JWT 过期后前端正确跳转登录页