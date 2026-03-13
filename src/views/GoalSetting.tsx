import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { treesApi, Child, GoalData } from '../services/api';

interface GoalSettingProps {
  onBack: () => void;
  // 编辑模式：传入现有目标数据
  editGoal?: GoalData & { childId?: string };
}

const ICONS = [
  'auto_stories', 'fitness_center', 'brush', 'piano',
  'pets', 'rocket_launch', 'psychology', 'sports_soccer',
];

type DurationUnit = 'days' | 'hours' | 'minutes';
type DailyUnit = 'hours' | 'minutes';

const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  days: '天',
  hours: '小时',
  minutes: '分钟',
};

const DAILY_UNIT_LABELS: Record<DailyUnit, string> = {
  hours: '小时',
  minutes: '分钟',
};

const QUICK_DAYS = [7, 14, 21, 30];

const toDays = (value: number, unit: DurationUnit): number => {
  if (!value || value <= 0) return 1;
  switch (unit) {
    case 'days': return Math.max(1, Math.min(365, Math.round(value)));
    case 'hours': return Math.max(1, Math.min(365, Math.ceil(value / 24)));
    case 'minutes': return Math.max(1, Math.min(365, Math.ceil(value / 1440)));
  }
};

const toMinutes = (value: number, unit: DailyUnit): number => {
  if (!value || value <= 0) return 0;
  switch (unit) {
    case 'hours': return Math.round(value * 60);
    case 'minutes': return Math.round(value);
  }
};

