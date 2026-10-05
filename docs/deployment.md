# 腾讯云 Lighthouse 部署

`tencent-cloud` 分支面向中国大陆访问场景：Vite 前端由 Lighthouse 上的 Nginx 托管，Express API 由 PM2 常驻运行，业务数据和认证数据写入已有 Lighthouse 上的 MySQL 8。

| 服务 | 平台 | 说明 |
|------|------|------|
| 前端 + API 入口 | 腾讯云 Lighthouse | Nginx 托管 `dist`，`/api/*` 反向代理到 Express |
| API 服务 | Lighthouse PM2 | Express 默认监听 `127.0.0.1:3002`，可用 `LITTLETREE_API_PORT` 覆盖 |
| 业务数据库 | Lighthouse MySQL 8 | 同机运行，只监听 `127.0.0.1:3306` |
| 认证 | Express + MySQL | bcrypt 密码校验、JWT access token、可轮换 refresh session |

## 运行架构

```text
浏览器 → Nginx → 静态 dist
              └→ /api/* → PM2/Express → MySQL 8
                                  └→ MySQL auth_users/auth_sessions
```

## 前置条件

- 已有 Lighthouse 实例，建议起步规格为 `2C4G`、系统盘至少 `60GB`。
- 已在 Lighthouse 安装 MySQL 8，并创建空业务库和专用账号。
- 已准备随机生成的 `JWT_SECRET`，只写入服务器环境变量，不提交 Git。
- 正式对外服务前准备已备案域名和 HTTPS 证书。没有 HTTPS 时只做测试，不启用生产支付。

## 部署步骤

### 1. 准备环境变量

在服务器项目根目录创建 `.env.local`，参考 [`.env.tencent.example`](../.env.tencent.example)，并限制权限：

```bash
chmod 600 /opt/littletreecheckin/.env.local
```

至少需要配置：

```dotenv
DATABASE_URL=mysql://<db-user>:<db-password>@127.0.0.1:3306/<database>
DATABASE_POOL_MAX=10
JWT_SECRET=<long-random-secret>
BCRYPT_ROUNDS=12
ACCESS_TOKEN_TTL=15m
NODE_ENV=production
PORT=3001
VITE_API_URL=
```

部署脚本默认使用 Web `8081`、API `3002`，用于与同机已有服务共存；如端口空闲，也可以在执行脚本时覆盖：

```bash
LITTLETREE_WEB_PORT=8081 LITTLETREE_API_PORT=3002 \
  LITTLETREE_ROOT=/opt/littletreecheckin deploy/deploy.sh
```

### 2. 上传代码和备份

将项目上传到 `/opt/littletreecheckin`，将 SQL 备份目录放到 `/opt/littletreecheckin/db-backup`。不要上传本地 `node_modules`、`.env.local` 或其他密钥文件。

### 3. 初始化业务数据库

只对空库执行一次。脚本会先创建 MySQL 8 业务表，再转换并按外键顺序导入 `profiles`、孩子、目标、树木、任务、勋章、奖品、兑换和消息数据。`push_subscriptions` 保留空表，不导入数据。

```bash
cd /opt/littletreecheckin
pnpm install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
chmod 600 .env.local
pnpm db:import:tencent /opt/littletreecheckin/db-backup
pnpm auth:import:tencent
```

重复导入同一批备份会产生主键冲突。导入失败时事务会回滚，修复连接或备份后再重试。

### 4. 构建并启动

```bash
cd /opt/littletreecheckin
LITTLETREE_ROOT=/opt/littletreecheckin deploy/deploy.sh
```

首次部署脚本会运行前端类型检查、后端测试、前后端构建，然后安装 Nginx 配置并启动 PM2。后续部署不再传入导入参数：

```bash
LITTLETREE_ROOT=/opt/littletreecheckin deploy/deploy.sh
```

### 5. 验证服务

```bash
curl -fsS http://127.0.0.1:3002/health
curl -fsSI http://127.0.0.1:8081/
pm2 list
nginx -t
```

浏览器访问 Lighthouse 公网 IP，确认首页能打开；再使用三个迁移账号的初始密码登录，验证首次改密和 `/api/v1/auth/me` 返回的孩子数据。新注册账号会在 MySQL 中同时创建 `auth_users` 和 `profiles` 记录。

## 正式 HTTPS

域名解析和备案完成后，将证书配置到 Nginx，并把 `server_name _;` 改为实际域名。正式环境只开放 `80/443`，Express 和 MySQL 端口只监听本机。确认 HTTPS 登录成功后，再将 `VITE_API_URL` 保持为空以使用同源 API，并按需启用 COS、支付和其他外部服务。

## 旧 Vercel 部署

根目录的 [`vercel.json`](../vercel.json) 和 [`api/[...path].ts`](../api/%5B...path%5D.ts) 暂时保留，便于回滚和旧环境维护。腾讯云分支的正式入口是 Lighthouse 的 Nginx + PM2，不需要部署 Vercel Function。
