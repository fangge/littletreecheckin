import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { treesApi } from '../services/api';

interface GoalSettingProps {
  onBack: () => void;
}

const ICONS = [
  'auto_stories', 'fitness_center', 'brush', 'piano',
  'pets', 'rocket_launch', 'psychology', 'sports_soccer',
];

export default function GoalSetting({ onBack }: GoalSettingProps) {
  const { currentChild } = useAuth();
  const [title, setTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('auto_stories');
  const [durationDays, setDurationDays] = useState(21);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [rewardTreeName, setRewardTreeName] = useState('金色橡树');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('请输入目标名称');
      return;
    }

    if (!currentChild) {
      setError('请先选择孩子');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await treesApi.createGoal(currentChild.id, {
        title: title.trim(),
        icon: selectedIcon,
        duration_days: durationDays,
        duration_minutes: durationMinutes,
        reward_tree_name: rewardTreeName || title.trim(),
      });
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建目标失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col bg-background-light overflow-x-hidden"
    >
      <div className="flex items-center p-6 pb-2 justify-between">
        <button
          onClick={onBack}
          className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label="返回"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 text-lg font-extrabold leading-tight tracking-tight flex-1 text-center">设置新目标</h2>
        <div className="size-10"></div>
      </div>

      <div className="flex flex-col gap-3 p-6 pt-2">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-slate-900 text-sm font-bold uppercase tracking-wider">目标设置</p>
          <p className="text-primary text-sm font-bold leading-normal">准备开始</p>
        </div>
        <div className="rounded-full bg-primary/20 h-3 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: '100%' }}></div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 px-6 pb-32 overflow-y-auto">
        <h3 className="text-slate-900 tracking-tight text-3xl font-extrabold leading-tight text-center pb-8 pt-4">
          开启你的下一个<br />
          <span className="text-primary">探险之旅？</span>
        </h3>

        <div className="mb-8">
          <label className="flex flex-col gap-3">
            <p className="text-slate-700 text-base font-bold ml-1">目标名称</p>
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

        <div className="mb-8">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-4">选择图标</h3>
          <div className="grid grid-cols-4 gap-4">
            {ICONS.map(icon => (
              <button
                key={icon}
                className={`flex aspect-square items-center justify-center rounded-2xl transition-all ${
                  selectedIcon === icon
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white border-2 border-primary/10 text-slate-400 hover:border-primary/40'
                }`}
                onClick={() => setSelectedIcon(icon)}
                aria-label={icon}
              >
                <span className="material-symbols-outlined text-3xl">{icon}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-4">目标时长（天）</h3>
          <div className="flex gap-3">
            {[7, 14, 21, 30].map(days => (
              <button
                key={days}
                className={`flex-1 rounded-2xl p-4 text-center border-2 transition-all ${
                  durationDays === days
                    ? 'bg-primary/20 border-primary'
                    : 'bg-white border-primary/10'
                }`}
                onClick={() => setDurationDays(days)}
                aria-label={`${days}天`}
              >
                <p className={`text-xs font-bold uppercase mb-1 ${durationDays === days ? 'text-primary' : 'text-slate-400'}`}>天</p>
                <p className="text-slate-900 text-xl font-bold">{days}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-4">每日时长（分钟）</h3>
          <div className="flex gap-3">
            {[10, 20, 30, 60].map(mins => (
              <button
                key={mins}
                className={`flex-1 rounded-2xl p-4 text-center border-2 transition-all ${
                  durationMinutes === mins
                    ? 'bg-primary/20 border-primary'
                    : 'bg-white border-primary/10'
                }`}
                onClick={() => setDurationMinutes(mins)}
                aria-label={`${mins}分钟`}
              >
                <p className={`text-xs font-bold uppercase mb-1 ${durationMinutes === mins ? 'text-primary' : 'text-slate-400'}`}>分钟</p>
                <p className="text-slate-900 text-xl font-bold">{mins}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-4">解锁奖励树木名称</h3>
          <input
            className="form-input flex w-full rounded-2xl text-slate-900 border-2 border-primary/20 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 h-14 placeholder:text-slate-400 px-5 font-medium shadow-sm transition-all"
            placeholder="例如：金色橡树"
            value={rewardTreeName}
            onChange={e => setRewardTreeName(e.target.value)}
            aria-label="奖励树木名称"
          />
          <div className="flex items-center gap-4 bg-gradient-to-r from-primary to-green-400 rounded-2xl p-5 text-white shadow-lg mt-4">
            <div className="size-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl fill-icon">forest</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase opacity-80">森林礼包</p>
              <p className="text-lg font-bold">{rewardTreeName || '金色橡树'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light via-background-light to-transparent max-w-md mx-auto z-10">
        <button
          className="w-full bg-primary hover:bg-primary/90 text-slate-900 text-lg font-extrabold py-5 rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          onClick={handleSubmit}
          disabled={isLoading}
          aria-label="创建目标"
        >
          {isLoading ? '创建中...' : '种下这棵树'}
          {!isLoading && <span className="material-symbols-outlined">park</span>}
        </button>
      </div>
    </motion.div>
  );
}
