import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { childrenApi, rewardsApi, FruitsHistoryItem } from '../services/api';

interface FruitsHistoryProps {
  onBack: () => void;
}

// 根据 goal_icon 生成彩色背景
const ICON_COLORS = [
  'bg-orange-100 text-orange-500',
  'bg-blue-100 text-blue-500',
  'bg-green-100 text-green-500',
  'bg-purple-100 text-purple-500',
  'bg-yellow-100 text-yellow-500',
  'bg-pink-100 text-pink-500',
];

const getIconColor = (index: number) => ICON_COLORS[index % ICON_COLORS.length];

const formatCheckinTime = (isoStr: string): string => {
  const date = new Date(isoStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
};

export default function FruitsHistory({ onBack }: FruitsHistoryProps) {
  const { currentChild } = useAuth();
  const [items, setItems] = useState<FruitsHistoryItem[]>([]);
  const [fruitsBalance, setFruitsBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentChild) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [historyRes, fruitsRes] = await Promise.all([
          childrenApi.getFruitsHistory(currentChild.id),
          rewardsApi.getFruits(currentChild.id),
        ]);
        setItems(historyRes.data);
        setFruitsBalance(fruitsRes.data.fruits_balance);
      } catch (err) {
        console.error('获取果实记录失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentChild]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col bg-background-light overflow-hidden"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md border-b border-primary/10 px-4 py-4">
        <div className="flex items-center gap-3 max-w-md mx-auto lg:max-w-2xl">
          <button
            onClick={onBack}
            className="p-2 hover:bg-primary/10 rounded-full transition-colors"
            aria-label="返回"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">果实获取记录</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 lg:pb-8">
        <div className="px-4 pt-4 max-w-md mx-auto lg:max-w-2xl space-y-4">
          {/* 余额摘要卡片 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 p-6 text-white shadow-lg shadow-orange-300/30">
            <div className="relative z-10">
              <p className="text-sm font-semibold opacity-90">
                {currentChild ? `${currentChild.name}的果实总余额` : '我的果实总余额'}
              </p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-4xl font-extrabold">{fruitsBalance.toLocaleString()}</span>
                <span className="mb-1 text-2xl">🍎</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                <span className="material-symbols-outlined text-sm leading-none">star</span>
                <span className="text-xs font-semibold">继续努力，换取更多奖励！</span>
              </div>
            </div>
            {/* 装饰圆 */}
            <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10" />
            <div className="absolute -right-2 top-8 size-16 rounded-full bg-white/10" />
          </div>

          {/* 获取明细列表 */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">获取明细</h2>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <span className="material-symbols-outlined text-orange-400 text-4xl animate-pulse">hourglass_empty</span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">eco</span>
                <p className="text-sm">还没有获取记录，快去完成任务吧！</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm"
                  >
                    {/* 目标图标 */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${getIconColor(index)}`}>
                      <span className="material-symbols-outlined text-xl leading-none">
                        {item.goal_icon || 'task_alt'}
                      </span>
                    </div>
                    {/* 任务信息 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatCheckinTime(item.checkin_time)}</p>
                    </div>
                    {/* 果实数 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-base font-extrabold text-orange-500">+{item.fruits_earned}</span>
                      <span className="text-base">🍎</span>
                    </div>
                  </div>
                ))}
                <p className="text-center text-xs text-slate-400 py-4">没有更多记录啦~</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </motion.div>
  );
}