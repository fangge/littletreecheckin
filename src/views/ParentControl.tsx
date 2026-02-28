import React from 'react';
import { motion } from 'motion/react';
import { TASKS } from '../constants';

interface ParentControlProps {
  onBack: () => void;
}

export default function ParentControl({ onBack }: ParentControlProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background-light overflow-hidden"
    >
      <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md border-b border-primary/10 px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-primary/10 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined">shield_person</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">家长控制</h1>
          </div>
          <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      <div className="px-4 py-4 max-w-md mx-auto w-full">
        <div className="flex p-1 bg-primary/10 rounded-xl">
          <button className="flex-1 py-2 text-sm font-semibold rounded-lg bg-white shadow-sm text-slate-900">
            待审核 ({TASKS.length})
          </button>
          <button className="flex-1 py-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors">
            已批准
          </button>
        </div>
      </div>

      <main className="flex-1 px-4 pb-32 overflow-y-auto max-w-md mx-auto w-full space-y-4">
        {TASKS.map((task) => (
          <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-primary/5 overflow-hidden">
            <div className="p-4 flex gap-4">
              <div className="w-20 h-20 rounded-xl bg-primary/5 flex items-center justify-center relative overflow-hidden shrink-0 border border-primary/10">
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-80" 
                  style={{ backgroundImage: `url("${task.image}")` }}
                ></div>
                <div className="absolute bottom-1 right-1 bg-white/90 px-1 rounded text-[10px] font-bold text-primary">{task.progress}%</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">{task.type}</p>
                  <span className="text-[10px] text-slate-400">{task.time}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 truncate">{task.title}</h3>
                <p className="text-sm text-slate-500 mt-1">虚拟树：{task.treeName}</p>
              </div>
            </div>
            
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">添加鼓励的话</label>
                <div className="relative">
                  <input 
                    className="w-full bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400" 
                    placeholder="留个便条..." 
                    type="text" 
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button className="p-1 hover:bg-primary/10 rounded-full text-lg">❤️</button>
                    <button className="p-1 hover:bg-primary/10 rounded-full text-lg">⭐</button>
                    <button className="p-1 hover:bg-primary/10 rounded-full text-lg">👍</button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-white transition-colors">太棒了！</button>
                <button className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-white transition-colors">继续加油！</button>
                <button className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-white transition-colors">为你感到骄傲！</button>
              </div>
            </div>
            
            <div className="flex border-t border-primary/5">
              <button className="flex-1 py-4 flex items-center justify-center gap-2 hover:bg-red-50 text-red-500 transition-colors border-r border-primary/5">
                <span className="material-symbols-outlined text-xl">cancel</span>
                <span className="font-bold text-sm">需改进</span>
              </button>
              <button className="flex-1 py-4 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all group">
                <span className="material-symbols-outlined fill-icon text-xl">check_circle</span>
                <span className="font-bold text-sm">批准并发送</span>
              </button>
            </div>
          </div>
        ))}
      </main>
    </motion.div>
  );
}
