import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  tasksApi,
  treesApi,
  TreeData,
  TaskData,
  GoalData
} from '../services/api';
import CelebrationPopup from '../components/CelebrationPopup';

interface CheckInProps {
  onViewMessages: () => void;
  onViewProfile: () => void;
}

export default function CheckIn({
  onViewMessages,
  onViewProfile
}: CheckInProps) {
  const { user, currentChild, setCurrentChild } = useAuth();
  const { isDark } = useTheme();
  const [growingTrees, setGrowingTrees] = useState<TreeData[]>([]);
  const [selectedTree, setSelectedTree] = useState<TreeData | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [todayTasks, setTodayTasks] = useState<Record<string, TaskData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    treeProgress: number;
    treeName: string;
    isTreeCompleted: boolean;
  }>({ treeProgress: 0, treeName: '小树', isTreeCompleted: false });

  // 获取 UTC+8 今天的日期字符串 YYYY-MM-DD
  const getUTC8Today = (): string => {
    const utc8Offset = 8 * 60 * 60 * 1000;
    return new Date(Date.now() + utc8Offset).toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getUTC8Today());

  const fetchData = useCallback(async () => {
    if (!currentChild) return;
    setIsLoading(true);
    try {
      // 并行获取进行中的树木、今日任务和目标列表
      const [treesRes, tasksRes, goalsRes] = await Promise.all([
        treesApi.list(currentChild.id, 'growing'),
        tasksApi.list(currentChild.id),
        treesApi.listGoals(currentChild.id)
      ]);

      setGrowingTrees(treesRes.data);
      setGoals(goalsRes.data);
      if (treesRes.data.length > 0) {
        setSelectedTree((prev) => {
          const stillExists = treesRes.data.find((t) => t.id === prev?.id);
          return stillExists || treesRes.data[0];
        });
      }

      // 按 "日期_goal_id" 建立任务映射（只保留最新的一条，因为列表已按时间倒序）
      // 使用 UTC+8 时区的日期，避免跨时区导致的日期判断错误
      const utc8Offset = 8 * 60 * 60 * 1000;
      const taskMap: Record<string, TaskData> = {};
      for (const task of tasksRes.data) {
        // 将 checkin_time 转换为 UTC+8 时区的日期再比较
        const taskDate = new Date(
          new Date(task.checkin_time).getTime() + utc8Offset
        )
          .toISOString()
          .split('T')[0];
        if (task.goal_id) {
          const key = `${taskDate}_${task.goal_id}`;
          if (!taskMap[key]) {
            // 只保留第一条（最新的），避免旧的 rejected 记录覆盖新的 pending 记录
            taskMap[key] = task;
          }
        }
      }
      setTodayTasks(taskMap);
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentChild]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 获取当前选中树木在指定日期的打卡状态
  const getTaskForTreeOnDate = (tree: TreeData | null, date: string): TaskData | null => {
    if (!tree?.goal_id) return null;
    return todayTasks[`${date}_${tree.goal_id}`] || null;
  };

  const handleCheckin = async () => {
    if (!selectedTree?.goal_id || !currentChild) {
      setError('请先选择一个目标');
      return;
    }
    
    setIsChecking(true);
    setError('');

    try {
      const isBackfill = selectedDate !== getUTC8Today();
      const res = await tasksApi.checkin(
        selectedTree.goal_id,
        currentChild.id,
        undefined,
        isBackfill ? selectedDate : undefined
      );
      // 更新任务映射
      setTodayTasks((prev) => ({
        ...prev,
        [`${selectedDate}_${selectedTree.goal_id!}`]: res.data
      }));
      // 打卡成功后弹出庆祝弹窗，传递最新树木进度
      // 从刷新后的数据中获取当前树木的最新状态
      const refreshedTreesRes = await treesApi.list(currentChild.id);
      const refreshedTree = refreshedTreesRes.data.find(
        (t) => t.id === selectedTree.id
      );
      setCelebrationData({
        treeProgress: refreshedTree?.progress ?? selectedTree.progress,
        treeName: refreshedTree?.name ?? selectedTree.name,
        isTreeCompleted: refreshedTree?.status === 'completed'
      });
      setIsCelebrationOpen(true);
      // 刷新树木数据
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '打卡失败，请重试');
    } finally {
      setIsChecking(false);
    }
  };

  const currentTree = selectedTree;
  const currentGoal = currentTree?.goal_id
    ? (goals.find((g) => g.id === currentTree.goal_id) ?? null)
    : null;
  const todayTask = getTaskForTreeOnDate(currentTree, selectedDate);
  const hasCheckedInToday = !!todayTask;
  const taskStatus = todayTask?.status;

  // 将 ISO 时间字符串格式化为北京时间显示
  const formatCheckinTime = (isoString: string): string => {
    return new Date(isoString).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const today = getUTC8Today();
  const isBackfillDate = selectedDate !== today;

  // 格式化日期为中文显示
  const formatDateDisplay = (dateStr: string): string => {
    if (dateStr === today) return '今天';
    const date = new Date(dateStr + 'T00:00:00+08:00');
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Shanghai'
    });
  };

  const getStatusText = () => {
    if (!hasCheckedInToday) return null;
    const dateLabel = isBackfillDate ? formatDateDisplay(selectedDate) : '今日';
    switch (taskStatus) {
      case 'pending':
        return {
          text: '等待家长审核中...',
          color: 'text-amber-500',
          bg: 'bg-amber-50 border-amber-200'
        };
      case 'approved':
        return {
          text: `${dateLabel}任务已通过 🎉`,
          color: 'text-green-600',
          bg: 'bg-green-50 border-green-200'
        };
      case 'rejected':
        return {
          text: '任务被拒绝，可重新打卡',
          color: 'text-red-500',
          bg: 'bg-red-50 border-red-200'
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusText();
  const canCheckin = !hasCheckedInToday || taskStatus === 'rejected';

  return (
    <>
      <CelebrationPopup
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        treeProgress={celebrationData.treeProgress}
        treeName={celebrationData.treeName}
        isTreeCompleted={celebrationData.isTreeCompleted}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pb-32 lg:pb-8 w-full"
      >
        <header className="w-full bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-10 px-3 lg:max-w-xl lg:mx-auto transition-colors">
          <div className="flex items-center py-4 justify-between">
            <button
              onClick={onViewProfile}
              className="text-slate-900 dark:text-[var(--text-primary)] flex size-12 shrink-0 items-center justify-start hover:text-primary transition-colors"
              aria-label="设置"
            >
              <span className="material-symbols-outlined text-2xl">
                settings
              </span>
            </button>
            <h2 className="text-slate-900 dark:text-[var(--text-primary)] text-lg font-bold leading-tight tracking-tight flex-1 text-center font-display">
              {currentChild ? `${currentChild.name}的打卡` : '每日打卡'}
            </h2>
            <div className="flex w-12 items-center justify-end">
              <button
                onClick={onViewMessages}
                className="flex items-center justify-center rounded-full size-10 bg-primary/10 text-primary"
                aria-label="消息"
              >
                <span className="material-symbols-outlined text-2xl fill-icon">
                  mail
                </span>
              </button>
            </div>
          </div>
          {/* 多孩子切换器 */}
          {user?.children && user.children.length > 1 && (
            <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
              {user.children.map((child) => (
                <button
                  key={child.id}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    currentChild?.id === child.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-color)] text-slate-600 dark:text-[var(--text-secondary)] hover:border-primary/40'
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

        {isLoading ? (
          <div className="flex justify-center py-12 px-3">
            <span className="material-symbols-outlined text-primary text-5xl animate-pulse">
              forest
            </span>
          </div>
        ) : growingTrees.length === 0 ? (
          <div className="text-center py-12 px-3 text-slate-400 dark:text-[var(--text-muted)] space-y-4">
            <span className="material-symbols-outlined text-6xl block">
              park
            </span>
            <p className="text-lg font-semibold">还没有进行中的目标</p>
            <p className="text-sm">去首页添加一个新目标吧！</p>
          </div>
        ) : (
          <div className="w-full space-y-4 pb-4 px-3">
            {/* 树木选择 */}
            {growingTrees.length > 1 && (
              <div className="w-0 min-w-full flex gap-2 overflow-x-auto no-scrollbar lg:overflow-visible lg:flex-wrap">
                {growingTrees.map((tree) => {
                  const treeTask = getTaskForTreeOnDate(tree, selectedDate);
                  return (
                    <button
                      key={tree.id}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${
                        selectedTree?.id === tree.id
                          ? 'bg-primary text-white'
                          : 'bg-primary/10 text-slate-700 dark:text-[var(--text-secondary)]'
                      }`}
                      onClick={() => setSelectedTree(tree)}
                    >
                      {tree.name}
                      {treeTask?.status === 'approved' && (
                        <span className="text-xs">✓</span>
                      )}
                      {treeTask?.status === 'pending' && (
                        <span className="text-xs">⏳</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative w-full max-w-sm mx-auto h-52 bg-gradient-to-b from-blue-100 dark:from-[#1a3d3a] to-primary/5 dark:to-[var(--bg-surface)] rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center border-4 border-white dark:border-[var(--bg-card)] transition-colors">
              <div className="absolute top-8 left-8 text-yellow-400">
                <span className="material-symbols-outlined text-6xl fill-icon">
                  light_mode
                </span>
              </div>
              <div className="absolute top-12 right-12 text-white/80">
                <span className="material-symbols-outlined text-4xl fill-icon">
                  cloud
                </span>
              </div>

              <div className="relative z-0 mt-auto mb-8">
                {(() => {
                  // 根据进度计算树的大小：0% → 64px，100% → 128px
                  const progress = currentTree?.progress ?? 0;
                  const minSize = 64;
                  const maxSize = 128;
                  const treeSize = Math.round(minSize + (maxSize - minSize) * (progress / 100));
                  const shadowWidth = Math.round(48 + 48 * (progress / 100));

                  return (
                    <>
                      {currentTree?.image ? (
                        <motion.div
                          animate={{ width: treeSize, height: treeSize }}
                          transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                          className="bg-contain bg-center bg-no-repeat"
                          style={{ backgroundImage: `url('${currentTree.image}')` }}
                        />
                      ) : (
                        <motion.div
                          animate={{ width: treeSize, height: treeSize }}
                          transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                          className="flex items-center justify-center"
                        >
                          <span
                            className="material-symbols-outlined text-primary fill-icon"
                            style={{ fontSize: treeSize }}
                          >
                            park
                          </span>
                        </motion.div>
                      )}
                      <motion.div
                        animate={{ width: shadowWidth }}
                        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-6 bg-slate-900/10 blur-md rounded-full"
                      />
                    </>
                  );
                })()}
              </div>

              <div className="absolute bottom-0 w-full h-12 bg-primary/20 flex items-center justify-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
                  {currentTree
                    ? currentTree.name
                    : '幼苗阶段'}
                </p>
              </div>
            </div>

            <div className="w-full max-w-sm mx-auto space-y-4">
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* 今日打卡状态提示 */}
              {statusInfo && (
                <div
                  className={`px-4 py-3 border rounded-xl text-sm font-medium flex items-center justify-between gap-2 ${statusInfo.bg} ${statusInfo.color}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">
                      {taskStatus === 'approved'
                        ? 'check_circle'
                        : taskStatus === 'rejected'
                          ? 'cancel'
                          : 'hourglass_empty'}
                    </span>
                    {statusInfo.text}
                  </div>
                  {todayTask?.checkin_time && (
                    <span className="text-xs opacity-70 shrink-0">
                      {formatCheckinTime(todayTask.checkin_time)}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 p-4 bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-slate-100 dark:border-[var(--border-color)] transition-colors">
                <div className="flex gap-6 justify-between items-center">
                  <p className="text-slate-900 dark:text-[var(--text-primary)] text-base font-bold">成长进度</p>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full">
                    {currentTree?.progress ?? 0}%
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-[var(--bg-card)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(13,242,13,0.5)] transition-all"
                    style={{ width: `${currentTree?.progress ?? 0}%` }}
                  />
                </div>
                <p className="text-primary text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">
                    water_drop
                  </span>
                  {currentTree
                    ? `还需 ${100 - (currentTree.progress ?? 0)}% 就能结果啦！`
                    : '坚持完成好习惯，让你的幼苗长成参天大树吧。'}
                </p>
                {/* 目标详情：时长 / 每日时长 / 每日次数 */}
                {currentGoal && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-[var(--border-color)]">
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-[var(--text-muted)] bg-slate-50 dark:bg-[var(--bg-card)] px-2 py-1 rounded-full">
                      <span className="material-symbols-outlined text-sm">
                        calendar_month
                      </span>
                      目标 {currentGoal.duration_days} 天
                    </span>
                    {currentGoal.duration_minutes > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-[var(--text-muted)] bg-slate-50 dark:bg-[var(--bg-card)] px-2 py-1 rounded-full">
                        <span className="material-symbols-outlined text-sm">
                          schedule
                        </span>
                        {currentGoal.duration_minutes >= 60
                          ? `每天 ${Math.round(currentGoal.duration_minutes / 60)} 小时`
                          : `每天 ${currentGoal.duration_minutes} 分钟`}
                      </span>
                    )}
                    {currentGoal.daily_count && currentGoal.daily_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-[var(--text-muted)] bg-slate-50 dark:bg-[var(--bg-card)] px-2 py-1 rounded-full">
                        <span className="material-symbols-outlined text-sm">
                          repeat
                        </span>
                        每天 {currentGoal.daily_count} 次
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center py-4">
                <h1 className="text-slate-900 dark:text-[var(--text-primary)] tracking-tight text-3xl font-extrabold leading-tight">
                  {!hasCheckedInToday
                    ? (isBackfillDate ? '补打卡' : '浇水时间到！')
                    : taskStatus === 'approved'
                      ? `${isBackfillDate ? formatDateDisplay(selectedDate) : '今日'}已完成！🎉`
                      : taskStatus === 'rejected'
                        ? '需要重新打卡'
                        : `${isBackfillDate ? formatDateDisplay(selectedDate) : '今日'}已打卡！`}
                </h1>
                <p className="text-slate-500 dark:text-[var(--text-secondary)] mt-2">
                  {!hasCheckedInToday
                    ? (isBackfillDate
                        ? `为 ${formatDateDisplay(selectedDate)} 补打卡，记录你的坚持！`
                        : '坚持完成好习惯，让你的幼苗长成参天大树吧。')
                    : taskStatus === 'approved'
                      ? '家长已审核通过，树木正在成长！'
                      : taskStatus === 'rejected'
                        ? todayTask?.reject_reason ||
                          '家长建议改进，重新打卡吧！'
                        : '等待家长审核，继续加油！'}
                </p>
              </div>

              {/* 打卡日期选择器 */}
              <div className="flex items-center justify-center">
                <label className="relative flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-color)] rounded-full shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
                  <span className="material-symbols-outlined text-primary text-xl">
                    calendar_month
                  </span>
                  <span className="text-slate-600 dark:text-[var(--text-secondary)] text-sm font-medium">
                    打卡日期：
                  </span>
                  <span className="text-primary font-bold text-sm">
                    {formatDateDisplay(selectedDate)}
                  </span>
                  <span className="material-symbols-outlined text-slate-400 dark:text-[var(--text-muted)] text-base">
                    expand_more
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    max={today}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    aria-label="选择打卡日期"
                  />
                </label>
              </div>

              <button
                className="w-full py-6 bg-primary text-background-dark text-xl font-extrabold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleCheckin}
                disabled={isChecking || !canCheckin}
                aria-label={isBackfillDate ? '补打卡' : '立即打卡'}
              >
                <span className="material-symbols-outlined text-3xl">
                  task_alt
                </span>
                {isChecking
                  ? '打卡中...'
                  : !canCheckin
                    ? taskStatus === 'approved'
                      ? `${isBackfillDate ? formatDateDisplay(selectedDate) : '今日'}已完成`
                      : '等待审核中'
                    : taskStatus === 'rejected'
                      ? '重新打卡'
                      : isBackfillDate
                        ? `补打卡 · ${formatDateDisplay(selectedDate)}`
                        : '立即打卡'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
