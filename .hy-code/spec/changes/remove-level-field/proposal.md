# 提案：删除树木 level 字段

## 背景

当前 `trees` 表中存在 `level` 字段（取值 1-5，每 20% 进度提升 1 级），但该字段在实际业务中没有任何实质作用：
- 前端仅在打卡页和 Dashboard 做简单展示（"Lv.3"、"5 级"），不影响任何业务逻辑
- 后端在审核通过时计算并更新 level，但该值从未被用于条件判断或功能控制
- 树木成长的核心指标是 `progress`（0-100%），level 是 progress 的冗余派生值

## 目标

从前端、后端、数据库三层彻底删除 `level` 字段，简化数据模型，减少不必要的计算和维护成本。

## 影响范围

| 层级 | 文件 | 变更内容 |
|------|------|---------|
| 前端类型 | `src/services/api.ts` | 删除 `TreeData.level` |
| 前端类型 | `src/types.ts` | 删除 `Tree.level` |
| 前端常量 | `src/constants.ts` | 删除 TREES 数组中的 `level` 字段 |
| 前端 UI | `src/views/CheckIn.tsx` | 删除 `Lv.${currentTree.level}` 展示 |
| 前端 UI | `src/views/Dashboard.tsx` | 删除树木卡片中的 `{tree.level} 级` 标签 |
| 后端路由 | `server/src/routes/tasks.ts` | 删除审核通过时的 level 计算和更新 |
| 后端路由 | `server/src/routes/trees.ts` | 删除 select/insert 中的 level 字段 |
| 数据库 | `supabase/migrations/` | 新增迁移文件删除 trees.level 列 |

## 不影响的功能

- 树木成长进度（`progress` 字段）保持不变
- 打卡、审核、果实奖励等核心业务流程不受影响
- 树木完成状态（`status: completed`）判断逻辑不变
