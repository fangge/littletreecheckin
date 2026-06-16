import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { rewardsApi, RedemptionData } from '../services/api';
import PullToRefresh from '../components/PullToRefresh';

// 根据 category 生成彩色背景
import Icon from '../components/Icon';
const CATEGORY_COLORS: Record<string, string> = {
  activity: 'bg-blue-100 text-blue-500',
  toy: 'bg-purple-100 text-purple-500',
  snack: 'bg-orange-100 text-orange-500',
};

const CATEGORY_ICONS: Record<string, string> = {
  activity: 'celebration',
  toy: 'toys',
  snack: 'restaurant',
};

const getCategoryColor = (category: string) => CATEGORY_COLORS[category] || 'bg-green-100 text-green-500';
const getCategoryIcon = (category: string) => CATEGORY_ICONS[category] || 'redeem';

const formatRedemptionTime = (isoStr: string): string => {
  const date = new Date(isoStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '待发放';
    case 'completed':
      return '已完成';
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'text-orange-500 bg-orange-50';
    case 'completed':
      return 'text-green-500 bg-green-50';
    default:
      return 'text-slate-500 bg-slate-50';
  }
};

export default function RedemptionHistory() {
  const navigate = useNavigate();
  const { currentChild } = useAuth();
  const [items, setItems] = useState<RedemptionData[]>([]);
  const [fruitsBalance, setFruitsBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentChild) return;

    setIsLoading(true);
    try {
      const [redemptionsRes, fruitsRes] = await Promise.all([
        rewardsApi.redemptions(currentChild.id),
        rewardsApi.getFruits(currentChild.id),
      ]);
      setItems(redemptionsRes.data);
      setFruitsBalance(fruitsRes.data.fruits_balance);
    } catch (err) {
      console.error('获取兑换记录失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentChild]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 下拉刷新处理函数
  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col bg-background-light"
      >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-primary/10 dark:border-[var(--border-color)] px-4 py-4 transition-colors">
        <div className="flex items-center gap-3 max-w-md mx-auto lg:max-w-2xl">
          <button
            onClick={() => navigate('/store')}
            className="p-2 hover:bg-primary/10 rounded-full transition-colors"
            aria-label="返回"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">果实兑换记录</h1>
        </div>
      </header>

      <main className="flex-1 pb-32 lg:pb-8">
        <div className="px-4 pt-4 max-w-md mx-auto lg:max-w-2xl space-y-4">
          {/* 余额摘要卡片 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-green-500 p-6 text-white shadow-lg shadow-primary/20">
            <div className="relative z-10">
              <p className="text-sm font-semibold opacity-90">
                {currentChild ? `${currentChild.name}的果实余额` : '我的果实余额'}
              </p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-4xl font-extrabold">{fruitsBalance.toLocaleString()}</span>
                <span className="mb-1 text-2xl">🍎</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 backdrop-blur-sm">
                <Icon name="shopping_bag" className="text-sm leading-none" />
                <span className="text-xs font-semibold">已兑换 {items.length} 次奖励</span>
              </div>
            </div>
            {/* 装饰圆 */}
            <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10" />
            <div className="absolute -right-2 top-8 size-16 rounded-full bg-white/10" />
          </div>

          {/* 兑换明细列表 */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">兑换明细</h2>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Icon name="hourglass_empty" className="text-primary text-4xl animate-pulse" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Icon name="shopping_cart" className="text-5xl mb-3 block" />
                <p className="text-sm">还没有兑换记录，快去商店兑换奖励吧！</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-white dark:bg-[var(--bg-surface)] rounded-2xl px-4 py-3 shadow-sm transition-colors"
                  >
                    {/* 奖励图标 */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${getCategoryColor(item.rewards?.category || '')}`}>
                      <Icon name={getCategoryIcon(item.rewards?.category || '')} className="text-xl leading-none" />
                    </div>
                    {/* 奖励信息 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.rewards?.name || '未知奖励'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatRedemptionTime(item.redeemed_at)}</p>
                    </div>
                    {/* 状态和果实数 */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-base font-extrabold text-red-500">
                          -{item.rewards?.price || 0}
                        </span>
                        <span className="text-base">🍎</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
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
    </PullToRefresh>
  );
}
