import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePendingTasksCount } from '../hooks/usePendingTasksCount';

// 路径到导航项的映射
const pathNavMap: Record<string, string> = {
  '/': 'tasks',
  '/forest': 'forest',
  '/medals': 'medals',
  '/store': 'store',
  '/profile': 'parent',
};

const allNavItems = [
  { id: 'tasks', label: '任务', icon: 'check_circle', path: '/' },
  { id: 'forest', label: '成长树', icon: 'park', path: '/forest' },
  { id: 'medals', label: '勋章', icon: 'workspace_premium', path: '/medals' },
  { id: 'store', label: '商店', icon: 'storefront', path: '/store' },
  { id: 'parent', label: '家长中心', icon: 'family_restroom', parentOnly: true, path: '/profile' },
];

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isChildMode } = useAuth();
  const pendingCount = usePendingTasksCount();

  const currentPathId = pathNavMap[location.pathname] || '';

  // 过滤掉儿童模式下的受限项（家长中心）
  const navItems = allNavItems.filter(item => !item.parentOnly || !isChildMode);

  return (
    <>
      {/* 移动端底部导航（< lg） */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-primary/10 dark:border-[var(--border-color)] bg-white/90 dark:bg-[var(--bg-surface)]/90 backdrop-blur-xl px-4 pb-6 pt-3 lg:hidden transition-colors">
        <div className="flex gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-1 flex-col items-center justify-end gap-1 transition-colors ${
                currentPathId === item.id ? 'text-primary' : 'text-slate-400 dark:text-[var(--text-muted)]'
              }`}
              aria-label={item.label}
              aria-current={currentPathId === item.id ? 'page' : undefined}
            >
              <span className="relative inline-flex">
                <span className={`material-symbols-outlined text-2xl ${currentPathId === item.id ? 'fill-icon' : ''}`}>
                  {item.icon}
                </span>
                {item.id === 'parent' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </span>
              <p className="text-[10px] font-bold leading-normal tracking-wide">{item.label}</p>
            </button>
          ))}
        </div>
      </nav>

      {/* 桌面端左侧边栏（≥ lg） */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-60 flex-col bg-white dark:bg-[var(--bg-surface)] border-r border-primary/10 dark:border-[var(--border-color)] z-20 transition-colors">
        {/* Logo 区域 */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-primary/10 dark:border-[var(--border-color)]">
          <div className="size-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl fill-icon">forest</span>
          </div>
          <div>
            <p className="text-slate-900 dark:text-[var(--text-primary)] font-extrabold text-sm leading-tight">成就丛林</p>
            <p className="text-slate-400 dark:text-[var(--text-muted)] text-[10px]">Achievement Jungle</p>
          </div>
        </div>

        {/* 导航项 */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all text-left w-full ${
                currentPathId === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-500 dark:text-[var(--text-secondary)] hover:bg-slate-50 dark:hover:bg-[var(--bg-card)] hover:text-slate-700 dark:hover:text-[var(--text-primary)]'
              }`}
              aria-label={item.label}
              aria-current={currentPathId === item.id ? 'page' : undefined}
            >
              <span className="relative inline-flex shrink-0">
                <span className={`material-symbols-outlined text-xl ${currentPathId === item.id ? 'fill-icon' : ''}`}>
                  {item.icon}
                </span>
                {item.id === 'parent' && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </span>
              {item.label}
              {item.id === 'parent' && pendingCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* 底部版权 */}
        <div className="px-6 py-4 border-t border-primary/10 dark:border-[var(--border-color)]">
          <p className="text-slate-400 dark:text-[var(--text-muted)] text-[10px]">©2026 成就丛林</p>
        </div>
      </aside>
    </>
  );
}
