## 1. Backend — Fruits History API

- [ ] 1.1 In [`server/src/routes/children.ts`](server/src/routes/children.ts), add `GET /:childId/fruits-history` handler: query `tasks` where `child_id = childId` and `status = 'approved'`, join `goals(title, icon, fruits_per_task)`, order by `checkin_time` descending; map each row to `{ id, title, checkin_time, fruits_earned: goals.fruits_per_task ?? 10, goal_icon: goals.icon }`
- [ ] 1.2 Validate that the child belongs to the authenticated parent (403 if not)

## 2. Frontend API Layer

- [ ] 2.1 In [`src/services/api.ts`](src/services/api.ts), add `FruitsHistoryItem` interface: `{ id, title, checkin_time, fruits_earned, goal_icon? }`
- [ ] 2.2 Add `childrenApi.getFruitsHistory(childId)` method calling `GET /api/v1/children/:childId/fruits-history`

## 3. Routing

- [ ] 3.1 In [`src/types.ts`](src/types.ts), add `'fruits-history'` to the `ViewType` union
- [ ] 3.2 In [`src/App.tsx`](src/App.tsx), add `case 'fruits-history'` rendering `<FruitsHistory onBack={() => setCurrentView('store')} />`; update `Store` render to pass `onViewFruitsHistory={() => setCurrentView('fruits-history')}`

## 4. Store UI — History Button

- [ ] 4.1 In [`src/views/Store.tsx`](src/views/Store.tsx), add `onViewFruitsHistory: () => void` to `StoreProps`
- [ ] 4.2 Add a white pill button "🕐 获取记录" in the top-right area of the fruits balance card, calling `onViewFruitsHistory` on click

## 5. FruitsHistory View

- [ ] 5.1 Create [`src/views/FruitsHistory.tsx`](src/views/FruitsHistory.tsx) with:
  - Props: `{ onBack: () => void }`
  - State: `items: FruitsHistoryItem[]`, `fruitsBalance: number`, `isLoading: boolean`
  - On mount: fetch `rewardsApi.getFruits(childId)` for balance and `childrenApi.getFruitsHistory(childId)` for records
  - Header: back button + title "果实获取记录"
  - Summary card: orange gradient, shows `fruitsBalance 🍎` + motivational subtitle
  - List section titled "获取明细": each row shows goal icon (colored circle), task title, formatted `checkin_time`, and `+N 🍎` in orange
  - Footer: "没有更多记录啦~" when list is non-empty; empty state message when list is empty

## 6. Validation

- [ ] 6.1 Manually test: navigate from Store → history page → back to Store
- [ ] 6.2 Manually test: history list shows correct fruits amounts and timestamps
- [ ] 6.3 Manually test: empty state displays when child has no approved tasks