# 更新日志

## 版本历史

### v2.15 — PWA 自动更新机制

优化 PWA 更新体验，解决应用安装后版本不自动更新的问题，用户无需手动卸载重装即可获取最新版本。

- ✅ **新增** `vite.config.ts` 构建时自动更新 `sw.js` 缓存版本号（基于时间戳）
- ✅ **新增** `src/components/UpdatePrompt.tsx` 更新提示组件，检测到新版本时弹出提示
- ✅ **修改** `public/sw.js` 添加 `SKIP_WAITING` 消息监听，支持客户端触发更新
- ✅ **修改** `index.html` 增强 Service Worker 注册逻辑，触发 `pwa-update-available` 事件
- ✅ **修改** `src/App.tsx` 全局渲染 `UpdatePrompt` 组件

**功能特性**：
- 每次部署自动生成新的缓存版本号
- 用户打开应用时自动检测新版本
- 弹窗提示用户更新，点击即可刷新获取最新版本
- 同时支持 PWA 安装提示功能

**无需数据库迁移**：纯前端 PWA 配置优化

---

### v2.14 — 每日任务进度弹窗

新增每日任务进度弹窗功能，用户每天首次打开应用时自动展示每个孩子的任务完成情况，提升用户体验。

- ✅ **新增** `src/components/TodayProgressModal.tsx`：每日任务进度弹窗组件，展示每个孩子的任务完成进度
- ✅ **新增** 自动触发机制：用户登录后延迟 800ms 自动检测并弹出（每天仅显示一次）
- ✅ **新增** 进度展示：显示孩子头像、任务完成数/总数、动态进度条、智能鼓励文字
- ✅ **新增** 鼓励文字逻辑：根据完成情况显示不同的鼓励语（全部完成/剩余少量/还未开始/完成部分）
- ✅ **修改** `src/App.tsx`：集成 `TodayProgressModal` 组件到全局布局

**功能特性**：
- 每天首次打开应用时自动弹出（通过 `localStorage` 记录显示状态）
- 只展示有任务数据的孩子
- 深色主题设计，与整体风格一致
- 流畅的动画效果（弹窗缩放、进度条增长）

**无需数据库迁移**：复用现有 `trees` 表和 `checked_in_today` 字段

---

### v2.13 — 下拉刷新功能

为所有数据展示页面统一添加下拉刷新交互，提升用户体验，让数据更新更直观便捷。

- ✅ **新增** `src/components/PullToRefresh.tsx` 通用下拉刷新组件（基于 Motion 手势系统，零依赖增加）
- ✅ **新增** 下拉刷新指示器：白色/深色背景卡片 + 毛玻璃效果 + 圆角阴影，清晰展示"下拉刷新"/"释放刷新"/"刷新中..."状态
- ✅ **新增** 流畅动画效果：下拉阻尼、弹簧回弹、图标旋转，提供 60fps 流畅体验
- ✅ **新增** 智能边界处理：仅在页面顶部启用下拉，刷新过程中禁用再次下拉，避免滚动冲突
- ✅ **集成** 8 个数据展示页面：Dashboard（主页）、CheckIn（打卡）、Messages（消息）、ParentControl（家长审核）、Store（商店）、Medals（勋章）、FruitsHistory（果实记录）、RewardsManagement（奖励管理）
- ✅ **优化** 指示器位置：从顶部上方滑入（`y - 60px`），避免与页面标题和内容重叠
- ✅ **适配** 完整支持亮色/暗色模式，图标和文字颜色动态切换

**使用方式**：在任意已集成页面顶部向下拖拽即可触发刷新

**无需数据库迁移**：纯前端交互增强

---

### v2.11 — 深色模式支持

新增深色模式主题，适配系统偏好或手动切换，改善夜间使用体验。

