## ADDED Requirements

### Requirement: Fruits History Entry Point in Store

商店页面的果实余额卡片 SHALL 在余额数字旁边显示"获取记录"按钮。点击该按钮后，系统 SHALL 导航到果实获取记录页面。

#### Scenario: 点击获取记录按钮跳转到记录页
- **WHEN** 用户在果实商店页面点击果实余额卡片上的"获取记录"按钮
- **THEN** 系统导航到果实获取记录页面，展示当前选中孩子的果实获取明细

### Requirement: Fruits History Page

系统 SHALL 提供独立的果实获取记录页面，展示以下内容：
1. 顶部摘要卡片：显示孩子当前果实总余额
2. 获取明细列表：按时间倒序展示所有已审核通过的任务记录，每条记录包含任务名称、审核时间、获得果实数（`+N 🍎`）
3. 列表末尾显示"没有更多记录啦~"提示

#### Scenario: 有果实获取记录时展示明细列表
- **WHEN** 孩子有已审核通过的任务记录
- **THEN** 页面显示所有记录，每条记录展示任务标题、打卡时间（格式 YYYY-MM-DD HH:mm）、获得果实数（`+N 🍎`），并在列表末尾显示"没有更多记录啦~"

#### Scenario: 无果实获取记录时展示空状态
- **WHEN** 孩子没有任何已审核通过的任务记录
- **THEN** 页面显示空状态提示（如"还没有获取记录，快去完成任务吧！"）

#### Scenario: 返回商店页面
- **WHEN** 用户点击果实获取记录页面的返回按钮
- **THEN** 系统返回果实商店页面

### Requirement: Fruits History Backend API

系统 SHALL 提供 `GET /api/v1/children/:childId/fruits-history` 接口，返回该孩子所有已审核通过（`status = 'approved'`）的任务记录，按 `checkin_time` 降序排列，每条记录包含任务标题、打卡时间、关联目标的图标（`goals.icon`）和每次果实数（`goals.fruits_per_task`，默认 10）。

#### Scenario: 返回已审核通过的任务果实记录
- **WHEN** 客户端请求 `GET /api/v1/children/:childId/fruits-history`
- **THEN** 服务端返回该孩子所有 `status = 'approved'` 的任务列表，每条包含 `id`、`title`、`checkin_time`、`fruits_earned`（= `goals.fruits_per_task ?? 10`）、`goal_icon`（= `goals.icon`），按 `checkin_time` 降序排列

#### Scenario: 无权访问他人记录
- **WHEN** 请求的 childId 不属于当前认证用户
- **THEN** 服务端返回 403 错误