import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { medalsApi, MedalData } from '../services/api';

// 支持的 unlock_condition 类型
const CONDITION_TYPES = [
  { value: 'total_tasks', label: '累计打卡次数', unit: '次', placeholder: '例如：10' },
  { value: 'consecutive_days', label: '连续打卡天数', unit: '天', placeholder: '例如：7' },
  { value: 'early_checkin', label: '早起打卡天数（8点前）', unit: '天', placeholder: '例如：7' },
  { value: 'trees_completed', label: '完成培育树木数', unit: '棵', placeholder: '例如：3' },
  { value: 'total_fruits', label: '累计获得果实数', unit: '个', placeholder: '例如：100' },
  { value: 'weekly_goals', label: '一周完成不同目标数', unit: '个', placeholder: '例如：5' },
];

// 可选图标
const ICON_OPTIONS = [
  'workspace_premium', 'military_tech', 'star', 'emoji_events', 'local_florist',
  'eco', 'bolt', 'favorite', 'rocket_launch', 'diamond',
  'auto_awesome', 'celebration', 'sunny', 'water_drop', 'forest',
  'spa', 'nature', 'park', 'grass', 'yard',
];

// 可选颜色
const COLOR_OPTIONS = [
  { value: 'from-yellow-400 to-orange-500', label: '金橙', preview: 'bg-gradient-to-br from-yellow-400 to-orange-500' },
  { value: 'from-green-400 to-emerald-600', label: '翠绿', preview: 'bg-gradient-to-br from-green-400 to-emerald-600' },
  { value: 'from-blue-400 to-indigo-600', label: '蓝紫', preview: 'bg-gradient-to-br from-blue-400 to-indigo-600' },
  { value: 'from-pink-400 to-rose-600', label: '玫红', preview: 'bg-gradient-to-br from-pink-400 to-rose-600' },
  { value: 'from-purple-400 to-violet-600', label: '紫色', preview: 'bg-gradient-to-br from-purple-400 to-violet-600' },
  { value: 'from-cyan-400 to-teal-600', label: '青蓝', preview: 'bg-gradient-to-br from-cyan-400 to-teal-600' },
  { value: 'from-amber-400 to-yellow-600', label: '琥珀', preview: 'bg-gradient-to-br from-amber-400 to-yellow-600' },
  { value: 'from-red-400 to-rose-600', label: '火红', preview: 'bg-gradient-to-br from-red-400 to-rose-600' },
];

interface MedalFormData {
  name: string;
  icon: string;
  color: string;
  description: string;
  condition_type: string;
  condition_threshold: string;
}

const DEFAULT_FORM: MedalFormData = {
  name: '',
  icon: 'workspace_premium',
  color: 'from-yellow-400 to-orange-500',
  description: '',
  condition_type: 'total_tasks',
  condition_threshold: '',
};

