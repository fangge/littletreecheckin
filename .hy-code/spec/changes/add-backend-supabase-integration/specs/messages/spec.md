## ADDED Requirements

### Requirement: 消息发送

系统 SHALL 允许家长向孩子发送文字消息、图片或贴纸，用于鼓励和互动。

#### Scenario: 发送文字消息
- **WHEN** 家长提交文字消息内容和接收者（孩子 ID）
- **THEN** 系统创建消息记录（sender_type: parent，type: text），返回消息信息

#### Scenario: 发送贴纸消息
- **WHEN** 家长提交贴纸 URL 和接收者
- **THEN** 系统创建消息记录（type: sticker，content 为贴纸 URL），返回消息信息

#### Scenario: 系统自动消息
- **WHEN** 任务被审核通过时
- **THEN** 系统自动创建一条系统消息（sender_type: system），通知孩子任务已通过并获得果实奖励

### Requirement: 消息列表查询

系统 SHALL 提供消息列表查询接口，按时间顺序返回对话记录。

#### Scenario: 获取消息列表
- **WHEN** 请求 GET /api/v1/children/:childId/messages
- **THEN** 系统返回该孩子的所有消息记录，按创建时间升序排列，包含发送者类型、内容、时间

#### Scenario: 分页查询
- **WHEN** 请求携带 page 和 limit 参数
- **THEN** 系统返回对应分页的消息列表，默认每页 20 条

### Requirement: 消息已读标记

系统 SHALL 支持将消息标记为已读，用于未读消息计数。

#### Scenario: 标记单条消息已读
- **WHEN** 请求 PUT /api/v1/messages/:messageId/read
- **THEN** 系统将该消息的 is_read 字段更新为 true

#### Scenario: 批量标记已读
- **WHEN** 孩子打开消息页面
- **THEN** 前端调用批量标记接口，将所有未读消息标记为已读

### Requirement: 未读消息计数

系统 SHALL 提供未读消息数量查询，用于导航栏角标显示。

#### Scenario: 查询未读数量
- **WHEN** 请求 GET /api/v1/children/:childId/messages/unread-count
- **THEN** 系统返回该孩子未读消息的数量