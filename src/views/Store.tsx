import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { rewardsApi, RewardData, Child } from '../services/api';
import PullToRefresh from '../components/PullToRefresh';

import Icon from '../components/Icon';
const CATEGORIES = [
  { key: '', label: '全部奖励' },
  { key: 'activity', label: '活动' },
  { key: 'toy', label: '玩具' },
  { key: 'snack', label: '零食' },
];

export default function Store() {
  const navigate = useNavigate();
  const { user, currentChild, setCurrentChild, refreshUser } = useAuth();
  const [selectedChild, setSelectedChild] = useState<Child | null>(currentChild);
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [fruitsBalance, setFruitsBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardData | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleSelectChild = (child: Child) => {
    setSelectedChild(child);
    setCurrentChild(child);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const rewardsRes = await rewardsApi.list(activeCategory || undefined);
      setRewards(rewardsRes.data);

      if (selectedChild) {
        const fruitsRes = await rewardsApi.getFruits(selectedChild.id);
        setFruitsBalance(fruitsRes.data.fruits_balance);
      }
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChild, activeCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 下拉刷新处理函数
  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const handleOpenRedeemModal = (reward: RewardData) => {
    if (!selectedChild) {
      alert('请先选择要兑换的孩子');
      return;
    }
    if (fruitsBalance < reward.price) {
      alert(`果实余额不足！当前余额：${fruitsBalance}，需要：${reward.price}`);
      return;
    }
    setSelectedReward(reward);
    setShowRedeemModal(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !selectedChild) return;
    
    setIsRedeeming(true);
    try {
      const res = await rewardsApi.redeem(selectedReward.id, selectedChild.id);
      setFruitsBalance(res.data.remaining_balance);
      await refreshUser();
      setShowRedeemModal(false);
      setSelectedReward(null);
      // 显示成功提示
      setTimeout(() => {
        alert(res.message || '兑换成功！');
      }, 100);
    } catch (err) {
      alert(err instanceof Error ? err.message : '兑换失败');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCloseRedeemModal = () => {
    if (isRedeeming) return; // 兑换中不允许关闭
    setShowRedeemModal(false);
    setSelectedReward(null);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 pb-32 lg:pb-8"
      >
      <div className="sticky top-0 z-10 bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md transition-colors">
        <div className="flex items-center px-6 pb-2 pt-6 lg:max-w-2xl lg:mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex size-10 items-center justify-center rounded-full bg-slate-200/50"
            aria-label="返回"
          >
            <Icon name="arrow_back" className="text-slate-900" />
          </button>
          <h2 className="flex-1 text-center text-xl font-bold tracking-tight text-slate-900 pr-10">果实商店</h2>
        </div>

        {/* 多孩子切换器 */}
        {user?.children && user.children.length > 1 && (
          <div className="flex gap-2 px-6 pb-3 overflow-x-auto no-scrollbar lg:max-w-2xl lg:mx-auto">
            {user.children.map(child => (
              <button
                key={child.id}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedChild?.id === child.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/40'
                }`}
                onClick={() => handleSelectChild(child)}
                aria-label={`切换到${child.name}`}
              >
                <Icon name={child.gender === 'female' ? 'face_3' : 'face'} className="text-sm" />
                {child.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 lg:max-w-2xl lg:mx-auto">
        {/* 果实余额卡片 */}
        <div className="relative mt-2 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-green-500 p-6 text-white shadow-lg shadow-primary/20">
          <div className="relative z-10 flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider opacity-90">
              {selectedChild ? `${selectedChild.name}的果实余额` : '我的果实余额'}
            </p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold">{fruitsBalance.toLocaleString()}</span>
              <span className="mb-1 text-2xl">🍎</span>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => navigate('/store/fruits-history')}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm shrink-0"
                aria-label="查看果实获取记录"
              >
                <Icon name="history" className="text-sm leading-none" />
                获取记录
              </button>
              <button
                onClick={() => navigate('/store/redemption-history')}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm shrink-0"
                aria-label="查看兑换记录"
              >
                <Icon name="shopping_bag" className="text-sm leading-none" />
                兑换记录
              </button>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/20 blur-2xl" />
        </div>

        {/* 分类筛选 */}
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
            <Icon name="storefront" className="text-primary text-4xl animate-pulse" />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4">
            {rewards.map((reward) => (
              <div key={reward.id} className="group flex flex-col rounded-xl bg-white dark:bg-[var(--bg-surface)] p-3 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col">
                  <h4 className="text-sm font-bold text-slate-900 text-ellipsis overflow-hidden whitespace-nowrap">{reward.name}</h4>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-xs font-bold text-primary">{reward.price} 🍎</span>
                    {fruitsBalance < reward.price && (
                      <span className="text-[10px] text-red-400">余额不足</span>
                    )}
                  </div>
                  <button
                    className="mt-3 rounded-full bg-primary/20 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleOpenRedeemModal(reward)}
                    disabled={fruitsBalance < reward.price || !selectedChild}
                    aria-label={`兑换${reward.name}`}
                  >
                    兑换
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 兑换确认弹窗 */}
      <AnimatePresence>
        {showRedeemModal && selectedReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={handleCloseRedeemModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[var(--bg-surface)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Icon name="redeem" className="text-primary text-5xl" />
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-[var(--text-primary)] mb-2">
                    确认兑换
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-[var(--text-secondary)] mb-1">
                    {selectedReward.name}
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {selectedReward.price} 🍎
                  </p>
                </div>

                <div className="w-full bg-slate-50 dark:bg-[var(--bg-card)] rounded-xl p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-[var(--text-secondary)]">当前余额</span>
                    <span className="font-bold text-slate-900 dark:text-[var(--text-primary)]">{fruitsBalance} 🍎</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-[var(--text-secondary)]">兑换消耗</span>
                    <span className="font-bold text-red-500">-{selectedReward.price} 🍎</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-[var(--border-color)] my-2"></div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-[var(--text-secondary)]">剩余余额</span>
                    <span className="font-bold text-primary">{fruitsBalance - selectedReward.price} 🍎</span>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    className="flex-1 py-3 bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-[var(--bg-surface)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleCloseRedeemModal}
                    disabled={isRedeeming}
                  >
                    取消
                  </button>
                  <button
                    className="flex-1 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    onClick={handleConfirmRedeem}
                    disabled={isRedeeming}
                  >
                    {isRedeeming ? (
                      <>
                        <Icon name="progress_activity" className="text-base animate-spin" />
                        兑换中...
                      </>
                    ) : (
                      '确认兑换'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </PullToRefresh>
  );
}
