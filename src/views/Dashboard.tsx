import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { treesApi, childrenApi, TreeData, StatsData, GoalData } from '../services/api';

interface DashboardProps {
  onAddGoal: () => void;
  onViewStore: () => void;
  onViewProfile: () => void;
  onEditGoal: (goal: GoalData & { childId?: string }) => void;
}

export default function Dashboard({ onAddGoal, onViewStore, onViewProfile, onEditGoal }: DashboardProps) {
  const { user, currentChild, setCurrentChild } = useAuth();
  const [trees, setTrees] = useState<TreeData[]>([]);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentChild) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [treesRes, statsRes, goalsRes] = await Promise.all([
          treesApi.list(currentChild.id),
          childrenApi.stats(currentChild.id),
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
  }, [currentChild]);

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
      className="flex-1 overflow-y-auto pb-32"
    >
      <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md border-b border-primary/10">
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

      <div className="flex gap-3 p-4 overflow-x-auto no-scrollbar">
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary px-6 transition-all">
          <p className="text-white text-sm font-bold leading-normal">本月</p>
        </button>
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/10 px-6">
          <p className="text-slate-700 text-sm font-medium leading-normal">上季度</p>
        </button>
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/10 px-6">
          <p className="text-slate-700 text-sm font-medium leading-normal">过去一年</p>
        </button>
      </div>

      <div className="px-4 py-2">
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
      <div className="px-4 mt-4">
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
              <p className="text-[10px] opacity-80">点击这里开启你的下一个探险之旅</p>
            </div>
          </div>
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <h3 className="text-slate-900 tracking-tight text-2xl font-extrabold px-4 pb-4 pt-6">果园花园</h3>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined text-primary text-4xl animate-pulse">forest</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 p-4">
          {trees.map((tree) => {
            const goal = getGoalForTree(tree);
            return (
              <div key={tree.id} className="relative group">
                {/* 编辑按钮：绝对定位在卡片右上角 */}
                {goal && goal.is_active && (
                  <button
                    className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm hover:bg-white active:scale-90 transition-all"
                    onClick={e => { e.stopPropagation(); handleEditTree(tree); }}
                    aria-label={`编辑${tree.name}目标`}
                  >
                    <span className="material-symbols-outlined text-slate-700 text-base leading-none">edit</span>
                  </button>
                )}
                <div
                  className="bg-cover bg-center flex flex-col gap-3 rounded-xl justify-end p-4 aspect-square overflow-hidden shadow-lg shadow-primary/5"
                  style={{
                    backgroundImage: tree.image
                      ? `linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 60%), url("${tree.image}")`
                      : 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-white text-base font-bold leading-tight">{tree.name}</p>
                    <div className="flex items-center gap-1.5">
                      {tree.status === 'completed' ? (
                        <span className="material-symbols-outlined text-primary text-sm font-bold fill-icon">check_circle</span>
                      ) : (
                        <div className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                          <span className="text-[10px] text-white font-bold">{tree.level} 级</span>
                        </div>
                      )}
                    </div>
                  </div>
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

      <div className="px-4 pb-8 text-center">
        <p className="text-slate-500 text-sm">继续完成任务，解锁更多珍稀树木！</p>
      </div>

      <div className="fixed bottom-24 right-6 z-30">
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
