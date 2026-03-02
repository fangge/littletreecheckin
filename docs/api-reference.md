# API 参考

所有需要认证的接口须在 Header 中携带：`Authorization: Bearer <token>`

Base URL（本地开发）：`http://localhost:3001`  
Base URL（生产）：与前端同域，使用相对路径 `/api/v1/...`

---

## 认证

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/v1/auth/register` | ✗ | 家长注册（含孩子信息） |
| POST | `/api/v1/auth/login` | ✗ | 家长登录，返回 JWT |
| GET | `/api/v1/auth/me` | ✓ | 获取当前用户和孩子列表 |
| POST | `/api/v1/auth/logout` | ✓ | 登出 |

### 注册请求体示例

```json
{
  "username": "parent01",
  "password": "securepassword",
  "phone": "13800138000",
  "children": [
    { "name": "小明", "age": 8, "gender": "male" }
  ]
}
```

---

## 孩子管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/users/:userId/children` | 获取孩子列表 |
| POST | `/api/v1/users/:userId/children` | 添加孩子 |
| PUT | `/api/v1/users/:userId/children/:childId` | 更新孩子信息 |
| DELETE | `/api/v1/users/:userId/children/:childId` | 软删除孩子 |
| GET | `/api/v1/children/:childId/stats` | 获取统计数据（支持时间筛选） |

### 统计数据接口（时间筛选）

```
GET /api/v1/children/:childId/stats?period=month|quarter|year
```

| `period` 参数 | 时间范围 | 说明 |
|---------------|----------|------|
| `month` | 当月 1 日到今天 | 本月统计 |
| `quarter` | 上个季度完整时间段 | 上季度统计 |
| `year` | 今天往前 365 天 | 过去一年统计 |
| 不传 | 最近 7 天 | 默认统计 |

**响应示例**：

```json
{
  "data": {
    "forestHealth": 85,
    "totalApprovedTasks": 42,
    "activeGoals": 3,
    "completedTrees": 2,
    "fruitsBalance": 120
  }
}
```

> `activeGoals` 和 `fruitsBalance` 不受 `period` 影响，始终返回实时值。

---

## 树木与目标

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/children/:childId/trees` | 获取树木列表 |
| POST | `/api/v1/children/:childId/goals` | 创建目标（自动种树） |
| GET | `/api/v1/children/:childId/goals` | 获取目标列表（含关联树木） |
| PUT | `/api/v1/trees/:treeId` | 更新树木信息 |
| PUT | `/api/v1/goals/:goalId` | 更新目标（支持修改归属孩子） |
| DELETE | `/api/v1/goals/:goalId` | 删除目标（含关联任务/树木/勋章撤销） |

### 查询参数

- `GET /api/v1/children/:childId/trees?status=growing` — 只返回成长中的树木
- `GET /api/v1/children/:childId/trees?status=completed` — 只返回已完成的树木
- `GET /api/v1/children/:childId/goals?active=true` — 只返回进行中的目标

---

## 任务打卡

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/children/:childId/tasks` | 获取任务列表 |
| POST | `/api/v1/tasks` | 任务打卡（每日限一次） |
| PUT | `/api/v1/tasks/:taskId/approve` | 家长审核通过（触发完整奖励链） |
| PUT | `/api/v1/tasks/:taskId/reject` | 家长拒绝（可附带原因） |

### 查询参数

- `GET /api/v1/children/:childId/tasks?status=pending` — 待审核任务
- `GET /api/v1/children/:childId/tasks?status=approved` — 已通过任务
- `GET /api/v1/children/:childId/tasks?status=rejected` — 已拒绝任务

### 打卡请求体示例

```json
{
  "goal_id": "uuid-of-goal",
  "child_id": "uuid-of-child",
  "image_url": "https://..."
}
```

### 拒绝请求体示例

```json
{
  "reason": "图片不清晰，请重新拍照"
}
```

---

## 勋章

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/children/:childId/medals` | 获取全部勋章（含已解锁/未解锁状态） |

---

## 奖励商店

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/rewards` | 获取上架奖励列表 |
| GET | `/api/v1/rewards/all` | 获取所有奖励（含已下架，供家长管理） |
| POST | `/api/v1/rewards` | 创建奖品 |
| PUT | `/api/v1/rewards/:rewardId` | 更新奖品（名称/价格/分类/上下架） |
| DELETE | `/api/v1/rewards/:rewardId` | 软删除奖品（设置 is_active=false） |
| GET | `/api/v1/rewards/children/:childId/fruits` | 查询果实余额 |
| POST | `/api/v1/rewards/:rewardId/redeem` | 兑换奖励（自动扣除果实） |
| GET | `/api/v1/rewards/children/:childId/redemptions` | 查询兑换历史 |
| PUT | `/api/v1/rewards/redemptions/:id/complete` | 家长确认奖励已发放 |

### 查询参数

- `GET /api/v1/rewards?category=activity` — 按分类筛选（activity / toy / snack）

---

## 消息

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/children/:childId/messages` | 获取消息列表（支持分页） |
| GET | `/api/v1/children/:childId/messages/unread-count` | 查询未读消息数 |
| POST | `/api/v1/messages` | 发送消息（text/sticker/image） |
| PUT | `/api/v1/messages/:messageId/read` | 标记单条消息已读 |
| PUT | `/api/v1/children/:childId/messages/read-all` | 批量标记全部已读 |

### 查询参数

- `GET /api/v1/children/:childId/messages?page=1&limit=20` — 分页查询

### 发送消息请求体示例

```json
{
  "child_id": "uuid-of-child",
  "sender_type": "parent",
  "text": "今天表现很棒！",
  "type": "text"
}
```

---

## 健康检查

```
GET /health
```

响应：`{ "status": "ok", "timestamp": "..." }`