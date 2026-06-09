# 更新日志

## 版本历史

### v3.9 — 勋章管理系统与解锁庆祝动画

家长可自由创建、编辑和自定义勋章及解锁条件；孩子打卡完成任务后，自动检测新解锁的勋章并弹出庆祝弹窗，增强激励体验。

- ✅ **新增** `src/views/MedalManagement.tsx`：勋章管理页面，支持创建、编辑、删除勋章，可自定义图标、颜色、名称、描述及解锁条件类型和阈值
- ✅ **新增** `src/components/MedalUnlockPopup.tsx`：勋章解锁庆祝弹窗组件，展示勋章图标、名称、解锁条件及鼓励文案，支持逐个展示多个新勋章
- ✅ **新增** `server/src/routes/medals.ts`：勋章 CRUD 接口（GET/POST/PUT/DELETE `/api/v1/medals`），支持列出所有勋章、创建、更新、删除（级联删除关联记录）
- ✅ **新增** `src/services/api.ts`：`medalsApi` 新增 `listAll`、`create`、`update`、`delete` 方法
- ✅ **新增** `src/router.tsx`：新增 `/medals/manage` 路由，懒加载 `MedalManagement` 页面
- ✅ **修改** `server/src/app.ts`：挂载 `/api/v1/medals` 路由，勋章管理接口独立于孩子路由
- ✅ **修改** `src/views/CheckIn.tsx`：打卡成功后自动查询勋章状态，检测新解锁勋章并在庆祝弹窗关闭后展示
- ✅ **修改** `src/views/Dashboard.tsx`：日历详情弹窗关闭后自动检测新解锁勋章并展示庆祝弹窗
- ✅ **修改** `src/views/Medals.tsx`：非儿童模式下勋章墙头部新增管理入口按钮（齿轮图标），点击跳转勋章管理页
- ✅ **修改** `src/components/CheckinDetailPopup.tsx`：新增 `onAfterClose` 回调 prop，支持弹窗完全关闭后触发勋章检查等后续操作

**功能特性**：
- 家长可在勋章管理页自由创建自定义勋章，支持 20 种图标和 8 种渐变色
- 支持 6 种解锁条件类型：累计打卡、连续打卡、早起打卡、完成培育树木、累计获得果实、一周完成目标
- 打卡后自动比对勋章状态，仅在检测到新解锁勋章时才弹出庆祝弹窗
- 多个勋章同时解锁时逐个展示，用户体验流畅
- 勋章管理支持编辑和删除（删除时级联清理已获得记录）
- 勋章解锁弹窗采用弹性动画、勋章旋转缩放效果，视觉冲击力强
- 非儿童模式下勋章墙可直接进入管理页，儿童模式下隐藏入口

**无需数据库迁移**：复用现有 `medals` 和 `child_medals` 表

---

### v3.8 — 待审核角标、分类优化与图标标签

为家长端新增待审核任务实时角标提示，优化任务分类图标，并在目标设置图标选择器中显示类别名称，提升家长审核效率与任务配置体验。

- ✅ **新增** `src/contexts/PendingTasksContext.tsx`：全局待审核任务数 Context，使用 `PendingTasksProvider` 包裹应用，提供 `pendingCount` 和 `refreshPendingCount`
- ✅ **新增** `src/hooks/usePendingTasksCount.ts`：封装 `usePendingTasks` 的便捷 Hook，供 Navigation 等组件使用
- ✅ **新增** `src/services/api.ts`：`tasksApi.listPending(childId)` 方法，直接请求不走缓存，确保角标数量实时准确
- ✅ **修改** `src/components/Navigation.tsx`：家长中心导航项新增红色数字角标，实时显示待审核任务数
- ✅ **修改** `src/views/Profile.tsx`：家长审核入口新增红色数字角标，与导航角标数据同步
- ✅ **修改** `src/views/CheckIn.tsx`：打卡成功后立即调用 `refreshPendingCount`，角标实时更新
- ✅ **修改** `src/views/ParentControl.tsx`：批准/拒绝/撤销任务后调用 `refreshPendingCount`，角标实时同步
- ✅ **修改** `src/router.tsx`：在 `RootLayout` 中集成 `PendingTasksProvider`
- ✅ **修改** `src/views/Dashboard.tsx`：将 `CATEGORY_MAP` 中"生活"分类（`pets` 图标）改为"劳动"（`cleaning_services` 图标）
- ✅ **修改** `src/views/GoalSetting.tsx`：图标选择器在图标下方显示对应类别名称（如"学习"、"运动"等）

