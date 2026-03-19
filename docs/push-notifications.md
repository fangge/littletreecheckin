# PWA 推送通知实现指南

## 功能概述

为成就丛林项目添加 PWA 推送通知功能，支持每天多个时间点自动推送孩子的打卡情况汇总。

**推送时间**：
- 早晨 08:00 - 提醒开始新的一天
- 中午 12:00 - 中午打卡提醒
- 晚上 21:30 - 每日打卡汇总

## 技术架构

### 前端部分

1. **推送服务** ([`src/services/push.ts`](../src/services/push.ts))
   - 封装了 PWA 推送订阅/取消订阅逻辑
   - 处理 VAPID 公钥转换
   - 提供权限检查和状态管理
   - 支持后台推送（页面关闭时也能接收）

2. **API 接口** ([`src/services/api.ts`](../src/services/api.ts))
   - 添加了 `pushApi` 接口
   - 与后端推送服务通信

3. **设置组件** ([`src/components/PushSettings.tsx`](../src/components/PushSettings.tsx))
   - 用户界面组件
   - 允许用户开启/关闭推送
   - 显示订阅状态

4. **Service Worker** ([`public/sw.js`](../public/sw.js))
   - 监听 `push` 事件
   - 显示系统通知
   - 处理通知点击事件

### 后端部分

1. **推送路由** ([`server/src/routes/push.ts`](../server/src/routes/push.ts))
   - `/api/v1/push/vapid-key` - 获取 VAPID 公钥
   - `/api/v1/push/subscribe` - 订阅推送
   - `/api/v1/push/unsubscribe` - 取消订阅
   - `/api/v1/push/status` - 检查订阅状态
   - `/api/v1/push/cron/morning` - 早晨推送端点（GitHub Actions 调用）
   - `/api/v1/push/cron/noon` - 中午推送端点（GitHub Actions 调用）
   - `/api/v1/push/cron/evening` - 晚上推送端点（GitHub Actions 调用）

2. **推送服务** ([`server/src/services/pushService.ts`](../server/src/services/pushService.ts))
   - 封装推送消息发送逻辑
   - 批量推送和单用户推送
   - 每日打卡汇总消息构建
   - 自动清理失效订阅

3. **定时任务** - 使用 GitHub Actions
   - 配置文件：[`.github/workflows/push-notifications.yml`](../.github/workflows/push-notifications.yml)
   - 每天自动触发 3 次推送
   - 支持手动触发测试
   - 详细文档：[GitHub Actions 推送通知配置指南](./github-actions-push-notifications.md)

## 实施步骤

### 1. 安装依赖

```bash
# 后端依赖
cd server
pnpm add web-push
```

### 2. 生成 VAPID 密钥

```bash
cd server
node scripts/generate-vapid-keys.js
```

将生成的密钥添加到 `.env` 文件：

```env
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=your_email@example.com
```

### 3. 创建数据库表

在 Supabase 中执行 SQL 文件：

```bash
# 在 Supabase SQL 编辑器中执行
supabase/migrations/008_add_push_subscriptions.sql
```

### 4. 前端集成

在需要使用推送的页面中引入组件：

```tsx
import { PushSettings } from '../components/PushSettings';

function Settings() {
  return (
    <div>
      <PushSettings onSubscriptionChange={(subscribed) => {
        console.log('订阅状态:', subscribed);
      }} />
    </div>
  );
}
```

或直接使用服务：

```tsx
import { useEffect } from 'react';
import { pushService } from '../services/push';

function App() {
  useEffect(() => {
    // 初始化推送服务
    pushService.initialize();
  }, []);

  const handleSubscribe = async () => {
    const success = await pushService.subscribe();
    if (success) {
      console.log('订阅成功');
    }
  };

  return <button onClick={handleSubscribe}>开启推送</button>;
}
```

### 5. 配置 GitHub Actions 定时任务

详细配置步骤请参考：[GitHub Actions 推送通知配置指南](./github-actions-push-notifications.md)

**快速配置**：

1. 在 GitHub 仓库设置中添加 Secrets：
   - `API_URL`: Vercel 部署的 API 地址
   - `CRON_SECRET`: Cron 请求验证密钥

2. 在 Vercel 项目设置中添加环境变量：
   - `CRON_SECRET`: 与 GitHub Secret 相同的值

3. 提交代码并推送到 GitHub

### 6. 启动服务

