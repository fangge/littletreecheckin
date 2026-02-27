import React from 'react';
import { motion } from 'motion/react';
import { REWARDS } from '../constants';

interface StoreProps {
  onBack: () => void;
}

export default function Store({ onBack }: StoreProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto pb-32"
    >
      <div className="sticky top-0 z-10 flex items-center bg-background-light/80 px-6 pb-4 pt-12 backdrop-blur-md">
        <button 
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-full bg-slate-200/50"
        >
          <span className="material-symbols-outlined text-slate-900">arrow_back</span>
        </button>
        <h2 className="flex-1 text-center text-xl font-bold tracking-tight text-slate-900 pr-10">果实商店</h2>
      </div>

      <div className="px-6">
        <div className="relative mt-2 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-green-500 p-6 text-white shadow-lg shadow-primary/20">
          <div className="relative z-10 flex flex-col gap-1">
            <p className="text-sm font-semibold uppercase tracking-wider opacity-90">我的果实余额</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold">2,450</span>
              <span className="mb-1 text-2xl">🍎</span>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/20 blur-2xl"></div>
        </div>

        <div className="mt-8 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button className="whitespace-nowrap rounded-full bg-primary px-5 py-2 text-sm font-bold text-slate-900">全部奖励</button>
          <button className="whitespace-nowrap rounded-full bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-600">活动</button>
          <button className="whitespace-nowrap rounded-full bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-600">玩具</button>
          <button className="whitespace-nowrap rounded-full bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-600">零食</button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {REWARDS.map((reward) => (
            <div key={reward.id} className="group flex flex-col rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-100">
                <img alt={reward.name} className="h-full w-full object-cover" src={reward.image} />
              </div>
              <div className="mt-3 flex flex-col">
                <h4 className="text-sm font-bold text-slate-900 text-ellipsis overflow-hidden whitespace-nowrap">{reward.name}</h4>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-xs font-bold text-primary">{reward.price} 🍎</span>
                </div>
                <button className="mt-3 rounded-full bg-primary/20 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-primary hover:text-white">
                  兑换
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