**功能特性**：
- 家长打开应用即可在导航栏和家长审核入口看到待审核任务数量
- 孩子打卡后角标立即更新，无需手动刷新
- 家长审核/拒绝/撤销后角标同步清零或减少
- 角标数据绕过缓存直接请求，保证实时性
- 任务分类"劳动"更贴合家务劳动场景
- 图标选择器显示类别名称，降低选择难度

**无需数据库迁移**：纯前端功能优化

---

### v3.7 — 共享任务功能

多个孩子可以共同参与同一个任务的竞争，先完成者获得奖励。新增共享任务总结页、打卡后自动跳转、日历金色叶子高亮、任务共享标识等完整功能链路。

- ✅ **新增** `supabase/migrations/011_add_shared_goals.sql`：在 `goals` 表中添加 `is_shared`（布尔）和 `shared_child_ids`（UUID 数组）字段，并建立索引
- ✅ **新增** `src/views/SharedTaskSummary.tsx`：共享任务总结页，展示任务信息、所有参与孩子的进度排名和进度条，支持获胜者高亮
- ✅ **新增** 后端接口 `GET /api/v1/goals/:goalId/shared-progress`：汇总所有参与孩子的完成天数、进度、获胜者信息
- ✅ **修改** `server/src/routes/trees.ts`：
  - 目标创建接口支持 `is_shared` 和 `shared_child_ids`，为每个参与孩子创建独立树木
  - 目标更新接口支持修改参与孩子列表（新增孩子创建树木，退出孩子在满足条件时移除树木）
  - 目标列表接口同时返回孩子参与的共享任务
  - 新增 `shared-progress` 路由，返回 `winner_child_id`、`is_completed`、各孩子进度等完整数据
- ✅ **修改** `server/src/routes/children.ts`：日历数据接口新增 `shared_completed_dates` 字段，支持共享任务打卡日期查询
- ✅ **修改** `server/src/app.ts`：将 `treesRouter` 额外挂载到 `/api/v1`，修复 `/goals/:goalId/shared-progress` 路由无法匹配的问题
- ✅ **修改** `src/services/api.ts`：扩展 `GoalData`、`SharedTaskProgress`、`SharedTaskSummaryData`、`CalendarData` 接口；新增 `getSharedTaskProgress` 方法；`updateGoal` 支持 `shared_child_ids`
- ✅ **修改** `src/views/GoalSetting.tsx`：
  - 新增"独立任务"与"共享任务"类型选择器
  - 共享任务模式下默认选中所有孩子，支持取消（少于 2 人时提示切换为独立任务）
  - 编辑共享任务时支持修改参与孩子列表
  - 共享任务完成条件改为"总天数"或"总次数"二选一
- ✅ **修改** `src/views/CheckIn.tsx`：任务列表中共享任务名称旁显示可点击"共享"标识；打卡庆祝弹窗关闭后自动跳转到共享任务总结页
- ✅ **修改** `src/views/Dashboard.tsx`：果园花园任务列表中共享任务显示可点击"共享"标识；将 `shared_completed_dates` 传递给日历组件
- ✅ **修改** `src/components/CheckinCalendar.tsx`：支持 `sharedCompletedDates` prop，共享任务打卡日期的叶子图标显示为金色
- ✅ **修改** `src/router.tsx`：新增 `/shared-task/:goalId` 路由，懒加载 `SharedTaskSummary` 页面

**功能特性**：
- 多孩子共同参与同一任务，先完成者获得水果奖励
- 每次打卡仍需家长审核才能生效
- 完成条件支持"总天数"或"总次数"二选一
- 共享任务总结页实时展示所有参与者进度排名
- 打卡成功后自动跳转总结页，直观查看竞争态势
- 日历中共享任务打卡日期叶子变金色，与普通任务区分
- 任务列表中共享标识可点击跳转总结页

**数据库迁移**：执行 `supabase/migrations/011_add_shared_goals.sql`

---

### v3.6 — SEO 优化、打卡动画升级与性能提升

全面优化 SEO 收录、打卡成功弹窗升级为男女孩专属 GIF 动画配音效、路由级代码分割提升首屏速度，并对多处 UI 进行紧凑化调整。

