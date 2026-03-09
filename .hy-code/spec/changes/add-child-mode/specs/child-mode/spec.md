## ADDED Requirements

### Requirement: 儿童模式状态管理

系统 SHALL 在 `AuthContext` 中维护 `isChildMode` 布尔状态，初始值从 `localStorage`（key: `child_mode`）读取，默认为 `false`。用户登出时系统 SHALL 清除该状态。

#### Scenario: 首次使用默认非儿童模式
- **WHEN** 用户首次登录，`localStorage` 中不存在 `child_mode` 键
- **THEN** `isChildMode` 默认为 `false`，应用以完整功能模式运行

#### Scenario: 刷新页面后状态持久化
- **WHEN** 用户在儿童模式下刷新页面
- **THEN** 系统从 `localStorage` 读取 `child_mode = true`，`isChildMode` 恢复为 `true`

#### Scenario: 登出时清除儿童模式状态
- **WHEN** 用户执行登出操作
- **THEN** 系统清除 `localStorage` 中的 `child_mode` 键，`isChildMode` 重置为 `false`

---

### Requirement: 密码二次确认验证

系统 SHALL 提供 `POST /api/v1/auth/verify-password` 后端接口，接受已登录用户的密码，使用 `bcrypt.compare` 验证后返回验证结果，不生成新 token。该接口 SHALL 受 JWT 认证中间件保护。

#### Scenario: 密码验证成功
- **WHEN** 已登录用户调用 `POST /api/v1/auth/verify-password`，提供正确密码
- **THEN** 接口返回 `{ success: true }`，HTTP 状态码 200

#### Scenario: 密码验证失败
- **WHEN** 已登录用户调用 `POST /api/v1/auth/verify-password`，提供错误密码
- **THEN** 接口返回 `{ success: false, message: "密码错误" }`，HTTP 状态码 401

#### Scenario: 未登录用户调用验证接口
- **WHEN** 未携带有效 JWT token 的请求调用该接口
- **THEN** 接口返回 401 未授权错误

---

### Requirement: 开启儿童模式需密码确认

系统 SHALL 在个人中心提供"开启儿童模式"入口，点击后弹出密码确认弹窗，用户输入账户登录密码验证成功后方可开启儿童模式。

#### Scenario: 密码正确时成功开启儿童模式
- **WHEN** 用户在个人中心点击"开启儿童模式"，在弹窗中输入正确密码并确认
- **THEN** 系统调用密码验证接口，验证成功后设置 `isChildMode = true`，持久化至 `localStorage`，弹窗关闭，页面显示儿童模式视觉提示

#### Scenario: 密码错误时拒绝开启
- **WHEN** 用户在密码确认弹窗中输入错误密码并确认
- **THEN** 系统调用密码验证接口，验证失败后弹窗显示"密码错误，请重试"提示，`isChildMode` 保持 `false`

#### Scenario: 取消操作不改变状态
- **WHEN** 用户在密码确认弹窗中点击"取消"
- **THEN** 弹窗关闭，`isChildMode` 状态不变

---

### Requirement: 关闭儿童模式需密码确认

系统 SHALL 在儿童模式下提供"退出儿童模式"入口（位于儿童模式提示横幅和个人中心），点击后弹出密码确认弹窗，用户输入账户登录密码验证成功后方可关闭儿童模式。

#### Scenario: 密码正确时成功关闭儿童模式
- **WHEN** 用户在儿童模式下点击"退出儿童模式"，在弹窗中输入正确密码并确认
- **THEN** 系统调用密码验证接口，验证成功后设置 `isChildMode = false`，清除 `localStorage` 中的 `child_mode` 键，弹窗关闭，页面恢复完整功能

#### Scenario: 密码错误时拒绝关闭
- **WHEN** 用户在密码确认弹窗中输入错误密码并确认
- **THEN** 系统调用密码验证接口，验证失败后弹窗显示"密码错误，请重试"提示，`isChildMode` 保持 `true`

---

