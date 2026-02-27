import React from 'react';
import { motion } from 'motion/react';
import { MEDALS } from '../constants';

interface MedalsProps {
  onBack: () => void;
}

export default function Medals({ onBack }: MedalsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 overflow-y-auto pb-32"
    >
      <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-primary/10">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-primary/20"
        >
          <span className="material-symbols-outlined text-slate-700">arrow_back</span>
        </button>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">我的勋章墙</h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-primary/20">
          <span className="material-symbols-outlined text-slate-700">help</span>
        </button>
      </header>

      <section className="p-6 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full border-4 border-primary bg-primary/10 p-1 shadow-lg overflow-hidden">
            <img 
              alt="Child avatar" 
              className="w-full h-full object-cover rounded-full" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA76jHaNOwcuDLfDfUV3xm4tI7C-bCoeL4rwcM1VrEtdmN_YboPIpVg92LE-87cE8WQd68A6SfKpw33XQDp8onOkZQ5PTpkJuQlmQN19lnqI4ngUL0yfVDxqHkt_KJMr0FW4kHipotZgxZ2BE3028o8joUlD6DwNsCUvwnBsZYXgJiN0Hw7QuCvvKUnVKAf_pxs0JCBh8zMg_HsIyczgVuB8gc3zcp0TOA8NZMG9VGdESuoCe5i3AqM7tPoQZLB4lVPnEQCXhdtXM9k" 
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-slate-900 font-bold px-3 py-1 rounded-full text-xs shadow-md border-2 border-white">
            等级 12
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">小小金牌园丁</h2>
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary font-bold">workspace_premium</span>
          <p className="text-slate-600 font-semibold">已获得 12 枚勋章</p>
        </div>
        <p className="text-sm text-slate-500 max-w-[280px]">你做得太棒了！继续照顾你的小树来解锁更多成就吧！</p>
      </section>

      <nav className="px-6 mb-6">
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button className="flex-1 py-2 text-sm font-bold rounded-lg bg-primary text-slate-900 shadow-sm">全部</button>
          <button className="flex-1 py-2 text-sm font-bold text-slate-600">已解锁</button>
          <button className="flex-1 py-2 text-sm font-bold text-slate-600">未解锁</button>
        </div>
      </nav>

      <section className="px-6 grid grid-cols-3 gap-y-8 gap-x-4 py-4">
        {MEDALS.map((medal) => (
          <div key={medal.id} className={`flex flex-col items-center gap-2 ${!medal.unlocked ? 'opacity-50 grayscale' : ''}`}>
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${medal.color} flex items-center justify-center shadow-lg border-4 border-white relative`}>
              <span className="material-symbols-outlined text-4xl text-white drop-shadow-md fill-icon">
                {medal.icon}
              </span>
              {medal.unlocked && (
                <div className="absolute -top-1 -right-1 bg-green-500 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="material-symbols-outlined text-xs text-white font-bold">check</span>
                </div>
              )}
            </div>
            <p className="text-[11px] font-extrabold text-slate-800 text-center leading-tight tracking-wider">{medal.name}</p>
          </div>
        ))}
      </section>

      <div className="mx-6 mt-8 p-4 bg-white rounded-2xl shadow-xl border-2 border-primary/20 flex gap-4 items-center">
        <div className="w-16 h-16 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-3xl fill-icon">military_tech</span>
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">最新获得奖励</h3>
          <p className="text-xs text-slate-600">“早起小标兵” 获得于 2023年10月24日</p>
          <div className="mt-2 text-[10px] font-bold text-primary flex items-center gap-1">
            查看详情 <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
