## ADDED Requirements

### Requirement: 月度打卡日历展示

系统 SHALL 在 Dashboard 页面的统计卡片上方展示一个月度打卡日历控件，标题为"我的成长足迹"，显示当前月份的完整日历网格（7列，周日至周六），并在右上角显示当前年月（如"2026年3月"）。

#### Scenario: 日历初始加载

- **WHEN** 用户进入 Dashboard 页面
- **THEN** 系统自动加载当前月份的打卡日历数据，展示本月日历网格

#### Scenario: 已打卡日期高亮

- **WHEN** 某日期存在至少一条非 rejected 状态的打卡记录
- **THEN** 该日期在日历中显示绿色叶子图标（🌿）作为高亮标记

#### Scenario: 当日日期标记

- **WHEN** 日历中的日期与今天相同
- **THEN** 该日期数字以绿色圆形背景高亮显示，与其他日期视觉区分

#### Scenario: 月份切换

- **WHEN** 用户点击日历左侧的"上一月"按钮
- **THEN** 日历切换到上一个月，并重新请求该月的打卡数据

- **WHEN** 用户点击日历右侧的"下一月"按钮
- **THEN** 日历切换到下一个月，并重新请求该月的打卡数据

---

### Requirement: 打卡详情浮层

系统 SHALL 在用户点击已打卡日期时，从屏幕底部滑出一个浮层，展示该日期的所有已打卡任务列表。

#### Scenario: 点击已打卡日期

- **WHEN** 用户点击日历中一个有打卡记录的日期
- **THEN** 屏幕出现半透明遮罩，底部滑出浮层，浮层标题显示"X月X日 成就"，副标题显示"收获了 N 个成长点"，列表展示当日所有任务名称，每条任务前有绿色勾选图标

#### Scenario: 点击未打卡日期

- **WHEN** 用户点击日历中一个没有打卡记录的日期
- **THEN** 不弹出浮层，无任何响应

#### Scenario: 关闭浮层

- **WHEN** 用户点击浮层右上角的关闭按钮，或点击背景遮罩区域
- **THEN** 浮层以动画方式向下滑出消失，遮罩消失

---

### Requirement: 打卡日历后端接口

系统 SHALL 提供 `GET /api/v1/children/:childId/checkin-calendar` 接口，接受 `year` 和 `month` 查询参数，返回指定月份的打卡日期列表及每日任务详情。

#### Scenario: 正常请求

- **WHEN** 已认证用户请求指定孩子某月的打卡日历数据
- **THEN** 接口返回 `checkin_dates`（打卡日期字符串数组，格式 YYYY-MM-DD）和 `tasks_by_date`（以日期为键的任务详情对象），仅包含 status 不为 rejected 的任务

#### Scenario: 无打卡记录

- **WHEN** 指定月份内没有任何打卡记录
- **THEN** 接口返回 `checkin_dates: []` 和 `tasks_by_date: {}`，HTTP 状态码 200

#### Scenario: 权限校验

- **WHEN** 请求的 childId 不属于当前认证用户
- **THEN** 接口返回 403 Forbidden