### Requirement: 儿童模式下隐藏目标编辑功能

系统 SHALL 在 `isChildMode = true` 时，在仪表板（`Dashboard.tsx`）中隐藏所有进入目标创建和编辑的 UI 入口。

#### Scenario: 隐藏添加新目标入口
- **WHEN** `isChildMode = true`，用户访问仪表板
- **THEN** "准备好迎接新挑战了吗？"横幅按钮、"添加新目标"卡片、移动端 FAB 浮动按钮均不显示

#### Scenario: 隐藏编辑目标按钮
- **WHEN** `isChildMode = true`，用户查看仪表板上的树木卡片
- **THEN** 每个树木卡片右上角的编辑按钮不显示，孩子只能查看目标进度

#### Scenario: 完整模式下正常显示
- **WHEN** `isChildMode = false`，用户访问仪表板
- **THEN** 所有目标编辑入口正常显示

---

### Requirement: 儿童模式下隐藏家长中心导航

系统 SHALL 在 `isChildMode = true` 时，在导航栏（`Navigation.tsx`）中隐藏"家长中心"导航项，包括移动端底部导航和桌面端侧边栏。

#### Scenario: 移动端底部导航隐藏家长中心
- **WHEN** `isChildMode = true`，用户在移动端查看底部导航栏
- **THEN** "家长中心"导航项不显示

#### Scenario: 桌面端侧边栏隐藏家长中心
- **WHEN** `isChildMode = true`，用户在桌面端查看侧边栏导航
- **THEN** "家长中心"导航项不显示

#### Scenario: 完整模式下正常显示
- **WHEN** `isChildMode = false`
- **THEN** "家长中心"导航项正常显示

---

### Requirement: 儿童模式下隐藏个人中心家长功能入口

系统 SHALL 在 `isChildMode = true` 时，在个人中心（`Profile.tsx`）中隐藏"家长审核"和"奖品与兑换管理"入口卡片。

#### Scenario: 隐藏家长审核入口
- **WHEN** `isChildMode = true`，用户访问个人中心
- **THEN** "家长审核"入口卡片不显示

#### Scenario: 隐藏奖品与兑换管理入口
- **WHEN** `isChildMode = true`，用户访问个人中心
- **THEN** "奖品与兑换管理"入口卡片不显示

#### Scenario: 完整模式下正常显示
- **WHEN** `isChildMode = false`，用户访问个人中心
- **THEN** 所有家长功能入口正常显示

---

### Requirement: 儿童模式下路由守卫

系统 SHALL 在 `isChildMode = true` 时，对家长专属页面（`/parent-control`、`/goal-setting`、`/rewards-management`）添加路由守卫，阻止直接 URL 访问并重定向至 `/dashboard`。

#### Scenario: 直接访问受限路由被重定向
- **WHEN** `isChildMode = true`，用户直接在浏览器地址栏输入 `/parent-control`
- **THEN** 系统重定向至 `/dashboard`

#### Scenario: 完整模式下正常访问
- **WHEN** `isChildMode = false`，用户访问 `/parent-control`
- **THEN** 正常渲染家长中心页面

---

### Requirement: 儿童模式视觉提示横幅

系统 SHALL 在 `isChildMode = true` 时，在页面顶部显示儿童模式提示横幅，横幅包含提示文案和"退出儿童模式"快捷按钮。

#### Scenario: 儿童模式下显示提示横幅
- **WHEN** `isChildMode = true`，用户访问任意页面
- **THEN** 页面顶部显示"当前处于儿童模式"提示横幅，横幅包含"退出儿童模式"按钮

#### Scenario: 点击退出按钮触发密码确认
- **WHEN** 用户点击横幅上的"退出儿童模式"按钮
- **THEN** 弹出密码确认弹窗，流程同"关闭儿童模式需密码确认"需求

#### Scenario: 完整模式下不显示横幅
- **WHEN** `isChildMode = false`
- **THEN** 页面顶部不显示儿童模式提示横幅
