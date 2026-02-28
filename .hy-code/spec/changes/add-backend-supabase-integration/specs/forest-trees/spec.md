## ADDED Requirements

### Requirement: 目标创建与树木生成

系统 SHALL 允许家长为孩子创建习惯目标，每个目标自动关联一棵虚拟树木。

#### Scenario: 创建目标成功
- **WHEN** 家长提交有效的目标信息（标题、图标、持续天数、每日时长、奖励树木名称）
- **THEN** 系统创建目标记录，同时自动创建对应的树木记录（初始状态 growing，进度 0，等级 1）

#### Scenario: 目标参数验证
- **WHEN** 家长提交的目标持续天数小于 1 或大于 365
- **THEN** 系统返回 400 错误，提示参数无效

### Requirement: 树木列表查询

系统 SHALL 提供孩子森林中所有树木的查询接口，用于仪表盘展示。

#### Scenario: 获取树木列表
- **WHEN** 请求 GET /api/v1/children/:childId/trees
- **THEN** 系统返回该孩子所有树木信息，包含名称、图片、状态、等级、进度

#### Scenario: 按状态筛选
- **WHEN** 请求携带 status 查询参数（growing/completed）
- **THEN** 系统仅返回对应状态的树木列表

### Requirement: 树木成长进度更新

系统 SHALL 在任务被家长审核通过后，自动更新对应树木的成长进度。

#### Scenario: 任务审核通过触发树木成长
- **WHEN** 家长审核通过一个任务
- **THEN** 系统根据目标总天数计算进度增量，更新树木进度（progress += 100/duration_days）

#### Scenario: 树木成长完成
- **WHEN** 树木进度达到 100%
- **THEN** 系统将树木状态更新为 completed，触发勋章检查逻辑

#### Scenario: 树木等级提升
- **WHEN** 树木进度每增加 20%
- **THEN** 系统将树木等级（level）加 1，最高等级为 5