# 下拉刷新功能实施任务

## 0. 准备工作
- [x] 0.1 读取调研文档 `../../../Library/Application Support/Code/User/globalStorage/huya-fed.huya-cline/tasks/c9787015-9f3a-4a1e-b03d-c05bb54e9508/下拉刷新功能调研结果.md` 以了解任务分析和调研结果
- [x] 0.2 阅读 [`design.md`](.hy-code/spec/changes/add-pull-to-refresh/design.md:1) 了解技术决策和架构设计
- [x] 0.3 阅读 [`specs/pull-to-refresh/spec.md`](.hy-code/spec/changes/add-pull-to-refresh/specs/pull-to-refresh/spec.md:1) 了解完整需求

## 1. 创建 PullToRefresh 组件
- [x] 1.1 创建 [`src/components/PullToRefresh.tsx`](src/components/PullToRefresh.tsx:1) 文件
- [x] 1.2 定义 `PullToRefreshProps` 接口（onRefresh、children、pullDownThreshold、loadingText、disabled）
- [x] 1.3 实现手势检测逻辑（使用 Motion 的 `useMotionValue` 和 `drag` 手势）
- [x] 1.4 实现下拉阈值判断（默认 80px）
- [x] 1.5 实现下拉状态管理（idle、pulling、releasing、refreshing）
- [x] 1.6 实现弹簧回弹动画（使用 `spring` transition）
- [x] 1.7 实现加载指示器 UI（图标 + 文本提示）
- [x] 1.8 添加滚动位置检测（仅在 `scrollTop === 0` 时启用下拉）
- [x] 1.9 添加防抖处理（刷新过程中禁用再次下拉）
- [x] 1.10 适配暗色模式（使用 Tailwind 的 `dark:` 前缀）

## 2. 集成到高优先级页面
- [x] 2.1 在 [`Dashboard.tsx`](src/views/Dashboard.tsx:1) 中集成 PullToRefresh 组件
- [x] 2.2 实现 Dashboard 的 `handleRefresh` 函数（调用 fetchTrees、fetchGoals 等）
- [x] 2.3 在 [`CheckIn.tsx`](src/views/CheckIn.tsx:1) 中集成 PullToRefresh 组件
- [x] 2.4 实现 CheckIn 的 `handleRefresh` 函数（刷新树木和任务列表）
- [x] 2.5 在 [`Messages.tsx`](src/views/Messages.tsx:1) 中集成 PullToRefresh 组件
- [x] 2.6 实现 Messages 的 `handleRefresh` 函数（调用 fetchMessages）
- [x] 2.7 在 [`ParentControl.tsx`](src/views/ParentControl.tsx:1) 中集成 PullToRefresh 组件
- [x] 2.8 实现 ParentControl 的 `handleRefresh` 函数（调用 fetchTasks）

## 3. 集成到中优先级页面
- [x] 3.1 在 [`Store.tsx`](src/views/Store.tsx:1) 中集成 PullToRefresh 组件
- [x] 3.2 实现 Store 的 `handleRefresh` 函数（刷新奖励列表和余额）
- [x] 3.3 在 [`Medals.tsx`](src/views/Medals.tsx:1) 中集成 PullToRefresh 组件
- [x] 3.4 实现 Medals 的 `handleRefresh` 函数（调用 fetchMedals）
- [x] 3.5 在 [`FruitsHistory.tsx`](src/views/FruitsHistory.tsx:1) 中集成 PullToRefresh 组件
- [x] 3.6 实现 FruitsHistory 的 `handleRefresh` 函数（刷新历史记录和余额）

## 4. 集成到低优先级页面
- [x] 4.1 在 [`RewardsManagement.tsx`](src/views/RewardsManagement.tsx:1) 中集成 PullToRefresh 组件
- [x] 4.2 实现 RewardsManagement 的 `handleRefresh` 函数（刷新奖励管理数据）

## 5. 测试与优化
- [ ] 5.1 测试所有页面的下拉刷新功能是否正常工作
- [ ] 5.2 测试下拉阈值判断是否准确（80px）
- [ ] 5.3 测试刷新过程中禁用再次下拉是否生效
- [ ] 5.4 测试页面非顶部时下拉是否被禁用
- [ ] 5.5 测试暗色模式下的视觉效果
- [ ] 5.6 测试移动端触摸体验（iOS Safari 和 Android Chrome）
- [ ] 5.7 测试动画流畅度（确保 60fps）
- [ ] 5.8 测试滚动冲突处理（如 Dashboard 的日历组件）
- [ ] 5.9 优化性能（如有卡顿或延迟）
- [ ] 5.10 验证所有需求场景（参考 spec.md）

## 6. 文档更新
- [ ] 6.1 更新项目文档，说明下拉刷新功能的使用方法
- [ ] 6.2 添加代码注释，解释关键实现逻辑
