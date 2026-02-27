import React from 'react';
import { motion } from 'motion/react';
import { TREES } from '../constants';

interface DashboardProps {
  onAddGoal: () => void;
  onViewStore: () => void;
}

export default function Dashboard({ onAddGoal, onViewStore }: DashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto pb-32"
    >
      <header className="sticky top-0 z-10 flex items-center bg-background-light/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-primary/10">
        <div className="flex size-12 shrink-0 items-center justify-start">
          <span className="material-symbols-outlined text-slate-900 text-2xl">settings</span>
        </div>
        <h1 className="text-slate-900 text-xl font-bold leading-tight tracking-tight flex-1 text-center">我的森林</h1>
        <div className="flex size-12 items-center justify-end">
          <button 
            onClick={onViewStore}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-primary/20 text-slate-900"
          >
            <span className="material-symbols-outlined text-2xl">storefront</span>
          </button>
        </div>
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
            <span className="text-primary font-bold text-sm">85% 生长中</span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-2xl font-extrabold">12</p>
              <p className="text-slate-500 text-[10px] sm:text-xs">已长成树木</p>
            </div>
            <div className="flex-1 border-x border-primary/20 px-4">
              <p className="text-2xl font-extrabold text-primary">340</p>
              <p className="text-slate-500 text-[10px] sm:text-xs">累计任务</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-2xl font-extrabold">4</p>
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
      <div className="grid grid-cols-2 gap-4 p-4">
        {TREES.map((tree) => (
          <div key={tree.id} className="relative group">
            <div
              className="bg-cover bg-center flex flex-col gap-3 rounded-xl justify-end p-4 aspect-square overflow-hidden shadow-lg shadow-primary/5"
              style={{
                backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 60%), url("${tree.image}")`,
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-white text-base font-bold leading-tight">{tree.name}</p>
                {tree.status === 'completed' ? (
                  <span className="material-symbols-outlined text-primary text-sm font-bold fill-icon">check_circle</span>
                ) : (
                  <div className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    <span className="text-[10px] text-white font-bold">{tree.level} 级</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Prominent Add Goal Entry */}
        <button 
          onClick={onAddGoal}
          className="relative flex flex-col items-center justify-center gap-3 rounded-xl aspect-square border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group"
        >
          <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">add</span>
          </div>
          <p className="text-primary font-bold text-sm">添加新目标</p>
        </button>
      </div>

      <div className="px-4 pb-8 text-center">
        <p className="text-slate-500 text-sm">继续完成任务，解锁更多珍稀树木！</p>
      </div>

      <div className="fixed bottom-24 right-6 z-30">
        <button 
          onClick={onAddGoal}
          className="flex size-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/40 text-white transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>
    </motion.div>
  );
}
