# 快速开始

## 1. 克隆并安装依赖

```bash
# 安装前端依赖
pnpm install

# 安装后端依赖
pnpm --prefix server install
```

---

## 2. 配置 Supabase

### 2.1 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)，点击 **Start your project** 注册/登录账号（支持 GitHub 登录）

2. 登录后点击右上角 **New project**

3. 填写项目信息：
   - **Organization**：选择你的组织（默认为个人账号）
   - **Name**：填写项目名称，例如 `achievement-jungle`
   - **Database Password**：设置一个强密码（**务必保存好**，后续可能用到）
   - **Region**：选择离你最近的区域，推荐 `Southeast Asia (Singapore)`
   - **Pricing Plan**：选择 `Free`（免费套餐足够开发使用）

4. 点击 **Create new project**，等待约 1-2 分钟项目初始化完成

### 2.2 获取 API 配置

项目创建完成后，进入项目控制台：

1. 点击左侧菜单 **Project Settings**（齿轮图标）→ **API**

2. 找到以下三个值并复制：

   | 配置项 | 位置 | 用途 |
   |--------|------|------|
   | **Project URL** | `Project URL` 区域 | `SUPABASE_URL` |
   | **anon public** | `Project API keys` → `anon public` | `SUPABASE_ANON_KEY` |
   | **service_role secret** | `Project API keys` → `service_role` → 点击眼睛图标显示 | `SUPABASE_SERVICE_KEY` |

   > ⚠️ **安全提示**：`service_role` key 拥有绕过所有 RLS 策略的权限，**只能在后端服务中使用**，绝对不能暴露在前端代码或公开仓库中。

### 2.3 配置环境变量

```bash
# 推荐：使用 .env.local（不会被 git 追踪，优先级更高）
cp .env.example .env.local

# 或者使用 .env
cp .env.example .env
```

> 💡 后端同时支持 `.env.local`（优先）和 `.env`，推荐使用 `.env.local` 存放敏感配置。

编辑 `.env.local` 文件，将上一步获取的值填入：

```env
# Supabase 配置
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co        # Project URL
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...   # anon public key
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6... # service_role key

# JWT 配置（自定义随机字符串，至少 32 位）
JWT_SECRET=my-super-secret-key-change-this-in-production-32chars
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development
```

> 💡 **生成 JWT_SECRET**：运行 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成安全随机密钥

---

## 3. 初始化数据库

### 3.1 执行建表脚本

1. 在 Supabase 控制台左侧菜单点击 **SQL Editor**

2. 点击右上角 **New query**

3. 复制 [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql) 的全部内容，粘贴到编辑器中

4. 点击右下角 **Run**（或按 `Ctrl/Cmd + Enter`）执行

5. 看到 `Success. No rows returned` 表示执行成功

### 3.2 执行种子数据脚本

1. 再次点击 **New query**

2. 复制 [`supabase/migrations/002_seed_data.sql`](../supabase/migrations/002_seed_data.sql) 的全部内容，粘贴到编辑器中

3. 点击 **Run** 执行

4. 执行成功后，可在左侧 **Table Editor** 中查看 `medals` 和 `rewards` 表，确认数据已插入（9 枚勋章 + 6 个奖励）

### 3.3 验证表结构

执行完成后，在 **Table Editor** 中应能看到以下 10 张表：

```
users · children · goals · trees · tasks
medals · child_medals · rewards · reward_redemptions · messages
```

### 3.4 配置 Storage（可选，用于任务打卡图片上传）

如需支持图片上传功能：

1. 左侧菜单点击 **Storage**

2. 点击 **New bucket**，填写：
   - **Name**：`task-images`
   - **Public bucket**：开启（允许公开访问图片 URL）

3. 点击 **Save** 创建

---

## 4. 启动开发服务器

```bash
# 终端 1：启动前端（http://localhost:3000）
pnpm dev

# 终端 2：启动后端（http://localhost:3001）
pnpm server:dev
```

健康检查：`GET http://localhost:3001/health`

---

## 可用脚本

```bash
pnpm dev              # 启动前端开发服务器（端口 3000）
pnpm build            # 构建前端生产包（输出到 dist/）
pnpm server:dev       # 启动后端开发服务器（端口 3001，热重载）
pnpm server:start     # 启动后端生产服务器