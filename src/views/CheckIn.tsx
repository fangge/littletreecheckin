import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePendingTasks } from '../contexts/PendingTasksContext';
import Icon from '../components/Icon';
import {
  tasksApi,
  treesApi,
  medalsApi, rewardsApi,
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
  const { isDark } = useTheme();
  const { refreshPendingCount } = usePendingTasks();
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
  // 果实余额
  const [fruitsBalance, setFruitsBalance] = useState(0);
  // 打卡后待展示的新勋章（等 CelebrationPopup 关闭后再展示）
  const pendingNewMedalsRef = useRef<MedalData[]>([]);

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
      // 并行获取全部树木（含已完成）、今日任务和目标列表
      const [treesRes, tasksRes, goalsRes] = await Promise.all([
        treesApi.list(currentChild.id),
        tasksApi.list(currentChild.id),
        treesApi.listGoals(currentChild.id)
      ]);

      setTrees(treesRes.data);
      setGoals(goalsRes.data);
      // 保存全量任务数据，供切换树时复用（避免重复网络请求）
      setAllTasks(tasksRes.data);
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

  // 页面加载时预加载两个 GIF 到浏览器缓存，避免弹窗打开时才开始下载
  useEffect(() => {
    preloadTreeGifs();
  }, []);

  // 获取果实余额
  useEffect(() => {
    if (!currentChild) return;
    rewardsApi.getFruits(currentChild.id)
      .then(res => setFruitsBalance(res.data.fruits_balance))
      .catch(() => {});
  }, [currentChild]);

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

  // 共享任务：另一个孩子已打卡，当前孩子也视为已完成
  const sharedCheckedInToday =
    currentGoal?.is_shared && selectedTree?.checked_in_today && !hasCheckedInToday;

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
    if (sharedCheckedInToday) {
      return {
        text: '共享任务已完成 🎉',
        color: 'text-green-600',
        bg: 'bg-green-50 border-green-200'
      };
    }
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
  const canCheckin = !sharedCheckedInToday && (!hasCheckedInToday || taskStatus === 'rejected') && selectedTree?.status !== 'completed';

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
          className="flex-1 flex flex-col overflow-x-hidden pb-32 lg:pb-8 w-full"
        >
          <header className="w-full bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-10 px-3 lg:max-w-xl lg:mx-auto transition-colors">
            <div className="flex items-center py-4 justify-between">
              <button
                onClick={() => navigate('/profile')}
                className="text-slate-900 dark:text-[var(--text-primary)] flex size-12 shrink-0 items-center justify-start hover:text-primary transition-colors"
                aria-label="设置"
              >
                <Icon name="settings" className="text-2xl" />
              </button>
              <h2 className="text-slate-900 dark:text-[var(--text-primary)] text-lg font-bold leading-tight tracking-tight flex-1 text-center font-display">
                {currentChild ? `${currentChild.name}的打卡` : '每日打卡'}
              </h2>
              <div className="flex w-12 items-center justify-end">
                <button
                  onClick={() => navigate('/messages')}
                  className="flex items-center justify-center rounded-full size-10 bg-primary/10 text-primary"
                  aria-label="消息"
                >
                  <Icon name="mail" filled className="text-2xl" />
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
                    <Icon name={child.gender === 'female' ? 'face_3' : 'face'} className="text-sm" />
                    {child.name}
                  </button>
                ))}
              </div>
            )}
          </header>

          {isLoading ? (
            <div className="flex justify-center py-12 px-3">
              <Icon name="forest" className="text-primary text-5xl animate-pulse" />
            </div>
          ) : trees.length === 0 ? (
            <div className="text-center py-12 px-3 text-slate-400 dark:text-[var(--text-muted)] space-y-4">
              <Icon name="park" className="text-6xl block" />
              <p className="text-lg font-semibold">还没有任何目标</p>
              <p className="text-sm">去首页添加一个新目标吧！</p>
            </div>
          ) : (
            <div className="w-full space-y-4 pb-4 px-3">
              {/* 树木选择 */}
              {trees.length > 1 && (
                <div className="w-full max-w-sm mx-auto">
                  <label className="relative flex items-center gap-2 px-4 py-3 bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-color)] rounded-2xl shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
                    <Icon name="park" className="text-primary text-xl" />
                    <span className="text-slate-600 dark:text-[var(--text-secondary)] text-sm font-medium">
                      当前目标：
                    </span>
                    <span className="text-primary font-bold text-sm flex-1 flex items-center gap-1.5">
                      {selectedTree?.name || '选择目标'}
                      {currentGoal?.is_shared && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/shared-task/${currentGoal.id}`); }}
                          className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 whitespace-nowrap active:scale-95 transition-transform"
                          aria-label="查看共享任务详情"
                        >
                          <Icon name="group" className="text-[10px]" />
                          共享
                        </button>
                      )}
                    </span>
                    {(() => {
                      const treeTask = getTaskForTreeOnDate(
                        selectedTree,
                        selectedDate
                      );
                      return treeTask?.status === 'approved' ? (
                        <span className="text-green-600 text-xs">✓</span>
                      ) : treeTask?.status === 'pending' ? (
                        <span className="text-amber-500 text-xs">⏳</span>
                      ) : null;
                    })()}
                    <Icon name="expand_more" className="text-slate-400 dark:text-[var(--text-muted)] text-base" />
                    <select
                      value={selectedTree?.id || ''}
                      onChange={(e) => {
                        const tree = trees.find(
                          (t) => t.id === e.target.value
                        );
                        if (tree) setSelectedTree(tree);
                      }}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      aria-label="选择目标"
                    >
                      {trees.map((tree) => {
                        const treeTask = getTaskForTreeOnDate(
                          tree,
                          selectedDate
                        );
                        const statusIcon =
                          tree.status === 'completed'
                            ? ' ✅已长成'
                            : treeTask?.status === 'approved'
                              ? ' ✓'
                              : treeTask?.status === 'pending'
                                ? ' ⏳'
                                : '';
                        return (
                          <option key={tree.id} value={tree.id}>
                            {tree.name}
                            {statusIcon}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              )}

              <div className="relative w-full max-w-sm mx-auto h-40 bg-gradient-to-b from-blue-100 dark:from-[#1a3d3a] to-primary/5 dark:to-[var(--bg-surface)] rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center border-4 border-white dark:border-[var(--bg-card)] transition-colors">
                <div className="absolute top-8 left-8 text-yellow-400">
                  <Icon name="light_mode" filled className="text-6xl" />
                </div>
                <div className="absolute top-12 right-12 text-white/80">
                  <Icon name="cloud" filled className="text-4xl" />
                </div>

                <div className="relative z-0 mt-auto mb-8">
                  {(() => {
                    // 根据进度计算树的大小：0% → 64px，100% → 128px（已完成树木强制 100%）
                    const isTreeCompleted = currentTree?.status === 'completed';
                    const progress = isTreeCompleted ? 100 : (currentTree?.progress ?? 0);
                    const minSize = 64;
                    const maxSize = 128;
                    const treeSize = Math.round(
                      minSize + (maxSize - minSize) * (progress / 100)
                    );
                    const shadowWidth = Math.round(48 + 48 * (progress / 100));

                    return (
                      <>
                        {currentTree?.image ? (
                          <motion.div
                            animate={{ width: treeSize, height: treeSize }}
                            transition={{
                              type: 'spring',
                              damping: 20,
                              stiffness: 120
                            }}
                            className="bg-contain bg-center bg-no-repeat"
                            style={{
                              backgroundImage: `url('${currentTree.image}')`
                            }}
                          />
                        ) : (
                          <motion.div
                            animate={{ width: treeSize, height: treeSize }}
                            transition={{
                              type: 'spring',
                              damping: 20,
                              stiffness: 120
                            }}
                            className="flex items-center justify-center"
                          >
                            <Icon name="park" filled size={`${treeSize}px`} className="text-primary" />
                          </motion.div>
                        )}
                        <motion.div
                          animate={{ width: shadowWidth }}
                          transition={{
                            type: 'spring',
                            damping: 20,
                            stiffness: 120
                          }}
                          className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-6 bg-slate-900/10 blur-md rounded-full"
                        />
                      </>
                    );
                  })()}
                </div>

                <div className="absolute bottom-0 w-full h-12 bg-primary/20 flex items-center justify-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
                    {currentTree ? currentTree.name : '幼苗阶段'}
                  </p>
                  {currentGoal?.is_shared && (
                    <button
                      onClick={() => navigate(`/shared-task/${currentGoal.id}`)}
                      className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/30 text-amber-700 dark:text-amber-400 whitespace-nowrap active:scale-95 transition-transform"
                      aria-label="查看共享任务详情"
                    >
                      <Icon name="group" className="text-[10px]" />
                      共享
                    </button>
                  )}
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
                      <Icon name={sharedCheckedInToday
                        ? 'check_circle'
                        : taskStatus === 'approved'
                          ? 'check_circle'
                          : taskStatus === 'rejected'
                            ? 'cancel'
                            : 'hourglass_empty'} className="text-lg" />
                      {statusInfo.text}
                    </div>
                    {todayTask?.checkin_time && (
                      <span className="text-xs opacity-70 shrink-0">
                        {formatCheckinTime(todayTask.checkin_time)}
                      </span>
                    )}
                  </div>
                )}

                <button
                    onClick={() => navigate('/store')}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-slate-100 dark:border-[var(--border-color)] active:scale-[0.98] transition-all hover:border-primary/30"
                  >
                    <span className="text-slate-600 dark:text-[var(--text-secondary)] text-sm font-medium">当前果实</span>
                    <span className="text-primary font-extrabold text-lg">{fruitsBalance.toLocaleString()}</span>
                  </button>

                <div className="flex flex-col gap-3 p-4 bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-slate-100 dark:border-[var(--border-color)] transition-colors">
                  <div className="flex gap-6 justify-between items-center">
                    <p className="text-slate-900 dark:text-[var(--text-primary)] text-base font-bold">
                      成长进度
                    </p>
                    <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full">
                      {selectedTree?.status === 'completed' ? 100 : (currentTree?.progress ?? 0)}%
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-[var(--bg-card)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(13,242,13,0.5)] transition-all"
                      style={{ width: `${selectedTree?.status === 'completed' ? 100 : (currentTree?.progress ?? 0)}%` }}
                    />
                  </div>
                  <p className="text-primary text-sm font-medium flex items-center gap-2">
                    <Icon name="water_drop" className="text-lg" />
                    {currentTree
                      ? selectedTree?.status === 'completed'
                        ? (currentGoal?.is_shared && selectedTree?.completed_by_child_id && selectedTree.completed_by_child_id !== currentChild?.id
                            ? (() => {
                                const finisher = user?.children?.find(c => c.id === selectedTree.completed_by_child_id);
                                return `🎉 ${finisher?.name || '小伙伴'} 已经完成了这个共享任务！你也可以继续努力，种下属于自己的小树吧~`;
                              })()
                            : '树木已长成！🎉 继续坚持好习惯，种下更多成长的种子吧。')
                        : `还需 ${100 - (currentTree.progress ?? 0)}% 就能结果啦！`
                      : '坚持完成好习惯，让你的幼苗长成参天大树吧。'}
                  </p>
                  {/* 目标详情：时长 / 每日时长 / 每日次数 / 已打卡天数 */}
                  <button
                    onClick={() => setShowCheckinHistory(true)}
                    className="flex items-center gap-1 text-xs font-bold text-primary/70 hover:text-primary active:scale-95 transition-all self-start"
                  >
                    <Icon name="history" className="text-sm" />
                    查看打卡记录
                  </button>
                  {currentGoal && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-[var(--border-color)]">
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-[var(--text-muted)] bg-slate-50 dark:bg-[var(--bg-card)] px-2 py-1 rounded-full">
                        <Icon name="calendar_month" className="text-sm" />
                        目标 {currentGoal.duration_days} 天
                      </span>
                      {currentGoal.duration_minutes > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-[var(--text-muted)] bg-slate-50 dark:bg-[var(--bg-card)] px-2 py-1 rounded-full">
                          <Icon name="schedule" className="text-sm" />
                          {currentGoal.duration_minutes >= 60
                            ? `每天 ${Math.round(currentGoal.duration_minutes / 60)} 小时`
                            : `每天 ${currentGoal.duration_minutes} 分钟`}
                        </span>
                      )}
                      {currentGoal.daily_count &&
                        currentGoal.daily_count > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-[var(--text-muted)] bg-slate-50 dark:bg-[var(--bg-card)] px-2 py-1 rounded-full">
                            <Icon name="repeat" className="text-sm" />
                            每天 {currentGoal.daily_count} 次
                          </span>
                        )}
                      {/* 已打卡天数 */}
                      <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                        <Icon name="check_circle" className="text-sm" />
                        已打卡 {currentTree?.completed_days || 0} 天
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-center py-2">
                  <h1 className="text-slate-900 dark:text-[var(--text-primary)] tracking-tight text-2xl font-extrabold leading-tight">
                    {sharedCheckedInToday
                      ? '共享任务已完成！'
                      : !hasCheckedInToday
                        ? isBackfillDate
                          ? '补打卡'
                          : '浇水时间到！'
                      : taskStatus === 'approved'
                        ? `${isBackfillDate ? formatDateDisplay(selectedDate) : '今日'}已完成！🎉`
                        : taskStatus === 'rejected'
                          ? '需要重新打卡'
                          : `${isBackfillDate ? formatDateDisplay(selectedDate) : '今日'}已打卡！`}
                  </h1>
                    <p className="text-slate-500 dark:text-[var(--text-secondary)] mt-2">
                      {sharedCheckedInToday
                        ? '有小朋友已经帮你完成了这个任务，快来欣赏你的小树吧！'
                        : !hasCheckedInToday
                          ? isBackfillDate
                            ? `为 ${formatDateDisplay(selectedDate)} 补打卡，记录你的坚持！`
                            : '坚持完成好习惯，让你的幼苗长成参天大树吧。'
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
                    <Icon name="calendar_month" className="text-primary text-xl" />
                    <span className="text-slate-600 dark:text-[var(--text-secondary)] text-sm font-medium">
                      打卡日期：
                    </span>
                    <span className="text-primary font-bold text-sm">
                      {formatDateDisplay(selectedDate)}
                    </span>
                    <Icon name="expand_more" className="text-slate-400 dark:text-[var(--text-muted)] text-base" />
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
                  {selectedTree?.status === 'completed' ? (
                    <>
                      <Icon name="park" className="text-3xl" />
                      树木已长成 🌳
                    </>
                  ) : sharedCheckedInToday ? (
                    '共享任务已完成'
                  ) : (
                    <>
                      <Icon name="check_circle" className="text-3xl" />
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
                    </>
                  )}
                </button>
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
    </>
  );
}
