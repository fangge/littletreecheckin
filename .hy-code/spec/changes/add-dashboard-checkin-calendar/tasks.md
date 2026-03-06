## 1. 后端：新增打卡日历接口

- [ ] 1.1 在 `server/src/routes/children.ts` 中新增路由 `GET /:childId/checkin-calendar`
  - 接受查询参数 `year`（数字）和 `month`（数字，1-12）
  - 校验 childId 归属当前认证用户，否则返回 403
  - 查询 `tasks` 表，筛选条件：`child_id = childId`、`status != 'rejected'`、`checkin_time` 在指定月份范围内（UTC+8 时区）
  - 关联查询 `goals` 表获取 `goal_title`
  - 将结果按日期（YYYY-MM-DD，UTC+8）分组，生成 `checkin_dates` 数组和 `tasks_by_date` 对象
  - 返回 `{ data: { checkin_dates, tasks_by_date } }`

## 2. 前端：新增 API 调用方法

- [ ] 2.1 在 `src/services/api.ts` 中新增 `CalendarData` 类型定义
  - `checkin_dates: string[]`
  - `tasks_by_date: Record<string, CalendarTask[]>`
  - `CalendarTask: { id, title, status, checkin_time, goal_title? }`
- [ ] 2.2 在 `childrenApi` 对象中新增 `getCheckinCalendar(childId, year, month)` 方法，调用新增后端接口

## 3. 前端：新建日历组件

- [ ] 3.1 创建 `src/components/CheckinCalendar.tsx`
  - Props：`checkinDates: string[]`、`onDateClick: (date: string) => void`、`selectedMonth: Date`、`onMonthChange: (date: Date) => void`
  - 渲染月份标题（"YYYY年M月"）和左右切换按钮
  - 渲染星期行（日一二三四五六）
  - 计算当月日期网格（含上月末尾占位格）
  - 已打卡日期显示绿色叶子图标（`🌿` 或 material icon `eco`）
  - 今日日期以绿色圆形背景高亮
  - 已打卡日期可点击，触发 `onDateClick`

## 4. 前端：新建打卡详情浮层组件

- [ ] 4.1 创建 `src/components/CheckinDetailPopup.tsx`
  - Props：`date: string | null`、`tasks: CalendarTask[]`、`onClose: () => void`
  - 使用 `AnimatePresence` + `motion.div` 实现底部滑入/滑出动画
  - 背景遮罩点击关闭
  - 标题显示"X月X日 成就"，副标题显示"收获了 N 个成长点"
  - 任务列表每项显示绿色勾选图标 + 任务名称
  - 底部显示"🌿 树苗又长高了一些！"鼓励文案
  - 右上角关闭按钮

## 5. 前端：集成到 Dashboard

- [ ] 5.1 在 `src/views/Dashboard.tsx` 中新增状态：
  - `selectedMonth: Date`（默认当前月）
  - `calendarData: CalendarData | null`
  - `selectedCalendarDate: string | null`
- [ ] 5.2 新增 `useEffect`，当 `currentChild` 或 `selectedMonth` 变化时，调用 `childrenApi.getCheckinCalendar` 获取日历数据
- [ ] 5.3 在统计卡片（森林健康度）上方插入 `CheckinCalendar` 组件，传入 `calendarData.checkin_dates`、`selectedMonth`、`onMonthChange`、`onDateClick`
- [ ] 5.4 在页面底部（或适当位置）渲染 `CheckinDetailPopup`，传入 `selectedCalendarDate` 对应的任务列表

## 6. 验证

- [ ] 6.1 运行 `hyspec validate add-dashboard-checkin-calendar --strict` 确认提案无错误
- [ ] 6.2 本地启动前后端，验证日历数据正确加载
- [ ] 6.3 验证已打卡日期高亮显示正确
- [ ] 6.4 验证点击已打卡日期弹出浮层，任务列表内容正确
- [ ] 6.5 验证点击未打卡日期无响应
- [ ] 6.6 验证月份切换后数据重新加载
- [ ] 6.7 验证浮层关闭动画正常