```bash
# 启动后端
pnpm server:start

# 启动前端
pnpm dev
```

## 推送消息格式

### 每日打卡汇总

```json
{
  "title": "🌿 成就丛林 - 今日打卡汇总",
  "body": "2/3 个孩子完成了所有任务，继续加油！\n\n小明: 5/5\n小红: 3/5\n小刚: 0/5",
  "icon": "/logo2.png",
  "badge": "/logo2.png",
  "url": "/"
}
```

## 测试推送功能

### 方法 1：通过前端界面

1. 访问设置页面
2. 点击"开启推送"按钮
3. 允许浏览器通知权限
4. 等待定时推送（8:00、12:00、21:30）

### 方法 2：手动触发 GitHub Actions

1. 进入 GitHub 仓库 → Actions
2. 选择 "Push Notifications Scheduler" 工作流
3. 点击 "Run workflow"
4. 选择推送类型（morning/noon/evening）
5. 点击 "Run workflow" 按钮
6. 查看执行日志

### 方法 3：直接调用 API 端点

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

# 测试订阅状态
curl http://localhost:3001/api/v1/push/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 注意事项

### HTTPS 要求

- **生产环境必须使用 HTTPS**：PWA 推送通知要求使用 HTTPS 协议
- **本地开发例外**：localhost 可以使用 HTTP
- **Vercel 部署**：自动提供 HTTPS，无需额外配置

### 浏览器兼容性

- Chrome/Edge: ✅ 完全支持
- Firefox: ✅ 完全支持
- Safari: ⚠️ 部分支持（iOS 限制较多）
- 微信内置浏览器: ❌ 不支持

### 用户体验

1. 首次订阅时需要用户授权
2. 用户可以随时在浏览器设置中禁用通知
3. 建议提供设置入口，允许用户开启/关闭推送

### 性能优化

1. 推送消息大小限制（约 4KB）
2. 避免频繁推送，建议每日 1-2 次
3. 使用 `TTL` 控制消息存活时间

## 扩展功能

### 自定义推送时间

修改 [`.github/workflows/push-notifications.yml`](../.github/workflows/push-notifications.yml) 中的 cron 表达式：

```yaml
on:
  schedule:
    # 每天 20:00 中国时间 (12:00 UTC)
    - cron: '0 12 * * *'
    
    # 每周一 9:00 中国时间 (1:00 UTC 周一)
    - cron: '0 1 * * 1'
    
    # 每天推送两次（9:00 和 21:30）
    - cron: '0 1 * * *'   # 9:00 中国时间
    - cron: '30 13 * * *' # 21:30 中国时间
```

**注意**：GitHub Actions 使用 UTC 时间，需要转换为中国时间（UTC+8）

### 添加更多推送场景

在 `pushService.ts` 中添加新的推送函数：

```typescript
export async function sendRewardReminder(childId: string): Promise<void> {
  // 实现奖励提醒推送
}
```

### 支持数据统计

记录推送送达率、点击率等指标：

```sql
CREATE TABLE push_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered BOOLEAN,
  clicked BOOLEAN,
  clicked_at TIMESTAMP WITH TIME ZONE
);
```

## 故障排查

### 问题：推送无法接收

1. 检查浏览器通知权限是否开启
2. 检查 Service Worker 是否注册成功
3. 检查 VAPID 密钥是否正确
4. 查看浏览器控制台错误信息

### 问题：定时任务不执行

1. 确认服务器进程在运行
2. 检查时区设置（使用服务器本地时区）
3. 查看后端日志输出

### 问题：订阅失败

1. 检查 HTTPS 配置
2. 确认 VAPID 公钥格式正确
3. 查看后端错误日志

## 部署检查清单

- [ ] 生成 VAPID 密钥对
- [ ] 配置环境变量
- [ ] 创建数据库表
- [ ] 安装依赖包
- [ ] 启动后端服务（包含定时任务）
- [ ] 前端集成推送组件
- [ ] 测试订阅/取消订阅
- [ ] 测试手动推送
- [ ] 确认 HTTPS 配置（生产环境）
- [ ] 监控推送送达率

## 相关资源

- [Web Push API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID 规范](https://datatracker.ietf.org/doc/html/rfc8292)
- [Service Worker 文档](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [node-cron 文档](https://www.npmjs.com/package/node-cron)
- [web-push 文档](https://www.npmjs.com/package/web-push)