- ✅ **新增** `src/contexts/ThemeContext.tsx`：主题状态管理，支持浅色/深色模式切换，`localStorage` 持久化
- ✅ **新增** `src/index.css`：Tailwind CSS v4 深色模式配置，定义深色主题 CSS 变量（`--bg-primary: #0f172a`、`--bg-surface: #1e293b`、`--bg-card: #334155` 等）
- ✅ **修改** 登录/注册页面：表单容器、输入框、按钮等适配深色主题
- ✅ **修改** Dashboard 页面：header、统计卡片、树木网格、筛选器等适配深色主题
- ✅ **修改** CheckIn 页面：打卡卡片、日历组件、进度条等适配深色主题
- ✅ **修改** 勋章页面：勋章卡片、筛选器、详情弹窗等适配深色主题
- ✅ **修改** 消息页面：消息列表、输入框、头部等适配深色主题
- ✅ **修改** 商店页面：商品卡片、价格标签等适配深色主题
- ✅ **修改** 目标设置页面：表单元素、按钮、标签等适配深色主题
- ✅ **修改** 个人中心页面：信息卡片、输入框、切换器等适配深色主题
- ✅ **修改** 家长控制页面：任务卡片、审核按钮、弹窗等适配深色主题
- ✅ **修改** 奖励管理页面：奖品卡片、兑换记录、输入框等适配深色主题
- ✅ **修改** 果实历史页面：记录卡片适配深色主题
- ✅ **修改** 庆祝弹窗组件：弹窗背景、文字颜色等适配深色主题
- ✅ **修改** 日历组件：日期格子、今日标记、打卡状态等适配深色主题
- ✅ **修改** Profile 页面：主题模式切换按钮

**无需数据库迁移**：纯前端主题适配

---

### v2.10 — 增加任务撤销逻辑

- ✅ **新增** 已通过审核任务增加撤销功能，撤销打卡任务状态，并扣除任务对应的果实数
- ✅ **新增** 果实获取记录的果实树，增加额外获得果实的记录
- ✅ **新增** 点击勋章可以获取勋章领取条件和获取勋章的时间
- ✅ **新增** 设置页面增加修改密码功能
- ✅ **修复** 勋章领取时间判断修复，正确显示对应勋章

---

### v2.9 — PWA 支持（可安装到主屏幕）

将 Web 应用升级为 Progressive Web App，支持 Android / iOS 设备安装到主屏幕，以全屏 App 模式运行，并提供静态资源离线缓存能力。

- ✅ **新增** `public/manifest.json`：PWA 应用清单，配置应用名称（成就丛林 HappyGrow）、主题色（`#16a34a`）、全屏独立显示模式（`standalone`）、横竖屏自由旋转（`orientation: any`）、快捷方式（长按图标直接跳转打卡页）
- ✅ **新增** `public/sw.js`：Service Worker，实现三种缓存策略：
  - API 请求（`/api/*`）：网络优先，离线时返回 503 JSON 错误
  - 外部字体（Google Fonts）：缓存优先，减少重复加载
  - 同域静态资源（JS/CSS/图片）：Stale-While-Revalidate，立即响应 + 后台更新
- ✅ **修改** `index.html`：添加 `<link rel="manifest">`、iOS/Android/Windows 全平台 PWA meta 标签、Service Worker 注册脚本（含版本更新检测）
- ✅ **修改** `vercel.json`：将 `rewrites` 改为有序 `routes` 规则，确保 `sw.js`（附加 `Service-Worker-Allowed: /` 响应头）和 `manifest.json` 不被 SPA 通配符规则拦截
- ✅ **新增** `public/` 目录：将 `logo.png`、`logo2.png`、`favicon.ico` 移入，确保 Vite 构建时正确复制到 `dist/` 根目录

**安装方式**：
- Android Chrome：访问网站后地址栏出现"添加到主屏幕"提示
- iOS Safari：点击分享按钮 → "添加到主屏幕"

**无需数据库迁移**：纯前端配置变更

---

### v2.8 — 删除树木 level 字段

移除冗余的树木等级字段，简化数据模型。`level` 是 `progress` 的派生值（每 20% 进度提升 1 级），在业务中无实质作用。

