# 下拉刷新功能设计文档

## Context

当前应用使用 React 19 + Motion 库构建，所有页面采用 Tailwind CSS 进行样式设计。数据获取通过 [`src/services/api.ts`](src/services/api.ts:1) 统一封装的 API 调用，各页面使用 `useEffect + async/await` 模式加载数据。项目已支持暗色模式，主要面向移动端用户。

现需为 8 个数据展示页面添加下拉刷新功能，提升用户获取最新数据的便利性。

## Goals / Non-Goals

**Goals:**
- 创建通用的下拉刷新组件，可复用于所有需要刷新的页面
- 实现流畅的下拉动画和加载指示器
- 支持自定义刷新逻辑（通过回调函数）
- 适配暗色模式和移动端触摸体验
- 防止频繁刷新（防抖处理）

**Non-Goals:**
- 不实现自动刷新或定时刷新功能
- 不修改现有的数据获取逻辑和 API 封装
- 不为表单类页面（登录、注册、设置）添加下拉刷新

## Decisions

### 决策 1：自定义实现 vs 第三方库

**选择**：自定义实现基于 Motion 库的下拉刷新组件

**理由**：
1. 项目已集成 Motion 库，可复用其手势系统（`useMotionValue`、`useTransform`、`drag` 手势）
2. 避免引入额外依赖，保持包体积最小（第三方库如 better-scroll 约 40KB）
3. 完全控制 UI 样式，与 Tailwind CSS 完美配合
4. 可根据项目需求定制交互细节

**备选方案**：
- `react-pull-to-refresh`：轻量但样式定制受限
- `better-scroll`：功能强大但体积大且过度设计

### 决策 2：组件架构

**选择**：创建独立的 `PullToRefresh` 包装组件

**架构**：
```typescript
<PullToRefresh onRefresh={fetchData}>
  <PageContent />
</PullToRefresh>
```

**理由**：
1. 关注点分离：刷新逻辑与页面内容解耦
2. 易于集成：只需包装现有页面内容
3. 可复用：统一的刷新交互体验

**组件接口**：
```typescript
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;  // 刷新回调（异步）
  children: React.ReactNode;        // 页面内容
  pullDownThreshold?: number;       // 触发阈值（默认 80px）
  loadingText?: string;             // 加载提示文本
  disabled?: boolean;               // 禁用刷新
}
```

### 决策 3：交互细节

**下拉阈值**：80px
- 小于 80px：显示下拉提示，释放后回弹
- 大于 80px：显示释放提示，释放后触发刷新

**动画效果**：
- 下拉过程：使用 Motion 的 `drag` 手势，实时跟随手指
- 释放回弹：使用弹簧动画（`spring` transition）
- 加载指示器：旋转动画（360度循环）

**防抖处理**：
- 刷新过程中禁用再次下拉
- 使用 `isRefreshing` 状态标记

### 决策 4：加载指示器设计

**选择**：使用 Material Symbols 图标 + 旋转动画

**样式**：
- 图标：`refresh` 或 `sync`
- 颜色：适配暗色模式（`text-gray-600 dark:text-gray-400`）
- 动画：`animate-spin` 类（Tailwind CSS）

**状态提示**：
- 下拉中：显示向下箭头 + "下拉刷新"
- 可释放：显示向上箭头 + "释放刷新"
- 刷新中：显示旋转图标 + "刷新中..."

## Risks / Trade-offs

### 风险 1：滚动冲突

**问题**：页面内部有滚动容器（如日历组件）时，可能与下拉手势冲突

**缓解方案**：
- 仅在页面顶部（`scrollTop === 0`）时启用下拉手势
- 使用 `touch-action: pan-y` CSS 属性控制触摸行为
- 监听 `onDragStart` 事件，检查滚动位置

### 风险 2：性能问题

**问题**：下拉过程中频繁重渲染可能影响性能

**缓解方案**：
- 使用 `useMotionValue` 避免触发 React 重渲染
- 使用 `useTransform` 进行动画计算
- 避免在拖拽回调中执行复杂逻辑

### 风险 3：移动端兼容性

**问题**：不同移动设备的触摸行为可能不一致

**缓解方案**：
- 充分测试 iOS Safari 和 Android Chrome
- 使用 Motion 库的跨平台手势系统
- 添加触觉反馈（可选，使用 Vibration API）

### Trade-off：简单性 vs 功能性

**选择**：优先保证简单性
- 不实现复杂的下拉阻尼效果（可后续优化）
- 不支持自定义加载指示器（统一样式）
- 不实现上拉加载更多功能（超出当前需求）

## Migration Plan

### 阶段 1：创建组件（1-2 天）
1. 实现 [`PullToRefresh.tsx`](src/components/PullToRefresh.tsx:1) 组件
2. 添加单元测试（可选）
3. 在一个页面（如 Dashboard）进行试点集成

### 阶段 2：页面集成（2-3 天）
按优先级分批集成：
1. **高优先级**（第 1 批）：Dashboard、CheckIn、Messages、ParentControl
2. **中优先级**（第 2 批）：Store、Medals、FruitsHistory
3. **低优先级**（第 3 批）：RewardsManagement

### 阶段 3：优化与测试（1 天）
1. 测试所有页面的刷新功能
2. 测试暗色模式适配
3. 测试移动端触摸体验
4. 性能优化（如有必要）

### Rollback 方案
- 如发现严重问题，可快速移除 `<PullToRefresh>` 包装，恢复原页面结构
- 组件设计为非侵入式，不修改现有数据获取逻辑

## Open Questions

1. **是否需要触觉反馈？**
   - 在下拉到阈值时震动提示
   - 需要用户授权 Vibration API
   - 建议：暂不实现，可后续根据用户反馈添加

2. **是否需要刷新失败提示？**
   - 当 API 调用失败时显示错误提示
   - 建议：由各页面自行处理错误（保持组件简单）

3. **是否需要记录刷新时间？**
   - 显示"最后更新于 XX:XX"
   - 建议：暂不实现，避免增加复杂度
