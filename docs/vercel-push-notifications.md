# Vercel 推送通知部署指南

## ⚠️ 重要限制

### Vercel Serverless 函数不支持 Cron 定时任务

**问题**：Vercel 的 Serverless 函数是按需执行的，不会持续运行，因此 `node-cron` 等定时任务库**无法在 Vercel 上工作**。

**原因**：
- Serverless 函数在请求到来时才启动
- 请求处理完成后函数会被销毁
- 没有持续运行的进程来执行定时任务

## 🔧 解决方案

### 方案 1：使用 Vercel Cron Jobs（推荐）

Vercel 提供了原生的 Cron Jobs 功能，需要在 `vercel.json` 中配置。

#### 步骤 1：修改 `vercel.json`

```json
{
  "version": 2,
  "crons": [
    {
      "path": "/api/v1/push/cron/morning",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/v1/push/cron/noon",
      "schedule": "0 12 * * *"
    },
    {
      "path": "/api/v1/push/cron/evening",
      "schedule": "30 21 * * *"
    }
  ]
}
```

**注意**：
- Vercel Cron Jobs 使用 UTC 时区
- 中国时间 (UTC+8) 需要减去 8 小时
- 早上 8:00 (UTC+8) = 0:00 (UTC) → `0 0 * * *`
- 中午 12:00 (UTC+8) = 4:00 (UTC) → `0 4 * * *`
- 晚上 21:30 (UTC+8) = 13:30 (UTC) → `30 13 * * *`

#### 步骤 2：创建 Cron 端点

在 [`server/src/routes/push.ts`](server/src/routes/push.ts) 中添加：

```typescript
/**
 * Vercel Cron Job 端点 - 早晨推送
 */
router.get('/cron/morning', async (_req: Request, res: Response): Promise<void> => {
  try {
    // 验证请求来自 Vercel Cron
    const authHeader = _req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    console.log('[Cron] 触发早晨推送 (8:00 中国时间)');
    await sendDailyCheckinSummary();
    
    res.json({ success: true, message: '早晨推送已触发' });
  } catch (error) {
    console.error('[Cron] 早晨推送失败:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Vercel Cron Job 端点 - 午间推送
 */
router.get('/cron/noon', async (_req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = _req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    console.log('[Cron] 触发午间推送 (12:00 中国时间)');
    await sendDailyCheckinSummary();
    
    res.json({ success: true, message: '午间推送已触发' });
  } catch (error) {
    console.error('[Cron] 午间推送失败:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Vercel Cron Job 端点 - 晚间推送
 */
router.get('/cron/evening', async (_req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = _req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    console.log('[Cron] 触发晚间推送 (21:30 中国时间)');
    await sendDailyCheckinSummary();
    
    res.json({ success: true, message: '晚间推送已触发' });
  } catch (error) {
    console.error('[Cron] 晚间推送失败:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

#### 步骤 3：配置环境变量

在 Vercel Dashboard 中添加：
- `CRON_SECRET`: 一个随机字符串，用于验证 Cron 请求

#### 步骤 4：部署

```bash
git add .
git commit -m "feat: 添加 Vercel Cron Jobs 支持"
git push
```

### 方案 2：使用外部 Cron 服务

如果不想使用 Vercel Cron Jobs，可以使用外部服务：

#### 2.1 使用 GitHub Actions

创建 `.github/workflows/push-notifications.yml`：

```yaml
name: Push Notifications

on:
  schedule:
    # 早上 8:00 (UTC+8) = 0:00 (UTC)
    - cron: '0 0 * * *'
    # 中午 12:00 (UTC+8) = 4:00 (UTC)
    - cron: '0 4 * * *'
    # 晚上 21:30 (UTC+8) = 13:30 (UTC)
    - cron: '30 13 * * *'

jobs:
  send-push:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Push Notification
        run: |
          curl -X POST https://你的域名.vercel.app/api/v1/push/test \
            -H "Authorization: Bearer ${{ secrets.API_TOKEN }}"
```

#### 2.2 使用 EasyCron / Cron-job.org

1. 注册账号
2. 创建定时任务，调用你的 API 端点
3. 设置时间为中国时区

### 方案 3：使用独立服务器

如果需要更可靠的定时任务，建议：

1. 使用 Railway / Render / Fly.io 等支持长期运行进程的平台
2. 部署一个独立的定时任务服务
3. 定时调用 Vercel 的 API 端点

## 📊 查看推送日志

### 方法 1：Vercel Dashboard

1. 进入 Vercel Dashboard
2. 选择你的项目
3. 点击 "Deployments" → 最新部署
4. 点击 "Functions" 或 "Runtime Logs"
5. 查找包含 `[Push]` 的日志

### 方法 2：使用测试端点

访问 `/api/v1/push/test` 端点手动触发推送，查看浏览器控制台和 Vercel 日志。

### 方法 3：调试端点

访问 `/api/v1/push/debug/env` 查看环境变量配置状态。

## 🐛 常见问题

### Q1: 为什么到了时间点没有收到推送？

**A**: 在 Vercel 上，`node-cron` 不会工作。必须使用 Vercel Cron Jobs 或外部定时服务。

### Q2: 如何验证推送功能是否正常？

**A**: 
1. 访问 `/api/v1/push/debug/env` 确认环境变量已配置
2. 点击应用中的"测试推送"按钮
3. 查看 Vercel Runtime Logs

### Q3: 本地开发时定时任务正常，部署后不工作？

**A**: 这是正常的。本地开发时 Node.js 进程持续运行，但 Vercel Serverless 函数是按需执行的。

### Q4: Vercel Cron Jobs 的限制是什么？

**A**:
- 免费版：每天最多 1 个 Cron Job
- Pro 版：每天最多 2 个 Cron Jobs
- Enterprise 版：无限制

如果需要 3 个时间点推送，建议升级到 Pro 版或使用外部 Cron 服务。

## 📝 推荐配置

对于本项目，推荐使用 **Vercel Cron Jobs + 外部 Cron 服务** 的组合：

1. **Vercel Cron Jobs**：用于最重要的晚间汇总推送 (21:30)
2. **GitHub Actions**：用于早晨和午间提醒推送 (8:00, 12:00)

这样可以在免费版 Vercel 上实现 3 个时间点的推送。

## 🔗 相关链接

- [Vercel Cron Jobs 文档](https://vercel.com/docs/cron-jobs)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Web Push 协议](https://web.dev/push-notifications-overview/)
