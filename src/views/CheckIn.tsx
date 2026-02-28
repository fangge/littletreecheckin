import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { tasksApi, treesApi, TreeData } from '../services/api';

interface CheckInProps {
  onViewMessages: () => void;
  onViewProfile: () => void;
}

export default function CheckIn({ onViewMessages, onViewProfile }: CheckInProps) {
  const { currentChild } = useAuth();
  const [growingTrees, setGrowingTrees] = useState<TreeData[]>([]);
  const [selectedTree, setSelectedTree] = useState<TreeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentChild) return;

    const fetchTrees = async () => {
      setIsLoading(true);
      try {
        const res = await treesApi.list(currentChild.id, 'growing');
        setGrowingTrees(res.data);
        if (res.data.length > 0) setSelectedTree(res.data[0]);
      } catch (err) {
        console.error('获取树木失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrees();
  }, [currentChild]);

  const handleCheckin = async () => {
    if (!selectedTree?.goal_id || !currentChild) {
      setError('请先选择一个目标');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      await tasksApi.checkin(selectedTree.goal_id, currentChild.id);
      setCheckinSuccess(true);
      // 刷新树木数据
      const res = await treesApi.list(currentChild.id, 'growing');
      setGrowingTrees(res.data);
      const updated = res.data.find(t => t.id === selectedTree.id);
      if (updated) setSelectedTree(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '打卡失败，请重试');
    } finally {
      setIsChecking(false);
    }
  };

  const currentTree = selectedTree;
  const completedToday = checkinSuccess;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col items-center p-6 space-y-8 overflow-y-auto pb-32"
    >
      <header className="w-full flex items-center bg-background-light/80 backdrop-blur-md sticky top-0 z-10 py-4 justify-between">
        <button
          onClick={onViewProfile}
          className="text-slate-900 flex size-12 shrink-0 items-center justify-start hover:text-primary transition-colors"
          aria-label="设置"
        >
          <span className="material-symbols-outlined text-2xl">settings</span>
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center font-display">每日打卡</h2>
        <div className="flex w-12 items-center justify-end">
          <button
            onClick={onViewMessages}
            className="flex items-center justify-center rounded-full size-10 bg-primary/10 text-primary"
            aria-label="消息"
          >
            <span className="material-symbols-outlined text-2xl fill-icon">mail</span>
          </button>
        </div>
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
              {growingTrees.map(tree => (
                <button
                  key={tree.id}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    selectedTree?.id === tree.id
                      ? 'bg-primary text-white'
                      : 'bg-primary/10 text-slate-700'
                  }`}
                  onClick={() => setSelectedTree(tree)}
                >
                  {tree.name}
                </button>
              ))}
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
                {completedToday ? '今日已打卡！🎉' : '浇水时间到！'}
              </h1>
              <p className="text-slate-500 mt-2">
                {completedToday
                  ? '等待家长审核，继续加油！'
                  : '坚持完成好习惯，让你的幼苗长成参天大树吧。'}
              </p>
            </div>

            <button
              className="w-full py-6 bg-primary text-background-dark text-xl font-extrabold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleCheckin}
              disabled={isChecking || completedToday}
              aria-label="立即打卡"
            >
              <span className="material-symbols-outlined text-3xl">task_alt</span>
              {isChecking ? '打卡中...' : completedToday ? '今日已完成' : '立即打卡'}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
