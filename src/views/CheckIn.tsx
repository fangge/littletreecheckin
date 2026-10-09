import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { usePendingTasks } from '../contexts/PendingTasksContext';
import Icon from '../components/Icon';
import {
  childrenApi,
  tasksApi,
  treesApi,
  medalsApi,
  TreeData,
  TaskData,
  GoalData,
  MedalData,
  invalidateChildDataCache
} from '../services/api';
import CelebrationPopup, { preloadTreeGifs } from '../components/CelebrationPopup';
import MedalUnlockPopup from '../components/MedalUnlockPopup';
import PullToRefresh from '../components/PullToRefresh';

export default function CheckIn() {
  const navigate = useNavigate();
  const { user, currentChild, setCurrentChild } = useAuth();
  const { refreshPendingCount } = usePendingTasks();
  // 获取 UTC+8 今天的日期字符串 YYYY-MM-DD
  const getUTC8Today = (): string => {
    const utc8Offset = 8 * 60 * 60 * 1000;
    return new Date(Date.now() + utc8Offset).toISOString().split('T')[0];
  };

  const [trees, setTrees] = useState<TreeData[]>([]);
  const [selectedTree, setSelectedTree] = useState<TreeData | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [todayTasks, setTodayTasks] = useState<Record<string, TaskData>>({});
  const [allTasks, setAllTasks] = useState<TaskData[]>([]);
  const [selectedTreeTasks, setSelectedTreeTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    treeProgress: number;
    treeName: string;
    isTreeCompleted: boolean;
  }>({ treeProgress: 0, treeName: '小树', isTreeCompleted: false });
  // 记录当前打卡的目标是否为共享任务，以及对应的 goalId
  const sharedGoalIdRef = useRef<string | null>(null);
  // 勋章相关状态
  const [newMedals, setNewMedals] = useState<MedalData[]>([]);
  const prevUnlockedMedalIdsRef = useRef<Set<string>>(new Set());
  const [showCheckinHistory, setShowCheckinHistory] = useState(false);
  const [showBatchCheckin, setShowBatchCheckin] = useState(false);
  const [batchDateInput, setBatchDateInput] = useState(getUTC8Today());
  const [batchDates, setBatchDates] = useState<string[]>([]);
  const [isBatchChecking, setIsBatchChecking] = useState(false);
  const [batchError, setBatchError] = useState('');
  // 果实余额
  const [fruitsBalance, setFruitsBalance] = useState(0);
  const [todayFruitsEarned, setTodayFruitsEarned] = useState(0);
  const dateInputRef = useRef<HTMLInputElement>(null);
  // 打卡后待展示的新勋章（等 CelebrationPopup 关闭后再展示）
  const pendingNewMedalsRef = useRef<MedalData[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(getUTC8Today());

  const fetchData = useCallback(async () => {
    if (!currentChild) return;
    setIsLoading(true);
    try {
      // 并行获取全部树木（含已完成）、今日任务和目标列表
      const [treesRes, tasksRes, goalsRes, fruitsHistoryRes] = await Promise.all([
        treesApi.list(currentChild.id),
        tasksApi.list(currentChild.id),
        treesApi.listGoals(currentChild.id),
        childrenApi.getFruitsHistory(currentChild.id),
      ]);

      const activeTrees = treesRes.data.filter(tree => tree.status !== 'completed');
      setTrees(activeTrees);
      setGoals(goalsRes.data);
      setFruitsBalance(fruitsHistoryRes.fruits_balance);
      const today = getUTC8Today();
      setTodayFruitsEarned(
        fruitsHistoryRes.data
          .filter(item => {
            const utc8Offset = 8 * 60 * 60 * 1000;
            return new Date(new Date(item.checkin_time).getTime() + utc8Offset)
              .toISOString()
              .split('T')[0] === today;
          })
          .reduce((total, item) => total + item.fruits_earned + item.bonus_fruits, 0)
      );
      // 保存全量任务数据，供切换树时复用（避免重复网络请求）
      setAllTasks(tasksRes.data);
      if (activeTrees.length > 0) {
        setSelectedTree((prev) => {
          const stillExists = activeTrees.find((t) => t.id === prev?.id);
          return stillExists || activeTrees[0];
        });
      } else {
        setSelectedTree(null);
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

  // 页面加载时预加载两个 GIF 到浏览器缓存，避免弹窗打开时才开始下载
  useEffect(() => {
    preloadTreeGifs();
  }, []);

  // 初始化已解锁勋章基准集合，避免首次打卡时把历史勋章误判为新解锁
  useEffect(() => {
    if (!currentChild) return;
    medalsApi.list(currentChild.id).then(res => {
      const ids = new Set(res.data.filter(m => m.unlocked).map(m => m.id));
      prevUnlockedMedalIdsRef.current = ids;
    }).catch(() => {/* 静默失败，不影响主流程 */});
  }, [currentChild]);

  // 获取当前选中树木在指定日期的打卡状态
  const getTaskForTreeOnDate = (
    tree: TreeData | null,
    date: string
  ): TaskData | null => {
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
    setIsCelebrationOpen(true);

    // 检查当前目标是否为共享任务，记录 goalId 供弹窗关闭后跳转
    const currentGoalData = goals.find(g => g.id === selectedTree.goal_id);
    sharedGoalIdRef.current = currentGoalData?.is_shared ? selectedTree.goal_id : null;

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
      // 打印当前任务的打卡时间
      console.table({
        任务ID: res.data.id,
        任务标题: res.data.title,
        打卡时间: res.data.checkin_time,
        格式化时间: formatCheckinTime(res.data.checkin_time),
        状态: res.data.status
      });
      // 打卡成功后弹出庆祝弹窗，传递最新树木进度
      // 从刷新后的数据中获取当前树木的最新状态
      // 清除缓存以获取最新的树木数据
      invalidateChildDataCache(currentChild.id);
      const refreshedTreesRes = await treesApi.list(currentChild.id);
      const refreshedTree = refreshedTreesRes.data.find(
        (t) => t.id === selectedTree.id
      );
      setCelebrationData({
        treeProgress: refreshedTree?.progress ?? selectedTree.progress,
        treeName: refreshedTree?.name ?? selectedTree.name,
        isTreeCompleted: refreshedTree?.status === 'completed'
      });

      // 刷新树木数据
      await fetchData();
      // 立即刷新导航角标待审核数量
      await refreshPendingCount();

      // 同时查询勋章状态，检查是否有新解锁的勋章
      try {
        const medalRes = await medalsApi.list(currentChild.id);
        const freshUnlocked = medalRes.data.filter(m => m.unlocked);
        const freshIds = new Set(freshUnlocked.map(m => m.id));
        const newly = freshUnlocked.filter(m => !prevUnlockedMedalIdsRef.current.has(m.id));
        prevUnlockedMedalIdsRef.current = freshIds;
        if (newly.length > 0) {
          // 暂存，等 CelebrationPopup 关闭后再展示
          pendingNewMedalsRef.current = newly;
        }
      } catch (medalErr) {
        console.error('检查勋章失败:', medalErr);
      }
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
  const formatCheckinTime = useCallback((isoString: string): string => {
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
  }, []);

  // 监听 selectedTree 变化，从已加载的全量任务数据中过滤（避免重复网络请求）
  useEffect(() => {
    if (!selectedTree?.goal_id || !allTasks) {
      setSelectedTreeTasks([]);
      return;
    }
    // 直接从全量数据中按 goal_id 过滤，不再发起网络请求
    const treeTasks = allTasks.filter(t => t.goal_id === selectedTree.goal_id);
    setSelectedTreeTasks(treeTasks);
    
    // 打印打卡记录（调试用）
    if (treeTasks.length > 0) {
      const checkinRecords = treeTasks.map((task) => ({
        日期: task.checkin_time.split('T')[0],
        时间: formatCheckinTime(task.checkin_time),
        状态: task.status === 'approved' ? '已通过' : task.status === 'rejected' ? '已拒绝' : '审核中'
      }));
      console.log(`【${selectedTree.name}】打卡记录:`);
      console.table(checkinRecords);
    }
  }, [selectedTree?.goal_id, allTasks]);

  const today = getUTC8Today();
  const isBackfillDate = selectedDate !== today;

  // 未打卡目标优先展示，已打卡目标排在后面。
  const sortedTrees = [...trees].sort((a, b) => {
    const getSortRank = (tree: TreeData) => {
      const status = getTaskForTreeOnDate(tree, selectedDate)?.status;
      return status === 'pending' || status === 'approved' ? 1 : 0;
    };
    return getSortRank(a) - getSortRank(b);
  });

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
  const canCheckin = (!hasCheckedInToday || taskStatus === 'rejected') && selectedTree?.status !== 'completed';

  const addBatchDate = () => {
    if (!batchDateInput || batchDateInput > today) return;
    const existingTask = getTaskForTreeOnDate(selectedTree, batchDateInput);
    if (existingTask && existingTask.status !== 'rejected') return;
    setBatchDates(prev => prev.includes(batchDateInput) ? prev : [...prev, batchDateInput].sort());
  };

  const handleBatchCheckin = async () => {
    if (!selectedTree?.goal_id || !currentChild || batchDates.length === 0) return;

    setIsBatchChecking(true);
    setBatchError('');
    const results = await Promise.all(batchDates.map(async date => {
      try {
        await tasksApi.checkin(selectedTree.goal_id!, currentChild.id, undefined, date);
        return { date, success: true, message: '' };
      } catch (err) {
        return {
          date,
          success: false,
          message: err instanceof Error ? err.message : '打卡失败'
        };
      }
    }));
    const failedDates = results
      .filter(result => !result.success)
      .map(result => `${formatDateDisplay(result.date)}：${result.message}`);
    const successCount = results.filter(result => result.success).length;

    if (successCount > 0) {
      const currentGoalData = goals.find(g => g.id === selectedTree.goal_id);
      sharedGoalIdRef.current = currentGoalData?.is_shared ? selectedTree.goal_id : null;
      invalidateChildDataCache(currentChild.id);
      const refreshedTreesRes = await treesApi.list(currentChild.id);
      const refreshedTree = refreshedTreesRes.data.find(t => t.id === selectedTree.id);
      setCelebrationData({
        treeProgress: refreshedTree?.progress ?? selectedTree.progress,
        treeName: refreshedTree?.name ?? selectedTree.name,
        isTreeCompleted: refreshedTree?.status === 'completed'
      });
      await fetchData();
      await refreshPendingCount();
      try {
        const medalRes = await medalsApi.list(currentChild.id);
        const freshUnlocked = medalRes.data.filter(m => m.unlocked);
        const freshIds = new Set(freshUnlocked.map(m => m.id));
        const newly = freshUnlocked.filter(m => !prevUnlockedMedalIdsRef.current.has(m.id));
        prevUnlockedMedalIdsRef.current = freshIds;
        if (newly.length > 0) pendingNewMedalsRef.current = newly;
      } catch (medalErr) {
        console.error('检查勋章失败:', medalErr);
      }
      setIsCelebrationOpen(true);
      setShowBatchCheckin(false);
      setBatchDates([]);
      if (failedDates.length > 0) {
        setError(`已完成 ${successCount} 个日期的打卡，以下日期未完成：${failedDates.join('；')}`);
      }
    } else {
      setBatchError(failedDates.join('；') || '没有可提交的日期');
    }

    setIsBatchChecking(false);
  };

  // 下拉刷新处理函数（清除缓存后强制刷新）
  const handleRefresh = useCallback(async () => {
    if (currentChild) invalidateChildDataCache(currentChild.id);
    await fetchData();
  }, [fetchData, currentChild]);

  return (
    <>
      <CelebrationPopup
        isOpen={isCelebrationOpen}
        onClose={() => {
          setIsCelebrationOpen(false);
          // 如果是共享任务，弹窗关闭后跳转到共享任务总结页
          if (sharedGoalIdRef.current) {
            navigate(`/shared-task/${sharedGoalIdRef.current}`);
            sharedGoalIdRef.current = null;
          }
          // CelebrationPopup 关闭后，展示新解锁的勋章
          if (pendingNewMedalsRef.current.length > 0) {
            setNewMedals(pendingNewMedalsRef.current);
            pendingNewMedalsRef.current = [];
          }
        }}
        treeProgress={celebrationData.treeProgress}
        treeName={celebrationData.treeName}
        isTreeCompleted={celebrationData.isTreeCompleted}
        childGender={currentChild?.gender}
        isSharedTask={!!sharedGoalIdRef.current}
      />

      {/* 勋章解锁庆祝弹层 */}
      {newMedals.length > 0 && (
        <MedalUnlockPopup
          medals={newMedals}
          childName={currentChild?.name}
          onClose={() => setNewMedals(prev => prev.slice(1))}
        />
      )}
      <PullToRefresh onRefresh={handleRefresh}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden bg-[#f2f7f3] pb-32 dark:bg-[#0f172a] lg:pb-8"
        >
          <header className="sticky top-0 z-10 w-full bg-transparent transition-colors">
            <div className="mx-auto flex max-w-md items-center justify-between px-4 pb-2 pt-3">
              {user?.children && user.children.length > 1 ? (
                <div className="flex max-w-[70%] items-center gap-1 overflow-x-auto rounded-full border border-emerald-100 bg-white p-1 shadow-sm no-scrollbar dark:border-emerald-900/50 dark:bg-[var(--bg-surface)]">
                  {user.children.map((child) => (
                    <button
                      key={child.id}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        currentChild?.id === child.id
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-slate-500 hover:bg-primary/5 dark:text-[var(--text-secondary)]'
                      }`}
                      onClick={() => setCurrentChild(child)}
                      aria-label={`切换到${child.name}`}
                    >
                      <Icon name={child.gender === 'female' ? 'face_3' : 'face'} className="text-sm" />
                      {child.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-900 dark:text-[var(--text-primary)]">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name={currentChild?.gender === 'female' ? 'face_3' : 'face'} className="text-xl" />
                  </span>
                  <span className="text-base font-extrabold">{currentChild?.name || '每日打卡'}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/messages')}
                  className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:text-primary dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-secondary)]"
                  aria-label="消息"
                >
                  <Icon name="notifications" size="17px" />
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:text-primary dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-secondary)]"
                  aria-label="设置"
                >
                  <Icon name="settings" size="17px" />
                </button>
              </div>
            </div>
          </header>

          {isLoading ? (
            <div className="flex justify-center py-12 px-3">
              <Icon name="forest" className="text-primary text-5xl animate-pulse" />
            </div>
          ) : trees.length === 0 ? (
            <div className="text-center py-12 px-3 text-slate-400 dark:text-[var(--text-muted)] space-y-4">
              <Icon name="park" className="text-6xl block" />
              <p className="text-lg font-semibold">暂无可打卡目标</p>
              <p className="text-sm">已长成的树木可以在森林主页查看。</p>
              <button
                onClick={() => navigate('/forest')}
                className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold"
              >
                <Icon name="forest" className="text-base" />
                查看森林
              </button>
            </div>
          ) : (
            <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col justify-between gap-4 px-4 py-1.5 sm:px-5">
              <section className="relative shrink-0 overflow-hidden rounded-3xl border-t border-white/25 bg-gradient-to-br from-[#ff8b26] via-[#f7931e] to-[#ffb300] p-3.5 text-white shadow-[0_10px_24px_-6px_rgba(247,147,30,0.42)] dark:border dark:border-white/20 dark:from-[#ea6d00] dark:via-[#e67c13] dark:to-[#d97706] dark:shadow-[0_10px_24px_-6px_rgba(234,109,0,0.35)]">
                <div className="pointer-events-none absolute -bottom-6 -right-5 size-28 rounded-full bg-white/15 blur-xl" />
                <div className="pointer-events-none absolute -top-10 right-1/3 size-24 rounded-full bg-yellow-200/25 blur-lg" />
                <div className="relative z-10 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/15 px-2.5 py-1 backdrop-blur-md dark:bg-black/25">
                      <span className="size-1.5 rounded-full bg-amber-200" />
                      <span className="text-[10px] font-medium text-amber-100">当前目标:</span>
                      <span className="max-w-[9rem] truncate text-[11px] font-bold tracking-tight text-white">{selectedTree?.name || '选择目标'}</span>
                      <Icon name="expand_more" className="text-[13px] text-amber-200" />
                      {trees.length > 1 && (
                        <select
                          value={selectedTree?.id || ''}
                          onChange={(e) => {
                            const tree = trees.find(t => t.id === e.target.value);
                            if (tree) setSelectedTree(tree);
                          }}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          aria-label="选择目标"
                        >
                          {sortedTrees.map((tree) => {
                            const treeTask = getTaskForTreeOnDate(tree, selectedDate);
                            const statusIcon = tree.status === 'completed' ? ' ✅已长成' : treeTask?.status === 'approved' ? ' ✓' : treeTask?.status === 'pending' ? ' ⏳' : '';
                            return <option key={tree.id} value={tree.id}>{tree.name}{statusIcon}</option>;
                          })}
                        </select>
                      )}
                    </div>
                    <button onClick={() => navigate('/store')} className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-white/30">
                      兑换心愿 <Icon name="arrow_forward" className="text-[13px]" />
                    </button>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/40 bg-white/25 text-3xl shadow-inner dark:bg-white/20">🍎</div>
                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-100/90"><span>成长果实总数</span></div>
                        <div className="flex items-baseline gap-1.5"><span className="text-4xl font-black leading-none tracking-tight drop-shadow-sm">{fruitsBalance.toLocaleString()}</span><span className="text-xs font-bold text-amber-100">颗</span></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center rounded-xl border border-white/20 bg-white/15 px-2.5 py-1.5 backdrop-blur-sm dark:bg-black/20">
                      <span className="text-[9px] font-medium text-amber-100">今日已获得</span>
                      <div className="mt-0.5 flex items-center gap-0.5 text-sm font-extrabold leading-tight text-yellow-200"><Icon name="bolt" filled className="text-[14px]" /><span>+{todayFruitsEarned} 🍎</span></div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="relative flex min-h-[175px] max-h-[240px] flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm dark:border-[rgba(51,65,85,0.7)] dark:bg-[#131e30] dark:shadow-lg">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-50/60 via-emerald-50/30 to-emerald-100/40 dark:from-sky-950/20 dark:via-emerald-950/30 dark:to-[#0d1624]" />
                <div className="relative z-10 flex items-center justify-between px-1">
                  <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                    <Icon name="sunny" filled size="20px" className="animate-sun" />
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <span className="size-1.5 animate-ping rounded-full bg-emerald-500" />
                    <span>{currentTree && (currentTree.progress ?? 0) >= 60 ? '茁壮成长阶段' : '幼苗成长阶段'}</span>
                  </div>
                  <div className="flex items-center text-sky-400">
                    <Icon name="cloud" filled size="20px" />
                  </div>
                </div>
                <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <div className="relative flex size-24 items-center justify-center rounded-full border-2 border-dashed border-emerald-400/50 bg-emerald-50/70 shadow-inner dark:border-emerald-500/50 dark:bg-emerald-950/40">
                      {(() => {
                        const treeSize = 64;
                        return currentTree?.image ? (
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
                            <Icon name="park" filled size="64px" className="text-emerald-600 dark:text-emerald-400" />
                          </motion.div>
                        );
                      })()}
                      <span className="animate-float-slow absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-cyan-500 text-[10px] font-bold text-white shadow-md dark:border-[rgb(30,41,59)]">💧</span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 w-20 rounded-full bg-emerald-200/80 blur-[0.5px] dark:bg-emerald-500/30" />
                  <span className="mt-1 rounded-full bg-emerald-100/70 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:border dark:border-emerald-500/30 dark:bg-emerald-950/70 dark:text-emerald-300">{currentTree?.name || '小树'} · 茁壮成长中</span>
                </div>
                <div className="relative z-10 rounded-2xl border border-emerald-100/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-[rgba(51,65,85,0.6)] dark:bg-[rgba(15,23,42,0.8)]">
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><Icon name="water_drop" size="13px" />{currentTree ? `还需 ${100 - (currentTree.progress ?? 0)}% 就能结果啦！` : '坚持浇水，小树会长大'}</span>
                    <span className="flex items-baseline gap-0.5 text-[10px] font-medium text-slate-400">已达 <b className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{selectedTree?.status === 'completed' ? 100 : (currentTree?.progress ?? 0)}%</b></span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full border border-slate-200/50 bg-slate-100 p-0.5 dark:border-[rgba(51,65,85,0.5)] dark:bg-[rgb(30,41,59)]">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 dark:from-emerald-500 dark:to-teal-400" style={{ width: `${selectedTree?.status === 'completed' ? 100 : (currentTree?.progress ?? 0)}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between px-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300"><Icon name="check_circle" size="12px" />已打卡 {currentTree?.completed_days || 0} / {currentGoal?.duration_days || 0} 天</span>
                    <button onClick={() => setShowCheckinHistory(true)} className="flex items-center text-[10px] text-slate-400 transition-colors hover:text-emerald-600">记录 <Icon name="chevron_right" size="12px" /></button>
                  </div>
                </div>
              </section>

              <div className="flex shrink-0 flex-col gap-3 pt-0.5">
                {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
                {statusInfo && (
                  <div className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                    <div className="flex items-center gap-2"><Icon name={taskStatus === 'approved' ? 'check_circle' : taskStatus === 'rejected' ? 'cancel' : 'hourglass_empty'} className="text-lg" />{statusInfo.text}</div>
                    {todayTask?.checkin_time && <span className="shrink-0 text-xs opacity-70">{formatCheckinTime(todayTask.checkin_time)}</span>}
                  </div>
                )}

                {currentGoal && <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-[var(--text-muted)]">
                  <span className="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-[var(--bg-surface)]">目标 {currentGoal.duration_days} 天</span>
                  {currentGoal.duration_minutes > 0 && <span className="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-[var(--bg-surface)]">每天 {currentGoal.duration_minutes >= 60 ? `${Math.round(currentGoal.duration_minutes / 60)} 小时` : `${currentGoal.duration_minutes} 分钟`}</span>}
                  {currentGoal.daily_count && currentGoal.daily_count > 0 && <span className="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-[var(--bg-surface)]">每天 {currentGoal.daily_count} 次</span>}
                </div>}

                <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-[var(--text-secondary)]"><span className="text-base">🌱</span>{!hasCheckedInToday ? (isBackfillDate ? '补上漏掉的浇水记录' : '浇水时间到！小树正在长大') : statusInfo?.text}</div>
                  <button
                    type="button"
                    onClick={() => {
                      const input = dateInputRef.current;
                      if (input && typeof input.showPicker === 'function') input.showPicker();
                      else input?.click();
                    }}
                    className="relative flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 dark:border-[rgba(51,65,85,0.7)] dark:bg-[rgba(30,41,59,0.9)] dark:text-slate-200 dark:hover:bg-[rgba(51,65,85,0.9)]"
                  >
                    <Icon name="calendar_today" size="13px" className="text-emerald-600 dark:text-emerald-400" />
                    <span className="dark:text-[var(--text-secondary)]">打卡: {formatDateDisplay(selectedDate)}</span>
                    <Icon name="arrow_drop_down" size="14px" className="text-slate-400" />
                    <input ref={dateInputRef} type="date" value={selectedDate} max={today} onChange={e => e.target.value && setSelectedDate(e.target.value)} className="pointer-events-none absolute size-0 opacity-0" aria-label="选择打卡日期" />
                  </button>
                </div>

                <div className="flex items-stretch gap-2">
                  <button className={`flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-t border-emerald-400/40 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-4 py-3.5 text-base font-black text-white shadow-[0_8px_20px_rgba(16,185,129,0.36)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${canCheckin && !isChecking ? 'btn-breathe' : ''}`} onClick={handleCheckin} disabled={isChecking || !canCheckin} aria-label={isBackfillDate ? '补打卡' : '立即打卡'}>
                    <Icon name={selectedTree?.status === 'completed' ? 'park' : 'check_circle'} size="22px" />
                    {selectedTree?.status === 'completed' ? '树木已长成' : isChecking ? '打卡中...' : !canCheckin ? (taskStatus === 'approved' ? `${isBackfillDate ? formatDateDisplay(selectedDate) : '今日'}已完成` : '等待审核中') : taskStatus === 'rejected' ? '重新打卡' : isBackfillDate ? '补打卡' : '立即打卡'}
                  </button>
                  <button onClick={() => { setBatchDates([]); setBatchDateInput(today); setBatchError(''); setShowBatchCheckin(true); }} disabled={!selectedTree || isChecking || isBatchChecking} className="flex min-h-[50px] w-auto shrink-0 flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[rgba(51,65,85,0.7)] dark:bg-[rgba(30,41,59,0.9)] dark:text-emerald-400 dark:hover:bg-[rgba(51,65,85,0.8)]"><Icon name="edit_calendar" size="18px" />补打卡</button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </PullToRefresh>

      {/* 打卡记录历史弹窗 */}
      {showCheckinHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCheckinHistory(false)}
          />
          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full sm:max-w-sm bg-[var(--bg-surface)] dark:bg-[var(--bg-primary)] rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col shadow-xl"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Icon name="history" className="text-primary text-xl" />
                <div>
                  <p className="text-slate-900 dark:text-[var(--text-primary)] text-lg font-bold leading-tight">
                    {selectedTree?.name || '目标'} 打卡记录
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[var(--text-muted)]">
                    共 {selectedTreeTasks.length} 次打卡 · 已通过 {selectedTreeTasks.filter(t => t.status === 'approved').length}
                    {selectedTreeTasks.filter(t => t.status === 'rejected').length > 0 && <> · 已拒绝 {selectedTreeTasks.filter(t => t.status === 'rejected').length}</>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckinHistory(false)}
                className="size-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[var(--bg-card)] text-slate-400 hover:text-slate-600 dark:hover:text-[var(--text-secondary)] transition-colors"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            {/* 列表 */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {selectedTreeTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-[var(--text-muted)]">
                  <Icon name="event_busy" className="text-4xl mx-auto mb-2" />
                  <p className="text-sm">暂无打卡记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...selectedTreeTasks]
                    .sort((a, b) => new Date(b.checkin_time).getTime() - new Date(a.checkin_time).getTime())
                    .map((task, idx) => {
                      const checkinDate = new Date(task.checkin_time);
                      const dateStr = checkinDate.toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        timeZone: 'Asia/Shanghai',
                      });
                      const timeStr = checkinDate.toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Shanghai',
                        hour12: false,
                      });

                      const statusConfig = {
                        approved: { text: '已通过', bg: 'bg-green-100 dark:bg-green-900/40', textColor: 'text-green-600 dark:text-green-400', icon: 'check_circle' },
                        rejected: { text: '已拒绝', bg: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-red-500 dark:text-red-400', icon: 'cancel' },
                        pending: { text: '审核中', bg: 'bg-amber-100 dark:bg-amber-900/40', textColor: 'text-amber-600 dark:text-amber-400', icon: 'hourglass_empty' },
                      }[task.status] || { text: task.status, bg: 'bg-slate-100', textColor: 'text-slate-500', icon: 'help' };

                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-slate-100 dark:border-[var(--border-color)]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-bold">
                                {dateStr}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-[var(--text-muted)]">
                                {timeStr}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${statusConfig.bg} ${statusConfig.textColor}`}>
                            <Icon name={statusConfig.icon} className="text-xs" />
                            {statusConfig.text}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {showBatchCheckin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isBatchChecking && setShowBatchCheckin(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full sm:max-w-sm bg-[var(--bg-surface)] dark:bg-[var(--bg-primary)] rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col shadow-xl"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <p className="text-slate-900 dark:text-[var(--text-primary)] text-lg font-bold">批量补打卡</p>
                <p className="text-xs text-slate-500 dark:text-[var(--text-muted)] mt-1">为「{selectedTree?.name || '当前目标'}」选择漏打卡日期</p>
              </div>
              <button
                onClick={() => setShowBatchCheckin(false)}
                disabled={isBatchChecking}
                className="size-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[var(--bg-card)] text-slate-400"
                aria-label="关闭批量补打卡"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={batchDateInput}
                  max={today}
                  onChange={e => setBatchDateInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-card)] px-3 py-2.5 text-sm text-slate-700 dark:text-[var(--text-primary)]"
                  aria-label="选择补打卡日期"
                />
                <button
                  onClick={addBatchDate}
                  disabled={!batchDateInput || batchDateInput > today || !!(getTaskForTreeOnDate(selectedTree, batchDateInput) && getTaskForTreeOnDate(selectedTree, batchDateInput)?.status !== 'rejected')}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-bold disabled:opacity-40"
                >
                  <Icon name="add" className="text-base" />
                  添加
                </button>
              </div>

              {batchDates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {batchDates.map(date => (
                    <button
                      key={date}
                      onClick={() => setBatchDates(prev => prev.filter(item => item !== date))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold"
                      aria-label={`移除${formatDateDisplay(date)}`}
                    >
                      {formatDateDisplay(date)}
                      <Icon name="close" className="text-xs" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center py-5 text-sm text-slate-400 dark:text-[var(--text-muted)]">请选择一个或多个日期</p>
              )}

              {batchError && (
                <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{batchError}</p>
              )}

              <button
                onClick={handleBatchCheckin}
                disabled={isBatchChecking || batchDates.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="check_circle" className="text-lg" />
                {isBatchChecking ? '批量打卡中...' : `提交 ${batchDates.length} 个日期`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
