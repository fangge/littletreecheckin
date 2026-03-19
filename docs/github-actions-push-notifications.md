# GitHub Actions 定时推送通知配置指南

## 📋 概述

本项目使用 **GitHub Actions** 实现定时推送通知功能，而不是 Vercel Cron Jobs。这种方案具有以下优势：

- ✅ **完全免费**：GitHub Actions 对公共仓库免费，私有仓库每月有 2000 分钟免费额度
- ✅ **无限制**：不受 Vercel 免费版每天 1 次的限制
- ✅ **灵活可靠**：可以配置任意数量的定时任务
- ✅ **易于调试**：可以手动触发工作流进行测试
- ✅ **详细日志**：GitHub 提供完整的执行日志

---

## 🏗️ 架构说明

### 工作流程

```
GitHub Actions (定时触发)
    ↓
调用 Vercel API 端点
    ↓
/api/v1/push/cron/{type}
    ↓
发送推送通知到所有订阅用户
```

### 时间配置

| 推送时间 | 中国时间 | UTC 时间 | Cron 表达式 |
|---------|---------|---------|------------|
| 早晨推送 | 08:00 | 00:00 | `0 0 * * *` |
| 中午推送 | 12:00 | 04:00 | `0 4 * * *` |
| 晚上推送 | 21:30 | 13:30 | `30 13 * * *` |

---

## 📁 文件结构

```
.github/
└── workflows/
    └── push-notifications.yml    # GitHub Actions 工作流配置

server/src/
└── routes/
    └── push.ts                   # Cron API 端点
```

---

## 🔧 配置步骤

### 1. GitHub Actions 工作流

工作流文件已创建在 [`.github/workflows/push-notifications.yml`](../.github/workflows/push-notifications.yml)

**主要功能**：
- 定时触发（每天 3 次）
- 支持手动触发
- 自动确定推送类型
- 调用 API 端点发送推送
- 记录执行结果

### 2. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加以下 Secrets：

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `API_URL` | Vercel 部署的 API 地址 | `https://your-app.vercel.app` |
| `CRON_SECRET` | Cron 请求验证密钥（可选） | `your-secret-key-here` |

**获取 API_URL**：
- 部署到 Vercel 后，在 Vercel 项目页面可以看到域名
- 格式：`https://your-project.vercel.app`

**生成 CRON_SECRET**（可选，增加安全性）：
```bash
# 生成随机密钥
openssl rand -base64 32
```

### 3. 配置 Vercel 环境变量

在 Vercel 项目设置中添加环境变量：

1. 进入 Vercel 项目 → Settings → Environment Variables
2. 添加以下变量：

| 变量名 | 值 | 说明 |
|-------|---|------|
| `CRON_SECRET` | 与 GitHub Secret 相同的值 | 用于验证 Cron 请求 |

---

## 🚀 部署和测试

### 1. 提交代码

```bash
git add .github/workflows/push-notifications.yml
git add vercel.json
git commit -m "feat: 使用 GitHub Actions 实现定时推送"
git push
```

### 2. 验证工作流

1. 进入 GitHub 仓库
2. 点击 "Actions" 标签
3. 查看 "Push Notifications Scheduler" 工作流
4. 确认工作流已启用

### 3. 手动测试

**方法 1：通过 GitHub Actions UI**
1. 进入 Actions → Push Notifications Scheduler
2. 点击 "Run workflow"
3. 选择推送类型（morning/noon/evening）
4. 点击 "Run workflow" 按钮
5. 查看执行日志

