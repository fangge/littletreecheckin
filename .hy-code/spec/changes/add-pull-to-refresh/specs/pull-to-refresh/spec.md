# 下拉刷新功能规格

## ADDED Requirements

### Requirement: 下拉刷新组件

系统 SHALL 提供一个通用的下拉刷新组件 [`PullToRefresh`](src/components/PullToRefresh.tsx:1)，支持用户通过下拉手势触发数据刷新。

#### Scenario: 用户下拉触发刷新
- **WHEN** 用户在页面顶部向下拖拽超过 80px 并释放
- **THEN** 系统应触发 `onRefresh` 回调函数，显示加载指示器，等待刷新完成后回弹

#### Scenario: 下拉未达到阈值
- **WHEN** 用户下拉距离小于 80px 并释放
- **THEN** 系统应显示回弹动画，不触发刷新

#### Scenario: 刷新过程中禁用再次下拉
- **WHEN** 系统正在执行刷新操作（`isRefreshing` 为 true）
- **THEN** 系统应禁用下拉手势，防止重复触发

#### Scenario: 页面非顶部时禁用下拉
- **WHEN** 页面滚动位置不在顶部（`scrollTop > 0`）
- **THEN** 系统应禁用下拉手势，避免与页面滚动冲突

### Requirement: 下拉动画效果

系统 SHALL 使用 Motion 库实现流畅的下拉动画，包括拖拽跟随、弹簧回弹和加载指示器旋转。

#### Scenario: 下拉过程实时跟随
- **WHEN** 用户正在下拉页面
- **THEN** 系统应实时更新下拉距离，显示对应的视觉反馈（箭头图标和提示文本）

#### Scenario: 释放后弹簧回弹
- **WHEN** 用户释放下拉手势
- **THEN** 系统应使用弹簧动画（spring transition）回弹到初始位置或加载位置

#### Scenario: 加载指示器旋转动画
- **WHEN** 系统正在执行刷新操作
- **THEN** 系统应显示旋转的加载图标（360度循环动画）

### Requirement: 视觉状态提示

系统 SHALL 根据下拉状态显示不同的视觉提示，包括图标和文本。

#### Scenario: 下拉中状态
- **WHEN** 用户下拉距离小于 80px
- **THEN** 系统应显示向下箭头图标和"下拉刷新"文本

#### Scenario: 可释放状态
- **WHEN** 用户下拉距离大于等于 80px
- **THEN** 系统应显示向上箭头图标和"释放刷新"文本

#### Scenario: 刷新中状态
- **WHEN** 系统正在执行刷新操作
- **THEN** 系统应显示旋转图标和"刷新中..."文本

### Requirement: 暗色模式适配

系统 SHALL 确保下拉刷新组件在暗色模式下正确显示，图标和文本颜色自动适配。

#### Scenario: 暗色模式下的颜色适配
- **WHEN** 用户启用暗色模式
- **THEN** 系统应使用 `text-gray-600 dark:text-gray-400` 等 Tailwind 类名自动调整颜色

### Requirement: Dashboard 页面集成

系统 SHALL 在 [`Dashboard.tsx`](src/views/Dashboard.tsx:1) 页面集成下拉刷新功能，刷新树木列表、统计数据、目标列表和日历数据。

#### Scenario: Dashboard 下拉刷新
- **WHEN** 用户在 Dashboard 页面下拉触发刷新
- **THEN** 系统应重新调用 `fetchTrees()`、`fetchGoals()` 等数据获取函数，更新页面内容

### Requirement: CheckIn 页面集成

系统 SHALL 在 [`CheckIn.tsx`](src/views/CheckIn.tsx:1) 页面集成下拉刷新功能，刷新进行中的树木、今日任务和目标列表。

#### Scenario: CheckIn 下拉刷新
- **WHEN** 用户在 CheckIn 页面下拉触发刷新
- **THEN** 系统应重新调用相关数据获取函数，更新打卡状态和任务列表

### Requirement: Medals 页面集成

系统 SHALL 在 [`Medals.tsx`](src/views/Medals.tsx:1) 页面集成下拉刷新功能，刷新勋章列表。

#### Scenario: Medals 下拉刷新
- **WHEN** 用户在 Medals 页面下拉触发刷新
- **THEN** 系统应重新调用 `fetchMedals()` 函数，更新勋章墙内容

### Requirement: Store 页面集成

系统 SHALL 在 [`Store.tsx`](src/views/Store.tsx:1) 页面集成下拉刷新功能，刷新奖励列表和果实余额。

#### Scenario: Store 下拉刷新
- **WHEN** 用户在 Store 页面下拉触发刷新
- **THEN** 系统应重新调用 `fetchRewards()` 和余额查询函数，更新商店内容

### Requirement: Messages 页面集成

系统 SHALL 在 [`Messages.tsx`](src/views/Messages.tsx:1) 页面集成下拉刷新功能，刷新消息列表。

#### Scenario: Messages 下拉刷新
- **WHEN** 用户在 Messages 页面下拉触发刷新
- **THEN** 系统应重新调用 `fetchMessages()` 函数，更新消息列表

### Requirement: ParentControl 页面集成

系统 SHALL 在 [`ParentControl.tsx`](src/views/ParentControl.tsx:1) 页面集成下拉刷新功能，刷新待审核和已审核任务列表。

#### Scenario: ParentControl 下拉刷新
- **WHEN** 用户在 ParentControl 页面下拉触发刷新
- **THEN** 系统应重新调用 `fetchTasks()` 函数，更新审核列表

### Requirement: FruitsHistory 页面集成

系统 SHALL 在 [`FruitsHistory.tsx`](src/views/FruitsHistory.tsx:1) 页面集成下拉刷新功能，刷新果实获取记录和余额。

#### Scenario: FruitsHistory 下拉刷新
- **WHEN** 用户在 FruitsHistory 页面下拉触发刷新
- **THEN** 系统应重新调用历史记录查询函数，更新果实历史

### Requirement: RewardsManagement 页面集成

系统 SHALL 在 [`RewardsManagement.tsx`](src/views/RewardsManagement.tsx:1) 页面集成下拉刷新功能，刷新奖品列表和兑换记录。

#### Scenario: RewardsManagement 下拉刷新
- **WHEN** 用户在 RewardsManagement 页面下拉触发刷新
- **THEN** 系统应重新调用奖励管理相关函数，更新管理界面

### Requirement: 移动端触摸优化

系统 SHALL 确保下拉刷新在移动端设备上提供流畅的触摸体验，无卡顿和延迟。

#### Scenario: 触摸响应流畅
- **WHEN** 用户在移动端设备上进行下拉操作
- **THEN** 系统应立即响应触摸事件，动画帧率保持在 60fps 以上

#### Scenario: 触摸行为控制
- **WHEN** 用户触摸下拉区域
- **THEN** 系统应使用 `touch-action: pan-y` CSS 属性，确保垂直滚动行为正确
