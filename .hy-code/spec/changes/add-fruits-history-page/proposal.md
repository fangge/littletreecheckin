## Why

Children and parents have no way to see a breakdown of how fruits were earned. The Store page shows only the current balance, making it hard to understand the reward history. Adding a fruits history page improves transparency and motivates children by showing their earning progress.

## What Changes

- **Store page**: Add a "获取记录" (history) button next to the fruits balance on the balance card. Clicking it navigates to the new `fruits-history` view.
- **New `FruitsHistory` view** (`src/views/FruitsHistory.tsx`): Displays the child's current fruits balance in an orange summary card, followed by a full chronological list of all approved tasks with the fruits earned per entry (`+N 🍎`). No date filter is needed — show all records.
- **Backend API**: New `GET /api/v1/children/:childId/fruits-history` endpoint that returns all approved tasks for the child, joined with `goals(title, icon, fruits_per_task)`, ordered by `checkin_time` descending.
- **Frontend API layer**: New `FruitsHistoryItem` type and `childrenApi.getFruitsHistory` method in `src/services/api.ts`.
- **Routing**: Add `'fruits-history'` to `ViewType` in `src/types.ts`; wire up the new view in `src/App.tsx`; pass `onViewFruitsHistory` callback to `Store`.

## Impact

- Affected capabilities: `store-fruits-history`
- Affected code:
  - `src/types.ts` — add `'fruits-history'` to `ViewType`
  - `src/App.tsx` — new case + pass callback to `Store`
  - `src/views/Store.tsx` — add history button to balance card
  - `src/views/FruitsHistory.tsx` — new file
  - `src/services/api.ts` — new type + API method
  - `server/src/routes/children.ts` — new endpoint