- ✅ **新增** `public/sitemap.xml`：站点地图，提升搜索引擎收录效率
- ✅ **新增** `public/robots.txt`：配置爬虫规则，保护私有页面（`/api/`、`/profile` 等）
- ✅ **新增** `index.html` JSON-LD 结构化数据：符合 Schema.org `SoftwareApplication` 规范，支持 Google 富摘要展示
- ✅ **重构** `src/components/CelebrationPopup.tsx`：移除 Three.js 3D 动画，改为男女孩专属 GIF 动画（`boytree.gif` / `girltree.gif`），根据孩子性别（`male`/`female`）自动切换；弹窗打开时同步播放对应音效（`boytree.mp3` / `girltree.mp3`），10 秒后自动关闭
- ✅ **优化** `src/views/CheckIn.tsx`：页面加载时预加载两个 GIF 和 MP3 到浏览器缓存，避免弹窗打开时才开始下载；传入 `childGender` prop 给弹窗
- ✅ **优化** `public/manifest.json`：新增应用截图（`/screenshots/checkin.png`、`/screenshots/forest.png`）、新增"我的森林"PWA 快捷方式、修复打卡快捷方式路径为 `/`、新增 Edge 侧边栏支持
- ✅ **优化** `src/router.tsx`：所有路由页面改为 `lazy` + `Suspense` 按需加载，新增 `SuspenseWrapper` 组件，首屏只加载当前路由代码
- ✅ **优化** `src/components/CheckinCalendar.tsx`：减小内边距、字体、按钮尺寸，日历整体更紧凑
- ✅ **优化** `src/views/Dashboard.tsx`：统计卡片内边距和字体缩小，将 `CATEGORY_MAP` 提取到模块级别避免每次渲染重建
- ✅ **优化** `src/views/CheckIn.tsx`：树木容器高度从 `h-52` 调整为 `h-40`，页面空间利用更合理

**功能特性**：
- 打卡成功弹窗根据孩子性别显示专属 GIF 动画，并同步播放音效，10 秒后自动关闭
- GIF 和 MP3 在页面加载时后台预加载，弹窗打开即可流畅播放
- 路由级代码分割后，首屏加载体积显著减小
- SEO 优化后，搜索引擎可正确识别应用类型、功能特性和评分信息

**无需数据库迁移**：纯前端优化

---

### v3.5 — UI 优化、导航重构与安全增强

本次更新对应用的导航结构、多个页面 UI、以及账户安全性进行了全面优化。

- ✅ **新增** `src/version.ts`：集中管理应用版本号，所有组件统一从此文件读取，告别硬编码
- ✅ **重构** `src/components/UpdatePrompt.tsx`：移除旧的 Service Worker 强制刷新弹层，改为在应用启动时检测 `localStorage` 中的版本号，版本不匹配时自动弹出更新日志弹窗（`ChangelogModal`），关闭后写入新版本号
- ✅ **重构** `src/components/Navigation.tsx` + `src/router.tsx`：**任务打卡页**（`CheckIn`）升级为应用首页（路径 `/`），**成长树页**（`Dashboard`）移至第二个 Tab（路径 `/forest`），任务 Tab 图标从 `task_alt` 更换为更圆润的 `check_circle`
- ✅ **重构** `src/views/Dashboard.tsx`：果园花园模块从图片网格卡片重构为垂直文字列表，每项包含分类标签、任务名称、果实奖励和完成状态，界面更简洁清晰
- ✅ **修复** `src/views/GoalSetting.tsx`：为保存/删除目标按钮添加加载状态（`isSaving`），防止重复提交；同步修复路由跳转至新路径 `/forest`
- ✅ **修复** `src/views/Messages.tsx`：修复路由调整后"返回"按钮跳转路径，确保正确导航
- ✅ **修复** `src/views/Store.tsx`：修复移动端余额卡片上操作按钮被遮挡的布局问题
- ✅ **优化** `src/views/RewardsManagement.tsx`：移除奖品列表中的图片占位符，列表更紧凑易读
- ✅ **优化** `src/views/Profile.tsx`：版本号改为从 `src/version.ts` 动态读取，不再硬编码
- ✅ **安全** `src/views/Login.tsx`：移除将用户密码**明文存储于 `localStorage`** 的逻辑，消除 XSS 攻击风险；"记住我"功能仅保留邮箱记忆，登录持久化完全依赖 Supabase Auth 内置的 Session（含 Refresh Token）机制

**功能特性**：
- 任务打卡作为首页，用户打开应用即可直接打卡，减少操作层级
- 版本更新时自动弹出更新日志，用户无需手动查看
- 密码不再落地存储，账户安全性显著提升
- 多处 UI 细节优化，整体体验更流畅

**无需数据库迁移**：纯前端优化

---

### v3.4 — 认证系统全面升级（Supabase Auth）

将自定义 JWT 认证体系全面迁移至 Supabase Auth 原生方案，提升安全性、简化架构，并支持邮箱登录与密码找回。

