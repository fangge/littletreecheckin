# 腾讯云 Lighthouse 迁移

`tencent-cloud` 分支将项目运行在已有的腾讯云 Lighthouse 上：Vite 产物由 Nginx 托管，Express API 由 PM2 常驻运行，业务数据和认证数据保存到同机 MySQL 8。

## 方案边界

- Lighthouse：Node.js、Express、PM2、Nginx 和 MySQL 8 在同一台服务器上运行。
- MySQL：只监听 `127.0.0.1:3306`，应用使用专用数据库账号，不使用 root。
- 前端：Nginx 默认监听 `8081` 托管 `dist`，`/api/*` 反向代理到 `127.0.0.1:3002`；两个端口都可通过部署环境变量覆盖。
- 认证：Express 使用 bcrypt 校验密码、JWT 识别请求、MySQL session 表管理刷新和退出。
- 文件：当前部署仍按本地文件处理；正式生产需要另行配置 COS 并迁移历史文件。

## 初始化 MySQL

在 Lighthouse 上安装并启动 MySQL 8：

```bash
sudo apt-get update
sudo apt-get install -y mysql-server
sudo systemctl enable --now mysql
mysql --version
```

使用 MySQL 管理账号创建业务库和专用用户。密码只在服务器内输入或生成，不要写进 Git、命令输出或聊天记录：

```sql
CREATE DATABASE littletreecheckin
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'littletreecheckin'@'127.0.0.1' IDENTIFIED BY '<strong-password>';
GRANT ALL PRIVILEGES ON littletreecheckin.* TO 'littletreecheckin'@'127.0.0.1';
FLUSH PRIVILEGES;
```

确认 MySQL 没有监听公网地址，并且 Lighthouse 云防火墙没有开放 `3306`：

```bash
sudo ss -lntp | grep ':3306'
sudo grep -R "^bind-address" /etc/mysql /etc/mysql/mysql.conf.d 2>/dev/null
```

## 配置环境变量

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

部署脚本默认使用 `LITTLETREE_WEB_PORT=8081` 和 `LITTLETREE_API_PORT=3002`，以便不占用同机已有应用的 80/8080/3001 端口。

生产环境的 `JWT_SECRET` 应在服务器内生成，不能提交仓库。HTTP 临时测试可以运行，但正式环境必须使用 HTTPS。

## 导入业务备份

将项目上传到 `/opt/littletreecheckin`，将 SQL 备份目录放到 `/opt/littletreecheckin/db-backup`。不要上传本地 `node_modules`、`.env.local` 或其他密钥文件。

```bash
cd /opt/littletreecheckin
pnpm install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
chmod 600 .env.local
pnpm db:import:tencent /opt/littletreecheckin/db-backup
```

导入器会先执行 [`server/db/schema.sql`](../server/db/schema.sql)，再按外键顺序转换并导入 12 个业务备份文件。`push_subscriptions` 是空表，Schema 会创建它但不会导入数据。重复导入同一批备份会产生主键冲突，初始化只执行一次。

## 导入三个既有账号

业务备份没有密码哈希，因此迁移账号使用用户确认的初始密码，并在首次登录后强制修改。导入脚本不会把密码写入仓库或日志，建议在服务器终端交互输入：

```bash
cd /opt/littletreecheckin
pnpm auth:import:tencent
```

脚本保留三个账号的原 UUID、邮箱、用户名和 `profiles` 关联：

| UUID | 邮箱 | 用户名 |
|------|------|--------|
| `31e8abe1-e962-4a2d-8ef8-7a76bf3d59fa` | `19630642@qq.com` | `Jo` |
| `6ea7dfb0-87d0-4b43-b3a8-1657a7de6af2` | `420249001@qq.com` | `vitionxp` |
| `bae3f9e4-c67f-4ee5-92db-5d32b622c3b3` | `fangge-sun@163.com` | `mrfangge` |

如果重新运行导入脚本，已有账号的密码不会被覆盖；它只补齐缺失账号和档案。

## 部署服务

```bash
cd /opt/littletreecheckin
LITTLETREE_ROOT=/opt/littletreecheckin deploy/deploy.sh
```

部署脚本会检查 MySQL、Node、pnpm、PM2 和 Nginx，运行类型检查、测试及构建，然后更新 Nginx 和 PM2。首次导入时可显式增加 `IMPORT_BACKUP=true IMPORT_AUTH_USERS=true`，已导入的数据库不再传入这两个参数。

验证：

```bash
curl -fsS http://127.0.0.1:3002/health
curl -fsSI http://127.0.0.1/
pm2 list
sudo nginx -t
```

浏览器访问 Lighthouse 公网 IP，使用三个迁移账号和初始密码登录，确认弹出强制改密窗口；修改密码后刷新页面，验证 `/api/v1/auth/me` 能返回对应孩子数据。

## 正式 HTTPS

域名解析、备案和证书准备完成后，将证书配置到 Nginx，并把 `server_name _;` 改为实际域名。正式环境只开放 `80/443`，Express 和 MySQL 端口只监听本机。确认 HTTPS 登录成功后，再按需启用 COS、支付和其他外部服务。

## 旧 Vercel 部署

根目录的 [`vercel.json`](../vercel.json) 和 [`api/[...path].ts`](../api/%5B...path%5D.ts) 暂时保留，便于回滚和旧环境维护。腾讯云分支的正式入口是 Lighthouse 的 Nginx + PM2，不需要部署 Vercel Function。