- ✅ **删除** `trees` 表 `level` 列（迁移文件：`supabase/migrations/005_remove_tree_level.sql`）
- ✅ **删除** 后端 `POST /api/v1/tasks/:taskId/approve` 中的 `newLevel` 计算逻辑及 `level` 字段更新
- ✅ **删除** 后端 `server/src/routes/trees.ts` 所有 `select`/`insert` 中的 `level` 字段
- ✅ **删除** 前端 `TreeData` 接口（`src/services/api.ts`）和 `Tree` 接口（`src/types.ts`）中的 `level` 字段
- ✅ **删除** 前端常量 `src/constants.ts` 中 TREES 数组的 `level` 字段
- ✅ **删除** 打卡页（`src/views/CheckIn.tsx`）底部标签中的 `Lv.X` 等级展示
- ✅ **删除** Dashboard（`src/views/Dashboard.tsx`）树木卡片中的 `X 级` 等级标签

**数据库迁移**：执行 `supabase/migrations/005_remove_tree_level.sql`

---

### v2.7 — 补打卡功能 & 布局偏移修复

新增打卡日期选择功能，支持为过去日期补打卡；同时修复多任务场景下内容向右偏移的布局问题。

- ✅ **新增** 打卡页面日期选择器（胶囊样式，显示"打卡日期：今天/X月X日"），点击弹出原生日期选择器，`max` 限制为今天，不可选择未来日期
- ✅ **新增** 补打卡逻辑：选择历史日期后，打卡按钮文案变为"补打卡 · X月X日"，标题/副标题/状态提示均动态适配
- ✅ **修改** `tasksApi.checkin()` 新增可选第 4 参数 `checkinDate?: string`，传入时使用指定日期 + 当前时分秒构造打卡时间
- ✅ **修改** 后端 `POST /api/v1/tasks` 重复打卡检查：从固定检查"今天"改为检查传入 `checkin_time` 对应的日期，支持对历史日期的补打卡去重
- ✅ **修改** 前端任务映射 key 从 `goal_id` 改为 `日期_goal_id`，支持多日期打卡记录并发管理
- ✅ **修复** 树木选择器容器新增 `max-w-sm`，与其他内容区域宽度约束一致，解决多任务时内容向右偏移的布局问题
- ✅ **修复** 外层容器新增 `min-w-0 w-full`，防止 flex 子元素撑开父容器导致布局异常

**无需数据库迁移**：复用现有 `tasks` 表的 `checkin_time` 字段

---

### v2.6 — 儿童模式

新增儿童模式，家长可一键切换，限制孩子的操作范围，防止误触编辑目标或访问家长管理功能，切换均需账户密码二次确认。

- ✅ **新增** `POST /api/v1/auth/verify-password` 后端接口，使用 `bcrypt.compare` 验证当前登录用户密码（不生成新 token，受 JWT 中间件保护）
- ✅ **新增** `src/components/PasswordConfirmModal.tsx` 通用密码确认弹窗组件（支持显示/隐藏密码、加载状态、错误提示）
- ✅ **新增** `src/components/ChildModeBanner.tsx` 儿童模式顶部提示横幅，含"退出儿童模式"快捷按钮
- ✅ **修改** `src/contexts/AuthContext.tsx`：新增 `isChildMode` 状态（`localStorage` 持久化，key: `child_mode`）、`enableChildMode()` / `disableChildMode()` 方法，登出时自动清除
- ✅ **修改** `src/services/api.ts`：`authApi` 新增 `verifyPassword()` 方法
- ✅ **修改** `src/views/Profile.tsx`：新增儿童模式切换卡片（开启/关闭均弹出密码确认弹窗）；儿童模式下隐藏"家长审核"和"奖品与兑换管理"入口
- ✅ **修改** `src/views/Dashboard.tsx`：儿童模式下隐藏 CTA 横幅、树木卡片编辑按钮、"添加新目标"卡片、FAB 浮动按钮
- ✅ **修改** `src/components/Navigation.tsx`：儿童模式下过滤"家长中心"导航项（移动端底部导航和桌面端侧边栏均生效）
- ✅ **修改** `src/App.tsx`：新增路由守卫 `handleViewChange()`，儿童模式下访问 `parent-control`、`add-goal`、`rewards-management` 时自动重定向至 `forest`；全局渲染 `ChildModeBanner`

