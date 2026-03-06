## Why

The Dashboard currently shows goal total days but lacks visibility into how many days a child has already completed, and whether they have checked in today. Additionally, the fruits reward per task is hardcoded at 10, preventing parents from customizing the incentive level per goal.

## What Changes

- **Dashboard progress display**: Each goal card in the Dashboard SHALL show completed days vs. total days (e.g., `1/21天`), with today's check-in status reflected in the count.
- **Today's check-in indicator**: The system SHALL indicate whether the child has already checked in for a goal today (today's task exists with non-rejected status).
- **Configurable fruits per task**: The `goals` table SHALL include a `fruits_per_task` field (default: 10) so parents can set how many fruits a child earns per approved task.
- **Goal editing UI**: The GoalSetting form SHALL expose a `fruits_per_task` input field (numeric, default 10).
- **Backend reward logic**: Task approval SHALL read `fruits_per_task` from the goal record instead of using the hardcoded constant `FRUITS_PER_TASK = 10`.

## Impact

- Affected specs: `task-checkin`, `forest-trees`
- Affected code:
  - `src/views/Dashboard.tsx` — add completed-days display and today's check-in status
  - `src/views/GoalSetting.tsx` — add `fruits_per_task` form field
  - `src/services/api.ts` — extend `GoalData` interface with `fruits_per_task`
  - `server/src/routes/tasks.ts` — replace hardcoded `FRUITS_PER_TASK` with goal's value
  - `server/src/routes/trees.ts` — accept `fruits_per_task` on goal creation
  - `server/src/routes/goals.ts` — accept `fruits_per_task` on goal update
  - `supabase/migrations/` — new migration to add `fruits_per_task` column to `goals` table

## Research Document

调研文档路径: `../../../Library/Application Support/Code/User/globalStorage/huya-fed.huya-cline/tasks/d2d4e803-7038-4f1a-a161-bb2aed720c2b/任务显示已完成天数和果实奖励字段调研结果.md`