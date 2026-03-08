## ADDED Requirements

### Requirement: Fruits Per Task Tag on Tree Card

Each tree card in the Dashboard garden grid SHALL display the goal's `fruits_per_task` value as a tag alongside the existing goal detail tags (duration, daily minutes, daily count), so children can see the fruit reward for each goal at a glance.

#### Scenario: 目标设置了每次果实数时显示果实标签
- **WHEN** 孩子查看 Dashboard 的果园花园
- **THEN** 每棵树的卡片在目标详情标签行中显示果实数标签（例如 `🍎 5/次`），且仅当 `fruits_per_task > 0` 时显示

#### Scenario: 目标未设置果实数时不显示果实标签
- **WHEN** 目标的 `fruits_per_task` 为 null 或 0
- **THEN** 树木卡片不显示果实标签，其他标签正常显示