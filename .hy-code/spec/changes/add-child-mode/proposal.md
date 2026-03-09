## Why

当前应用由家长和孩子共用同一账号，孩子在使用时可能误操作修改目标设置或访问家长管理功能。需要一个儿童模式，在孩子使用时限制敏感操作，同时通过密码二次确认保障家长对模式切换的控制权。

## What Changes

- 在 `AuthContext` 中新增 `isChildMode` 状态，持久化至 `localStorage`
- 在个人中心（`Profile.tsx`）添加儿童模式开关入口，开启/关闭均需密码二次确认弹窗
- 儿童模式下隐藏以下功能：
  - 仪表板（`Dashboard.tsx`）中的"添加新目标"按钮、编辑目标按钮、FAB 浮动按钮
  - 导航栏（`Navigation.tsx`）中的"家长中心"导航项
  - 个人中心（`Profile.tsx`）中的"家长审核"入口、"奖品与兑换管理"入口
- 添加前端路由守卫，防止儿童模式下直接访问家长专属页面（`/parent-control`、`/goal-setting`、`/rewards-management`）
- 新增后端密码验证接口 `POST /api/v1/auth/verify-password`，用于模式切换时的密码校验
- 儿童模式下在页面顶部显示视觉提示横幅

## Impact

- 受影响的能力：child-mode（新增）
- 受影响的代码：
  - `src/contexts/AuthContext.tsx`（添加状态和方法）
  - `src/views/Profile.tsx`（添加模式切换入口和密码弹窗）
  - `src/views/Dashboard.tsx`（条件隐藏编辑入口）
  - `src/components/Navigation.tsx`（条件隐藏家长中心导航）
  - `src/App.tsx`（添加路由守卫）
  - `src/services/api.ts`（添加密码验证 API 调用）
  - `server/src/routes/auth.ts`（新增密码验证接口）
