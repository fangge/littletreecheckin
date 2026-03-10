# 规格说明：删除树木 level 字段

## REMOVED Requirements

### Requirement: 删除树木等级字段

系统 SHALL 从所有层级（数据库、后端 API、前端类型、前端 UI）中移除 `level` 字段，树木成长状态仅通过 `progress`（0-100%）表示。

#### Scenario: 前端类型定义不再包含 level
- **WHEN** 前端代码引用 `TreeData` 或 `Tree` 类型
- **THEN** 类型定义中不存在 `level` 字段，TypeScript 编译不报错

#### Scenario: 打卡页不展示树木等级
- **WHEN** 用户查看打卡页面的树木展示区域
- **THEN** 底部标签仅显示树木名称（如"苹果树"），不显示"Lv.X"等级信息

#### Scenario: Dashboard 树木卡片不展示等级标签
- **WHEN** 用户查看 Dashboard 的树木卡片列表
- **THEN** 卡片上不显示"X 级"等级标签

#### Scenario: 后端审核通过时不计算和更新 level
- **WHEN** 家长审核通过一条打卡任务
- **THEN** 后端仅更新树木的 `progress` 和 `status` 字段，不计算或写入 `level` 字段

#### Scenario: 后端 API 响应不包含 level 字段
- **WHEN** 前端调用树木列表、创建目标、更新树木等接口
- **THEN** 响应数据中不包含 `level` 字段

#### Scenario: 数据库 trees 表不包含 level 列
- **WHEN** 执行数据库迁移 `005_remove_tree_level.sql`
- **THEN** `trees` 表中 `level` 列被删除，现有数据不受影响
