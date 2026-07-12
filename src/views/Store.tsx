import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { rewardsApi, RewardData, Child, CashExchangeSetting, RedemptionData } from '../services/api';
import PullToRefresh from '../components/PullToRefresh';

import Icon from '../components/Icon';
const CATEGORIES = [
  { key: '', label: '全部奖励' },
  { key: 'activity', label: '活动' },
  { key: 'toy', label: '玩具' },
  { key: 'snack', label: '零食' },
];

const getCompletedCashAmount = (items: RedemptionData[]) =>
  items.reduce((total, item) => {
    if (item.redemption_type !== 'cash' || item.status !== 'completed') return total;
    return total + Number(item.cash_amount || 0);
  }, 0);

const formatCooldownUntil = (value: string) => new Date(value).toLocaleString('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const getRewardUnavailableMessage = (reward: RewardData) => {
  if (reward.remaining_redemptions === 0) return '已达最高可兑换数';
  if (reward.cooldown_until) return `冷静期至 ${formatCooldownUntil(reward.cooldown_until)}`;
  if (reward.available_quantity === 0) return '当前不可兑换';
  return null;
};

const getRewardLimitSummary = (reward: RewardData) => {
  if (reward.cooldown_until) return `冷静期至 ${formatCooldownUntil(reward.cooldown_until)}`;

  const summaries: string[] = [];
  if (reward.max_redemptions != null) {
    summaries.push(`总剩余 ${reward.remaining_redemptions ?? reward.max_redemptions}`);
  }
  if (reward.max_consecutive_redemptions != null) {
    summaries.push(`本轮剩余 ${reward.consecutive_remaining ?? reward.max_consecutive_redemptions}`);
  }
  return summaries.join(' · ');
};

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
  const [redeemQuantity, setRedeemQuantity] = useState(1);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [cashSetting, setCashSetting] = useState<CashExchangeSetting | null>(null);
  const [cashFruitsInput, setCashFruitsInput] = useState('');
  const [showCashModal, setShowCashModal] = useState(false);
  const [isCashRedeeming, setIsCashRedeeming] = useState(false);
  const [completedCashAmount, setCompletedCashAmount] = useState(0);

  const cashFruits = parseInt(cashFruitsInput, 10);
  const cashPreview = cashSetting && !isNaN(cashFruits)
    ? (cashFruits / cashSetting.fruits_per_yuan) * (cashSetting.yuan_amount ?? 1)
    : 0;
  const maxRedeemQuantity = selectedReward
    ? Math.max(0, Math.min(
        Math.floor(fruitsBalance / selectedReward.price),
        selectedReward.available_quantity ?? Number.POSITIVE_INFINITY,
      ))
    : 0;
  const redeemTotal = selectedReward ? selectedReward.price * redeemQuantity : 0;

  const handleSelectChild = (child: Child) => {
    setSelectedChild(child);
    setCurrentChild(child);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const rewardsPromise = rewardsApi.list(activeCategory || undefined, selectedChild?.id);
      const cashSettingPromise = rewardsApi.getCashSetting();
      const childDataPromise = selectedChild
        ? Promise.all([
            rewardsApi.getFruits(selectedChild.id),
            rewardsApi.redemptions(selectedChild.id),
          ])
        : Promise.resolve(null);

      const [rewardsRes, cashSettingRes, childData] = await Promise.all([
        rewardsPromise,
        cashSettingPromise,
        childDataPromise,
      ]);
      setRewards(rewardsRes.data);
      setCashSetting(cashSettingRes.data);

      if (childData) {
        const [fruitsRes, redemptionsRes] = childData;
        setFruitsBalance(fruitsRes.data.fruits_balance);
        setCompletedCashAmount(getCompletedCashAmount(redemptionsRes.data));
      } else {
        setFruitsBalance(0);
        setCompletedCashAmount(0);
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
    const unavailableMessage = getRewardUnavailableMessage(reward);
    if (unavailableMessage) {
      alert(unavailableMessage);
      return;
    }
    if (fruitsBalance < reward.price) {
      alert(`果实余额不足！当前余额：${fruitsBalance}，需要：${reward.price}`);
      return;
    }
    setSelectedReward(reward);
    setRedeemQuantity(1);
    setShowRedeemModal(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !selectedChild) return;
    if (redeemTotal > fruitsBalance) {
      alert(`果实余额不足！当前余额：${fruitsBalance}，需要：${redeemTotal}`);
      return;
    }
    if (maxRedeemQuantity <= 0 || redeemQuantity > maxRedeemQuantity) {
      alert('兑换数量超过当前可兑换上限');
      return;
    }
    
    setIsRedeeming(true);
    try {
      const res = await rewardsApi.redeem(selectedReward.id, selectedChild.id, redeemQuantity);
      setFruitsBalance(res.data.remaining_balance);
      setShowRedeemModal(false);
      setSelectedReward(null);
      setRedeemQuantity(1);
      await Promise.all([fetchData(), refreshUser()]);
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
    setRedeemQuantity(1);
  };

  const handleOpenCashModal = () => {
    if (!selectedChild) {
      alert('请先选择要兑换的孩子');
      return;
    }
    if (!cashSetting?.is_enabled) {
      alert('现金兑换暂未开启');
      return;
    }
    if (!cashFruitsInput || isNaN(cashFruits) || cashFruits <= 0) {
      alert('请输入要兑换的果实数');
      return;
    }
    if (cashFruits > fruitsBalance) {
      alert(`果实余额不足！当前余额：${fruitsBalance}`);
      return;
    }
    setShowCashModal(true);
  };

  const handleConfirmCashRedeem = async () => {
    if (!selectedChild || !cashSetting || isNaN(cashFruits)) return;

    setIsCashRedeeming(true);
    try {
      const res = await rewardsApi.redeemCash(selectedChild.id, cashFruits);
      setFruitsBalance(res.data.remaining_balance);
      setCashFruitsInput('');
      await fetchData();
      await refreshUser();
      setShowCashModal(false);
      setTimeout(() => {
        alert(res.message || '现金兑换申请已提交！');
      }, 100);
    } catch (err) {
      alert(err instanceof Error ? err.message : '现金兑换失败');
    } finally {
      setIsCashRedeeming(false);
    }
  };

  const handleCloseCashModal = () => {
    if (isCashRedeeming) return;
    setShowCashModal(false);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 pb-32 lg:pb-8"
      >
      <div className="sticky top-0 z-99 bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md transition-colors">
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
            <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm">
              <span className="text-xs font-semibold opacity-90">
                {selectedChild ? `${selectedChild.name}已发放人民币` : '已发放人民币'}
              </span>
              <span className="text-lg font-extrabold">¥{completedCashAmount.toFixed(2)}</span>
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

        {/* 果实换人民币 */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-primary/10 bg-white dark:bg-[var(--bg-surface)] shadow-sm">
          <div className="relative p-4">
            <div className="absolute -right-6 -top-8 size-28 rounded-full bg-emerald-100/80 blur-2xl dark:bg-emerald-900/20" />
            <div className="relative z-10">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon name="diamond" className="text-2xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-[var(--text-primary)]">果实换人民币</h3>
                    {cashSetting?.is_enabled === false && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-[var(--bg-card)] dark:text-[var(--text-muted)]">
                        暂未开启
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[var(--text-secondary)]">
                    当前比例：{cashSetting ? `${cashSetting.fruits_per_yuan} 🍎 = ¥${Number(cashSetting.yuan_amount ?? 1).toFixed(2)}` : '读取中...'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                <label className="sr-only" htmlFor="cash-fruits-input">兑换果实数</label>
                <input
                  id="cash-fruits-input"
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:bg-white dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)]"
                  type="number"
                  min="1"
                  max={fruitsBalance}
                  inputMode="numeric"
                  placeholder="输入果实数"
                  value={cashFruitsInput}
                  onChange={e => setCashFruitsInput(e.target.value)}
                  disabled={!cashSetting?.is_enabled || !selectedChild}
                />
                <button
                  className="rounded-2xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleOpenCashModal}
                  disabled={!cashSetting?.is_enabled || !selectedChild || !cashFruitsInput || isNaN(cashFruits) || cashFruits <= 0 || cashFruits > fruitsBalance}
                >
                  换钱
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-500 dark:text-[var(--text-secondary)]">
                  预计到账 <span className="text-base font-extrabold text-primary">¥{Math.max(0, cashPreview).toFixed(2)}</span>
                </span>
                <button
                  className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary disabled:opacity-50"
                  onClick={() => setCashFruitsInput(String(fruitsBalance))}
                  disabled={!cashSetting?.is_enabled || fruitsBalance <= 0}
                >
                  全部兑换
                </button>
              </div>
            </div>
          </div>
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
            {rewards.map((reward) => {
              const unavailableMessage = getRewardUnavailableMessage(reward);
              const limitSummary = getRewardLimitSummary(reward);
              const isUnavailable = Boolean(unavailableMessage);

              return (
                <div key={reward.id} className="group flex flex-col rounded-xl bg-white dark:bg-[var(--bg-surface)] p-3 shadow-sm transition-all hover:shadow-md">
                  <div className="flex h-full flex-col">
                    <h4 className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-slate-900 dark:text-[var(--text-primary)]">{reward.name}</h4>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-xs font-bold text-primary">{reward.price} 🍎</span>
                      {fruitsBalance < reward.price && !isUnavailable && (
                        <span className="text-[10px] text-red-400">余额不足</span>
                      )}
                    </div>
                    {(unavailableMessage || limitSummary) && (
                      <p className={`mt-1 min-h-8 text-[10px] leading-4 ${isUnavailable ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-[var(--text-muted)]'}`}>
                        {unavailableMessage || limitSummary}
                      </p>
                    )}
                    <button
                      className="mt-auto rounded-full bg-primary/20 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-[var(--text-primary)]"
                      onClick={() => handleOpenRedeemModal(reward)}
                      disabled={fruitsBalance < reward.price || !selectedChild || isUnavailable}
                      aria-label={`兑换${reward.name}`}
                    >
                      {reward.cooldown_until ? '冷静中' : reward.remaining_redemptions === 0 ? '已达上限' : '兑换'}
                    </button>
                  </div>
                </div>
              );
            })}
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
                    {selectedReward.price} 🍎 / 个
                  </p>
                </div>

                <div className="w-full">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700 dark:text-[var(--text-primary)]">兑换数量</span>
                    <span className="text-xs text-slate-400 dark:text-[var(--text-muted)]">最多 {maxRedeemQuantity} 个</span>
                  </div>
                  <div className="grid h-12 grid-cols-[3rem_1fr_3rem] overflow-hidden rounded-xl border border-slate-200 dark:border-[var(--border-color)]">
                    <button
                      className="flex items-center justify-center bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[var(--bg-card)] dark:text-[var(--text-secondary)]"
                      onClick={() => setRedeemQuantity(quantity => Math.max(1, quantity - 1))}
                      disabled={redeemQuantity <= 1}
                      aria-label="减少兑换数量"
                    >
                      <Icon name="remove_circle" className="text-xl" />
                    </button>
                    <input
                      className="min-w-0 border-x border-slate-200 bg-white text-center text-base font-bold text-slate-900 outline-none dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)]"
                      type="number"
                      min="1"
                      max={maxRedeemQuantity}
                      step="1"
                      inputMode="numeric"
                      value={redeemQuantity}
                      onChange={event => {
                        const quantity = Number.parseInt(event.target.value, 10);
                        setRedeemQuantity(Math.min(maxRedeemQuantity, Math.max(1, Number.isNaN(quantity) ? 1 : quantity)));
                      }}
                      aria-label="兑换数量"
                    />
                    <button
                      className="flex items-center justify-center bg-slate-50 text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[var(--bg-card)]"
                      onClick={() => setRedeemQuantity(quantity => Math.min(maxRedeemQuantity, quantity + 1))}
                      disabled={redeemQuantity >= maxRedeemQuantity}
                      aria-label="增加兑换数量"
                    >
                      <Icon name="add_circle" className="text-xl" />
                    </button>
                  </div>
                </div>

                <div className="w-full bg-slate-50 dark:bg-[var(--bg-card)] rounded-xl p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-[var(--text-secondary)]">当前余额</span>
                    <span className="font-bold text-slate-900 dark:text-[var(--text-primary)]">{fruitsBalance} 🍎</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-[var(--text-secondary)]">兑换消耗</span>
                    <span className="font-bold text-red-500">-{redeemTotal} 🍎</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-[var(--border-color)] my-2"></div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-[var(--text-secondary)]">剩余余额</span>
                    <span className="font-bold text-primary">{fruitsBalance - redeemTotal} 🍎</span>
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
                    disabled={isRedeeming || redeemTotal > fruitsBalance || maxRedeemQuantity <= 0}
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

      {/* 现金兑换确认弹窗 */}
      <AnimatePresence>
        {showCashModal && cashSetting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={handleCloseCashModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[var(--bg-surface)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon name="diamond" className="text-5xl text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-[var(--text-primary)]">确认兑换人民币</h3>
                  <p className="text-sm text-slate-600 dark:text-[var(--text-secondary)]">
                    {cashFruits.toLocaleString()} 个果实将兑换为
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-primary">¥{cashPreview.toFixed(2)}</p>
                </div>

                <div className="w-full rounded-xl bg-slate-50 p-3 text-sm dark:bg-[var(--bg-card)]">
                  <div className="mb-1 flex justify-between">
                    <span className="text-slate-600 dark:text-[var(--text-secondary)]">当前余额</span>
                    <span className="font-bold text-slate-900 dark:text-[var(--text-primary)]">{fruitsBalance} 🍎</span>
                  </div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-slate-600 dark:text-[var(--text-secondary)]">兑换消耗</span>
                    <span className="font-bold text-red-500">-{cashFruits} 🍎</span>
                  </div>
                  <div className="my-2 border-t border-slate-200 dark:border-[var(--border-color)]" />
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-[var(--text-secondary)]">剩余余额</span>
                    <span className="font-bold text-primary">{fruitsBalance - cashFruits} 🍎</span>
                  </div>
                </div>

                <p className="text-center text-xs leading-5 text-slate-400 dark:text-[var(--text-muted)]">
                  提交后会进入待发放记录，由家长线下确认付款。
                </p>

                <div className="flex w-full gap-3">
                  <button
                    className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--bg-card)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-surface)]"
                    onClick={handleCloseCashModal}
                    disabled={isCashRedeeming}
                  >
                    取消
                  </button>
                  <button
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleConfirmCashRedeem}
                    disabled={isCashRedeeming}
                  >
                    {isCashRedeeming ? (
                      <>
                        <Icon name="progress_activity" className="text-base animate-spin" />
                        提交中...
                      </>
                    ) : (
                      '确认提交'
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