- ✅ **新增** `supabase/migrations/010_migrate_to_supabase_auth.sql`：完整数据库迁移脚本，创建 `profiles` 表、RLS 策略、自动同步 trigger，并清理旧认证表（`users`、`password_resets`、`login_attempts`）
- ✅ **新增** `src/lib/supabase.ts`：前端 Supabase 客户端，支持 `VITE_` 前缀和无前缀两种环境变量格式（兼容 Vercel 部署）
- ✅ **重写** `src/contexts/AuthContext.tsx`：使用 `supabase.auth.onAuthStateChange` 监听会话状态，`signInWithPassword` / `signUp` 替代旧接口
- ✅ **重写** `src/views/Login.tsx`：改为邮箱 + 密码登录，移除用户名登录逻辑
- ✅ **重写** `src/views/Register.tsx`：新增邮箱输入字段，注册后调用后端 `/register-children` 创建孩子记录
- ✅ **重写** `src/views/ForgotPassword.tsx`：使用 `supabase.auth.resetPasswordForEmail` 发送重置邮件
- ✅ **修改** `src/views/Profile.tsx`：密码修改改用 `supabase.auth.updateUser`
- ✅ **重写** `server/src/middleware/auth.ts`：使用 `supabase.auth.getUser(token)` 验证 Supabase JWT，替代旧的 `jwt.verify`
- ✅ **简化** `server/src/routes/auth.ts`：仅保留 `/me`（获取用户信息）和 `/register-children`（注册后创建孩子）两个接口，删除旧的登录/注册/刷新 Token 接口
- ✅ **修改** `server/src/config/supabase.ts`：后端 Supabase 客户端同时支持 `SUPABASE_SERVICE_ROLE_KEY` 和 `SUPABASE_SERVICE_KEY` 两种变量名
- ✅ **修复** `src/utils/requestCache.ts`：修复 Promise 被错误调用的 TypeScript 编译错误
- ✅ **修复** `server/src/services/medalService.ts`：修复 null 检查顺序和类型断言问题

**功能特性**：
- 登录/注册均使用真实邮箱，不再生成虚构邮箱
- 会话状态由 Supabase Auth 自动管理，无需手动维护 Token
- 密码找回通过邮件链接完成，安全可靠
- 后端使用 `service_role` 密钥，可绕过 RLS 直接访问数据
- 前后端均通过 TypeScript 编译检查

**数据库迁移**：执行 `supabase/migrations/010_migrate_to_supabase_auth.sql`

---

### v3.3 — 奖品兑换优化与商店入口调整

新增奖品撤回功能、兑换加载状态优化、兑换记录孩子筛选，并将商店入口移至全局导航栏，提升奖品管理和兑换体验。

- ✅ **新增** 奖品撤回功能：待发放的兑换记录增加"撤回"按钮，点击后将果实返还给孩子
- ✅ **新增** 后端撤回接口 `PUT /api/v1/rewards/redemptions/:redemptionId/cancel`：校验记录状态 → 返还果实 → 删除记录
- ✅ **新增** 兑换记录孩子筛选：支持"全部孩子"和单个孩子筛选，动态显示孩子名称标签
- ✅ **新增** 商店兑换加载状态：兑换弹窗在请求期间禁用所有按钮，显示"兑换中..."加载动画
- ✅ **修改** `src/views/RewardsManagement.tsx`：实现撤回按钮、孩子筛选器 UI、`handleCancel` 函数
- ✅ **修改** `src/views/Store.tsx`：将 `alert` 确认方式替换为符合设计规范的自定义模态弹窗，增加 `isRedeeming` 状态
- ✅ **修改** `server/src/routes/rewards.ts`：新增撤回接口，使用直接 SQL 查询更新孩子余额
- ✅ **修改** `src/services/api.ts`：新增 `cancelRedemption` 函数
- ✅ **修改** `src/views/Dashboard.tsx`：移除右上角商店按钮
- ✅ **修改** `src/components/Navigation.tsx`：在导航项中增加"商店"入口，更新 `pathNavMap`

**功能特性**：
- 撤回功能仅对"待发放"状态的兑换记录可用，已发放的不可撤回
- 撤回时弹出二次确认框，防止误操作
- 兑换弹窗使用圆角、主题色、毛玻璃效果，符合 Pure Sprout 设计规范
- 孩子筛选器支持横向滚动，Pill 形状设计
- 商店入口在移动端底部导航和桌面端侧边栏均可见
- 完整支持深色模式

**无需数据库迁移**：复用现有 `redemptions` 和 `children` 表

---

### v3.2 — 家长审核多孩子分类优化

新增家长审核页面的孩子筛选功能，通过二级 Tab 快速切换查看不同孩子的任务，提升多孩子家庭的使用体验。

