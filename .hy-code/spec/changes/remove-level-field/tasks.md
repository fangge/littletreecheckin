# 任务清单：删除树木 level 字段

## 前端修改

- [ ] `src/services/api.ts`：删除 `TreeData` 接口中的 `level: number` 字段
- [ ] `src/types.ts`：删除 `Tree` 接口中的 `level?: number` 字段
- [ ] `src/constants.ts`：删除 TREES 常量数组中所有条目的 `level` 字段
- [ ] `src/views/CheckIn.tsx`：删除打卡页底部标签中的 `· Lv.${currentTree.level}` 展示
- [ ] `src/views/Dashboard.tsx`：删除树木卡片中的 `{tree.level} 级` 等级标签 UI

## 后端修改

- [ ] `server/src/routes/tasks.ts`：
  - 删除审核通过时 `select` 中的 `level` 字段
  - 删除 `newLevel` 计算逻辑（`Math.min(5, Math.floor(newProgress / 20) + 1)`）
  - 删除 `update` 中的 `level: newLevel`
- [ ] `server/src/routes/trees.ts`：
  - 删除树木列表查询 `select` 中的 `level` 字段
  - 删除创建树木 `insert` 中的 `level: 1`
  - 删除更新树木 `select` 中的 `level` 字段
  - 删除目标列表关联查询中的 `level` 字段

## 数据库迁移

- [ ] 新建 `supabase/migrations/005_remove_tree_level.sql`，内容为：
  ```sql
  ALTER TABLE trees DROP COLUMN IF EXISTS level;
  ```

## 文档更新

- [ ] 更新 `README.md`，在更新日志中新增 v2.8 条目，记录删除 level 字段的变更
