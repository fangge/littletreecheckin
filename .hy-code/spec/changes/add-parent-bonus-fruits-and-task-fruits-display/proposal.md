## Why

Parents currently can only leave a text note when approving a child's task. There is no way to grant bonus fruits beyond the goal's default `fruits_per_task` amount. Additionally, the Dashboard tree cards do not show how many fruits a task earns, making it hard for children to understand the reward value of each goal.

## What Changes

- **ParentControl**: When approving a task, parents can optionally enter a bonus fruits amount (on top of the goal's base `fruits_per_task`). The total fruits awarded = base + bonus.
- **ParentControl**: Display the base fruits amount for each pending task so parents have context when deciding on a bonus.
- **Backend `approve` endpoint**: Accept an optional `bonus_fruits` integer in the request body; add it to the fruits credited to the child and include it in the system notification message.
- **Frontend `tasksApi.approve`**: Pass optional `bonus_fruits` to the approve endpoint.
- **`TaskData` type**: Expose `fruits_per_task` from the joined `goals` relation so the UI can display it.
- **Dashboard**: Add a fruits-per-task tag to each tree card's goal tags row (e.g. `🍎 5/次`).

## Impact

- Affected capabilities: `parent-task-review`, `dashboard-task-display`
- Affected code:
  - `src/views/ParentControl.tsx` — bonus fruits input + base fruits display
  - `src/services/api.ts` — `tasksApi.approve` signature, `TaskData` type
  - `server/src/routes/tasks.ts` — approve handler accepts `bonus_fruits`
  - `src/views/Dashboard.tsx` — goalTags includes fruits-per-task