- ✅ **新增** 二级 Tab 孩子筛选器：在"待审核/已批准"一级 Tab 下方显示孩子筛选 Tab
- ✅ **新增** "全部"选项：默认显示所有孩子的任务，支持快速切换到特定孩子
- ✅ **新增** 任务数量显示：每个孩子 Tab 显示对应的任务数量（如"小明 (3)"）
- ✅ **新增** 批准时间显示：已批准任务显示具体的批准时间（年/月/日 时:分格式）
- ✅ **优化** 任务卡片显示逻辑：选择"全部"时显示孩子名称标签，选择特定孩子时隐藏（避免冗余）
- ✅ **优化** 横向滚动支持：孩子较多时支持横向滚动查看，隐藏滚动条保持界面美观
- ✅ **修改** `src/views/ParentControl.tsx`：重构为二级 Tab 架构，提取 TaskCard 组件避免代码重复
- ✅ **修改** `server/src/routes/tasks.ts`：任务列表查询添加 `updated_at` 字段
- ✅ **修改** `src/services/api.ts`：TaskData 接口添加 `updated_at` 和 `created_at` 字段

**功能特性**：
- 仅在有多个孩子时显示二级 Tab，单孩子家庭保持原有简洁界面
- Pill 形状设计（圆角按钮），符合 Pure Sprout 设计规范
- 选中状态使用 Sprout Green 背景，未选中使用浅灰色背景
- 前端筛选，无需额外 API 请求，响应迅速
- 完整支持深色模式

**无需数据库迁移**：复用现有 `tasks` 表的 `updated_at` 字段

---

### v3.1 — 月度任务打卡总结

新增月度任务打卡总结功能，用户可查看本月打卡成就单，直观了解任务完成情况，激励持续打卡。

- ✅ **新增** `src/components/MonthlySummaryModal.tsx` 月度任务总结弹窗组件，展示本月打卡统计数据
- ✅ **新增** Dashboard 时间筛选器右侧"成就单"入口按钮（渐变色设计，奖杯图标）
- ✅ **新增** 打卡之王区域：展示本月打卡次数最多的任务（支持多个并列第一），配绿色渐变背景和👑图标
- ✅ **新增** 加油小能手区域：展示本月打卡次数最少的任务，橙黄色渐变背景和💪图标，鼓励用户继续努力
- ✅ **新增** 全部任务一览：完整罗列所有任务的打卡次数，按次数降序排列，支持平滑滚动
- ✅ **新增** 统计信息：显示本月总打卡次数、头部🎓毕业帽插图配合奖杯徽章
- ✅ **新增** 空状态处理：当月无打卡记录时显示友好提示
- ✅ **修改** `src/views/Dashboard.tsx`：集成弹窗组件，添加状态管理（`showMonthlySummary`）

**功能特性**：
- 基于日历数据自动统计每个任务的打卡次数
- 智能识别并列第一/最后的任务
- 显示任务名称和目标标题（如果有）
- 完整支持深色模式适配
- 流畅的弹窗动画效果（缩放、滑入）
- 符合"Pure Sprout"设计风格（圆角、柔和配色、Material Icons）

**无需数据库迁移**：复用现有日历数据（`CalendarData`）

---

### v3.0 — 架构全面升级

对认证系统、路由、安全性、性能四大核心领域进行深度重构，大幅提升应用的安全性与用户体验。

- ✅ **新增** 全新双 Token 认证机制（Access Token + Refresh Token 自动续签）
- ✅ **新增** 完整密码找回流程：发送验证码 → 重置新密码（支持开发调试模式）
- ✅ **新增** React Router 路由系统：URL 导航、浏览器历史、深链接、PWA 快捷方式全部生效
- ✅ **新增** 后端角色权限中间件：家长/儿童角色分离，写操作需家长权限验证
- ✅ **新增** Vite 代码分割优化：React Vendor / Motion 独立打包，首屏加载更快
- ✅ **修改** 移除 Vercel 不兼容的 better-sqlite3 依赖，纯 Supabase 架构

**功能特性**：
- Access Token（15分钟）+ Refresh Token（7天）双令牌机制
- Token 过期自动续签，无感刷新用户会话
- 密码找回支持邮箱验证码（生产环境）和调试模式（开发环境）
- React Router 完整支持浏览器前进/后退、URL 分享、PWA 快捷方式
- 后端权限中间件自动校验用户角色，保护敏感操作
- Vite 构建优化，React/Motion 独立打包，减少首屏加载时间

**数据库迁移**：执行 `supabase/migrations/002_auth_security.sql`

---

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