**无需数据库迁移**：儿童模式状态仅存储在前端 `localStorage`

---

### v2.5 — 果实获取记录页面

在果实商店新增果实获取记录入口，并提供独立的果实获取明细页面，让孩子和家长清晰了解每次任务审核通过后的果实收益历史。

- ✅ **新增** 果实商店余额卡片右侧添加"获取记录"按钮，点击跳转到果实获取记录页面
- ✅ **新增** `src/views/FruitsHistory.tsx` 果实获取记录页面：顶部橙色渐变余额摘要卡片 + 全量获取明细列表（按时间倒序）
- ✅ **新增** 明细列表每条记录展示：目标彩色图标、任务名称、打卡时间（`YYYY-MM-DD HH:mm`）、获得果实数（`+N 🍎`）
- ✅ **新增** 后端接口 `GET /api/v1/children/:childId/fruits-history`，返回所有已审核通过任务的果实获取记录，含权限校验
- ✅ **新增** 前端 `FruitsHistoryItem` 类型定义及 `childrenApi.getFruitsHistory` 方法
- ✅ **修改** `ViewType` 加入 `'fruits-history'`，`App.tsx` 新增对应路由 case

**无需数据库迁移**：复用现有 `tasks` 表和 `goals.fruits_per_task` 字段

---

### v2.4 — 家长审核额外奖励果实 & Dashboard 果实数展示

允许家长在审核任务时额外奖励果实，并在 Dashboard 树木卡片上直观展示每次任务的果实收益。

- ✅ **新增** 家长审核待审核任务时，卡片显示该目标的**基础奖励果实数**（如 `基础奖励：5 🍎`）
- ✅ **新增** 家长审核时可通过 `−` / 输入框 / `+` 控件设置**额外奖励果实**（非负整数），实时显示合计果实数
- ✅ **修改** 后端 `PUT /api/v1/tasks/:taskId/approve` 接受可选 `bonus_fruits` 参数，总果实 = 基础 + 额外，系统通知消息注明额外奖励（如 `"获得 8 个果实（含额外奖励 3 个）"`）
- ✅ **修改** 后端任务列表查询：`goals(...)` select 加入 `fruits_per_task`，前端可直接读取
- ✅ **修改** `tasksApi.approve` 接受可选 `bonusFruits` 参数，`TaskData.goals` 类型加入 `fruits_per_task`
- ✅ **新增** Dashboard 树木卡片目标标签行显示 `🍎 N/次` 果实标签（`fruits_per_task > 0` 时）

**无需数据库迁移**：复用现有 `goals.fruits_per_task` 字段

---

### v2.3 — Dashboard 打卡日历控件

在 Dashboard 页面新增月度打卡日历，直观展示孩子的成长足迹，并支持点击查看每日打卡详情。

- ✅ **新增** Dashboard 顶部"我的成长足迹"月度日历控件，支持上/下月切换
- ✅ **新增** 已打卡日期显示绿色叶子图标（`eco`）高亮，今日日期以绿色圆形背景标记
- ✅ **新增** 点击已打卡日期弹出底部浮层，展示当日所有打卡任务列表（任务名称 + 绿色勾选图标）
- ✅ **新增** 后端接口 `GET /api/v1/children/:childId/checkin-calendar?year=&month=`，按 UTC+8 时区聚合打卡数据，排除 rejected 任务
- ✅ **新增** 前端 `CalendarData` / `CalendarTask` 类型定义及 `childrenApi.getCheckinCalendar` 方法
- ✅ **新增** `src/components/CheckinCalendar.tsx` 纯手写日历组件（无第三方依赖）
- ✅ **新增** `src/components/CheckinDetailPopup.tsx` 打卡详情浮层（`motion/react` 底部滑入动画）

**无需数据库迁移**：复用现有 `tasks` 表数据

---

### v2.2 — 响应式布局（多端适配）

将移动端专属布局升级为完整响应式设计，支持手机、平板、桌面端无缝切换。

