# 提案：Dashboard 打卡日历控件

## Why

当前 Dashboard 页面只展示汇总统计数据（已长成树木数、累计任务数、新种子数），孩子和家长无法直观地看到每天的打卡情况。增加月度打卡日历，可以让孩子清晰感知自己的坚持轨迹，增强成就感和持续打卡的动力。

## What Changes

- **新增** 后端接口 `GET /api/v1/children/:childId/checkin-calendar`，按年月返回打卡日期列表及每日任务详情
- **新增** 前端日历组件 `src/components/CheckinCalendar.tsx`，展示月度日历，高亮已打卡日期（绿色叶子图标）
- **新增** 前端打卡详情浮层组件 `src/components/CheckinDetailPopup.tsx`，点击已打卡日期后展示当日任务列表
- **修改** `src/views/Dashboard.tsx`，在统计卡片上方插入日历控件区域
- **修改** `src/services/api.ts`，新增 `getCheckinCalendar` API 调用方法
- **修改** `server/src/routes/children.ts`，注册新的日历数据路由

## Impact

- 受影响的 specs：`dashboard-calendar`（新建）
- 受影响的代码：
  - `server/src/routes/children.ts`（新增路由）
  - `src/services/api.ts`（新增 API 方法）
  - `src/views/Dashboard.tsx`（集成日历组件）
  - 新建 `src/components/CheckinCalendar.tsx`
  - 新建 `src/components/CheckinDetailPopup.tsx`
- 无破坏性变更（BREAKING）：本次变更为纯新增功能，不修改现有接口和数据结构
- 无需数据库迁移：复用现有 `tasks` 表数据
