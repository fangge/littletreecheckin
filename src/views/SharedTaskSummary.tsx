import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { treesApi, SharedTaskSummaryData } from '../services/api';

import Icon from '../components/Icon';
export default function SharedTaskSummary() {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();
  const { user, currentChild } = useAuth();
  const [summaryData, setSummaryData] = useState<SharedTaskSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!goalId) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await treesApi.getSharedTaskProgress(goalId);
        setSummaryData(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取共享任务数据失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [goalId]);

  const goal = summaryData?.goal;
  const progressList = summaryData?.progress ?? [];

  // 计算剩余天数（基于 duration_days 和当前日期）
  const getRemainingDays = (): number | null => {
    if (!goal) return null;
    // 剩余天数 = 目标天数 - 当前孩子已完成天数（取最大进度）
    const maxCompleted = Math.max(...progressList.map(p => p.completed_days), 0);
    return Math.max(0, goal.duration_days - maxCompleted);
  };

  const remainingDays = getRemainingDays();

  // 获取孩子性别图标
  const getChildGenderIcon = (childId: string): string => {
    const child = user?.children?.find(c => c.id === childId);
    return child?.gender === 'female' ? 'face_3' : 'face';
  };


  // 根据进度百分比返回绿色深浅（进度越高越深）
  const getProgressColor = (percent: number): string => {
    // lightness 从 72%（浅绿）线性过渡到 32%（深绿）
    const lightness = Math.round(72 - (percent / 100) * 40);
    return `hsl(142, 65%, ${lightness}%)`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-light">
        <div className="flex flex-col items-center gap-3">
          <Icon name="refresh" className="text-4xl text-primary animate-spin" />
          <p className="text-slate-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-light">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <Icon name="error" className="text-4xl text-red-400" />
          <p className="text-slate-600 text-sm">{error || '数据加载失败'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-2 px-6 py-2 bg-primary text-white rounded-full text-sm font-bold"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col bg-background-light overflow-x-hidden"
    >
      {/* 顶部导航 */}
      <div className="flex items-center p-6 pb-4 justify-between lg:max-w-xl lg:mx-auto lg:w-full">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-900 dark:text-[var(--text-primary)] flex size-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-[var(--bg-card)] shadow-sm"
          aria-label="返回"
        >
          <Icon name="arrow_back" />
        </button>
        <h2 className="text-slate-900 dark:text-[var(--text-primary)] text-lg font-extrabold leading-tight tracking-tight flex-1 text-center">
          共享任务
        </h2>
        <div className="size-10" />
      </div>

      <div className="flex-1 px-6 pb-32 overflow-y-auto lg:max-w-xl lg:mx-auto lg:w-full">
        {/* 任务信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[var(--bg-surface)] rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-[var(--border-color)] mb-5"
        >
          {/* 标签行 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full">
              <Icon name="group" className="text-sm" />
              <span className="text-xs font-bold">共同挑战</span>
            </div>
            {remainingDays !== null && remainingDays > 0 && (
              <div className="flex items-center gap-1 text-slate-500 dark:text-[var(--text-secondary)]">
                <Icon name="schedule" className="text-sm" />
                <span className="text-xs font-medium">剩余 {remainingDays} 天</span>
              </div>
            )}
            {remainingDays === 0 && (
              <div className="flex items-center gap-1 text-amber-500">
                <Icon name="emoji_events" className="text-sm" />
                <span className="text-xs font-bold">已完成</span>
              </div>
            )}
          </div>

          {/* 任务标题 */}
          <div className="flex items-center gap-3 mb-4">
            <Icon name={goal?.icon || 'auto_stories'} className="text-3xl text-primary" />
            <div>
              <h1 className="text-slate-900 dark:text-[var(--text-primary)] text-2xl font-black leading-tight">
                {goal?.title}
              </h1>
              <p className="text-slate-500 dark:text-[var(--text-secondary)] text-sm mt-0.5">
                目标：{goal?.daily_count
                  ? `完成 ${goal?.duration_days} 次`
                  : `连续坚持 ${goal?.duration_days} 天`}
              </p>
            </div>
          </div>

          {/* 奖励信息 */}
          <div className="bg-slate-50 dark:bg-[var(--bg-card)] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Icon name="military_tech" className="text-amber-500 text-xl" />
            </div>
            <div>
              <p className="text-slate-500 dark:text-[var(--text-secondary)] text-xs">获胜奖励</p>
              <p className="text-primary font-black text-lg leading-tight">
                {goal?.fruits_per_task ?? 10} 个金苹果
              </p>
            </div>
          </div>

          {/* 提示文字 */}
          <p className="text-slate-400 dark:text-[var(--text-muted)] text-xs text-center mt-3 flex items-center justify-center gap-1">
            <Icon name="info" className="text-sm" />
            先完成的宝贝可以获得水果奖励哦！
          </p>
        </motion.div>

        {/* 当前进度 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-slate-900 dark:text-[var(--text-primary)] text-xl font-black mb-3">
            当前进度
          </h2>

          <div className="flex flex-col gap-3">
            {(() => {
              const sorted = [...progressList].sort((a, b) => b.completed_days - a.completed_days);
              const maxDays = sorted.length > 0 ? sorted[0].completed_days : 0;
              const minDays = sorted.length > 0 ? sorted[sorted.length - 1].completed_days : 0;
              return sorted.map((item, index) => {
                const progressPercent = goal
                  ? Math.min(100, Math.round((item.completed_days / goal.duration_days) * 100))
                  : 0;
                // 相对进度：进度相同则颜色相同；所有人进度相同时都用深绿（100）
                const relativePercent = maxDays === minDays
                  ? 100
                  : Math.round(((item.completed_days - minDays) / (maxDays - minDays)) * 100);

                const progressColor = item.is_winner ? '#f59e0b' : getProgressColor(relativePercent);
                return (
                   <motion.div
                     key={item.child_id}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.2 + index * 0.08 }}
                     className={`bg-white dark:bg-[var(--bg-surface)] rounded-2xl p-4 shadow-sm border transition-colors ${
                       item.is_winner
                         ? 'border-amber-300 dark:border-amber-500/50'
                         : 'border-slate-100 dark:border-[var(--border-color)]'
                     }`}
                   >
                     <div className="flex items-center gap-3">
                       {/* 排名徽章 */}
                       <div className="relative shrink-0">
                         <div
                           className="w-12 h-12 rounded-full flex items-center justify-center"
                           style={{ backgroundColor: item.is_winner ? '#fef3c7' : `${progressColor}22` }}
                         >
                           <Icon name={getChildGenderIcon(item.child_id)} className="text-2xl" />
                         </div>
                         
                       </div>

                       {/* 孩子信息 */}
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between mb-1.5">
                           <span className="text-slate-900 dark:text-[var(--text-primary)] font-bold text-sm">
                             {item.child_name}
                             {item.is_winner && (
                               <span className="ml-1.5 text-amber-500 text-xs">🏆</span>
                             )}
                           </span>
                           <span className="text-sm font-bold" style={{ color: progressColor }}>
                             {item.completed_days}/{goal?.duration_days} {goal?.daily_count ? '次' : '天'}
                           </span>
                         </div>

                         {/* 进度条 */}
                         <div className="h-2 bg-slate-100 dark:bg-[var(--bg-card)] rounded-full overflow-hidden">
                           <motion.div
                             initial={{ width: 0 }}
                             animate={{ width: `${progressPercent}%` }}
                             transition={{ duration: 0.6, delay: 0.3 + index * 0.1, ease: 'easeOut' }}
                             className="h-full rounded-full"
                             style={{ backgroundColor: progressColor }}
                           />
                         </div>
                       </div>
                     </div>
                   </motion.div>
                 );
              });
            })()}
          </div>
        </motion.div>

        {/* 获胜者提示 */}
        {summaryData.winner_child_id && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 text-center"
          >
            <p className="text-amber-600 dark:text-amber-400 font-bold text-sm">
              🎉 {progressList.find(p => p.child_id === summaryData.winner_child_id)?.child_name} 率先完成了任务！
            </p>
            <p className="text-amber-500 dark:text-amber-500/80 text-xs mt-1">
              等待家长审核后即可获得奖励
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
