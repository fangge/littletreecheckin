## 1. App Shell

- [ ] 1.1 更新 `src/App.tsx`：移除根容器的 `max-w-md`，改为 `w-full`；在 `lg` 断点添加 `lg:flex lg:flex-row` 使侧边栏与内容区并排；内容区添加 `lg:ml-60 lg:flex-1`
- [ ] 1.2 更新 `src/App.tsx` 加载状态：移除 `max-w-md`，改为全屏居中

## 2. Navigation — 响应式侧边栏

- [ ] 2.1 更新 `src/components/Navigation.tsx`：
  - 移动端（默认）：保持 `fixed bottom-0 left-0 right-0` 底部导航
  - 桌面端（`lg:`）：改为 `lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-60 lg:flex-col lg:border-r lg:border-primary/10 lg:pt-8 lg:px-4 lg:pb-6`
  - 导航项在桌面端改为横向图标+文字（`lg:flex-row lg:gap-3 lg:w-full lg:px-3 lg:py-3 lg:rounded-xl`）
  - 在侧边栏顶部添加应用名称/Logo 区域

## 3. Dashboard

- [ ] 3.1 更新 `src/views/Dashboard.tsx`：树木网格添加 `md:grid-cols-3 lg:grid-cols-4`
- [ ] 3.2 更新 `src/views/Dashboard.tsx`：内容区域添加 `lg:max-w-4xl lg:mx-auto`（或在 header/section 级别添加）
- [ ] 3.3 更新 `src/views/Dashboard.tsx`：FAB 按钮添加 `lg:hidden`（桌面端通过侧边栏导航操作）
- [ ] 3.4 更新 `src/views/Dashboard.tsx`：底部 padding 改为 `pb-32 lg:pb-8`

## 4. 表单视图内容居中

- [ ] 4.1 更新 `src/views/GoalSetting.tsx`：内容区域添加 `lg:max-w-xl lg:mx-auto`，固定底部按钮区域在桌面端改为 `lg:sticky lg:bottom-0`
- [ ] 4.2 更新 `src/views/CheckIn.tsx`：内容区域添加 `lg:max-w-xl lg:mx-auto`
- [ ] 4.3 更新 `src/views/ParentControl.tsx`：内容区域添加 `lg:max-w-2xl lg:mx-auto`
- [ ] 4.4 更新 `src/views/Store.tsx`：内容区域添加 `lg:max-w-2xl lg:mx-auto`
- [ ] 4.5 更新 `src/views/Medals.tsx`：内容区域添加 `lg:max-w-2xl lg:mx-auto`

## 5. 认证视图

- [ ] 5.1 检查 `src/views/Login.tsx` 和 `src/views/Register.tsx`：确保在桌面端以居中卡片形式展示（`max-w-md mx-auto` 已有，确认在大屏下视觉效果良好）

## 6. 全局样式

- [ ] 6.1 更新 `src/index.css`（如需要）：添加桌面端 body 背景色区分（侧边栏区域与内容区域的视觉分隔）

## 7. 验证

- [ ] 7.1 在浏览器中验证移动端（375px）布局无变化
- [ ] 7.2 在浏览器中验证平板端（768px）布局正常
- [ ] 7.3 在浏览器中验证桌面端（1280px）侧边栏导航和内容区域正常展示
- [ ] 7.4 验证所有视图在桌面端的导航切换功能正常