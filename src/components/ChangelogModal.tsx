import { motion, AnimatePresence } from 'motion/react';

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
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] px-6 py-4 space-y-4">
              {/* v2.13 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded">v2.13</span>
                  <span className="text-sm text-slate-500 dark:text-[var(--text-muted)]">最新</span>
                </div>
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

              {/* v2.12 */}
              <div className="space-y-2 pt-4 border-t border-primary/5 dark:border-[var(--border-color)]">
                <span className="bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded">v2.12</span>
                <h4 className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">PWA 推送通知</h4>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] text-xs leading-relaxed">
                  每天晚上 9:30 自动推送所有孩子的打卡情况汇总，支持用户自主开启/关闭推送，VAPID 认证确保推送安全性。
                </p>
                <ul className="text-xs text-slate-500 dark:text-[var(--text-muted)] space-y-1 ml-2">
                  <li>• 新增推送服务、设置组件和后端路由</li>
                  <li>• 支持每日打卡汇总推送</li>
                  <li>• 在个人中心订阅推送通知</li>
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