**方法 2：直接调用 API**
```bash
# 测试早晨推送
curl -X GET "https://your-app.vercel.app/api/v1/push/cron/morning" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 测试中午推送
curl -X GET "https://your-app.vercel.app/api/v1/push/cron/noon" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 测试晚上推送
curl -X GET "https://your-app.vercel.app/api/v1/push/cron/evening" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. 查看日志

**GitHub Actions 日志**：
1. 进入 Actions → 选择工作流运行记录
2. 点击 "send-push-notifications" 作业
3. 查看每个步骤的详细日志

**Vercel Functions 日志**：
1. 进入 Vercel 项目控制台
2. 点击 "Functions" 标签
3. 查找对应的函数调用记录
4. 查看推送服务的详细日志

---

## 📊 监控和维护

### 查看执行历史

在 GitHub Actions 页面可以看到：
- 每次执行的时间
- 执行状态（成功/失败）
- 详细的执行日志
- 推送发送结果

### 常见问题排查

#### 1. 工作流未触发

**检查项**：
- 确认工作流文件在 `.github/workflows/` 目录下
- 确认文件名为 `.yml` 或 `.yaml`
- 确认 YAML 语法正确
- 查看 Actions 页面是否有错误提示

#### 2. API 调用失败

**检查项**：
- 确认 `API_URL` Secret 配置正确
- 确认 Vercel 部署成功
- 确认 API 端点可访问
- 检查 `CRON_SECRET` 是否匹配

#### 3. 推送未发送

**检查项**：
- 查看 Vercel Functions 日志
- 确认有用户订阅了推送
- 确认 VAPID 密钥配置正确
- 检查推送订阅是否有效

---

## 🔒 安全性说明

### CRON_SECRET 验证

API 端点支持可选的 `CRON_SECRET` 验证：

```typescript
// server/src/routes/push.ts
const authHeader = req.headers.authorization;
const cronSecret = process.env.CRON_SECRET;

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  res.status(401).json({ error: 'Unauthorized' });
  return;
}
```

**建议**：
- ✅ 在生产环境中启用 `CRON_SECRET`
- ✅ 使用强随机密钥
- ✅ 定期更换密钥
- ✅ 不要在代码中硬编码密钥

### GitHub Actions 权限

工作流只需要以下权限：
- 读取仓库代码（默认）
- 访问 Secrets（默认）

不需要额外的权限配置。

---

## 📈 扩展和优化

### 添加更多推送时间

编辑 [`.github/workflows/push-notifications.yml`](../.github/workflows/push-notifications.yml)：

```yaml
on:
  schedule:
    # 添加新的时间点
    - cron: '0 6 * * *'  # 14:00 中国时间
```

### 添加推送失败通知

可以配置在推送失败时发送通知：

```yaml
- name: 通知失败
  if: failure()
  run: |
    # 发送邮件、Slack 消息等
```

### 添加重试机制

```yaml
- name: 发送推送通知
  uses: nick-invision/retry@v2
  with:
    timeout_minutes: 5
    max_attempts: 3
    command: |
      curl -X GET "${API_URL}/api/v1/push/cron/${TYPE}" \
        -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## 🆚 与 Vercel Cron Jobs 对比

| 特性 | GitHub Actions | Vercel Cron Jobs |
|-----|---------------|------------------|
| 免费额度 | 2000 分钟/月（私有仓库）<br>无限制（公共仓库） | 1 次/天（免费版）<br>100 次/天（Pro 版） |
| 配置复杂度 | 中等 | 简单 |
| 灵活性 | 高 | 中 |
| 调试便利性 | 高（详细日志） | 中 |
| 可靠性 | 高 | 高 |
| 成本 | 免费 | 免费版受限，Pro 版 $20/月 |

**推荐使用 GitHub Actions**，因为：
- 完全免费且无限制
- 更灵活的配置选项
- 更好的调试体验
- 适合中小型项目

---

## 📚 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitHub Actions Cron 语法](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [PWA 推送通知指南](./push-notifications.md)
- [API 参考文档](./api-reference.md)

---

## ✅ 检查清单

部署前确认：

- [ ] GitHub Actions 工作流文件已创建
- [ ] GitHub Secrets 已配置（`API_URL`, `CRON_SECRET`）
- [ ] Vercel 环境变量已配置（`CRON_SECRET`）
- [ ] 代码已提交并推送到 GitHub
- [ ] 工作流已在 Actions 页面显示
- [ ] 手动触发测试成功
- [ ] 查看日志确认推送发送成功

---

## 🎉 总结

使用 GitHub Actions 实现定时推送通知是一个可靠、免费且灵活的解决方案。配置完成后，系统将自动在指定时间发送推送通知，无需任何手动干预。
