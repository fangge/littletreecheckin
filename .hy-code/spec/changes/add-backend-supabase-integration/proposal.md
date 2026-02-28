# 提案：后端服务与 Supabase 数据库集成

## 为什么

当前"成就丛林"应用是纯前端实现，所有数据均为硬编码的 mock 数据（`src/constants.ts`），无法持久化存储，也无法支持多用户、多设备访问。需要构建完整的后端服务和数据库层，使应用具备真实的用户认证、数据持久化和业务逻辑处理能力。

## 变更内容

- **新增** Express.js 后端服务（`server/` 目录），提供 RESTful API
- **新增** Supabase 数据库表结构（10 张核心业务表）
- **新增** JWT 用户认证系统（家长注册/登录）
- **新增** 孩子信息管理 API
- **新增** 树木与目标管理 API（森林系统）
- **新增** 任务打卡与审核 API
- **新增** 勋章成就系统 API
- **新增** 奖励商店与果实兑换 API
- **新增** 家长与孩子消息互动 API
- **修改** 前端：将 mock 数据替换为真实 API 调用，添加 API 服务层

## 影响范围

- 影响的能力模块：auth（认证）、children-management（孩子管理）、forest-trees（森林树木）、task-checkin（任务打卡）、rewards-store（奖励商店）、medals（勋章系统）、messages（消息系统）
- 影响的代码：
  - 新增 `server/` 目录（后端服务）
  - 新增 `supabase/migrations/` 目录（数据库迁移）
  - 修改 `src/` 下所有视图组件（替换 mock 数据）
  - 新增 `src/services/` 目录（API 服务层）
  - 新增 `src/contexts/` 目录（全局状态管理）
- **无破坏性变更**（前端 UI 保持不变，仅数据来源改变）

## 调研文档

- 调研文档路径：`../../../Library/Application Support/Code/User/globalStorage/huya-fed.huya-cline/tasks/26ff0976-2655-4087-b347-03b1cecb8d45/成就丛林前后端一体化实现方案.md`
- 前端数据模型参考：`src/types.ts`
- 前端 mock 数据参考：`src/constants.ts`
- 现有依赖参考：`package.json`（已包含 express、better-sqlite3，需替换为 Supabase）

## 参考资料

- [Supabase 官方文档](https://supabase.com/docs)
- [Express.js 官方文档](https://expressjs.com/)
- 前端视图文件：`src/views/` 目录下所有组件