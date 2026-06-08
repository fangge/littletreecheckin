import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { treesApi, childrenApi, TreeData, StatsData, GoalData, CalendarData, CalendarTask, invalidateChildDataCache } from '../services/api';
import CheckinCalendar from '../components/CheckinCalendar';
import CheckinDetailPopup from '../components/CheckinDetailPopup';
import MonthlySummaryModal from '../components/MonthlySummaryModal';
import PullToRefresh from '../components/PullToRefresh';

type TimeFilter = 'month' | 'quarter' | 'year';

const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  month: '本月',
  quarter: '上季度',
  year: '过去一年',
};

// rendering-hoist-jsx: 将静态映射表提取到模块级别，避免每次渲染重建
const CATEGORY_MAP: Record<string, { text: string; className: string }> = {
  auto_stories: { text: '学习', className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
  fitness_center: { text: '运动', className: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' },
  brush: { text: '艺术', className: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400' },
  piano: { text: '音乐', className: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' },
  cleaning_services: { text: '劳动', className: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' },
  rocket_launch: { text: '探索', className: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' },
  psychology: { text: '思维', className: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400' },
  sports_soccer: { text: '运动', className: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' },
};

const DEFAULT_CATEGORY = { text: '生活', className: 'bg-slate-100 text-slate-500 dark:bg-[var(--bg-card)] dark:text-[var(--text-muted)]' };

// 根据时间范围获取对应的月份列表（用于成就单多月数据聚合）
const getMonthsForFilter = (filter: TimeFilter): Date[] => {
  const now = new Date();
  const months: Date[] = [];

  if (filter === 'month') {
    months.push(new Date(now.getFullYear(), now.getMonth(), 1));
  } else if (filter === 'quarter') {
    // 上季度：3个月
    const currentQuarterStart = Math.floor(now.getMonth() / 3) * 3;
    let prevQuarterStart = currentQuarterStart - 3;
    let year = now.getFullYear();
    if (prevQuarterStart < 0) {
      prevQuarterStart += 12;
      year -= 1;
    }
    for (let i = 0; i < 3; i++) {
      months.push(new Date(year, prevQuarterStart + i, 1));
    }
  } else {
    // 过去12个月（包含当前月）
    for (let i = 11; i >= 0; i--) {
      months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
  }

  return months;
};

// 根据时间范围获取日历应该跳转到的起始月
const getCalendarMonthForFilter = (filter: TimeFilter): Date => {
  const now = new Date();

  if (filter === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (filter === 'quarter') {
    const currentQuarterStart = Math.floor(now.getMonth() / 3) * 3;
    let prevQuarterStart = currentQuarterStart - 3;
    let year = now.getFullYear();
    if (prevQuarterStart < 0) {
      prevQuarterStart += 12;
      year -= 1;
    }
    return new Date(year, prevQuarterStart, 1);
  } else {
    // 过去一年的起始月（11个月前）
    return new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, currentChild, setCurrentChild, isChildMode } = useAuth();
  const [trees, setTrees] = useState<TreeData[]>([]);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  // 日历相关状态
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  const [summaryCalendarData, setSummaryCalendarData] = useState<CalendarData | null>(null);

  useEffect(() => {
    if (!currentChild) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 使用聚合接口一次获取树木+目标+统计数据（替代3次独立请求，减少 ~7 次冗余 DB 查询）
        // 同时获取日历数据，避免重复请求（性能优化）
        const [dashboardRes, calendarRes] = await Promise.all([
          treesApi.dashboardData(currentChild.id, timeFilter),
          childrenApi.getCheckinCalendar(
            currentChild.id,
            selectedMonth.getFullYear(),
            selectedMonth.getMonth() + 1
          ),
        ]);
        
        setTrees(dashboardRes.data.trees);
        setGoals(dashboardRes.data.goals);
        setStats(dashboardRes.data.stats);
        setCalendarData(calendarRes.data);
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentChild, timeFilter, selectedMonth]);

  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    // 切换时间范围时，日历同步跳转到对应的起始月
    setSelectedMonth(getCalendarMonthForFilter(filter));
    // 清空成就单缓存，避免下次打开显示旧数据
    setSummaryCalendarData(null);
  };

  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date);
  };

  const handleCalendarDateClick = (date: string) => {
    setSelectedCalendarDate(date);
  };

  const handleCloseDetailPopup = () => {
    setSelectedCalendarDate(null);
  };

  // 打开成就单：根据 timeFilter 获取对应时间范围的数据
  const handleOpenSummary = async () => {
    if (!currentChild) return;
    // 先清空数据，Modal 内立即显示 loading
    setSummaryCalendarData(null);
    setShowMonthlySummary(true);

    if (timeFilter === 'month') {
      // 本月直接使用已有的日历数据
      setSummaryCalendarData(calendarData);
      return;
    }

    // quarter / year：并行获取多月数据并合并
    try {
      const months = getMonthsForFilter(timeFilter);
      const results = await Promise.all(
        months.map(m =>
          childrenApi.getCheckinCalendar(currentChild.id, m.getFullYear(), m.getMonth() + 1)
        )
      );

      const merged: CalendarData = {
        checkin_dates: [],
        shared_completed_dates: [],
        tasks_by_date: {},
      };

      results.forEach(res => {
        merged.checkin_dates.push(...res.data.checkin_dates);
        merged.shared_completed_dates.push(...res.data.shared_completed_dates);
        Object.assign(merged.tasks_by_date, res.data.tasks_by_date);
      });

      setSummaryCalendarData(merged);
    } catch (err) {
      console.error('获取成就单数据失败:', err);
      setSummaryCalendarData(calendarData);
    }
  };

  // 获取选中日期的任务列表
  const selectedDateTasks: CalendarTask[] =
    selectedCalendarDate && calendarData?.tasks_by_date[selectedCalendarDate]
      ? calendarData.tasks_by_date[selectedCalendarDate]
      : [];

  // 通过 goal_id 找到对应的目标
  const getGoalForTree = (tree: TreeData): GoalData | undefined => {
    if (!tree.goal_id) return undefined;
    return goals.find(g => g.id === tree.goal_id);
  };

  const handleEditTree = (tree: TreeData) => {
    const goal = getGoalForTree(tree);
    if (!goal) return;
    // 通过 URL state 传递编辑目标数据
    navigate('/add-goal', { state: { editGoal: { ...goal, childId: currentChild?.id } } });
  };

  // 下拉刷新处理函数（清除缓存后强制刷新）
  const handleRefresh = useCallback(async () => {
    if (!currentChild) return;

    // 先清除该孩子的所有缓存，确保获取最新数据
    invalidateChildDataCache(currentChild.id);
    
    try {
      // 聚合接口 + 日历接口并行
      const [dashboardRes, calendarRes] = await Promise.all([
        treesApi.dashboardData(currentChild.id, timeFilter),
        childrenApi.getCheckinCalendar(
          currentChild.id,
          selectedMonth.getFullYear(),
          selectedMonth.getMonth() + 1
        ),
      ]);
      
      setTrees(dashboardRes.data.trees);
      setGoals(dashboardRes.data.goals);
      setStats(dashboardRes.data.stats);
      setCalendarData(calendarRes.data);
    } catch (err) {
      console.error('刷新数据失败:', err);
    }
  }, [currentChild, timeFilter, selectedMonth]);

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={showMonthlySummary || selectedCalendarDate !== null}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 pb-32 lg:pb-8"
      >
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-primary/10 dark:border-[var(--border-color)] lg:max-w-4xl lg:mx-auto lg:border-x lg:border-primary/10 dark:lg:border-[var(--border-color)] transition-colors">
        <div className="flex items-center p-4 pb-2 justify-between">
          <button
            onClick={() => navigate('/profile')}
            className="flex size-12 shrink-0 items-center justify-start hover:text-primary transition-colors"
            aria-label="设置"
          >
            <span className="material-symbols-outlined text-2xl">settings</span>
          </button>
          <h1 className="text-slate-900 dark:text-[var(--text-primary)] text-xl font-bold leading-tight tracking-tight flex-1 text-center">
            {currentChild ? `${currentChild.name}的森林` : '我的森林'}
          </h1>
          <div className="flex size-12 items-center justify-end" />
        </div>
        {/* 多孩子切换器 */}
        {user?.children && user.children.length > 1 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            {user.children.map(child => (
              <button
                key={child.id}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  currentChild?.id === child.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white dark:bg-[var(--bg-surface)] border border-slate-200 dark:border-[var(--border-color)] text-slate-600 dark:text-[var(--text-secondary)] hover:border-primary/40'
                }`}
                onClick={() => setCurrentChild(child)}
                aria-label={`切换到${child.name}`}
              >
                <span className="material-symbols-outlined text-sm">
                  {child.gender === 'female' ? 'face_3' : 'face'}
                </span>
                {child.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 打卡日历 */}
      <div className="px-4 pt-3 pb-1 lg:max-w-4xl lg:mx-auto">
        <CheckinCalendar
          checkinDates={calendarData?.checkin_dates ?? []}
          sharedCompletedDates={calendarData?.shared_completed_dates ?? []}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          onDateClick={handleCalendarDateClick}
        />
      </div>

      <div className="flex gap-3 p-4 overflow-x-auto no-scrollbar lg:max-w-4xl lg:mx-auto">
        <div className="flex gap-3 flex-1 overflow-x-auto no-scrollbar">
          {(Object.keys(TIME_FILTER_LABELS) as TimeFilter[]).map(filter => (
            <button
              key={filter}
              className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-6 transition-all ${
                timeFilter === filter
                  ? 'bg-primary text-white font-bold'
                  : 'bg-primary/10 dark:bg-[var(--bg-card)] text-slate-700 dark:text-[var(--text-primary)] font-medium hover:bg-primary/20'
              }`}
              onClick={() => handleTimeFilterChange(filter)}
              aria-label={`筛选${TIME_FILTER_LABELS[filter]}数据`}
              aria-pressed={timeFilter === filter}
            >
              <p className="text-sm leading-normal">{TIME_FILTER_LABELS[filter]}</p>
            </button>
          ))}
        </div>
        {/* 任务总结入口按钮 */}
        <button
          onClick={handleOpenSummary}
          className="flex h-10 shrink-0 items-center justify-center gap-x-1.5 rounded-full px-4 bg-gradient-to-r from-primary to-emerald-500 text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95"
          aria-label="查看月度任务总结"
        >
          <span className="material-symbols-outlined text-lg">emoji_events</span>
          <p className="text-sm leading-normal">成就单</p>
        </button>
      </div>

      <div className="px-4 py-1 lg:max-w-4xl lg:mx-auto">
        <div className="bg-primary/5 dark:bg-[var(--bg-card)] rounded-xl p-3.5 border border-primary/20 dark:border-[var(--border-color)]">
          <div className="flex justify-between items-center mb-2.5">
            <p className="text-slate-600 dark:text-[var(--text-secondary)] font-bold uppercase text-[11px] tracking-widest">森林健康度</p>
            <span className="text-primary font-bold text-xs">
              {stats ? `${stats.forestHealth}% 生长中` : '加载中...'}
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-xl font-extrabold dark:text-[var(--text-primary)] leading-tight">{stats?.completedTrees ?? '--'}</p>
              <p className="text-slate-500 dark:text-[var(--text-muted)] text-[10px]">已长成树木</p>
            </div>
            <div className="flex-1 border-x border-primary/20 dark:border-[var(--border-color)] px-3">
              <p className="text-xl font-extrabold text-primary leading-tight">{stats?.totalApprovedTasks ?? '--'}</p>
              <p className="text-slate-500 dark:text-[var(--text-muted)] text-[10px]">累计任务</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-xl font-extrabold dark:text-[var(--text-primary)] leading-tight">{stats?.activeGoals ?? '--'}</p>
              <p className="text-slate-500 dark:text-[var(--text-muted)] text-[10px]">新种子</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Goal CTA Banner（儿童模式下隐藏） */}
      {!isChildMode && (
        <div className="px-4 mt-4 lg:max-w-4xl lg:mx-auto">
          <button
            onClick={() => navigate('/add-goal')}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 p-4 rounded-2xl flex items-center justify-between text-white shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            aria-label="添加新目标"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">rocket_launch</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">准备好迎接新挑战了吗？</p>
                <p className="text-[10px] opacity-80">点击这里种下你的下一个成长之树</p>
              </div>
            </div>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}

      <h3 className="text-slate-900 dark:text-[var(--text-primary)] tracking-tight text-2xl font-extrabold px-4 pb-4 pt-6 lg:max-w-4xl lg:mx-auto">果园花园</h3>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined text-primary text-4xl animate-pulse">forest</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 lg:max-w-4xl lg:mx-auto">
          {trees.map((tree) => {
            const goal = getGoalForTree(tree);
            const checkedInToday = tree.checked_in_today ?? false;
            const isDone = tree.status === 'completed' || checkedInToday;
            const category = goal?.icon ? (CATEGORY_MAP[goal.icon] ?? DEFAULT_CATEGORY) : null;

            return (
              <div
                key={tree.id}
                className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl px-4 py-4 shadow-sm border border-slate-100 dark:border-[var(--border-color)] flex items-center justify-between gap-3 transition-colors"
              >
                {/* 左侧：分类标签 + 树木名称 */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  {category && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${category.className}`}>
                      {category.text}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xl shrink-0">🍎</span>
                    <p className="text-slate-900 dark:text-[var(--text-primary)] text-lg font-bold leading-tight truncate">{tree.name}</p>
                    {goal?.is_shared && (
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/shared-task/${goal.id}`); }}
                        className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 whitespace-nowrap active:scale-95 transition-transform"
                        aria-label="查看共享任务详情"
                      >
                        <span className="material-symbols-outlined text-[10px]">group</span>
                        共享
                      </button>
                    )}
                  </div>
                </div>

                {/* 右侧：果实数 + 状态 + 编辑 */}
                <div className="flex items-center gap-2 shrink-0">
                  {goal?.fruits_per_task && goal.fruits_per_task > 0 && (
                    <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      +{goal.fruits_per_task} 果实
                    </span>
                  )}
                  {isDone && (
                    <span className="material-symbols-outlined text-primary text-2xl fill-icon">check_circle</span>
                  )}
                  {goal && !isChildMode && (
                    <button
                      className="text-slate-300 dark:text-[var(--text-muted)] hover:text-slate-500 dark:hover:text-[var(--text-secondary)] active:scale-90 transition-all"
                      onClick={e => { e.stopPropagation(); handleEditTree(tree); }}
                      aria-label={`编辑${tree.name}目标`}
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Goal Entry（儿童模式下隐藏） */}
          {!isChildMode && (
            <button
              onClick={() => navigate('/add-goal')}
              className="flex items-center gap-3 bg-white dark:bg-[var(--bg-surface)] rounded-2xl px-4 py-4 border-2 border-dashed border-primary/30 dark:border-[var(--border-color)] hover:bg-primary/5 transition-colors"
              aria-label="添加新目标"
            >
              <div className="size-9 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-xl">add</span>
              </div>
              <p className="text-primary font-bold text-sm">添加新目标</p>
            </button>
          )}
        </div>
      )}

      <div className="px-4 pb-8 text-center lg:max-w-4xl lg:mx-auto">
        <p className="text-slate-500 dark:text-[var(--text-muted)] text-sm">继续完成任务，解锁更多果实！</p>
      </div>

      {/* 打卡详情浮层 */}
      <CheckinDetailPopup
        date={selectedCalendarDate}
        tasks={selectedDateTasks}
        onClose={handleCloseDetailPopup}
      />

      {/* 月度任务总结弹窗 */}
      <MonthlySummaryModal
        isOpen={showMonthlySummary}
        onClose={() => setShowMonthlySummary(false)}
        calendarData={summaryCalendarData}
        selectedMonth={selectedMonth}
        childName={currentChild?.name}
        timeFilter={timeFilter}
      />

      {/* FAB：仅移动端显示，儿童模式下隐藏 */}
      {!isChildMode && (
        <div className="fixed bottom-24 right-6 z-30 lg:hidden">
          <button
            onClick={() => navigate('/add-goal')}
            className="flex size-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/40 text-white transition-transform active:scale-95"
            aria-label="快速添加目标"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
      )}
      </motion.div>
    </PullToRefresh>
  );
}
