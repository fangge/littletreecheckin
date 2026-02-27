import React from 'react';
import { motion } from 'motion/react';

interface GoalSettingProps {
  onBack: () => void;
}

export default function GoalSetting({ onBack }: GoalSettingProps) {
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
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 text-lg font-extrabold leading-tight tracking-tight flex-1 text-center">设置新目标</h2>
        <div className="size-10"></div>
      </div>

      <div className="flex flex-col gap-3 p-6 pt-2">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-slate-900 text-sm font-bold uppercase tracking-wider">第 1 步 (共 4 步)</p>
          <p className="text-primary text-sm font-bold leading-normal">准备开始</p>
        </div>
        <div className="rounded-full bg-primary/20 h-3 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: '25%' }}></div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-32">
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
            <button className="flex aspect-square items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-3xl fill-icon">auto_stories</span>
            </button>
            <button className="flex aspect-square items-center justify-center rounded-2xl bg-white border-2 border-primary/10 text-slate-400 hover:border-primary/40 transition-colors">
              <span className="material-symbols-outlined text-3xl">fitness_center</span>
            </button>
            <button className="flex aspect-square items-center justify-center rounded-2xl bg-white border-2 border-primary/10 text-slate-400 hover:border-primary/40 transition-colors">
              <span className="material-symbols-outlined text-3xl">brush</span>
            </button>
            <button className="flex aspect-square items-center justify-center rounded-2xl bg-white border-2 border-primary/10 text-slate-400 hover:border-primary/40 transition-colors">
              <span className="material-symbols-outlined text-3xl">piano</span>
            </button>
            <button className="flex aspect-square items-center justify-center rounded-2xl bg-white border-2 border-primary/10 text-slate-400 hover:border-primary/40 transition-colors">
              <span className="material-symbols-outlined text-3xl">pets</span>
            </button>
            <button className="flex aspect-square items-center justify-center rounded-2xl bg-white border-2 border-primary/10 text-slate-400 hover:border-primary/40 transition-colors">
              <span className="material-symbols-outlined text-3xl">rocket_launch</span>
            </button>
            <button className="flex aspect-square items-center justify-center rounded-2xl bg-white border-2 border-primary/10 text-slate-400 hover:border-primary/40 transition-colors">
              <span className="material-symbols-outlined text-3xl">psychology</span>
            </button>
            <button className="flex aspect-square items-center justify-center rounded-2xl bg-primary/10 border-2 border-dashed border-primary text-primary">
              <span className="material-symbols-outlined text-3xl">add</span>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-4">目标时长</h3>
          <div className="flex gap-3">
            <div className="flex-1 bg-white border-2 border-primary/10 rounded-2xl p-4 text-center">
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">天</p>
              <p className="text-slate-900 text-xl font-bold">21</p>
            </div>
            <div className="flex-1 bg-white border-2 border-primary/10 rounded-2xl p-4 text-center">
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">小时</p>
              <p className="text-slate-900 text-xl font-bold">0</p>
            </div>
            <div className="flex-1 bg-primary/20 border-2 border-primary rounded-2xl p-4 text-center">
              <p className="text-primary text-xs font-extrabold uppercase mb-1">分钟</p>
              <p className="text-slate-900 text-xl font-bold">20</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-slate-700 text-base font-bold ml-1 pb-4">解锁奖励</h3>
          <div className="flex items-center gap-4 bg-gradient-to-r from-primary to-green-400 rounded-2xl p-5 text-white shadow-lg">
            <div className="size-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl fill-icon">forest</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase opacity-80">森林礼包</p>
              <p className="text-lg font-bold">金色橡树</p>
            </div>
            <span className="material-symbols-outlined">chevron_right</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light via-background-light to-transparent max-w-md mx-auto z-10">
        <button className="w-full bg-primary hover:bg-primary/90 text-slate-900 text-lg font-extrabold py-5 rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2">
          继续设置计划
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </motion.div>
  );
}
