## MODIFIED Requirements

### Requirement: 目标创建与树木生成

系统 SHALL 允许家长为孩子创建习惯目标，每个目标自动关联一棵虚拟树木，并支持设置每次完成任务获得的果实数。

#### Scenario: 创建目标成功
- **WHEN** 家长提交有效的目标信息（标题、图标、持续天数、每日时长、奖励树木名称，可选 fruits_per_task）
- **THEN** 系统创建目标记录（fruits_per_task 默认为 10），同时自动创建对应的树木记录（初始状态 growing，进度 0，等级 1）

#### Scenario: 目标参数验证
- **WHEN** 家长提交的目标持续天数小于 1 或大于 365
- **THEN** 系统返回 400 错误，提示参数无效

#### Scenario: 自定义果实奖励
- **WHEN** 家长创建目标时指定 fruits_per_task 为正整数（如 20）
- **THEN** 系统以该值存储目标的果实奖励数，后续每次任务审核通过时按此值奖励果实

## ADDED Requirements

### Requirement: 目标果实奖励配置

系统 SHALL 在目标（goal）上存储 `fruits_per_task` 字段，表示每次任务审核通过后奖励给孩子的果实数量，默认值为 10。

#### Scenario: 默认果实奖励
- **WHEN** 家长创建目标时未指定 fruits_per_task
- **THEN** 系统使用默认值 10 作为每次任务的果实奖励数

#### Scenario: 编辑目标时修改果实奖励
- **WHEN** 家长通过 PUT /api/v1/goals/:goalId 更新目标，传入新的 fruits_per_task 值
- **THEN** 系统更新目标的 fruits_per_task，后续审核通过的任务按新值奖励果实

#### Scenario: 任务审核通过使用目标果实奖励
- **WHEN** 家长审核通过一个任务
- **THEN** 系统从该任务关联的 goal 记录读取 fruits_per_task，将该数量的果实加入孩子余额（而非使用硬编码常量）

### Requirement: Dashboard 目标进度展示

系统 SHALL 在 Dashboard 的树木卡片中展示目标的已完成天数与总天数，以及今日是否已签到。

#### Scenario: 显示已完成天数
- **WHEN** Dashboard 加载树木列表
- **THEN** 每个目标卡片显示格式为 `X/Y天` 的进度标签（X 为已完成天数，Y 为目标总天数）

#### Scenario: 今日已签到状态
- **WHEN** 孩子今日已对该目标打卡（任务状态为 pending 或 approved）
- **THEN** 目标卡片显示今日已打卡的视觉指示（如 ✓ 标记或高亮标签）

#### Scenario: 今日未签到状态
- **WHEN** 孩子今日尚未对该目标打卡
- **THEN** 目标卡片不显示今日打卡指示，仅显示历史已完成天数