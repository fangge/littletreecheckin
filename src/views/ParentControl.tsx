import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { usePendingTasks } from '../contexts/PendingTasksContext';
import { tasksApi, messagesApi, TaskData } from '../services/api';
import { invalidateCache } from '../utils/requestCache';
import PullToRefresh from '../components/PullToRefresh';
import Icon from '../components/Icon';

// ─── 类型 ────────────────────────────────────────────────────
interface TaskWithChild extends TaskData {
  childName?: string;
  childId?: string;
}

/** 孩子色板（索引轮换） */
const CHILD_COLORS = [
  '#006e18', // Sprout Green
  '#2563eb', // Blue
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Violet
  '#0891b2', // Cyan
];

// ─── 任务卡片（不变） ─────────────────────────────────────────────
interface TaskCardProps {
  task: TaskWithChild;
  notes: Record<string, string>;
  bonusFruits: Record<string, number>;
  processingId: string | null;
  showChildName: boolean;
  onQuickNote: (taskId: string, text: string) => void;
  onApprove: (task: TaskWithChild) => void;
  onReject: (task: TaskWithChild) => void;
  onRevoke: (confirm: { show: boolean; task: TaskWithChild | null }) => void;
  onNotesChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBonusFruitsChange: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const TaskCard = ({ task, notes, bonusFruits, processingId, showChildName, onQuickNote, onApprove, onReject, onRevoke, onNotesChange, onBonusFruitsChange }: TaskCardProps) => (
  <div className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-primary/5 dark:border-[var(--border-color)] overflow-hidden transition-colors">
    <div className="p-4 flex gap-4">
      <div className="w-20 h-20 rounded-xl bg-primary/5 flex items-center justify-center relative overflow-hidden shrink-0 border border-primary/10">
        {task.image_url ? (
          <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url("${task.image_url}")` }} />
        ) : (
          <Icon name="check_circle" className="text-primary text-3xl" />
        )}
        <div className="absolute bottom-1 right-1 bg-white/90 dark:bg-[var(--bg-surface)]/90 px-1 rounded text-[10px] font-bold text-primary">{task.progress}%</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5">
            {showChildName && task.childName && (
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{task.childName}</span>
            )}
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[var(--text-muted)]">{task.type}</p>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] shrink-0 ml-1">
            {new Date(task.checkin_time).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-[var(--text-primary)] truncate">{task.title}</h3>
      </div>
    </div>

    {task.status === 'pending' && (
      <>
        <div className="px-4 pb-4 space-y-3">
          {task.goals?.fruits_per_task != null && task.goals.fruits_per_task > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[var(--text-muted)]">
              <span>基础奖励：</span>
              <span className="font-bold text-primary">{task.goals.fruits_per_task} 🍎</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wide">给 {task.childName || '孩子'} 留言</label>
            <div className="relative">
              <input
                className="w-full bg-slate-50 dark:bg-[var(--bg-card)] border-none rounded-xl text-sm dark:text-[var(--text-primary)] focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 pr-24"
                placeholder="留个便条..."
                type="text"
                value={notes[task.id] || ''}
                onChange={e => onNotesChange(prev => ({ ...prev, [task.id]: e.target.value }))}
                aria-label="鼓励留言"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button className="p-1 hover:bg-primary/10 rounded-full text-lg" onClick={() => onQuickNote(task.id, '❤️ 太棒了！')}>❤️</button>
                <button className="p-1 hover:bg-primary/10 rounded-full text-lg" onClick={() => onQuickNote(task.id, '⭐ 继续加油！')}>⭐</button>
                <button className="p-1 hover:bg-primary/10 rounded-full text-lg" onClick={() => onQuickNote(task.id, '👍 为你骄傲！')}>👍</button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['太棒了！', '继续加油！', '为你感到骄傲！'].map(text => (
              <button key={text} className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-white transition-colors" onClick={() => onQuickNote(task.id, text)}>
                {text}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">额外奖励果实</label>
            <div className="flex items-center gap-2">
              <button
                className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors disabled:opacity-40"
                onClick={() => onBonusFruitsChange(prev => ({ ...prev, [task.id]: Math.max(0, (prev[task.id] ?? 0) - 1) }))}
                disabled={(bonusFruits[task.id] ?? 0) <= 0}
                aria-label="减少额外果实"
              >−</button>
              <input
                className="w-16 text-center bg-slate-50 dark:bg-[var(--bg-card)] border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 dark:text-[var(--text-primary)]"
                type="number"
                min={0}
                step={1}
                value={bonusFruits[task.id] ?? 0}
                onChange={e => onBonusFruitsChange(prev => ({ ...prev, [task.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                aria-label="额外奖励果实数量"
              />
              <button
                className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                onClick={() => onBonusFruitsChange(prev => ({ ...prev, [task.id]: (prev[task.id] ?? 0) + 1 }))}
                aria-label="增加额外果实"
              >+</button>
              <span className="text-sm">🍎</span>
              {(bonusFruits[task.id] ?? 0) > 0 && (
                <span className="text-xs text-primary font-semibold">
                  共 {(task.goals?.fruits_per_task ?? 0) + (bonusFruits[task.id] ?? 0)} 🍎
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex border-t border-primary/5 dark:border-[var(--border-color)]">
          <button className="flex-1 py-4 flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors border-r border-primary/5 dark:border-[var(--border-color)] disabled:opacity-50" onClick={() => onReject(task)} disabled={processingId === task.id} aria-label="拒绝任务">
            <Icon name="cancel" className="text-xl" />
            <span className="font-bold text-sm">需改进</span>
          </button>
          <button className="flex-1 py-4 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all disabled:opacity-50" onClick={() => onApprove(task)} disabled={processingId === task.id} aria-label="批准任务">
            <Icon name="check_circle" filled className="text-xl" />
            <span className="font-bold text-sm">{processingId === task.id ? '处理中...' : '批准并发送'}</span>
          </button>
        </div>
      </>
    )}

    {task.status === 'approved' && (
      <div className="px-4 pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="check_circle" filled />
            <span className="text-sm font-semibold">已批准</span>
          </div>
          <button
            className="py-2 px-3 flex items-center gap-1 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            onClick={() => onRevoke({ show: true, task })}
            disabled={processingId === task.id}
          >
            <Icon name="undo" className="text-sm" />
            撤销批准
          </button>
        </div>
        {task.updated_at && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-[var(--text-muted)]">
            <Icon name="schedule" className="text-sm" />
            <span>批准时间：{new Date(task.updated_at).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        )}
      </div>
    )}
  </div>
);

// ─── 孩子模块头部（批量操作） ─────────────────────────────────────
interface ChildModuleHeaderProps {
  childName: string;
  colorAccent: string;
  pendingCount: number;
  totalCount: number;
  isBulkProcessing: boolean;
  onBulkApprove: () => void;
  onBulkReject: () => void;
}

const ChildModuleHeader = ({
  childName, colorAccent, pendingCount, totalCount, isBulkProcessing,
  onBulkApprove, onBulkReject,
}: ChildModuleHeaderProps) => (
  <div className="flex items-center justify-between py-2 px-1">
    <div className="flex items-center gap-2.5">
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorAccent }} />
      <h2 className="text-base font-bold text-slate-900 dark:text-[var(--text-primary)]">{childName}</h2>
      <span className="text-xs text-slate-400 dark:text-[var(--text-muted)]">
        {pendingCount}/{totalCount} 待审核
      </span>
    </div>
    {pendingCount > 0 && (
      <div className="flex gap-2">
        <button
          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 flex items-center gap-1"
          onClick={onBulkReject}
          disabled={isBulkProcessing}
        >
          <Icon name="cancel" className="text-sm" />
          全部拒绝
        </button>
        <button
          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-50 flex items-center gap-1"
          onClick={onBulkApprove}
          disabled={isBulkProcessing}
        >
          <Icon name="check_circle" filled className="text-sm" />
          {isBulkProcessing ? '批量处理中...' : '全部批准'}
        </button>
      </div>
    )}
  </div>
);

// ─── 主组件 ────────────────────────────────────────────────────
export default function ParentControl() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshPendingCount } = usePendingTasks();
  const [tasks, setTasks] = useState<TaskWithChild[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [bonusFruits, setBonusFruits] = useState<Record<string, number>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<{ show: boolean; task: TaskWithChild | null }>({ show: false, task: null });

  // 批量操作状态
  const [bulkApprovingChildId, setBulkApprovingChildId] = useState<string | null>(null);
  const [bulkRejectConfirm, setBulkRejectConfirm] = useState<{ show: boolean; childName: string; taskIds: string[] } | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user?.children || user.children.length === 0) return;
    setIsLoading(true);
    try {
      const results = await Promise.all(
        user.children.map(child =>
          tasksApi.list(child.id, activeTab).then(res =>
            res.data.map(task => ({ ...task, childName: child.name, childId: child.id }))
          )
        )
      );
      const allTasks = results.flat().sort(
        (a, b) => new Date(b.checkin_time).getTime() - new Date(a.checkin_time).getTime()
      );
      setTasks(allTasks);
    } catch (err) {
      console.error('获取任务失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.children, activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleApprove = async (task: TaskWithChild) => {
    setProcessingId(task.id);
    try {
      const bonus = bonusFruits[task.id] ?? 0;
      await tasksApi.approve(task.id, bonus > 0 ? bonus : undefined);
      const note = notes[task.id];
      if (note && task.childId) await messagesApi.send(task.childId, note);
      if (task.childId) {
        invalidateCache(task.childId);
      }
      await fetchTasks();
      await refreshPendingCount();
    } catch (err) {
      console.error('审核失败:', err);
      alert(`审核失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (task: TaskWithChild) => {
    setProcessingId(task.id);
    try {
      await tasksApi.reject(task.id, notes[task.id]);
      if (task.childId) {
        invalidateCache(task.childId);
      }
      await fetchTasks();
      await refreshPendingCount();
    } catch (err) {
      console.error('拒绝失败:', err);
      alert(`拒绝失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickNote = (taskId: string, text: string) => {
    setNotes(prev => ({ ...prev, [taskId]: text }));
  };

  // ── 批量批准 ──────────────────────────────────────────────────
  const handleBulkApprove = async (childId: string) => {
    const childPendingTasks = tasks.filter(t => t.childId === childId && t.status === 'pending');
    if (childPendingTasks.length === 0) return;

    setBulkApprovingChildId(childId);
    try {
      const taskIds = childPendingTasks.map(t => t.id);
      const notesMap: Record<string, { bonus_fruits?: number }> = {};
      for (const t of childPendingTasks) {
        const bonus = bonusFruits[t.id] ?? 0;
        if (bonus > 0) {
          notesMap[t.id] = { bonus_fruits: bonus };
        }
      }

      const result = await tasksApi.bulkApprove(taskIds, Object.keys(notesMap).length > 0 ? notesMap : undefined);

      // 发送留言
      for (const t of childPendingTasks) {
        const note = notes[t.id];
        if (note) {
          try { await messagesApi.send(childId, note); } catch { /* 留言失败不影响 */ }
        }
      }

      if (taskIds.length > 0) {
        invalidateCache(childId);
      }

      await fetchTasks();
      await refreshPendingCount();

      // 如果有部分失败，给用户反馈
      if (result.approved_count < result.total) {
        const failures = result.data.filter(r => r.status === 'failed');
        alert(`部分审核失败(${result.approved_count}/${result.total}):\n${failures.map(f => f.error).join('\n')}`);
      }
    } catch (err) {
      console.error('批量审核失败:', err);
      alert(`批量审核失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setBulkApprovingChildId(null);
    }
  };

  // ── 批量拒绝 ──────────────────────────────────────────────────
  const confirmBulkReject = (childId: string, childName: string) => {
    const childPendingTasks = tasks.filter(t => t.childId === childId && t.status === 'pending');
    if (childPendingTasks.length === 0) return;
    setBulkRejectConfirm({
      show: true,
      childName,
      taskIds: childPendingTasks.map(t => t.id),
    });
  };

  const handleBulkReject = async () => {
    if (!bulkRejectConfirm) return;
    const { taskIds } = bulkRejectConfirm;
    setBulkRejectConfirm(null);
    setBulkApprovingChildId(taskIds[0] || null);

    try {
      // 逐个拒绝（没有后端 bulk-reject，顺序执行）
      for (const taskId of taskIds) {
        try {
          const reason = notes[taskId] || undefined;
          await tasksApi.reject(taskId, reason);
        } catch (err) {
          console.error(`拒绝任务 ${taskId} 失败:`, err);
        }
      }

      // 清除所有被操作的孩子缓存
      const affectedChildIds = new Set<string>();
      for (const t of tasks.filter(t => taskIds.includes(t.id))) {
        if (t.childId) affectedChildIds.add(t.childId);
      }
      for (const cid of affectedChildIds) invalidateCache(cid);

      await fetchTasks();
      await refreshPendingCount();
    } catch (err) {
      console.error('批量拒绝失败:', err);
      alert(`批量拒绝失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setBulkApprovingChildId(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeConfirm.task) return;
    setProcessingId(revokeConfirm.task.id);
    try {
      await tasksApi.revoke(revokeConfirm.task.id);
      if (revokeConfirm.task.childId) {
        invalidateCache(revokeConfirm.task.childId);
      }
      await fetchTasks();
      await refreshPendingCount();
      setRevokeConfirm({ show: false, task: null });
    } catch (err) {
      console.error('撤销失败:', err);
      alert(err instanceof Error ? err.message : '撤销失败，请重试');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const hasMultipleChildren = user?.children && user.children.length > 1;

  // ── 按孩子分组（仅 pending 模式下使用） ─────────────────────────
  const groupedPendingTasks = (() => {
    if (activeTab !== 'pending') return null;
    const groups = new Map<string, TaskWithChild[]>();
    for (const task of tasks) {
      if (!task.childId || task.status !== 'pending') continue;
      const existing = groups.get(task.childId) || [];
      existing.push(task);
      groups.set(task.childId, existing);
    }
    return groups;
  })();

  // 根据选中的孩子过滤任务
  const filteredTasks = (() => {
    if (selectedChildId === 'all') return tasks;
    return tasks.filter(t => t.childId === selectedChildId);
  })();

  // 根据选中的孩子过滤分组
  const visibleGroups = (() => {
    if (!groupedPendingTasks) return null;
    if (selectedChildId === 'all') return groupedPendingTasks;
    const filtered = new Map<string, TaskWithChild[]>();
    const childTasks = groupedPendingTasks.get(selectedChildId);
    if (childTasks && childTasks.length > 0) {
      filtered.set(selectedChildId, childTasks);
    }
    // Also include all children who have tasks (for empty-state display)
    for (const [childId, childTasks] of groupedPendingTasks) {
      if (childId === selectedChildId) continue;
    }
    return filtered;
  })();

  const getChildColor = (childId: string) => {
    if (!user?.children) return CHILD_COLORS[0];
    const idx = user.children.findIndex(c => c.id === childId);
    return CHILD_COLORS[idx % CHILD_COLORS.length];
  };

  // 下拉刷新处理函数
  const handleRefresh = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col bg-background-light"
      >
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-primary/10 dark:border-[var(--border-color)] px-4 py-4 transition-colors">
        <div className="flex items-center justify-between max-w-md mx-auto lg:max-w-2xl">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profile')} className="p-2 hover:bg-primary/10 rounded-full transition-colors" aria-label="返回">
              <Icon name="arrow_back" />
            </button>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon name="shield_person" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">家长控制</h1>
          </div>
          {user?.children && user.children.length > 1 && (
            <span className="text-xs text-slate-400 dark:text-[var(--text-muted)] bg-white dark:bg-[var(--bg-card)] px-2 py-1 rounded-full border border-slate-200 dark:border-[var(--border-color)]">
              {user.children.length} 个孩子
            </span>
          )}
        </div>
      </header>

      <div className="px-4 py-4 max-w-md mx-auto w-full lg:max-w-2xl space-y-3">
        {/* 一级 Tab: 待审核/已批准 */}
        <div className="flex p-1 bg-primary/10 dark:bg-[var(--bg-card)] rounded-xl">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-[var(--bg-surface)] shadow-sm text-slate-900 dark:text-[var(--text-primary)]' : 'text-slate-500 dark:text-[var(--text-secondary)] hover:text-primary'}`}
            onClick={() => setActiveTab('pending')}
          >
            待审核 {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'approved' ? 'bg-white dark:bg-[var(--bg-surface)] shadow-sm text-slate-900 dark:text-[var(--text-primary)]' : 'text-slate-500 dark:text-[var(--text-secondary)] hover:text-primary'}`}
            onClick={() => setActiveTab('approved')}
          >
            已批准
          </button>
        </div>

        {/* 二级 Tab: 孩子筛选 */}
        {hasMultipleChildren && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
                selectedChildId === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] hover:bg-slate-200 dark:hover:bg-[var(--bg-surface)]'
              }`}
              onClick={() => setSelectedChildId('all')}
            >
              全部 ({tasks.filter(t => activeTab === 'pending' ? t.status === 'pending' : t.status === 'approved').length})
            </button>
            {user?.children?.map(child => {
              const childTaskCount = tasks.filter(t => t.childId === child.id && (activeTab === 'pending' ? t.status === 'pending' : t.status === 'approved')).length;
              return (
                <button
                  key={child.id}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
                    selectedChildId === child.id
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] hover:bg-slate-200 dark:hover:bg-[var(--bg-surface)]'
                  }`}
                  onClick={() => setSelectedChildId(child.id)}
                >
                  {child.name} ({childTaskCount})
                </button>
              );
            })}
          </div>
        )}
      </div>

      <main className="flex-1 px-4 pb-32 overflow-y-auto max-w-md mx-auto w-full space-y-3 lg:max-w-2xl lg:pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Icon name="hourglass_empty" className="text-primary text-4xl animate-pulse" />
          </div>
        ) : activeTab === 'pending' && groupedPendingTasks ? (
          /* ── 待审核模式：按孩子分组 ── */
          (() => {
            const groupIds = visibleGroups ? Array.from(visibleGroups.keys()) : [];
            const targetIds = selectedChildId === 'all'
              ? groupIds
              : groupIds.length > 0 ? groupIds : [selectedChildId];

            if (targetIds.length === 0 || targetIds.every(cid => (groupedPendingTasks.get(cid) || []).length === 0)) {
              return (
                <div className="text-center py-12 text-slate-400 dark:text-[var(--text-muted)]">
                  <Icon name="check_circle" className="text-5xl mb-3 block" />
                  <p>暂无待审核任务</p>
                </div>
              );
            }

            return targetIds.map(childId => {
              const childTasks = (groupedPendingTasks.get(childId) || []).filter(t => t.status === 'pending');
              const child = user?.children?.find(c => c.id === childId);

              if (childTasks.length === 0) return null;

              return (
                <div key={childId} className="space-y-3">
                  <ChildModuleHeader
                    childName={child?.name || '未知'}
                    colorAccent={getChildColor(childId)}
                    pendingCount={childTasks.length}
                    totalCount={tasks.filter(t => t.childId === childId).length}
                    isBulkProcessing={bulkApprovingChildId === childId}
                    onBulkApprove={() => handleBulkApprove(childId)}
                    onBulkReject={() => confirmBulkReject(childId, child?.name || '未知')}
                  />
                  {childTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      notes={notes}
                      bonusFruits={bonusFruits}
                      processingId={processingId}
                      onQuickNote={handleQuickNote}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onRevoke={setRevokeConfirm}
                      onNotesChange={setNotes}
                      onBonusFruitsChange={setBonusFruits}
                      showChildName={false}
                    />
                  ))}
                </div>
              );
            });
          })()
        ) : filteredTasks.length === 0 ? (
          /* ── 已批准模式：平铺列表 ── */
          <div className="text-center py-12 text-slate-400 dark:text-[var(--text-muted)]">
            <Icon name="check_circle" className="text-5xl mb-3 block" />
            <p>{activeTab === 'pending' ? '暂无待审核任务' : '暂无已批准任务'}</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              notes={notes}
              bonusFruits={bonusFruits}
              processingId={processingId}
              onQuickNote={handleQuickNote}
              onApprove={handleApprove}
              onReject={handleReject}
              onRevoke={setRevokeConfirm}
              onNotesChange={setNotes}
              onBonusFruitsChange={setBonusFruits}
              showChildName={!!(hasMultipleChildren && selectedChildId === 'all')}
            />
          ))
        )}
      </main>

      {/* 撤销确认弹窗 */}
      {revokeConfirm.show && revokeConfirm.task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRevokeConfirm({ show: false, task: null })} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white dark:bg-[var(--bg-surface)] rounded-2xl p-6 w-full max-w-sm shadow-xl transition-colors"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-[var(--text-primary)] mb-2">确认撤销</h3>
            <p className="text-sm text-slate-500 dark:text-[var(--text-muted)] mb-4">
              确定要撤销任务 <span className="font-semibold text-slate-900 dark:text-[var(--text-primary)]">{revokeConfirm.task.title}</span> 的审核吗？
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                ⚠️ 撤销后将扣除该孩子 {revokeConfirm.task.goals?.fruits_per_task ?? 10} + {revokeConfirm.task.bonus_fruits ?? 0} = {((revokeConfirm.task.goals?.fruits_per_task ?? 10) + (revokeConfirm.task.bonus_fruits ?? 0))} 个果实
              </p>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-[var(--text-secondary)] bg-slate-100 dark:bg-[var(--bg-card)] hover:bg-slate-200 dark:hover:bg-[var(--bg-surface)] transition-colors"
                onClick={() => setRevokeConfirm({ show: false, task: null })}
              >
                取消
              </button>
              <button
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                onClick={handleRevoke}
                disabled={processingId === revokeConfirm.task.id}
              >
                {processingId === revokeConfirm.task.id ? '处理中...' : '确认撤销'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 批量拒绝确认弹窗 */}
      {bulkRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBulkRejectConfirm(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white dark:bg-[var(--bg-surface)] rounded-2xl p-6 w-full max-w-sm shadow-xl transition-colors"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-[var(--text-primary)] mb-2">批量拒绝确认</h3>
            <p className="text-sm text-slate-500 dark:text-[var(--text-muted)] mb-4">
              确定要<span className="font-semibold text-red-500">拒绝</span> <span className="font-semibold text-slate-900 dark:text-[var(--text-primary)]">{bulkRejectConfirm.childName}</span> 的全部 <span className="font-semibold text-slate-900 dark:text-[var(--text-primary)]">{bulkRejectConfirm.taskIds.length}</span> 个待审核任务吗？
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ 此操作不可撤销，被拒绝的任务需要孩子重新打卡
              </p>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-[var(--text-secondary)] bg-slate-100 dark:bg-[var(--bg-card)] hover:bg-slate-200 dark:hover:bg-[var(--bg-surface)] transition-colors"
                onClick={() => setBulkRejectConfirm(null)}
              >
                取消
              </button>
              <button
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                onClick={handleBulkReject}
              >
                确认拒绝
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </motion.div>
    </PullToRefresh>
  );
}
