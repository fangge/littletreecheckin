## MODIFIED Requirements

### Requirement: 任务列表查询

系统 SHALL 提供任务列表查询接口，支持按状态和日期筛选，并在每条任务记录中附带对应目标的已完成天数和今日签到状态。

#### Scenario: 获取待审核任务列表
- **WHEN** 家长请求 GET /api/v1/children/:childId/tasks?status=pending
- **THEN** 系统返回该孩子所有待审核的任务列表，按打卡时间倒序排列

#### Scenario: 获取全部任务列表
- **WHEN** 请求不带 status 参数
- **THEN** 系统返回所有任务，包含任务标题、类型、状态、打卡时间、关联树木名称

#### Scenario: 返回目标已完成天数
- **WHEN** 请求 GET /api/v1/children/:childId/tasks（任意 status 参数）
- **THEN** 每条任务记录中包含 `goal_completed_days` 字段，值为该 goal 下状态为 approved 的任务总数

#### Scenario: 返回今日签到状态
- **WHEN** 请求 GET /api/v1/children/:childId/tasks
- **THEN** 每条任务记录中包含 `checked_in_today` 布尔字段，若该 goal 在今日（UTC+8）存在状态非 rejected 的任务则为 true，否则为 false

## ADDED Requirements

### Requirement: 目标完成进度查询

系统 SHALL 在树木列表接口中附带每棵树对应目标的已完成天数和今日签到状态，供 Dashboard 直接展示进度。

#### Scenario: 树木列表包含进度信息
- **WHEN** 请求 GET /api/v1/children/:childId/trees
- **THEN** 每棵树的响应数据中包含 `completed_days`（该 goal 下 approved 任务数）和 `checked_in_today`（今日是否已有非 rejected 任务）字段

#### Scenario: 今日已签到的目标
- **WHEN** 孩子今日已对某目标打卡且任务状态为 pending 或 approved
- **THEN** 对应树木的 `checked_in_today` 为 true

#### Scenario: 今日未签到的目标
- **WHEN** 孩子今日尚未对某目标打卡，或仅有 rejected 状态的任务
- **THEN** 对应树木的 `checked_in_today` 为 false