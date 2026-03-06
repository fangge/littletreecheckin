import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { treesApi, childrenApi, TreeData, StatsData, GoalData, CalendarData, CalendarTask } from '../services/api';
import CheckinCalendar from '../components/CheckinCalendar';
import CheckinDetailPopup from '../components/CheckinDetailPopup';

interface DashboardProps {
  onAddGoal: () => void;
  onViewStore: () => void;
  onViewProfile: () => void;
  onEditGoal: (goal: GoalData & { childId?: string }) => void;
}

type TimeFilter = 'month' | 'quarter' | 'year';

const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  month: '本月',
  quarter: '上季度',
  year: '过去一年',
};

export default function Dashboard({ onAddGoal, onViewStore, onViewProfile, onEditGoal }: DashboardProps) {
  const { user, currentChild, setCurrentChild } = useAuth();
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

  useEffect(() => {
    if (!currentChild) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [treesRes, statsRes, goalsRes] = await Promise.all([
          treesApi.list(currentChild.id),
          childrenApi.stats(currentChild.id, timeFilter),
          treesApi.listGoals(currentChild.id),
        ]);
        setTrees(treesRes.data);
        setStats(statsRes.data);
        setGoals(goalsRes.data);
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentChild, timeFilter]);

  // 获取日历打卡数据
  useEffect(() => {
    if (!currentChild) return;

    const fetchCalendar = async () => {
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        const res = await childrenApi.getCheckinCalendar(currentChild.id, year, month);
        setCalendarData(res.data);
      } catch (err) {
        console.error('获取日历数据失败:', err);
      }
    };

    fetchCalendar();
  }, [currentChild, selectedMonth]);

  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
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
    onEditGoal({ ...goal, childId: currentChild?.id });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto pb-32 lg:pb-8"
    >
      <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md border-b border-primary/10 lg:max-w-4xl lg:mx-auto lg:border-x lg:border-primary/10">
        <div className="flex items-center p-4 pb-2 justify-between">
          <button
            onClick={onViewProfile}
            className="flex size-12 shrink-0 items-center justify-start hover:text-primary transition-colors"
            aria-label="设置"
          >
            <span className="material-symbols-outlined text-2xl">settings</span>
          </button>
          <h1 className="text-slate-900 text-xl font-bold leading-tight tracking-tight flex-1 text-center">
            {currentChild ? `${currentChild.name}的森林` : '我的森林'}
          </h1>
          <div className="flex size-12 items-center justify-end">
            <button
              onClick={onViewStore}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-primary/20 text-slate-900"
              aria-label="商店"
            >
              <span className="material-symbols-outlined text-2xl">storefront</span>
            </button>
          </div>
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
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/40'
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
      <div className="px-4 pt-4 pb-2 lg:max-w-4xl lg:mx-auto">
        <CheckinCalendar
          checkinDates={calendarData?.checkin_dates ?? []}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          onDateClick={handleCalendarDateClick}
        />
      </div>

      <div className="flex gap-3 p-4 overflow-x-auto no-scrollbar lg:max-w-4xl lg:mx-auto">
        {(Object.keys(TIME_FILTER_LABELS) as TimeFilter[]).map(filter => (
          <button
            key={filter}
            className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-6 transition-all ${
              timeFilter === filter
                ? 'bg-primary text-white font-bold'
                : 'bg-primary/10 text-slate-700 font-medium hover:bg-primary/20'
            }`}
            onClick={() => handleTimeFilterChange(filter)}
            aria-label={`筛选${TIME_FILTER_LABELS[filter]}数据`}
            aria-pressed={timeFilter === filter}
          >
            <p className="text-sm leading-normal">{TIME_FILTER_LABELS[filter]}</p>
          </button>
        ))}
      </div>

      <div className="px-4 py-2 lg:max-w-4xl lg:mx-auto">
        <div className="bg-primary/5 rounded-xl p-5 border border-primary/20">
          <div className="flex justify-between items-center mb-4">
            <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">森林健康度</p>
            <span className="text-primary font-bold text-sm">
              {stats ? `${stats.forestHealth}% 生长中` : '加载中...'}
            </span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-2xl font-extrabold">{stats?.completedTrees ?? '--'}</p>
              <p className="text-slate-500 text-[10px] sm:text-xs">已长成树木</p>
            </div>
            <div className="flex-1 border-x border-primary/20 px-4">
              <p className="text-2xl font-extrabold text-primary">{stats?.totalApprovedTasks ?? '--'}</p>
              <p className="text-slate-500 text-[10px] sm:text-xs">累计任务</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-2xl font-extrabold">{stats?.activeGoals ?? '--'}</p>
              <p className="text-slate-500 text-[10px] sm:text-xs">新种子</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Goal CTA Banner */}
      <div className="px-4 mt-4 lg:max-w-4xl lg:mx-auto">
        <button
          onClick={onAddGoal}
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

      <h3 className="text-slate-900 tracking-tight text-2xl font-extrabold px-4 pb-4 pt-6 lg:max-w-4xl lg:mx-auto">果园花园</h3>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined text-primary text-4xl animate-pulse">forest</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 lg:max-w-4xl lg:mx-auto">
          {trees.map((tree) => {
            const goal = getGoalForTree(tree);
            // 构建目标详情标签（已完成天数/总天数 / 每日时长 / 每日次数）
            const goalTags: string[] = [];
            if (goal) {
              const completedDays = tree.completed_days ?? 0;
              goalTags.push(`${completedDays}/${goal.duration_days}天`);
              if (goal.duration_minutes && goal.duration_minutes > 0) {
                goalTags.push(
                  goal.duration_minutes >= 60
                    ? `${Math.round(goal.duration_minutes / 60)}h/天`
                    : `${goal.duration_minutes}min/天`
                );
              }
              if (goal.daily_count && goal.daily_count > 0) {
                goalTags.push(`${goal.daily_count}次/天`);
              }
            }
            const checkedInToday = tree.checked_in_today ?? false;
            return (
              <div key={tree.id} className="relative group">
                {/* 编辑按钮：绝对定位在卡片右上角（进行中和已完成的目标均可编辑） */}
                {goal && (
                  <button
                    className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm hover:bg-white active:scale-90 transition-all w-8 h-8 flex items-center justify-center"
                    onClick={e => { e.stopPropagation(); handleEditTree(tree); }}
                    aria-label={`编辑${tree.name}目标`}
                  >
                    <span className="material-symbols-outlined text-slate-700 text-base leading-none">edit</span>
                  </button>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  {tree.status === 'completed' ? (
                    <span className="material-symbols-outlined text-primary text-sm font-bold fill-icon">check_circle</span>
                  ) : checkedInToday ? (
                    <div className="bg-primary/90 px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-white text-[10px] leading-none">check</span>
                      <span className="text-[10px] text-white font-bold">今日已打卡</span>
                    </div>
                  ) : (
                    <div className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      <span className="text-[10px] text-white font-bold flex items-center">{tree.level} 级</span>
                    </div>
                  )}
                </div>
                <div
                  className="bg-cover bg-center flex flex-col gap-2 rounded-xl justify-end p-4 aspect-square overflow-hidden shadow-lg shadow-primary/5"
                  style={{
                    backgroundImage: tree.image
                      ? `linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 65%), url("${tree.image}")`
                      : 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-white text-base font-bold leading-tight">{tree.name}</p>
                  </div>
                  {/* 目标详情标签 */}
                  {goalTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {goalTags.map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] text-white/80 bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {tree.status === 'growing' && (
                    <div className="w-full bg-white/20 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${tree.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Goal Entry */}
          <button
            onClick={onAddGoal}
            className="relative flex flex-col items-center justify-center gap-3 rounded-xl aspect-square border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group"
            aria-label="添加新目标"
          >
            <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">add</span>
            </div>
            <p className="text-primary font-bold text-sm">添加新目标</p>
          </button>
        </div>
      )}

      <div className="px-4 pb-8 text-center lg:max-w-4xl lg:mx-auto">
        <p className="text-slate-500 text-sm">继续完成任务，解锁更多珍稀树木！</p>
      </div>

      {/* 打卡详情浮层 */}
      <CheckinDetailPopup
        date={selectedCalendarDate}
        tasks={selectedDateTasks}
        onClose={handleCloseDetailPopup}
      />

      {/* FAB：仅移动端显示，桌面端通过侧边栏导航操作 */}
      <div className="fixed bottom-24 right-6 z-30 lg:hidden">
        <button
          onClick={onAddGoal}
          className="flex size-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/40 text-white transition-transform active:scale-95"
          aria-label="快速添加目标"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>
    </motion.div>
  );
}
