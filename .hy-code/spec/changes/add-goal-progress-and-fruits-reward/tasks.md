## 0. Research

- [ ] 0.1 读取调研文档 `../../../Library/Application Support/Code/User/globalStorage/huya-fed.huya-cline/tasks/d2d4e803-7038-4f1a-a161-bb2aed720c2b/任务显示已完成天数和果实奖励字段调研结果.md` 以了解任务分析和调研结果

## 1. Database Migration

- [ ] 1.1 创建新的 Supabase 迁移文件（`supabase/migrations/004_add_fruits_per_task.sql`），在 `goals` 表添加 `fruits_per_task INTEGER NOT NULL DEFAULT 10` 字段

## 2. Backend — Goal CRUD

- [ ] 2.1 更新 `server/src/routes/trees.ts`：在创建目标时接收并存储 `fruits_per_task` 字段（默认 10）
- [ ] 2.2 更新 `server/src/routes/goals.ts`：在更新目标时支持修改 `fruits_per_task` 字段

## 3. Backend — Task Approval

- [ ] 3.1 更新 `server/src/routes/tasks.ts`：审核通过时从关联 goal 记录读取 `fruits_per_task`，替换硬编码的 `FRUITS_PER_TASK = 10`

## 4. Backend — Goal Progress API

- [ ] 4.1 更新 `server/src/routes/tasks.ts` 的任务列表查询：在返回数据中增加每个 goal 的已完成天数（`approved` 状态的任务数）和今日是否已签到（`checked_in_today`）字段
- [ ] 4.2 或者：在 `server/src/routes/trees.ts` 的树木列表接口中，附带每棵树对应 goal 的已完成天数和今日签到状态

## 5. Frontend — Type Definitions

- [ ] 5.1 更新 `src/services/api.ts` 的 `GoalData` 接口：添加 `fruits_per_task?: number` 字段
- [ ] 5.2 更新 `src/services/api.ts` 的 `TreeData` 接口（如需要）：添加 `completed_days?: number` 和 `checked_in_today?: boolean` 字段

## 6. Frontend — Dashboard Progress Display

- [ ] 6.1 更新 `src/views/Dashboard.tsx`：在树木卡片的 goalTags 中显示已完成天数/总天数（例如：`1/21天`）
- [ ] 6.2 更新 `src/views/Dashboard.tsx`：若今日已签到，在卡片上显示今日已打卡的视觉指示（例如：✓ 标记或高亮标签）

## 7. Frontend — GoalSetting Form

- [ ] 7.1 更新 `src/views/GoalSetting.tsx`：在表单中添加"每次获得果实数"输入字段（数字类型，默认值 10，最小值 1）
- [ ] 7.2 确保 GoalSetting 的提交逻辑将 `fruits_per_task` 传递给后端 API

## 8. Validation

- [ ] 8.1 手动测试：创建目标时设置自定义果实数，审核通过后验证果实余额增加正确数量
- [ ] 8.2 手动测试：Dashboard 卡片正确显示已完成天数/总天数
- [ ] 8.3 手动测试：今日已签到的目标卡片显示正确的今日打卡状态