export default function GoalSetting({ onBack, editGoal }: GoalSettingProps) {
  const { user, currentChild, setCurrentChild } = useAuth();
  const isEditMode = !!editGoal;

  // 编辑模式下：找到目标归属的孩子作为初始选中
  const initialChild = isEditMode && editGoal?.childId
    ? user?.children?.find(c => c.id === editGoal.childId) || currentChild
    : currentChild;

  const [selectedChild, setSelectedChild] = useState<Child | null>(initialChild);
  const [title, setTitle] = useState(editGoal?.title || '');
  const [selectedIcon, setSelectedIcon] = useState(editGoal?.icon || 'auto_stories');
  const [rewardTreeName, setRewardTreeName] = useState(editGoal?.reward_tree_name || '');

  // 目标时长（编辑模式下预填充天数）
  const [durationValue, setDurationValue] = useState<string>(
    editGoal ? String(editGoal.duration_days) : '21'
  );
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('days');

  // 每日时长（编辑模式下预填充分钟数）
  const [dailyValue, setDailyValue] = useState<string>(
    editGoal?.duration_minutes ? String(editGoal.duration_minutes) : ''
  );
  const [dailyUnit, setDailyUnit] = useState<DailyUnit>('minutes');

  // 每日次数（编辑模式下预填充）
  const [dailyCountValue, setDailyCountValue] = useState<string>(
    editGoal?.daily_count ? String(editGoal.daily_count) : ''
  );

  // 每次获得果实数（编辑模式下预填充，默认10）
  const [fruitsPerTaskValue, setFruitsPerTaskValue] = useState<string>(
    editGoal?.fruits_per_task ? String(editGoal.fruits_per_task) : '10'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDurationQuickSelect = (days: number) => {
    setDurationValue(String(days));
    setDurationUnit('days');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('请输入目标名称');
      return;
    }

    const numDuration = parseFloat(durationValue);
    if (!durationValue || isNaN(numDuration) || numDuration <= 0) {
      setError('请输入有效的目标时长');
      return;
    }

    if (!selectedChild) {
      setError('请先选择孩子');
      return;
    }

    const durationDays = toDays(numDuration, durationUnit);
    const numDaily = dailyValue ? parseFloat(dailyValue) : 0;
    const durationMinutes = dailyValue && !isNaN(numDaily) ? toMinutes(numDaily, dailyUnit) : 0;
    const numDailyCount = dailyCountValue ? parseInt(dailyCountValue, 10) : null;
    const dailyCount = dailyCountValue && !isNaN(numDailyCount!) && numDailyCount! > 0 ? numDailyCount : null;
    const numFruitsPerTask = fruitsPerTaskValue ? parseInt(fruitsPerTaskValue, 10) : 10;
    const fruitsPerTask = !isNaN(numFruitsPerTask) && numFruitsPerTask > 0 ? numFruitsPerTask : 10;

    setIsLoading(true);
    setError('');

    try {
      if (isEditMode && editGoal) {
        // 编辑模式：更新目标（包含可能变更的归属孩子）
        await treesApi.updateGoal(editGoal.id, {
          title: title.trim(),
          icon: selectedIcon,
          duration_days: durationDays,
          duration_minutes: durationMinutes,
          daily_count: dailyCount,
          reward_tree_name: rewardTreeName.trim() || title.trim(),
          child_id: selectedChild.id !== editGoal.childId ? selectedChild.id : undefined,
          fruits_per_task: fruitsPerTask,
        });
        // 如果修改了归属孩子，自动切换 currentChild 到新孩子
        if (selectedChild.id !== editGoal.childId) {
          setCurrentChild(selectedChild);
        }
      } else {
        // 创建模式：新建目标，切换 currentChild 到所选孩子
        await treesApi.createGoal(selectedChild!.id, {
          title: title.trim(),
          icon: selectedIcon,
          duration_days: durationDays,
          duration_minutes: durationMinutes,
          daily_count: dailyCount,
          reward_tree_name: rewardTreeName.trim() || title.trim(),
          fruits_per_task: fruitsPerTask,
        });
        if (selectedChild.id !== currentChild?.id) {
          setCurrentChild(selectedChild);
        }
      }
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${isEditMode ? '更新' : '创建'}目标失败，请重试`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editGoal) return;
    if (!confirm(`确定要删除目标"${editGoal.title}"吗？相关的打卡记录和树木也会一并删除，此操作不可恢复。`)) return;

    setIsDeleting(true);
    try {
      await treesApi.deleteGoal(editGoal.id);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const computedDays = durationValue && !isNaN(parseFloat(durationValue))
    ? toDays(parseFloat(durationValue), durationUnit)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col bg-background-light overflow-x-hidden"
    >
      <div className="flex items-center p-6 pb-2 justify-between lg:max-w-xl lg:mx-auto lg:w-full">
        <button
          onClick={onBack}
          className="text-slate-900 dark:text-[var(--text-primary)] flex size-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-[var(--bg-card)] shadow-sm"
          aria-label="返回"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 dark:text-[var(--text-primary)] text-lg font-extrabold leading-tight tracking-tight flex-1 text-center">
          {isEditMode ? '修改目标' : '设置新目标'}
        </h2>
        {/* 编辑模式下显示删除按钮 */}
        {isEditMode ? (
          <button
            className="size-10 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="删除目标"
          >
            <span className="material-symbols-outlined text-xl">
              {isDeleting ? 'hourglass_empty' : 'delete'}
            </span>
          </button>
        ) : (
          <div className="size-10" />
        )}
      </div>

      {isEditMode && (
        <div className="mx-6 mt-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs flex items-center gap-2 lg:max-w-xl lg:mx-auto lg:w-[calc(100%-3rem)]">
          <span className="material-symbols-outlined text-sm">edit</span>
          修改目标信息不会影响已完成的打卡记录
        </div>
      )}

      {error && (
        <div className="mx-6 mt-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm lg:max-w-xl lg:mx-auto lg:w-[calc(100%-3rem)]">
          {error}
        </div>
      )}

      <div className="flex-1 px-6 pb-32 overflow-y-auto pt-4 lg:pb-8">
        <div className="lg:max-w-xl lg:mx-auto">
        <h3 className="text-slate-900 dark:text-[var(--text-primary)] tracking-tight text-3xl font-extrabold leading-tight text-center pb-6">
          {isEditMode ? '调整你的' : '种下你的下一个'}<br />
          <span className="text-primary">{isEditMode ? '成长之树' : '成长之树？'}</span>
        </h3>

        {/* 孩子选择（多孩子时显示，新建和编辑模式均支持） */}
        {user?.children && user.children.length > 1 && (
          <div className="mb-6">
            <p className="text-slate-700 text-base font-bold ml-1 mb-3">
              为哪个孩子设置目标 <span className="text-red-400">*</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {user.children.map(child => (
              <button
                key={child.id}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                  selectedChild?.id === child.id
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-white dark:bg-[var(--bg-card)] border-slate-200 dark:border-[var(--border-color)] text-slate-600 dark:text-[var(--text-secondary)] hover:border-primary/40'
                }`}
                onClick={() => setSelectedChild(child)}
                aria-label={`选择${child.name}`}
              >
                  <span className="material-symbols-outlined text-base">
                    {child.gender === 'female' ? 'face_3' : 'face'}
                  </span>
                  {child.name}
                  {selectedChild?.id === child.id && (
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                  )}
                </button>
              ))}
            </div>
            {selectedChild && (
              <p className="text-xs text-slate-400 mt-2 ml-1">
                将为 <span className="text-primary font-bold">{selectedChild.name}</span> 种下这棵树
              </p>
            )}
          </div>
        )}

        {/* 目标名称 */}
        <div className="mb-6">
          <label className="flex flex-col gap-3">
            <p className="text-slate-700 text-base font-bold ml-1">目标名称 <span className="text-red-400">*</span></p>
            <div className="relative">
              <input
                className="form-input flex w-full rounded-2xl text-slate-900 border-2 border-primary/20 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 h-16 placeholder:text-slate-400 p-5 text-lg font-medium shadow-sm transition-all"
                placeholder="例如：阅读20分钟"
                value={title}
                onChange={e => setTitle(e.target.value)}
                aria-label="目标名称"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                <span className="material-symbols-outlined text-3xl">edit_note</span>
              </div>
            </div>
          </label>
        </div>

        {/* 选择图标 */}
        <div className="mb-6">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-4">选择图标</h3>
          <div className="grid grid-cols-4 gap-4">
            {ICONS.map(icon => (
              <button
                key={icon}
                className={`flex aspect-square items-center justify-center rounded-2xl transition-all ${
                  selectedIcon === icon
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white dark:bg-[var(--bg-card)] border-2 border-primary/10 text-slate-400 dark:text-[var(--text-secondary)] hover:border-primary/40'
                }`}
                onClick={() => setSelectedIcon(icon)}
                aria-label={icon}
              >
                <span className="material-symbols-outlined text-3xl">{icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 目标时长 */}
        <div className="mb-6">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-3">
            目标时长 <span className="text-red-400">*</span>
            {computedDays && durationUnit !== 'days' && (
              <span className="text-primary text-sm font-normal ml-2">≈ {computedDays} 天</span>
            )}
          </h3>

          <div className="flex gap-2 mb-3">
            {QUICK_DAYS.map(days => (
              <button
                key={days}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  durationValue === String(days) && durationUnit === 'days'
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-white dark:bg-[var(--bg-card)] border-slate-200 dark:border-[var(--border-color)] text-slate-500 dark:text-[var(--text-secondary)] hover:border-primary/40'
                }`}
                onClick={() => handleDurationQuickSelect(days)}
                aria-label={`${days}天`}
              >
                {days}天
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                className="form-input w-full rounded-xl border-2 border-primary/20 bg-white dark:bg-[var(--bg-card)] text-slate-900 dark:text-[var(--text-primary)] h-12 placeholder:text-slate-400 px-4 text-lg font-bold focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                type="number"
                min="1"
                placeholder="自定义"
                value={durationValue}
                onChange={e => setDurationValue(e.target.value)}
                aria-label="目标时长数值"
              />
            </div>
            <div className="flex bg-white dark:bg-[var(--bg-card)] border-2 border-primary/20 dark:border-[var(--border-color)] rounded-xl overflow-hidden h-12">
              {(['days', 'hours', 'minutes'] as DurationUnit[]).map(unit => (
                <button
                  key={unit}
                  className={`px-3 text-sm font-bold transition-all ${
                    durationUnit === unit
                      ? 'bg-primary text-white'
                      : 'text-slate-500 hover:bg-primary/10'
                  }`}
                  onClick={() => setDurationUnit(unit)}
                  aria-label={DURATION_UNIT_LABELS[unit]}
                >
                  {DURATION_UNIT_LABELS[unit]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 每日时长（可选） */}
        <div className="mb-6">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-3">
            每日时长
            <span className="text-slate-400 text-xs font-normal ml-2">（可选）</span>
          </h3>

          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                className="form-input w-full rounded-xl border-2 border-primary/20 bg-white text-slate-900 h-12 placeholder:text-slate-400 px-4 text-lg font-bold focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                type="number"
                min="1"
                placeholder="不限制"
                value={dailyValue}
                onChange={e => setDailyValue(e.target.value)}
                aria-label="每日时长数值"
              />
              {dailyValue && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setDailyValue('')}
                  aria-label="清除每日时长"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>
            <div className="flex bg-white dark:bg-[var(--bg-card)] border-2 border-primary/20 dark:border-[var(--border-color)] rounded-xl overflow-hidden h-12">
              {(['hours', 'minutes'] as DailyUnit[]).map(unit => (
                <button
                  key={unit}
                  className={`px-4 text-sm font-bold transition-all ${
                    dailyUnit === unit
                      ? 'bg-primary text-white'
                      : 'text-slate-500 hover:bg-primary/10'
                  }`}
                  onClick={() => setDailyUnit(unit)}
                  aria-label={DAILY_UNIT_LABELS[unit]}
                >
                  {DAILY_UNIT_LABELS[unit]}
                </button>
              ))}
            </div>
          </div>

          {dailyValue && !isNaN(parseFloat(dailyValue)) && (
            <p className="text-xs text-slate-400 mt-2 ml-1">
              每天需完成 {dailyUnit === 'hours'
                ? `${dailyValue} 小时（${toMinutes(parseFloat(dailyValue), 'hours')} 分钟）`
                : `${dailyValue} 分钟`}
            </p>
          )}
        </div>

        {/* 每日次数（可选） */}
        <div className="mb-6">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-3">
            每日次数
            <span className="text-slate-400 text-xs font-normal ml-2">（可选）</span>
          </h3>

          <div className="relative">
            <input
              className="form-input w-full rounded-xl border-2 border-primary/20 bg-white text-slate-900 h-12 placeholder:text-slate-400 px-4 text-lg font-bold focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all pr-12"
              type="number"
              min="1"
              max="99"
              placeholder="不限制"
              value={dailyCountValue}
              onChange={e => setDailyCountValue(e.target.value)}
              aria-label="每日次数"
            />
            {dailyCountValue ? (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setDailyCountValue('')}
                aria-label="清除每日次数"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            ) : (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">次</span>
            )}
          </div>

          {dailyCountValue && !isNaN(parseInt(dailyCountValue, 10)) && parseInt(dailyCountValue, 10) > 0 && (
            <p className="text-xs text-slate-400 mt-2 ml-1">
              每天需完成 <span className="text-primary font-bold">{dailyCountValue}</span> 次
            </p>
          )}
        </div>

        {/* 每次获得果实数 */}
        <div className="mb-6">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-3">
            每次获得果实数
            <span className="text-slate-400 text-xs font-normal ml-2">（默认10个）</span>
          </h3>

          <div className="relative">
            <input
              className="form-input w-full rounded-xl border-2 border-primary/20 bg-white text-slate-900 h-12 placeholder:text-slate-400 px-4 text-lg font-bold focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all pr-12"
              type="number"
              min="1"
              max="999"
              placeholder="10"
              value={fruitsPerTaskValue}
              onChange={e => setFruitsPerTaskValue(e.target.value)}
              aria-label="每次获得果实数"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg">🍎</span>
          </div>

          {fruitsPerTaskValue && !isNaN(parseInt(fruitsPerTaskValue, 10)) && parseInt(fruitsPerTaskValue, 10) > 0 && (
            <p className="text-xs text-slate-400 mt-2 ml-1">
              每次任务审核通过后获得 <span className="text-primary font-bold">{fruitsPerTaskValue}</span> 个果实
            </p>
          )}
        </div>

        {/* 解锁奖励树木名称 */}
        <div className="mb-6">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-3">
            解锁奖励树木名称
            <span className="text-slate-400 text-xs font-normal ml-2">（默认与目标名称相同）</span>
          </h3>
          <input
            className="form-input flex w-full rounded-2xl text-slate-900 border-2 border-primary/20 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 h-14 placeholder:text-slate-400 px-5 font-medium shadow-sm transition-all"
            placeholder={title || '例如：金色橡树'}
            value={rewardTreeName}
            onChange={e => setRewardTreeName(e.target.value)}
            aria-label="奖励树木名称"
          />
          <div className="flex items-center gap-4 bg-gradient-to-r from-primary to-green-400 rounded-2xl p-5 text-white shadow-lg mt-4">
            <div className="size-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl fill-icon">forest</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase opacity-80">完成目标解锁</p>
              <p className="text-lg font-bold">{rewardTreeName || title || '金色橡树'}</p>
              {computedDays && (
                <p className="text-xs opacity-70 mt-0.5">
                  坚持 {computedDays} 天后长成
                </p>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light via-background-light to-transparent z-10 space-y-3 lg:sticky lg:bottom-0 lg:bg-none lg:pt-4 lg:pb-8">
        <div className="lg:max-w-xl lg:mx-auto space-y-3">
        <button
          className="w-full bg-primary hover:bg-primary/90 text-slate-900 text-lg font-extrabold py-5 rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          onClick={handleSubmit}
          disabled={isLoading}
          aria-label={isEditMode ? '保存修改' : '创建目标'}
        >
          {isLoading
            ? (isEditMode ? '保存中...' : '创建中...')
            : (isEditMode ? '保存修改' : '种下这棵树')}
          {!isLoading && (
            <span className="material-symbols-outlined">
              {isEditMode ? 'save' : 'park'}
            </span>
          )}
        </button>
        {/* 编辑模式下底部也显示删除按钮，更加明显 */}
        {isEditMode && (
          <button
            className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all disabled:opacity-50"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="删除此目标"
          >
            <span className="material-symbols-outlined text-lg">
              {isDeleting ? 'hourglass_empty' : 'delete_forever'}
            </span>
            {isDeleting ? '删除中...' : '删除此目标（含打卡记录和树木）'}
          </button>
        )}
        </div>
      </div>
    </motion.div>
  );
}
