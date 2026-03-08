## 1. Backend — Approve Endpoint Accepts Bonus Fruits

- [ ] 1.1 In [`server/src/routes/tasks.ts`](server/src/routes/tasks.ts:152), read `bonus_fruits` (non-negative integer, default 0) from `req.body` in the `PUT /:taskId/approve` handler
- [ ] 1.2 Add `bonus_fruits` to `fruitsEarned` when updating `children.fruits_balance`
- [ ] 1.3 Update the system notification message to mention the bonus when `bonus_fruits > 0` (e.g. `"…获得 8 个果实（含额外奖励 3 个）！"`)

## 2. Frontend API Layer

- [ ] 2.1 In [`src/services/api.ts`](src/services/api.ts:304), update `tasksApi.approve` to accept an optional `bonusFruits?: number` parameter and send `{ bonus_fruits: bonusFruits }` in the request body
- [ ] 2.2 Extend the `TaskData` interface to include `fruits_per_task?: number` (sourced from the joined `goals` relation)
- [ ] 2.3 In the backend task list query ([`server/src/routes/tasks.ts`](server/src/routes/tasks.ts:26)), add `fruits_per_task` to the `goals(...)` select so it is returned in the task list response

## 3. ParentControl UI — Bonus Fruits Input

- [ ] 3.1 In [`src/views/ParentControl.tsx`](src/views/ParentControl.tsx), add a `bonusFruits` state (`Record<string, number>`) to track per-task bonus input
- [ ] 3.2 In the pending task card, display the base fruits amount from `task.goals?.fruits_per_task` (e.g. `"基础奖励：5 🍎"`)
- [ ] 3.3 Add a number input (min=0, step=1) labelled "额外奖励果实" below the note input area
- [ ] 3.4 Pass `bonusFruits[task.id]` to `tasksApi.approve` in `handleApprove`

## 4. Dashboard UI — Fruits Per Task Tag

- [ ] 4.1 In [`src/views/Dashboard.tsx`](src/views/Dashboard.tsx:251), add a `🍎 N/次` tag to `goalTags` when `goal.fruits_per_task` is a positive number

## 5. Validation

- [ ] 5.1 Manually test: approve a task with no bonus → child receives base fruits, message shows base amount
- [ ] 5.2 Manually test: approve a task with bonus=3 → child receives base+3 fruits, message mentions bonus
- [ ] 5.3 Manually test: Dashboard tree card shows `🍎 N/次` tag for goals with `fruits_per_task > 0`
- [ ] 5.4 Manually test: bonus input rejects negative values (browser min=0 constraint)