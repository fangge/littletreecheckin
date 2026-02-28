import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { rewardsApi, RewardData } from '../services/api';

interface StoreProps {
  onBack: () => void;
}

const CATEGORIES = [
  { key: '', label: '全部奖励' },
  { key: 'activity', label: '活动' },
  { key: 'toy', label: '玩具' },
  { key: 'snack', label: '零食' },
];

export default function Store({ onBack }: StoreProps) {
  const { currentChild, refreshUser } = useAuth();
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [fruitsBalance, setFruitsBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [rewardsRes] = await Promise.all([
          rewardsApi.list(activeCategory || undefined),
        ]);
        setRewards(rewardsRes.data);

        if (currentChild) {
          const fruitsRes = await rewardsApi.getFruits(currentChild.id);
          setFruitsBalance(fruitsRes.data.fruits_balance);
        }
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentChild, activeCategory]);

  const handleRedeem = async (reward: RewardData) => {
    if (!currentChild) return;
    if (fruitsBalance < reward.price) {
      alert(`果实余额不足！当前余额：${fruitsBalance}，需要：${reward.price}`);
      return;
    }

    setRedeemingId(reward.id);
    try {
      const res = await rewardsApi.redeem(reward.id, currentChild.id);
      setFruitsBalance(res.data.remaining_balance);
      await refreshUser();
      alert(res.message || '兑换成功！');
    } catch (err) {
      alert(err instanceof Error ? err.message : '兑换失败');
    } finally {
      setRedeemingId(null);
    }
  };

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
          aria-label="返回"
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
              <span className="text-4xl font-extrabold">{fruitsBalance.toLocaleString()}</span>
              <span className="mb-1 text-2xl">🍎</span>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/20 blur-2xl"></div>
        </div>

        <div className="mt-8 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold transition-all ${
                activeCategory === cat.key
                  ? 'bg-primary text-slate-900'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
              onClick={() => setActiveCategory(cat.key)}
              aria-label={cat.label}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined text-primary text-4xl animate-pulse">storefront</span>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4">
            {rewards.map((reward) => (
              <div key={reward.id} className="group flex flex-col rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md">
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-100">
                  {reward.image ? (
                    <img alt={reward.name} className="h-full w-full object-cover" src={reward.image} />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <span className="material-symbols-outlined text-5xl">redeem</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-col">
                  <h4 className="text-sm font-bold text-slate-900 text-ellipsis overflow-hidden whitespace-nowrap">{reward.name}</h4>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-xs font-bold text-primary">{reward.price} 🍎</span>
                    {fruitsBalance < reward.price && (
                      <span className="text-[10px] text-red-400">余额不足</span>
                    )}
                  </div>
                  <button
                    className="mt-3 rounded-full bg-primary/20 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleRedeem(reward)}
                    disabled={redeemingId === reward.id || fruitsBalance < reward.price}
                    aria-label={`兑换${reward.name}`}
                  >
                    {redeemingId === reward.id ? '兑换中...' : '兑换'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
