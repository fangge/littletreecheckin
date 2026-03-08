## ADDED Requirements

### Requirement: Bonus Fruits on Task Approval

When a parent approves a child's task, the parent SHALL be able to optionally specify a bonus fruits amount (non-negative integer) in addition to the goal's base `fruits_per_task`. The total fruits credited to the child SHALL equal `base_fruits + bonus_fruits`.

#### Scenario: 家长批准任务时不填写额外奖励
- **WHEN** 家长点击"批准"按钮且未填写额外果实数量
- **THEN** 孩子获得目标设定的基础果实数（`fruits_per_task`），系统消息显示获得的果实总数

#### Scenario: 家长批准任务时填写额外奖励果实
- **WHEN** 家长在额外奖励输入框中填写正整数并点击"批准"
- **THEN** 孩子获得 `base_fruits + bonus_fruits` 个果实，系统消息中注明额外奖励数量

#### Scenario: 额外果实输入框只允许非负整数
- **WHEN** 家长在额外奖励输入框中输入负数或非数字
- **THEN** 输入框应限制为最小值 0，不允许提交负数

### Requirement: Display Base Fruits on Pending Task Card

The parent task review card SHALL display the goal's base `fruits_per_task` value so the parent has context when deciding whether to add a bonus.

#### Scenario: 待审核任务卡片显示基础果实数
- **WHEN** 家长查看待审核任务列表
- **THEN** 每个任务卡片显示该任务对应目标的基础果实数（例如"基础奖励：5 🍎"）