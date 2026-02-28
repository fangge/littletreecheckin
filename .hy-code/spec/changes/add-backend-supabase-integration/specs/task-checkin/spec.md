## ADDED Requirements

### Requirement: 每日任务打卡

系统 SHALL 允许孩子对当日目标进行打卡，提交完成凭证（可选图片）。

#### Scenario: 打卡成功
- **WHEN** 孩子提交任务打卡请求（包含 goal_id，可选图片 URL）
- **THEN** 系统创建任务记录，状态为 pending（待家长审核），返回任务信息

#### Scenario: 重复打卡
- **WHEN** 孩子对同一目标在同一天再次打卡
- **THEN** 系统返回 409 错误，提示"今日已打卡，请等待家长审核"

#### Scenario: 目标不存在或已完成
- **WHEN** 孩子对不存在或已完成的目标打卡
- **THEN** 系统返回 404 或 400 错误

### Requirement: 任务列表查询

系统 SHALL 提供任务列表查询接口，支持按状态和日期筛选。

#### Scenario: 获取待审核任务列表
- **WHEN** 家长请求 GET /api/v1/children/:childId/tasks?status=pending
- **THEN** 系统返回该孩子所有待审核的任务列表，按打卡时间倒序排列

#### Scenario: 获取全部任务列表
- **WHEN** 请求不带 status 参数
- **THEN** 系统返回所有任务，包含任务标题、类型、状态、打卡时间、关联树木名称

### Requirement: 家长审核任务

系统 SHALL 允许家长对孩子提交的任务进行审核（通过或拒绝），审核结果触发相应的奖励逻辑。

#### Scenario: 审核通过
- **WHEN** 家长请求 PUT /api/v1/tasks/:taskId/approve
- **THEN** 系统将任务状态更新为 approved，同时增加孩子果实余额、更新关联树木成长进度、检查并解锁符合条件的勋章，返回更新后的任务信息

#### Scenario: 审核拒绝
- **WHEN** 家长请求 PUT /api/v1/tasks/:taskId/reject，可附带拒绝原因
- **THEN** 系统将任务状态更新为 rejected，不奖励果实，返回更新后的任务信息

#### Scenario: 越权审核
- **WHEN** 家长尝试审核不属于自己孩子的任务
- **THEN** 系统返回 403 错误

#### Scenario: 重复审核
- **WHEN** 家长尝试审核已经审核过的任务
- **THEN** 系统返回 400 错误，提示"任务已审核"

### Requirement: 图片上传支持

系统 SHALL 支持任务打卡时上传图片凭证，存储到 Supabase Storage。

#### Scenario: 图片上传成功
- **WHEN** 孩子上传不超过 5MB 的图片文件（jpg/png/webp）
- **THEN** 系统将图片存储到 Supabase Storage，返回可访问的图片 URL

#### Scenario: 图片超出大小限制
- **WHEN** 上传的图片超过 5MB
- **THEN** 系统返回 400 错误，提示文件大小限制