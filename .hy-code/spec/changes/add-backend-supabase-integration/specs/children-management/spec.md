## ADDED Requirements

### Requirement: 孩子信息管理

系统 SHALL 允许已登录家长对其账户下的孩子信息进行增删改查操作。

#### Scenario: 获取孩子列表
- **WHEN** 家长请求 GET /api/v1/users/:userId/children
- **THEN** 系统返回该家长账户下所有孩子的信息列表，包含果实余额

#### Scenario: 添加孩子
- **WHEN** 家长提交有效的孩子姓名、年龄和性别
- **THEN** 系统创建新的孩子记录，初始果实余额为 0，返回新建的孩子信息

#### Scenario: 更新孩子信息
- **WHEN** 家长提交孩子的更新信息（姓名、年龄、头像等）
- **THEN** 系统更新孩子记录并返回最新信息

#### Scenario: 删除孩子
- **WHEN** 家长请求删除某个孩子
- **THEN** 系统软删除该孩子记录（保留历史数据），返回成功响应

#### Scenario: 越权访问
- **WHEN** 家长尝试访问不属于自己账户的孩子信息
- **THEN** 系统返回 403 错误，拒绝访问

### Requirement: 孩子统计数据

系统 SHALL 为每个孩子提供综合统计数据，用于仪表盘展示。

#### Scenario: 获取统计数据
- **WHEN** 家长请求 GET /api/v1/children/:childId/stats
- **THEN** 系统返回该孩子的森林健康度、已完成任务数、进行中目标数、果实余额等统计信息

#### Scenario: 森林健康度计算
- **WHEN** 系统计算孩子的森林健康度
- **THEN** 健康度基于最近 7 天任务完成率计算，范围 0-100%