# 快速开始

`tencent-cloud` 分支使用已有 Lighthouse 上的 MySQL 8 保存业务和认证数据。部署和公网访问请参阅 [`腾讯云 Lighthouse 部署指南`](deployment.md)。

## 1. 安装依赖

```bash
pnpm install
pnpm --prefix server install
```

## 2. 配置环境变量

```bash
cp .env.tencent.example .env.local
chmod 600 .env.local
```

编辑 `.env.local`，至少填写：

```dotenv
DATABASE_URL=mysql://<db-user>:<db-password>@127.0.0.1:3306/<database>
DATABASE_POOL_MAX=10
JWT_SECRET=<long-random-secret>
BCRYPT_ROUNDS=12
ACCESS_TOKEN_TTL=15m
NODE_ENV=development
PORT=3001
VITE_API_URL=
```

`JWT_SECRET` 只用于后端签发和验证 access token，不要提交到 Git。浏览器不会直接连接 MySQL。

## 3. 初始化数据库

只对空库执行一次。脚本会创建 MySQL schema，再转换并导入业务 SQL 备份；`push_subscriptions` 为空表，不需要导入数据。

```bash
pnpm db:import:tencent /path/to/littletreesql_backup
```

如果需要迁移三个既有账号，在服务器终端交互执行账号导入脚本，输入用户确认的初始密码：

```bash
pnpm auth:import:tencent
```

账号首次登录后会被强制要求修改密码。

## 4. 启动开发服务器

```bash
# 终端 1
pnpm dev

# 终端 2
pnpm server:dev
```

前端地址为 `http://localhost:3000`，后端健康检查为 `http://localhost:3001/health`。Vite 会把 `/api` 请求代理到后端。

## 可用脚本

```bash
pnpm dev                # 前端开发服务器
pnpm build              # 前端生产构建
pnpm server:dev         # 后端热重载
pnpm server:build       # 后端 TypeScript 构建
pnpm server:start       # 后端生产服务器
pnpm db:import:tencent  # 导入业务备份
pnpm auth:import:tencent # 导入三个既有账号
pnpm lint               # 前端类型检查
```
