# 线上部署

本项目使用 **Vercel Serverless Functions** 方案，前端静态文件和后端 API 全部部署在 Vercel，**只需要 Vercel + Supabase 两个平台**，无需额外的后端服务器。

| 服务 | 平台 | 说明 |
|------|------|------|
| 前端 + 后端 API | [Vercel](https://vercel.com) | 前端静态文件 + `/api/*` 由 Serverless Function 处理 |
| 数据库 | [Supabase](https://supabase.com) | PostgreSQL，免费套餐 |

---

## 工作原理

```
Vercel 部署后：
  前端请求 /api/v1/auth/login
       ↓
  Vercel 路由匹配 /api/(.*) → api/[...path].ts（Serverless Function）
       ↓
  Express 应用处理请求 → 调用 Supabase 数据库
```

本地开发时，Vite 代理将 `/api` 请求转发到 `localhost:3001`，行为与生产环境完全一致。

---

## 部署步骤

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "feat: add backend with Supabase integration"
git push origin main
```

### 2. 在 Vercel 导入仓库

1. 访问 [vercel.com](https://vercel.com)，点击 **Add New Project**
2. 选择你的 GitHub 仓库，点击 **Import**
3. Vercel 会自动读取 [`vercel.json`](../vercel.json) 配置，无需手动设置构建命令

### 3. 配置环境变量

在 Vercel 项目设置 → **Environment Variables** 中添加以下变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key（仅后端使用） | `eyJhbGci...` |
| `JWT_SECRET` | JWT 签名密钥（至少 32 位随机字符串） | `a1b2c3d4...` |
| `JWT_EXPIRES_IN` | JWT 有效期 | `7d` |
| `NODE_ENV` | 运行环境 | `production` |

> ⚠️ **无需设置 `VITE_API_URL`**：前端使用相对路径 `/api/...`，Vercel 自动路由到 Serverless Function。

### 4. 部署

点击 **Deploy**，等待约 1-2 分钟，前端和后端 API 同时上线。

---

## 安全注意事项

- **`JWT_SECRET`** 使用强随机密钥：
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- **`SUPABASE_SERVICE_KEY`** 只在 Vercel 环境变量中设置，**绝对不要**提交到代码仓库

- 确认 `.gitignore` 中包含 `.env`、`.env.local`，防止密钥泄露

---

## 本地开发与生产环境对比

| 项目 | 本地开发 | 生产（Vercel） |
|------|----------|----------------|
| 前端服务 | Vite dev server（端口 3000） | Vercel CDN 静态托管 |
| 后端服务 | Express server（端口 3001） | Vercel Serverless Function |
| API 路由 | Vite 代理 `/api` → `localhost:3001` | Vercel 路由 `/api/*` → `api/[...path].ts` |
| 环境变量 | `.env.local` 文件 | Vercel 项目环境变量 |
| 数据库 | 同一个 Supabase 项目（建议用独立测试项目） | 生产 Supabase 项目 |

---

## vercel.json 配置说明

```json
{
  "buildCommand": "pnpm build && pnpm --prefix server build",
  "outputDirectory": "dist",
  "functions": {
    "api/[...path].ts": {
      "memory": 512,
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/[...path]" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- `buildCommand`：同时构建前端（Vite）和后端（TypeScript 编译）
- `outputDirectory`：前端静态文件输出目录
- `functions`：声明 Serverless Function 入口及资源限制
- `rewrites`：`/api/*` 路由到 Function，其余路由到前端 SPA 入口