- ✅ **修改** `src/App.tsx`：移除 `max-w-md` 硬限制，添加 `lg:flex-row` 双列结构，登录/注册页不应用侧边栏偏移
- ✅ **修改** `src/components/Navigation.tsx`：移动端保持底部导航栏，桌面端（≥ 1024px）切换为固定左侧边栏（240px，含 Logo + 竖排导航项）
- ✅ **修改** `src/views/Dashboard.tsx`：树木网格 `2列 → md:3列 → lg:4列`，内容区 `lg:max-w-4xl`，FAB 按钮桌面端隐藏
- ✅ **修改** `src/views/GoalSetting.tsx`：表单内容 `lg:max-w-xl` 居中，固定底部按钮改为 `lg:sticky`
- ✅ **修改** `src/views/Medals.tsx`：勋章网格 `3列 → md:4列 → lg:5列`，内容 `lg:max-w-2xl` 居中
- ✅ **修改** `src/views/Store.tsx` / `CheckIn.tsx` / `ParentControl.tsx` / `Profile.tsx` / `RewardsManagement.tsx`：内容区 `lg:max-w-2xl` 居中，底部 padding 桌面端适配
- ✅ **修改** `src/views/Login.tsx`：桌面端以卡片形式居中显示（`lg:max-w-md lg:rounded-2xl lg:shadow-xl`）

**断点行为**：

| 断点 | 宽度 | 导航 | 内容 |
|------|------|------|------|
| 默认 | < 768px | 底部导航栏 | 全宽，`pb-32` |
| `md` | ≥ 768px | 底部导航栏 | Dashboard 3列网格 |
| `lg` | ≥ 1024px | 左侧边栏（240px） | 内容居中，`pb-8`，Dashboard 4列网格 |

---

### v2.1 — 任务进度展示与可配置果实奖励

增强 Dashboard 可见性，并允许家长为每个目标自定义果实奖励数量。

- ✅ **新增** Dashboard 目标卡片显示已完成天数 / 总天数（如 `1/21天`）
- ✅ **新增** 今日已打卡的目标卡片显示绿色"今日已打卡"徽章
- ✅ **新增** 目标设置表单新增"每次获得果实数"字段（默认 10，可自定义）
- ✅ **修改** 后端任务审核逻辑：从 goal 记录读取 `fruits_per_task`，替换硬编码常量
- ✅ **修改** 树木列表 API：响应附带 `completed_days` 和 `checked_in_today` 字段
- ✅ **修改** `GoalData` / `TreeData` 前端类型定义，新增对应字段

**数据库迁移**：执行 `supabase/migrations/004_add_fruits_per_task.sql`

---

### v2.0 — 后端服务与 Supabase 数据库集成

将纯前端 mock 数据应用升级为具备完整后端服务和数据库持久化的全栈应用。

- ✅ **新增** Express.js 后端服务（`server/` 目录），提供 RESTful API（`/api/v1/`）
- ✅ **新增** Supabase 数据库表结构（10 张核心业务表，见 `supabase/migrations/`）
- ✅ **新增** JWT 用户认证系统（家长注册 / 登录 / 登出）
- ✅ **新增** 孩子信息管理 API（增删改查、多孩子切换）
- ✅ **新增** 树木与目标管理 API（创建目标自动生成树木、进度更新）
- ✅ **新增** 任务打卡与家长审核 API（审核通过自动奖励果实、触发树木成长）
- ✅ **新增** 勋章成就系统 API（根据累计任务、连续打卡等条件自动解锁）
- ✅ **新增** 奖励商店与果实兑换 API（家长管理奖励、孩子兑换）
- ✅ **新增** 家长与孩子消息互动 API（系统自动发送审核通知）
- ✅ **修改** 前端：将 mock 数据替换为真实 API 调用，新增 `src/services/api.ts` 服务层和 `src/contexts/AuthContext.tsx` 全局状态管理

**数据库迁移**：执行 `supabase/migrations/001_initial_schema.sql` → `002_seed_data.sql` → `003_add_daily_count.sql`
