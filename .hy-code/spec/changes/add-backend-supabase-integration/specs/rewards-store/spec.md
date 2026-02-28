## ADDED Requirements

### Requirement: 奖励商店管理

系统 SHALL 提供奖励商品的查询接口，支持按分类筛选。

#### Scenario: 获取奖励列表
- **WHEN** 请求 GET /api/v1/rewards
- **THEN** 系统返回所有激活状态的奖励列表，包含名称、价格（果实数）、图片、分类

#### Scenario: 按分类筛选奖励
- **WHEN** 请求携带 category 参数（activity/toy/snack）
- **THEN** 系统仅返回对应分类的奖励列表

### Requirement: 果实余额查询

系统 SHALL 提供孩子果实余额的实时查询接口。

#### Scenario: 查询果实余额
- **WHEN** 请求 GET /api/v1/children/:childId/fruits
- **THEN** 系统返回该孩子当前的果实余额数量

### Requirement: 奖励兑换

系统 SHALL 允许孩子使用果实兑换商店中的奖励，兑换需扣除对应果实数量。

#### Scenario: 兑换成功
- **WHEN** 孩子请求兑换某个奖励，且果实余额充足
- **THEN** 系统扣除对应果实数量，创建兑换记录（状态 pending），返回兑换成功信息

#### Scenario: 果实余额不足
- **WHEN** 孩子请求兑换的奖励价格超过当前果实余额
- **THEN** 系统返回 400 错误，提示"果实余额不足"，并显示当前余额和所需数量

#### Scenario: 奖励不存在或已下架
- **WHEN** 孩子请求兑换不存在或已下架的奖励
- **THEN** 系统返回 404 错误

### Requirement: 家长确认奖励发放

系统 SHALL 允许家长将兑换记录标记为已完成（已实际发放奖励）。

#### Scenario: 确认奖励发放
- **WHEN** 家长将某条兑换记录状态更新为 completed
- **THEN** 系统更新兑换记录状态，返回成功响应

#### Scenario: 兑换记录查询
- **WHEN** 家长请求查看孩子的兑换历史
- **THEN** 系统返回该孩子所有兑换记录，包含奖励名称、兑换时间、状态