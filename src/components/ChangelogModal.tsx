import { motion, AnimatePresence } from 'motion/react';

import Icon from '../components/Icon';
interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white dark:bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-[var(--bg-surface)] px-6 py-4 border-b border-primary/10 dark:border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-[var(--text-primary)]">更新日志</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-[var(--text-primary)] transition-colors"
                aria-label="关闭"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] px-6 py-4 space-y-4">
              {/* v4.2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded">v4.2</span>
                  <span className="text-sm text-slate-500 dark:text-[var(--text-muted)]">最新</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">家长审核批量操作与共享任务体验优化</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  家长审核页按孩子分组，支持一键批量批准/拒绝；共享任务打卡文案适配"已有小朋友完成"场景；树木进度计算更精准。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 家长审核按孩子分组，每个孩子独立展示待审核任务</li>
                  <li>• 一键批量批准/拒绝某个孩子的全部待审核任务</li>
                  <li>• 共享任务打卡时如已有小朋友完成，文案友好提示</li>
                  <li>• 树木进度精准重算，避免同天多次打卡导致进度虚高</li>
                  <li>• 项目文档全面升级，完整路由表、API 速查、数据库结构一览</li>
                </ul>
              </div>
              {/* v4.1 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v4.1</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">注册流程重构与共享任务果实修复</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  注册改为两步流程，无需立即填写孩子信息即可创建账户；共享任务果实只在树木完全长成时才发放，竞争更公平；果树数据实现多孩子隔离。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 注册分两步完成，孩子信息可跳过稍后添加</li>
                  <li>• 共享任务果实只在完成全部目标后才发放</li>
                  <li>• 已完成树木绿色高亮展示，不可再打卡</li>
                  <li>• 打卡历史列表一览，带状态标签</li>
                  <li>• 打卡和详情查看后自动检测新解锁勋章</li>
                  <li>• 成就单支持本月/上季度/过去一年</li>
                </ul>
              </div>

              {/* v4.0 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v4.0</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">图标系统全面 SVG 化</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  彻底移除 Material Symbols 字体图标，全站 90+ 图标改用预下载的 inline SVG，再也不会出现"先显示文字再变图标"的闪烁问题了。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 图标零闪烁，与页面内容同步显示</li>
                  <li>• 不再依赖外部字体 CDN，加载更快更稳定</li>
                  <li>• 图标颜色自动适配亮色/暗色主题</li>
                  <li>• 保持与原来一模一样的视觉风格</li>
                </ul>
              </div>

              {/* v3.9 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.9</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">勋章管理系统与解锁庆祝动画</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  家长可自由创建和自定义勋章，设置不同的解锁条件；孩子完成任务后自动检测新勋章并弹出庆祝动画，激励成长每一步。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 新增勋章管理页面，家长可创建/编辑/删除自定义勋章</li>
                  <li>• 支持 20 种图标、8 种渐变色、6 种解锁条件类型</li>
                  <li>• 打卡后自动检测新解锁勋章，弹出专属庆祝动画</li>
                  <li>• 多个勋章同时解锁时逐个展示，体验流畅</li>
                  <li>• 勋章墙新增管理入口，家长可快速进入管理页</li>
                </ul>
              </div>

              {/* v3.8 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.8</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">待审核角标、分类优化与图标标签</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  家长端新增待审核任务实时角标，打卡或审核后立即同步更新，同时优化任务分类图标并在图标选择器中显示类别名称。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 导航栏"家长中心"和家长审核入口新增待审核任务数角标</li>
                  <li>• 孩子打卡后角标立即更新，无需手动刷新</li>
                  <li>• 家长审核/拒绝/撤销后角标实时同步</li>
                  <li>• 任务分类"生活"改为"劳动"，图标更贴合家务场景</li>
                  <li>• 目标设置图标选择器在图标下方显示类别名称</li>
                </ul>
              </div>

              {/* v3.7 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.7</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">共享任务功能</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  多个孩子可以共同参与同一个任务的竞争，先完成者获得奖励，支持进度排名、日历高亮和任务标识。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 新增共享任务类型，多孩子共同参与同一任务</li>
                  <li>• 新增共享任务总结页，实时展示所有参与者进度排名</li>
                  <li>• 打卡成功后自动跳转总结页，直观查看竞争态势</li>
                  <li>• 日历中共享任务打卡日期叶子变金色，与普通任务区分</li>
                  <li>• 任务列表中共享标识可点击跳转总结页</li>
                  <li>• 目标设置支持选择参与孩子，完成条件支持总天数/总次数</li>
                </ul>
              </div>

              {/* v3.6 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.6</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">SEO 优化、打卡动画升级与性能提升</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  全面优化 SEO 收录、打卡成功弹窗升级为男女孩专属 GIF 动画配音效、路由级代码分割提升首屏速度，并对多处 UI 进行紧凑化调整。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 新增 JSON-LD 结构化数据、sitemap.xml 和 robots.txt，提升搜索引擎收录</li>
                  <li>• PWA manifest 新增应用截图与"我的森林"快捷方式</li>
                  <li>• 打卡成功弹窗升级为男女孩专属 GIF 动画，并配有对应音效</li>
                  <li>• 路由页面全部改为 lazy 按需加载，首屏加载更快</li>
                  <li>• 打卡日历、统计卡片 UI 紧凑化，页面空间利用更合理</li>
                </ul>
              </div>

              {/* v3.5 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.5</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">UI 优化、导航重构与安全增强</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  对导航结构、多个页面 UI 及账户安全性进行全面优化，任务打卡页升级为首页，密码不再本地存储。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 任务打卡页升级为首页，减少操作层级</li>
                  <li>• 果园花园改为文字列表，界面更简洁清晰</li>
                  <li>• 版本更新时自动弹出更新日志</li>
                  <li>• 移除密码明文存储，账户安全性显著提升</li>
                  <li>• 修复商店移动端按钮遮挡、目标保存加载状态等细节</li>
                </ul>
              </div>

              {/* v3.4 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.4</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">认证系统全面升级（Supabase Auth）</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  将自定义 JWT 认证体系全面迁移至 Supabase Auth 原生方案，提升安全性、简化架构，并支持邮箱登录与密码找回。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 登录/注册均使用真实邮箱，不再生成虚构邮箱</li>
                  <li>• 会话状态由 Supabase Auth 自动管理，无需手动维护 Token</li>
                  <li>• 密码找回通过邮件链接完成，安全可靠</li>
                  <li>• 重写登录、注册、忘记密码页面，适配新认证流程</li>
                  <li>• 后端使用 service_role 密钥，可绕过 RLS 直接访问数据</li>
                  <li>• 前后端均通过 TypeScript 编译检查</li>
                </ul>
              </div>

              {/* v3.3 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.3</span>
                </div>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">奖品兑换优化与商店入口调整</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  新增奖品撤回功能、兑换加载状态优化、兑换记录孩子筛选，并将商店入口移至全局导航栏，提升奖品管理和兑换体验。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 待发放兑换记录增加撤回按钮，返还果实</li>
                  <li>• 兑换弹窗增加加载状态，防止重复点击</li>
                  <li>• 兑换记录支持按孩子筛选</li>
                  <li>• 商店入口移至全局导航栏</li>
                </ul>
              </div>

              {/* v3.2 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.2</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">家长审核多孩子分类优化</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  新增家长审核页面的孩子筛选功能，通过二级 Tab 快速切换查看不同孩子的任务，提升多孩子家庭的使用体验。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 二级 Tab 孩子筛选器（支持"全部"和单个孩子）</li>
                  <li>• 任务数量实时显示（如"小明 (3)"）</li>
                  <li>• 已批准任务显示批准时间</li>
                  <li>• 横向滚动支持，孩子较多时自动适配</li>
                </ul>
              </div>

              {/* v3.1 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.1</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">月度任务打卡总结</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  新增月度任务打卡总结功能，用户可查看本月打卡成就单，直观了解任务完成情况，激励持续打卡。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• Dashboard 新增"成就单"入口按钮</li>
                  <li>• 展示打卡之王（最多）和加油小能手（最少）</li>
                  <li>• 完整罗列所有任务打卡次数</li>
                  <li>• 符合"Pure Sprout"设计风格</li>
                </ul>
              </div>

              {/* v3.0 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v3.0</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">架构全面升级</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  对认证系统、路由、安全性、性能四大核心领域进行深度重构，大幅提升应用的安全性与用户体验。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 全新双 Token 认证机制（Access Token + Refresh Token 自动续签）</li>
                  <li>• 完整密码找回流程：发送验证码 → 重置新密码（支持开发调试模式）</li>
                  <li>• React Router 路由系统：URL 导航、浏览器历史、深链接、PWA 快捷方式全部生效</li>
                  <li>• 后端角色权限中间件：家长/儿童角色分离，写操作需家长权限验证</li>
                  <li>• Vite 代码分割优化：React Vendor / Motion 独立打包，首屏加载更快</li>
                  <li>• 移除 Vercel 不兼容的 better-sqlite3 依赖，纯 Supabase 架构</li>
                </ul>
              </div>

              {/* v2.15 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v2.15</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">PWA 自动更新机制</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  优化 PWA 更新体验，解决应用安装后版本不自动更新的问题，用户无需手动卸载重装即可获取最新版本。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 构建时自动更新缓存版本号</li>
                  <li>• 检测新版本弹窗提示用户</li>
                  <li>• 一键刷新获取最新版本</li>
                  <li>• 支持 PWA 安装提示</li>
                </ul>
              </div>

              {/* v2.13 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v2.13</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">下拉刷新功能</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  为所有数据展示页面统一添加下拉刷新交互，提升用户体验，让数据更新更直观便捷。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 新增通用下拉刷新组件</li>
                  <li>• 流畅动画效果（60fps）</li>
                  <li>• 集成 8 个数据展示页面</li>
                  <li>• 完整支持亮色/暗色模式</li>
                </ul>
              </div>

              {/* v2.11 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v2.11</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">深色模式支持</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  新增深色模式主题，适配系统偏好或手动切换，改善夜间使用体验。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 支持浅色/深色/跟随系统三种模式</li>
                  <li>• 所有页面全面适配深色主题</li>
                  <li>• localStorage 持久化主题设置</li>
                </ul>
              </div>

              {/* v2.10 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v2.10</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">任务撤销逻辑</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  增加任务撤销功能，支持家长撤销已审核通过的任务，并自动扣除对应果实数。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 已通过任务可撤销</li>
                  <li>• 自动扣除对应果实</li>
                  <li>• 修复勋章领取时间判断</li>
                </ul>
              </div>

              {/* v2.9 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v2.9</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">PWA 支持</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  应用可安装到主屏幕，支持 Android / iOS 设备，以全屏 App 模式运行。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 支持安装到主屏幕</li>
                  <li>• 静态资源离线缓存</li>
                  <li>• 全屏独立显示模式</li>
                </ul>
              </div>

              {/* v2.8 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v2.8</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">优化树木等级</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  移除冗余的树木等级字段，简化数据模型。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 删除 trees 表 level 字段</li>
                  <li>• 优化数据结构</li>
                </ul>
              </div>

              {/* v2.7 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v2.7</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">补打卡功能</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  支持为过去日期补打卡，同时修复多任务场景下内容向右偏移的布局问题。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 支持历史日期补打卡</li>
                  <li>• 修复布局偏移问题</li>
                </ul>
              </div>

              {/* v2.6 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v2.6</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">儿童模式</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  家长可一键切换儿童模式，限制孩子的操作范围，防止误触编辑目标或访问家长管理功能。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 隐藏编辑和家长管理功能</li>
                  <li>• 切换需密码二次确认</li>
                  <li>• 顶部横幅快捷退出</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