export default function MedalManagement() {
  const navigate = useNavigate();
  const [medals, setMedals] = useState<MedalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMedal, setEditingMedal] = useState<MedalData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<MedalFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchMedals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await medalsApi.listAll();
      setMedals(res.data);
    } catch (err) {
      setError('获取勋章列表失败');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedals();
  }, [fetchMedals]);

  const openCreate = () => {
    setFormData(DEFAULT_FORM);
    setEditingMedal(null);
    setIsCreating(true);
    setError('');
  };

  const openEdit = (medal: MedalData) => {
    setFormData({
      name: medal.name,
      icon: medal.icon,
      color: medal.color,
      description: medal.description ?? '',
      condition_type: medal.unlock_condition?.type ?? 'total_tasks',
      condition_threshold: String(medal.unlock_condition?.threshold ?? ''),
    });
    setEditingMedal(medal);
    setIsCreating(true);
    setError('');
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingMedal(null);
    setError('');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { setError('请填写勋章标题'); return; }
    if (!formData.condition_threshold || isNaN(Number(formData.condition_threshold))) {
      setError('请填写有效的达成数值'); return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload = {
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color,
        description: formData.description.trim(),
        unlock_condition: {
          type: formData.condition_type,
          threshold: Number(formData.condition_threshold),
        },
      };

      if (editingMedal) {
        await medalsApi.update(editingMedal.id, payload);
      } else {
        await medalsApi.create(payload);
      }
      await fetchMedals();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await medalsApi.delete(id);
      setMedals(prev => prev.filter(m => m.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const selectedCondition = CONDITION_TYPES.find(c => c.value === formData.condition_type);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-full pb-24"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-primary/10 dark:border-[var(--border-color)] transition-colors">
        <div className="px-4 py-4 flex items-center justify-between lg:max-w-2xl lg:mx-auto">
          <button
            onClick={() => navigate('/medals')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[var(--bg-card)] shadow-sm border border-primary/20 dark:border-[var(--border-color)]"
            aria-label="返回"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-[var(--text-primary)]">arrow_back</span>
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-[var(--text-primary)]">勋章管理</h1>
          <button
            onClick={openCreate}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-slate-900 shadow-sm"
            aria-label="添加勋章"
          >
            <span className="material-symbols-outlined text-xl">add</span>
          </button>
        </div>
      </header>

      <div className="lg:max-w-2xl lg:mx-auto px-4 pt-4">
        {/* 说明 */}
        <div className="mb-4 p-4 bg-primary/5 rounded-2xl">
          <p className="text-sm font-bold text-slate-700 dark:text-[var(--text-primary)]">成就管理</p>
          <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)] mt-0.5">查看并更新孩子成长勋章的达成条件。</p>
        </div>

        {/* 勋章列表 */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined text-primary text-4xl animate-pulse">workspace_premium</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {medals.map(medal => {
              const condType = CONDITION_TYPES.find(c => c.value === medal.unlock_condition?.type);
              return (
                <div
                  key={medal.id}
                  className="bg-white dark:bg-[var(--bg-card)] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-[var(--border-color)] flex items-center gap-4"
                >
                  <div className={`w-14 h-14 shrink-0 rounded-full bg-gradient-to-br ${medal.color} flex items-center justify-center shadow-md`}>
                    <span className="material-symbols-outlined text-2xl text-white fill-icon">{medal.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-800 dark:text-[var(--text-primary)] text-sm">{medal.name}</p>
                    <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)] mt-0.5">
                      {condType ? `${condType.label}：${medal.unlock_condition?.threshold} ${condType.unit}` : '未设置条件'}
                    </p>
                    {medal.description && (
                      <p className="text-xs text-slate-400 dark:text-[var(--text-muted)] mt-0.5 truncate">{medal.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(medal)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-[var(--bg-surface)] text-slate-600 dark:text-[var(--text-secondary)] rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(medal.id)}
                      className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
            {medals.length === 0 && (
              <div className="text-center py-12 text-slate-400 dark:text-[var(--text-muted)]">
                <span className="material-symbols-outlined text-4xl mb-2 block">workspace_premium</span>
                <p className="text-sm">暂无勋章，点击右上角添加</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 编辑/创建表单弹窗 */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
            onClick={closeForm}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-white dark:bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                {/* 拖拽条 */}
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />

                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-[var(--text-primary)]">
                    {editingMedal ? '正在编辑勋章' : '添加新勋章'}
                  </h2>
                  <button
                    onClick={closeForm}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[var(--bg-card)] text-slate-500"
                    aria-label="关闭"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {/* 预览 */}
                <div className="flex justify-center mb-5">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${formData.color} flex items-center justify-center shadow-lg border-4 border-white`}>
                    <span className="material-symbols-outlined text-4xl text-white fill-icon">{formData.icon}</span>
                  </div>
                </div>

                {/* 图标选择 */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 dark:text-[var(--text-secondary)] mb-2">勋章图标</label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setFormData(prev => ({ ...prev, icon }))}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          formData.icon === icon
                            ? 'bg-primary text-slate-900 shadow-md scale-110'
                            : 'bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] hover:bg-primary/20'
                        }`}
                        aria-label={icon}
                      >
                        <span className="material-symbols-outlined text-xl fill-icon">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 颜色选择 */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 dark:text-[var(--text-secondary)] mb-2">勋章颜色</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setFormData(prev => ({ ...prev, color: c.value }))}
                        className={`w-8 h-8 rounded-full ${c.preview} transition-all ${
                          formData.color === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                        }`}
                        aria-label={c.label}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* 勋章标题 */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 dark:text-[var(--text-secondary)] mb-2">勋章标题</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：坚持之星"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-color)] rounded-xl text-sm text-slate-800 dark:text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* 勋章描述 */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 dark:text-[var(--text-secondary)] mb-2">勋章描述（可选）</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="例如：坚持打卡的小勇士"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-color)] rounded-xl text-sm text-slate-800 dark:text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* 解锁条件类型 */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 dark:text-[var(--text-secondary)] mb-2">解锁条件类型</label>
                  <select
                    value={formData.condition_type}
                    onChange={e => setFormData(prev => ({ ...prev, condition_type: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-color)] rounded-xl text-sm text-slate-800 dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {CONDITION_TYPES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* 达成数值 */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-[var(--text-secondary)] mb-2">
                    达成数值（{selectedCondition?.unit ?? '次'}）
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.condition_threshold}
                    onChange={e => setFormData(prev => ({ ...prev, condition_threshold: e.target.value }))}
                    placeholder={selectedCondition?.placeholder ?? '例如：10'}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-color)] rounded-xl text-sm text-slate-800 dark:text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* 错误提示 */}
                {error && (
                  <p className="text-red-500 text-xs mb-4 text-center">{error}</p>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={closeForm}
                    className="flex-1 py-3 bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-primary text-slate-900 font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {isSaving ? '保存中...' : (editingMedal ? '保存修改' : '添加勋章')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl p-6 max-w-xs w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-red-500 text-3xl">delete</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-[var(--text-primary)] mb-2">确认删除</h3>
                <p className="text-sm text-slate-500 dark:text-[var(--text-secondary)] mb-5">删除后无法恢复，已获得该勋章的记录也会一并删除。</p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 font-bold rounded-xl"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
