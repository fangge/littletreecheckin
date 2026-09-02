# 腾讯云自建认证迁移设计

## 目标

移除项目对 Supabase Auth 的运行时依赖，使用 Lighthouse 上的 MySQL 8 和 Express API 完成用户注册、登录、会话、密码修改、儿童模式密码确认及密码重置，同时保留现有业务数据与三个已有账号的 UUID 关联。

## 已确认的迁移约束

- 业务数据继续使用 Lighthouse 本机 MySQL 8。
- 三个已有账号保留原 UUID、邮箱、用户名和已验证状态。
- 三个已有账号初始密码均为 `123456`。
- 初始密码只以 bcrypt 哈希形式写入数据库。
- 三个账号首次登录后必须修改密码。
- 现有 SQL 备份没有密码哈希，因此不尝试恢复 Supabase 原密码。
- MySQL 只监听 `127.0.0.1:3306`，浏览器不直接连接数据库。
- 不再向服务器传输 `SUPABASE_URL`、Supabase API key 或其他 Supabase 配置。

## 架构

前端通过同源 `/api/v1/auth/*` 调用 Express。Express 使用 MySQL 查询用户和业务资料，使用 bcrypt 校验密码，使用 JWT access token 识别请求，并使用服务端 session 表支持刷新和退出登录。业务表中的 `profiles.id`、`children.parent_id`、现金兑换的 `parent_id` 和推送订阅的 `user_id` 继续使用原账号 UUID。

认证相关表：

- `auth_users`：账号 UUID、邮箱、密码哈希、验证状态和首次改密标记。
- `auth_sessions`：刷新会话的哈希、过期时间、撤销时间和用户 UUID。
- `password_reset_tokens`：一次性密码设置/重置 token 的哈希、过期时间和使用时间。

## API 行为

- `POST /api/v1/auth/login`：邮箱和密码登录，返回 access token、用户资料和 `must_change_password`。
- `POST /api/v1/auth/register`：创建 `auth_users` 与同 UUID 的 `profiles`，返回 access token。
- `POST /api/v1/auth/refresh`：轮换 refresh session 并返回新的 access token。
- `POST /api/v1/auth/logout`：撤销当前 refresh session。
- `GET /api/v1/auth/me`：使用本地 JWT 返回用户和孩子列表。
- `POST /api/v1/auth/change-password`：校验当前密码后设置新密码，并清除强制改密标记。
- `POST /api/v1/auth/request-password-reset`：创建一次性 token。当前没有邮件服务时，仅供部署管理员生成设置链接；不在响应中返回 token。
- `POST /api/v1/auth/reset-password`：使用一次性 token 设置新密码并撤销旧会话。
- `POST /api/v1/auth/register-children`：改为使用本地认证用户，并在 MySQL 事务中创建档案和孩子。

儿童模式和敏感资料修改继续通过重新验证当前用户密码实现，但验证改为本地认证服务。

## 前端改动

- 删除 `src/lib/supabase.ts` 和 `@supabase/supabase-js` 的运行时使用。
- `AuthContext` 改为维护本地 access token、登录状态和本地退出流程。
- 登录、注册、忘记密码、重置密码、个人资料改密和儿童模式验证全部调用本地 API。
- API 请求层自动注入本地 Bearer token，并在失效时尝试刷新会话。
- 首次登录返回 `must_change_password` 时打开强制修改密码流程。

## 数据迁移

部署脚本在已有业务表导入后创建认证表，并按原 UUID 导入三个账号。导入命令在服务器内部生成 `123456` 的 bcrypt 哈希，不把明文密码写入命令行参数、环境文件、仓库或日志。导入过程校验三个账号的 `profiles` 记录存在；缺失档案时创建最小档案。

## 测试与验收

- 认证单元测试覆盖密码哈希校验、错误密码、强制改密、session 撤销、过期 token 和一次性 reset token。
- API 测试覆盖注册、登录、`/me`、刷新、退出、改密和重置密码。
- 前端构建和类型检查必须通过。
- 服务器验证 MySQL 认证表、三个账号 UUID、业务数据关联、健康检查和 Nginx/API 访问。
- 不启用 Supabase 环境变量时，服务器和前端仍能启动并完成本地认证流程。

## 安全边界

`123456` 仅作为迁移初始密码。首次登录必须改密；生产环境不能继续使用该密码。密码重置 token 只保存哈希，使用一次后立即失效。access token 和 refresh session 均设置有限有效期，退出登录撤销服务端 session。
