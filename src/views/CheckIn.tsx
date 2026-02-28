import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { tasksApi, treesApi, TreeData, TaskData } from '../services/api';
import CelebrationPopup from '../components/CelebrationPopup';

interface CheckInProps {
  onViewMessages: () => void;
  onViewProfile: () => void;
}

export default function CheckIn({ onViewMessages, onViewProfile }: CheckInProps) {
  const { user, currentChild, setCurrentChild } = useAuth();
  const [growingTrees, setGrowingTrees] = useState<TreeData[]>([]);
  const [selectedTree, setSelectedTree] = useState<TreeData | null>(null);
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

  const fetchData = useCallback(async () => {
    if (!currentChild) return;
    setIsLoading(true);
    try {
      // 并行获取进行中的树木和今日任务
      const [treesRes, tasksRes] = await Promise.all([
        treesApi.list(currentChild.id, 'growing'),
        tasksApi.list(currentChild.id),
      ]);

      setGrowingTrees(treesRes.data);
      if (treesRes.data.length > 0) {
        setSelectedTree(prev => {
          const stillExists = treesRes.data.find(t => t.id === prev?.id);
          return stillExists || treesRes.data[0];
        });
      }

      // 筛选今日任务，按 goal_id 建立映射（只保留最新的一条，因为列表已按时间倒序）
      const today = new Date().toISOString().split('T')[0];
      const todayMap: Record<string, TaskData> = {};
      for (const task of tasksRes.data) {
        const taskDate = new Date(task.checkin_time).toISOString().split('T')[0];
        if (taskDate === today && task.goal_id && !todayMap[task.goal_id]) {
          // 只保留第一条（最新的），避免旧的 rejected 记录覆盖新的 pending 记录
          todayMap[task.goal_id] = task;
        }
      }
      setTodayTasks(todayMap);
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentChild]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 获取当前选中树木今日的打卡状态
  const getTodayTaskForTree = (tree: TreeData | null): TaskData | null => {
    if (!tree?.goal_id) return null;
    return todayTasks[tree.goal_id] || null;
  };

  const handleCheckin = async () => {
    if (!selectedTree?.goal_id || !currentChild) {
      setError('请先选择一个目标');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const res = await tasksApi.checkin(selectedTree.goal_id, currentChild.id);
      // 更新今日任务映射
      setTodayTasks(prev => ({
        ...prev,
        [selectedTree.goal_id!]: res.data,
      }));
      // 刷新树木数据
      await fetchData();
      // 打卡成功后弹出庆祝弹窗，传递最新树木进度
      // 从刷新后的数据中获取当前树木的最新状态
      const refreshedTreesRes = await treesApi.list(currentChild.id);
      const refreshedTree = refreshedTreesRes.data.find(t => t.id === selectedTree.id);
      setCelebrationData({
        treeProgress: refreshedTree?.progress ?? selectedTree.progress,
        treeName: refreshedTree?.name ?? selectedTree.name,
        isTreeCompleted: refreshedTree?.status === 'completed',
      });
      setIsCelebrationOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '打卡失败，请重试');
    } finally {
      setIsChecking(false);
    }
  };

  const currentTree = selectedTree;
  const todayTask = getTodayTaskForTree(currentTree);
  const hasCheckedInToday = !!todayTask;
  const taskStatus = todayTask?.status;

  const getStatusText = () => {
    if (!hasCheckedInToday) return null;
    switch (taskStatus) {
      case 'pending': return { text: '等待家长审核中...', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
      case 'approved': return { text: '今日任务已通过 🎉', color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
      case 'rejected': return { text: '任务被拒绝，可重新打卡', color: 'text-red-500', bg: 'bg-red-50 border-red-200' };
      default: return null;
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
      className="flex-1 flex flex-col items-center p-6 space-y-8 overflow-y-auto pb-32"
    >
      <header className="w-full bg-background-light/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center py-4 justify-between">
          <button
            onClick={onViewProfile}
            className="text-slate-900 flex size-12 shrink-0 items-center justify-start hover:text-primary transition-colors"
            aria-label="设置"
          >
            <span className="material-symbols-outlined text-2xl">settings</span>
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center font-display">
            {currentChild ? `${currentChild.name}的打卡` : '每日打卡'}
          </h2>
          <div className="flex w-12 items-center justify-end">
            <button
              onClick={onViewMessages}
              className="flex items-center justify-center rounded-full size-10 bg-primary/10 text-primary"
              aria-label="消息"
            >
              <span className="material-symbols-outlined text-2xl fill-icon">mail</span>
            </button>
          </div>
        </div>
        {/* 多孩子切换器 */}
        {user?.children && user.children.length > 1 && (
          <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined text-primary text-5xl animate-pulse">forest</span>
        </div>
      ) : growingTrees.length === 0 ? (
        <div className="text-center py-12 text-slate-400 space-y-4">
          <span className="material-symbols-outlined text-6xl block">park</span>
          <p className="text-lg font-semibold">还没有进行中的目标</p>
          <p className="text-sm">去首页添加一个新目标吧！</p>
        </div>
      ) : (
        <>
          {/* 树木选择 */}
          {growingTrees.length > 1 && (
            <div className="w-full flex gap-2 overflow-x-auto no-scrollbar">
              {growingTrees.map(tree => {
                const treeTask = getTodayTaskForTree(tree);
                return (
                  <button
                    key={tree.id}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${
                      selectedTree?.id === tree.id
                        ? 'bg-primary text-white'
                        : 'bg-primary/10 text-slate-700'
                    }`}
                    onClick={() => setSelectedTree(tree)}
                  >
                    {tree.name}
                    {treeTask?.status === 'approved' && <span className="text-xs">✓</span>}
                    {treeTask?.status === 'pending' && <span className="text-xs">⏳</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative w-full max-w-sm aspect-square bg-gradient-to-b from-blue-100 to-primary/5 rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center border-4 border-white">
            <div className="absolute top-8 left-8 text-yellow-400">
              <span className="material-symbols-outlined text-6xl fill-icon">light_mode</span>
            </div>
            <div className="absolute top-12 right-12 text-white/80">
              <span className="material-symbols-outlined text-4xl fill-icon">cloud</span>
            </div>

            <div className="relative z-0 mt-auto mb-12">
              {currentTree?.image ? (
                <div
                  className="w-48 h-48 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('${currentTree.image}')` }}
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-9xl fill-icon">park</span>
                </div>
              )}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900/10 blur-md rounded-full" />
            </div>

            <div className="absolute bottom-0 w-full h-12 bg-primary/20 flex items-center justify-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
                {currentTree ? `${currentTree.name} · Lv.${currentTree.level}` : '幼苗阶段'}
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* 今日打卡状态提示 */}
            {statusInfo && (
              <div className={`px-4 py-3 border rounded-xl text-sm font-medium flex items-center gap-2 ${statusInfo.bg} ${statusInfo.color}`}>
                <span className="material-symbols-outlined text-lg">
                  {taskStatus === 'approved' ? 'check_circle' : taskStatus === 'rejected' ? 'cancel' : 'hourglass_empty'}
                </span>
                {statusInfo.text}
              </div>
            )}

            <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="flex gap-6 justify-between items-center">
                <p className="text-slate-900 text-base font-bold">成长进度</p>
                <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full">
                  {currentTree?.progress ?? 0}%
                </span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(13,242,13,0.5)] transition-all"
                  style={{ width: `${currentTree?.progress ?? 0}%` }}
                />
              </div>
              <p className="text-primary text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">water_drop</span>
                {currentTree
                  ? `还需 ${100 - (currentTree.progress ?? 0)}% 就能结果啦！`
                  : '坚持完成好习惯，让你的幼苗长成参天大树吧。'}
              </p>
            </div>

            <div className="text-center py-4">
              <h1 className="text-slate-900 tracking-tight text-3xl font-extrabold leading-tight">
                {!hasCheckedInToday ? '浇水时间到！' :
                  taskStatus === 'approved' ? '今日已完成！🎉' :
                  taskStatus === 'rejected' ? '需要重新打卡' :
                  '今日已打卡！'}
              </h1>
              <p className="text-slate-500 mt-2">
                {!hasCheckedInToday
                  ? '坚持完成好习惯，让你的幼苗长成参天大树吧。'
                  : taskStatus === 'approved'
                  ? '家长已审核通过，树木正在成长！'
                  : taskStatus === 'rejected'
                  ? (todayTask?.reject_reason || '家长建议改进，重新打卡吧！')
                  : '等待家长审核，继续加油！'}
              </p>
            </div>

            <button
              className="w-full py-6 bg-primary text-background-dark text-xl font-extrabold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleCheckin}
              disabled={isChecking || !canCheckin}
              aria-label="立即打卡"
            >
              <span className="material-symbols-outlined text-3xl">task_alt</span>
              {isChecking ? '打卡中...' :
                !canCheckin ? (taskStatus === 'approved' ? '今日已完成' : '等待审核中') :
                taskStatus === 'rejected' ? '重新打卡' : '立即打卡'}
            </button>
          </div>
        </>
      )}
    </motion.div>
    </>
  );
}
