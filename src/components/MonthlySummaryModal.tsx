import { motion, AnimatePresence } from 'motion/react';
import { useMemo } from 'react';

interface TaskSummary {
  taskName: string;
  goalTitle?: string;
  count: number;
}

interface MonthlySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarData: {
    checkin_dates: string[];
    tasks_by_date: Record<string, Array<{
      id: string;
      title: string;
      status: 'pending' | 'approved' | 'rejected';
      checkin_time: string;
      goal_title?: string;
    }>>;
  } | null;
  selectedMonth: Date;
}

export default function MonthlySummaryModal({
  isOpen,
  onClose,
  calendarData,
  selectedMonth,
}: MonthlySummaryModalProps) {
  // 计算任务统计数据
  const taskStats = useMemo(() => {
    if (!calendarData) return null;

    // 统计每个任务的打卡次数
    const taskCountMap = new Map<string, TaskSummary>();

    Object.values(calendarData.tasks_by_date).forEach(tasks => {
      tasks.forEach(task => {
        const key = task.title;
        const existing = taskCountMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          taskCountMap.set(key, {
            taskName: task.title,
            goalTitle: task.goal_title,
            count: 1,
          });
        }
      });
    });

    // 转换为数组并排序
    const allTasks = Array.from(taskCountMap.values()).sort((a, b) => b.count - a.count);

    if (allTasks.length === 0) return null;

    // 找出打卡最多的任务（可能有多个并列第一）
    const maxCount = allTasks[0].count;
    const topTasks = allTasks.filter(t => t.count === maxCount);

    // 找出打卡最少的任务（可能有多个并列最少）
    const minCount = allTasks[allTasks.length - 1].count;
    const bottomTasks = allTasks.filter(t => t.count === minCount);

    return {
      topTasks,
      bottomTasks,
      allTasks,
      totalCheckins: allTasks.reduce((sum, t) => sum + t.count, 0),
    };
  }, [calendarData]);

  const monthName = selectedMonth.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-[var(--bg-surface)] rounded-3xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-primary/10 dark:bg-[var(--bg-card)] text-primary hover:bg-primary/20 transition-colors"
              aria-label="关闭"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* 头部插图 */}
            <div className="flex justify-center pt-8 pb-4">
              <div className="relative size-32 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 flex items-center justify-center">
                <div className="text-6xl">🎓</div>
                <div className="absolute -bottom-2 -right-2 size-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-2xl fill-icon">emoji_events</span>
                </div>
              </div>
            </div>

            {/* 标题 */}
            <div className="text-center px-6 pb-6">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-[var(--text-primary)] mb-2">
                {monthName.replace('年', '年 ')}成就单
              </h2>
              {taskStats && (
                <p className="text-sm text-slate-500 dark:text-[var(--text-muted)]">
                  本月共完成 <span className="font-bold text-primary">{taskStats.totalCheckins}</span> 次打卡
                </p>
              )}
            </div>

            {taskStats ? (
              <div className="px-6 pb-6 space-y-6">
                {/* 打卡之王 */}
                <div className="bg-gradient-to-br from-primary/5 to-emerald-50 dark:from-primary/10 dark:to-emerald-900/10 rounded-2xl p-5 border border-primary/20 dark:border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">👑</span>
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">打卡之王</h3>
                  </div>
                  <div className="space-y-2">
                    {taskStats.topTasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white/60 dark:bg-[var(--bg-card)]/60 rounded-xl p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-[var(--text-primary)] truncate">
                            {task.goalTitle || task.taskName}
                          </p>
                          {task.goalTitle && task.goalTitle !== task.taskName && (
                            <p className="text-xs text-slate-500 dark:text-[var(--text-muted)] truncate">
                              {task.taskName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-3 shrink-0">
                          <span className="material-symbols-outlined text-primary text-lg fill-icon">
                            sentiment_very_satisfied
                          </span>
                          <span className="text-2xl font-extrabold text-primary">{task.count}</span>
                          <span className="text-xs text-slate-500 dark:text-[var(--text-muted)]">次</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 加油小能手 */}
                {taskStats.bottomTasks[0].count !== taskStats.topTasks[0].count && (
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/10 dark:to-yellow-900/10 rounded-2xl p-5 border border-orange-200 dark:border-[var(--border-color)]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">💪</span>
                      <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                        加油小能手
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {taskStats.bottomTasks.map((task, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white/60 dark:bg-[var(--bg-card)]/60 rounded-xl p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-[var(--text-primary)] truncate">
                              {task.goalTitle || task.taskName}
                            </p>
                            {task.goalTitle && task.goalTitle !== task.taskName && (
                              <p className="text-xs text-slate-500 dark:text-[var(--text-muted)] truncate">
                                {task.taskName}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-3 shrink-0">
                            <span className="material-symbols-outlined text-orange-500 text-lg">
                              sentiment_content
                            </span>
                            <span className="text-2xl font-extrabold text-orange-600 dark:text-orange-400">
                              {task.count}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-[var(--text-muted)]">次</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 text-center font-medium">
                      继续加油，下个月争取更多打卡！💪
                    </p>
                  </div>
                )}

                {/* 全部任务一览 */}
                <div>
                  <button
                    className="w-full flex items-center justify-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors py-2"
                    onClick={() => {
                      const element = document.getElementById('all-tasks-list');
                      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                  >
                    <span className="material-symbols-outlined text-base">list</span>
                    全部任务一览
                  </button>
                  <div id="all-tasks-list" className="space-y-2 mt-3">
                    {taskStats.allTasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 dark:bg-[var(--bg-card)] rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-[var(--bg-surface)] transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="size-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-[var(--text-primary)] truncate text-sm">
                              {task.goalTitle || task.taskName}
                            </p>
                            {task.goalTitle && task.goalTitle !== task.taskName && (
                              <p className="text-xs text-slate-500 dark:text-[var(--text-muted)] truncate">
                                {task.taskName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-3 shrink-0">
                          <span className="text-lg font-bold text-slate-900 dark:text-[var(--text-primary)]">
                            {task.count}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-[var(--text-muted)]">次</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 鼓励语 */}
                <div className="text-center py-4">
                  <p className="text-sm text-slate-600 dark:text-[var(--text-secondary)] leading-relaxed">
                    "太棒了！你的小花园越来越茂盛啦，
                    <br />
                    下个月继续保持哦！"
                  </p>
                </div>

                {/* 收下成就单按钮 */}
                <button
                  onClick={onClose}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-full transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                  收下成就单
                </button>
              </div>
            ) : (
              <div className="px-6 pb-8 text-center">
                <div className="size-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-[var(--bg-card)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-[var(--text-muted)]">
                    event_busy
                  </span>
                </div>
                <p className="text-slate-600 dark:text-[var(--text-secondary)] mb-6">
                  本月还没有打卡记录哦
                  <br />
                  快去完成第一个任务吧！
                </p>
                <button
                  onClick={onClose}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-full transition-all active:scale-[0.98]"
                >
                  知道了
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}