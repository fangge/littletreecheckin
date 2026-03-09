## 1. 后端：新增密码验证接口

- [ ] 1.1 在 `server/src/routes/auth.ts` 中新增 `POST /api/v1/auth/verify-password` 接口，接收当前登录用户的密码，使用 `bcrypt.compare` 验证，返回验证结果（不生成新 token）
- [ ] 1.2 接口需要 JWT 认证中间件保护，确保只有已登录用户可调用

## 2. 前端：AuthContext 扩展

- [ ] 2.1 在 `src/contexts/AuthContext.tsx` 中添加 `isChildMode: boolean` 状态，初始值从 `localStorage` 读取（key: `child_mode`）
- [ ] 2.2 添加 `enableChildMode(password: string): Promise<void>` 方法，调用密码验证接口，验证成功后设置 `isChildMode = true` 并持久化到 `localStorage`
- [ ] 2.3 添加 `disableChildMode(password: string): Promise<void>` 方法，调用密码验证接口，验证成功后设置 `isChildMode = false` 并清除 `localStorage`
- [ ] 2.4 在 `src/services/api.ts` 中添加 `verifyPassword(password: string): Promise<boolean>` API 调用方法

## 3. 前端：密码验证弹窗组件

- [ ] 3.1 创建 `src/components/PasswordConfirmModal.tsx` 通用密码确认弹窗组件，包含密码输入框、确认按钮、取消按钮、错误提示
- [ ] 3.2 弹窗支持 `onConfirm(password: string)` 和 `onCancel()` 回调，以及 `isLoading` 和 `error` 状态展示

## 4. 前端：个人中心添加模式切换入口

- [ ] 4.1 在 `src/views/Profile.tsx` 中添加"儿童模式"切换卡片，显示当前模式状态（开启/关闭）
- [ ] 4.2 点击切换时弹出 `PasswordConfirmModal`，验证成功后调用 `enableChildMode` 或 `disableChildMode`
- [ ] 4.3 添加友好的成功/失败提示反馈

## 5. 前端：仪表板隐藏编辑入口

- [ ] 5.1 在 `src/views/Dashboard.tsx` 中，根据 `isChildMode` 条件隐藏"准备好迎接新挑战了吗？"横幅按钮
- [ ] 5.2 根据 `isChildMode` 条件隐藏"添加新目标"卡片
- [ ] 5.3 根据 `isChildMode` 条件隐藏移动端 FAB 浮动按钮
- [ ] 5.4 根据 `isChildMode` 条件隐藏每个树木卡片右上角的编辑按钮

## 6. 前端：导航栏隐藏家长中心

- [ ] 6.1 在 `src/components/Navigation.tsx` 中，根据 `isChildMode` 条件隐藏"家长中心"导航项（移动端底部导航和桌面端侧边栏均需处理）

## 7. 前端：个人中心隐藏家长功能入口

- [ ] 7.1 在 `src/views/Profile.tsx` 中，根据 `isChildMode` 条件隐藏"家长审核"入口卡片
- [ ] 7.2 根据 `isChildMode` 条件隐藏"奖品与兑换管理"入口卡片

## 8. 前端：路由守卫

- [ ] 8.1 在 `src/App.tsx` 中为 `/parent-control`、`/goal-setting`、`/rewards-management` 路由添加守卫
- [ ] 8.2 儿童模式下访问上述路由时，重定向至 `/dashboard` 并显示提示信息

## 9. 前端：儿童模式视觉提示

- [ ] 9.1 创建 `src/components/ChildModeBanner.tsx` 横幅组件，显示"当前处于儿童模式"提示和快速退出按钮
- [ ] 9.2 在 `src/App.tsx` 或布局组件中，当 `isChildMode` 为 `true` 时显示该横幅

## 10. 验证与测试

- [ ] 10.1 验证开启儿童模式后所有受限功能均已隐藏
- [ ] 10.2 验证关闭儿童模式后所有功能恢复正常
- [ ] 10.3 验证密码错误时给出正确的错误提示
- [ ] 10.4 验证刷新页面后儿童模式状态持久化正常
- [ ] 10.5 验证儿童模式下直接访问受限路由会被重定向
