# 下拉刷新功能提案

## Why

当前应用的所有数据展示页面缺少下拉刷新功能，用户无法主动刷新页面数据以获取最新内容。这导致用户在完成打卡、家长审核任务、兑换奖励等操作后，需要退出页面重新进入才能看到更新后的数据，用户体验不佳。添加统一的下拉刷新功能可以让用户随时获取最新数据，提升应用的交互体验和数据实时性。

## What Changes

- 创建通用的 [`PullToRefresh`](src/components/PullToRefresh.tsx:1) 组件，基于 Motion 库实现流畅的下拉刷新交互
- 为 8 个数据展示页面集成下拉刷新功能：
  - [`Dashboard.tsx`](src/views/Dashboard.tsx:1) - 仪表盘（刷新树木列表、统计数据、目标列表、日历数据）
  - [`CheckIn.tsx`](src/views/CheckIn.tsx:1) - 打卡页面（刷新进行中的树木、今日任务、目标列表）
  - [`Medals.tsx`](src/views/Medals.tsx:1) - 勋章墙（刷新勋章列表）
  - [`Store.tsx`](src/views/Store.tsx:1) - 商店（刷新奖励列表、果实余额）
  - [`Messages.tsx`](src/views/Messages.tsx:1) - 消息页面（刷新消息列表）
  - [`ParentControl.tsx`](src/views/ParentControl.tsx:1) - 家长审核（刷新待审核/已审核任务列表）
  - [`FruitsHistory.tsx`](src/views/FruitsHistory.tsx:1) - 果实历史（刷新果实获取记录、余额）
  - [`RewardsManagement.tsx`](src/views/RewardsManagement.tsx:1) - 奖励管理（刷新奖品列表、兑换记录）
- 不包括登录、注册、目标设置、个人设置等表单类页面
- 实现下拉动画、加载指示器、触发阈值判断、防抖处理等完整交互细节
- 适配暗色模式和移动端触摸体验

## Impact

- **新增能力**：pull-to-refresh（下拉刷新交互组件）
- **影响文件**：
  - 新增：[`src/components/PullToRefresh.tsx`](src/components/PullToRefresh.tsx:1)
  - 修改：8 个页面组件（Dashboard、CheckIn、Medals、Store、Messages、ParentControl、FruitsHistory、RewardsManagement）
- **依赖**：复用现有的 Motion 库（motion/react），无需引入新依赖
- **用户体验**：显著提升数据实时性和交互流畅度
- **技术风险**：需处理滚动冲突、防止频繁刷新、确保触摸体验流畅

## 调研文档

详细的技术调研和实现方案请参考：`../../../Library/Application Support/Code/User/globalStorage/huya-fed.huya-cline/tasks/c9787015-9f3a-4a1e-b03d-c05bb54e9508/下拉刷新功能调研结果.md`
