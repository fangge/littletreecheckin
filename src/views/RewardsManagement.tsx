import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { rewardsApi, RewardData, RedemptionData, CashExchangeSetting } from '../services/api';
import PullToRefresh from '../components/PullToRefresh';

import Icon from '../components/Icon';

interface RewardForm {
  name: string;
  price: string;
  category: 'activity' | 'toy' | 'snack';
}

type ActiveTab = 'rewards' | 'redemptions' | 'cash';

type ManagementRedemption = RedemptionData & {
  childName?: string;
  childId?: string;
};

const EMPTY_FORM: RewardForm = { name: '', price: '', category: 'activity' };
const CATEGORY_LABELS = { activity: '活动', toy: '玩具', snack: '零食' };

const formatMoney = (value?: number) => `¥${Number(value || 0).toFixed(2)}`;
const formatExchangeRate = (fruits?: number, amount?: number) =>
  `${Number(fruits || 0).toLocaleString()} 🍎 = ${formatMoney(amount ?? 1)}`;
const getSpentFruits = (redemption: ManagementRedemption) =>
  redemption.redemption_type === 'cash'
    ? redemption.fruits_spent || 0
    : redemption.rewards?.price || 0;
const getRedemptionName = (redemption: ManagementRedemption) =>
  redemption.redemption_type === 'cash'
    ? `人民币 ${formatMoney(redemption.cash_amount)}`
    : redemption.rewards?.name || '未知奖品';

export default function RewardsManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('rewards');

  // 奖品管理
  const [rewards, setRewards] = useState<(RewardData & { is_active: boolean })[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<(RewardData & { is_active: boolean }) | null>(null);
  const [form, setForm] = useState<RewardForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // 兑换记录
  const [redemptions, setRedemptions] = useState<ManagementRedemption[]>([]);
  const [isLoadingRedemptions, setIsLoadingRedemptions] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('all');

  // 现金兑换配置
  const [cashSetting, setCashSetting] = useState<CashExchangeSetting | null>(null);
  const [cashRateInput, setCashRateInput] = useState('100');
  const [cashAmountInput, setCashAmountInput] = useState('1');
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cashError, setCashError] = useState('');
  const [isLoadingCashSetting, setIsLoadingCashSetting] = useState(false);
  const [isSavingCashSetting, setIsSavingCashSetting] = useState(false);
  const cashRateNumber = Number(cashRateInput);
  const cashAmountNumber = Number(cashAmountInput);

  const fetchRewards = useCallback(async () => {
    setIsLoadingRewards(true);
    try {
      const res = await rewardsApi.listAll();
      setRewards(res.data);
    } catch (err) {
      console.error('获取奖品失败:', err);
    } finally {
      setIsLoadingRewards(false);
    }
  }, []);

  const fetchRedemptions = useCallback(async () => {
    if (!user?.children || user.children.length === 0) return;
    setIsLoadingRedemptions(true);
    try {
      // 使用批量接口一次性获取所有孩子的兑换记录（性能优化：避免 N+1 查询）
      const childIds = user.children.map(c => c.id).join(',');
      const res = await rewardsApi.redemptionsBatch(childIds);

      const enriched = res.data.map(r => ({
        ...r,
        childName: r.children?.name || '未知',
        childId: r.child_id,
      }));

      setRedemptions(enriched);
    } catch (err) {
      console.error('获取兑换记录失败:', err);
    } finally {
      setIsLoadingRedemptions(false);
    }
  }, [user?.children]);

  const fetchCashSetting = useCallback(async () => {
    setIsLoadingCashSetting(true);
    try {
      const res = await rewardsApi.getCashSetting();
      setCashSetting(res.data);
      setCashRateInput(String(res.data.fruits_per_yuan));
      setCashAmountInput(String(res.data.yuan_amount ?? 1));
      setCashEnabled(res.data.is_enabled);
      setCashError('');
    } catch (err) {
      console.error('获取现金兑换配置失败:', err);
      setCashError(err instanceof Error ? err.message : '获取现金兑换配置失败');
    } finally {
      setIsLoadingCashSetting(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
    fetchRedemptions();
    fetchCashSetting();
  }, [fetchRewards, fetchRedemptions, fetchCashSetting]);

  const handleOpenAdd = () => {
    setEditingReward(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEdit = (reward: RewardData & { is_active: boolean }) => {
    setEditingReward(reward);
    setForm({ name: reward.name, price: String(reward.price), category: reward.category as 'activity' | 'toy' | 'snack' });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('请输入奖品名称'); return; }
    const price = parseInt(form.price, 10);
    if (!form.price || isNaN(price) || price <= 0) { setFormError('请输入有效的价格'); return; }
    setIsSaving(true);
    setFormError('');
    try {
      if (editingReward) {
        await rewardsApi.update(editingReward.id, { name: form.name.trim(), price, category: form.category });
      } else {
        await rewardsApi.create({ name: form.name.trim(), price, category: form.category });
      }
      setShowForm(false);
      await fetchRewards();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (reward: RewardData & { is_active: boolean }) => {
    const action = reward.is_active ? '下架' : '上架';
    if (!confirm(`确定要${action}奖品"${reward.name}"吗？${reward.is_active ? '下架后孩子将无法在商店看到此奖品。' : '上架后孩子可以在商店兑换此奖品。'}`)) return;
    try {
      await rewardsApi.update(reward.id, { is_active: !reward.is_active });
      await fetchRewards();
    } catch (err) {
      console.error('操作失败:', err);
    }
  };

  const handleDelete = async (reward: RewardData & { is_active: boolean }) => {
    if (!confirm(`确定要删除奖品"${reward.name}"吗？`)) return;
    try {
      await rewardsApi.delete(reward.id);
      await fetchRewards();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleConfirm = async (redemption: ManagementRedemption) => {
    setConfirmingId(redemption.id);
    try {
      if (redemption.redemption_type === 'cash') {
        await rewardsApi.confirmCashRedemption(redemption.id);
      } else {
        await rewardsApi.confirmRedemption(redemption.id);
      }
      await fetchRedemptions();
    } catch (err) {
      console.error('确认失败:', err);
      alert(err instanceof Error ? err.message : '确认失败');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (redemption: ManagementRedemption) => {
    const childName = redemption.childName || '未知';
    const name = getRedemptionName(redemption);
    const fruits = getSpentFruits(redemption);
    if (!confirm(`确定要撤回"${childName}"兑换的"${name}"吗？\n撤回后将返还 ${fruits} 🍎 给孩子。`)) return;

    setCancelingId(redemption.id);
    try {
      if (redemption.redemption_type === 'cash') {
        await rewardsApi.cancelCashRedemption(redemption.id);
      } else {
        await rewardsApi.cancelRedemption(redemption.id);
      }
      await fetchRedemptions();
    } catch (err) {
      console.error('撤回失败:', err);
      alert(err instanceof Error ? err.message : '撤回失败');
    } finally {
      setCancelingId(null);
    }
  };

  const handleSaveCashSetting = async () => {
    const fruitsPerYuan = parseInt(cashRateInput, 10);
    if (!cashRateInput || isNaN(fruitsPerYuan) || fruitsPerYuan <= 0) {
      setCashError('请输入大于0的整数果实数');
      return;
    }

    const yuanAmount = Number(cashAmountInput);
    if (!cashAmountInput || !Number.isFinite(yuanAmount) || yuanAmount <= 0) {
      setCashError('请输入大于0的兑换金额');
      return;
    }

    setIsSavingCashSetting(true);
    setCashError('');
    try {
      const res = await rewardsApi.updateCashSetting({
        fruits_per_yuan: fruitsPerYuan,
        yuan_amount: Number(yuanAmount.toFixed(2)),
        is_enabled: cashEnabled,
      });
      setCashSetting(res.data);
      setCashRateInput(String(res.data.fruits_per_yuan));
      setCashAmountInput(String(res.data.yuan_amount ?? 1));
      setCashEnabled(res.data.is_enabled);
      alert(res.message || '现金兑换配置已保存');
    } catch (err) {
      setCashError(err instanceof Error ? err.message : '保存现金兑换配置失败');
    } finally {
      setIsSavingCashSetting(false);
    }
  };

  // 下拉刷新处理函数
  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchRewards(), fetchRedemptions(), fetchCashSetting()]);
  }, [fetchRewards, fetchRedemptions, fetchCashSetting]);

  // 根据选中的孩子筛选兑换记录
  const filteredRedemptions = selectedChildId === 'all'
    ? redemptions
    : redemptions.filter(r => r.childId === selectedChildId);

  const pendingCount = redemptions.filter(r => r.status === 'pending').length;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col bg-background-light min-h-screen"
      >
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-primary/10 dark:border-[var(--border-color)] transition-colors">
        <div className="flex items-center px-4 py-4 justify-between lg:max-w-2xl lg:mx-auto">
          <button onClick={() => navigate('/profile')} className="p-2 hover:bg-primary/10 rounded-full transition-colors" aria-label="返回">
            <Icon name="arrow_back" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">奖品与兑换管理</h1>
          {activeTab === 'rewards' ? (
            <button className="flex items-center gap-1 text-primary text-sm font-bold" onClick={handleOpenAdd} aria-label="添加奖品">
              <Icon name="add_circle" className="text-lg" />
              添加
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>

        <div className="flex px-4 pb-3 gap-2 lg:max-w-2xl lg:mx-auto">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${activeTab === 'rewards' ? 'bg-primary text-white shadow-sm' : 'bg-white dark:bg-[var(--bg-surface)] border border-slate-200 dark:border-[var(--border-color)] text-slate-600 dark:text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('rewards')}
          >
            奖品管理
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${activeTab === 'redemptions' ? 'bg-primary text-white shadow-sm' : 'bg-white dark:bg-[var(--bg-surface)] border border-slate-200 dark:border-[var(--border-color)] text-slate-600 dark:text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('redemptions')}
          >
            兑换记录 {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${activeTab === 'cash' ? 'bg-primary text-white shadow-sm' : 'bg-white dark:bg-[var(--bg-surface)] border border-slate-200 dark:border-[var(--border-color)] text-slate-600 dark:text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('cash')}
          >
            兑换比例
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-32 space-y-4 pt-4 lg:max-w-2xl lg:mx-auto lg:w-full lg:pb-8">
        {/* 奖品管理 */}
        {activeTab === 'rewards' && (
          <>
            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-primary/5 dark:bg-[var(--bg-card)] rounded-2xl p-4 border border-primary/10 dark:border-[var(--border-color)] space-y-3">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">{editingReward ? '编辑奖品' : '新增奖品'}</p>
                    {formError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formError}</p>}
                    <input className="form-input w-full rounded-xl border-slate-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-card)] text-slate-900 dark:text-[var(--text-primary)] h-11 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary px-3 transition-colors" placeholder="奖品名称 *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="form-input w-full rounded-xl border-slate-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-card)] text-slate-900 dark:text-[var(--text-primary)] h-11 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary px-3 transition-colors" placeholder="价格（果实数）*" type="number" min="1" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
                      <div className="flex gap-1 bg-white dark:bg-[var(--bg-card)] rounded-xl border border-slate-200 dark:border-[var(--border-color)] p-1">
                        {(['activity', 'toy', 'snack'] as const).map(cat => (
                          <button key={cat} className={`flex-1 rounded-lg text-[10px] font-bold py-1.5 transition-all ${form.category === cat ? 'bg-primary text-white' : 'text-slate-500 dark:text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-[var(--bg-surface)]'}`} onClick={() => setForm(p => ({ ...p, category: cat }))}>{CATEGORY_LABELS[cat]}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-60" onClick={handleSave} disabled={isSaving}>{isSaving ? '保存中...' : '保存'}</button>
                      <button className="px-4 py-2.5 bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-sm font-bold rounded-xl" onClick={() => setShowForm(false)}>取消</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoadingRewards ? (
              <div className="flex justify-center py-12">
                <Icon name="redeem" className="text-primary text-4xl animate-pulse" />
              </div>
            ) : rewards.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-[var(--text-muted)]">
                <Icon name="redeem" className="text-5xl mb-3 block" />
                <p>暂无奖品，点击右上角"添加"创建</p>
              </div>
            ) : (
              rewards.map(reward => (
                <div key={reward.id} className={`bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-sm border overflow-hidden ${!reward.is_active ? 'opacity-60 border-slate-200 dark:border-[var(--border-color)]' : 'border-primary/5 dark:border-[var(--border-color)]'} transition-colors`}>
                  <div className="p-4 flex gap-3 items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-[var(--text-primary)] truncate">{reward.name}</p>
                        {!reward.is_active && <span className="text-[10px] bg-slate-200 dark:bg-[var(--bg-card)] text-slate-500 dark:text-[var(--text-muted)] px-1.5 py-0.5 rounded-full font-bold shrink-0">已下架</span>}
                      </div>
                      <p className="text-sm text-primary font-bold">{reward.price} 🍎</p>
                      <p className="text-xs text-slate-400 dark:text-[var(--text-muted)]">{CATEGORY_LABELS[reward.category as keyof typeof CATEGORY_LABELS]}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button className="p-2 text-slate-400 dark:text-[var(--text-muted)] hover:text-primary transition-colors rounded-lg hover:bg-primary/10" onClick={() => handleOpenEdit(reward)} aria-label="编辑">
                        <Icon name="edit" className="text-lg" />
                      </button>
                      <button className={`p-2 transition-colors rounded-lg ${reward.is_active ? 'text-slate-400 dark:text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`} onClick={() => handleToggle(reward)} aria-label={reward.is_active ? '下架' : '上架'} title={reward.is_active ? '点击下架' : '点击上架'}>
                        <Icon name={reward.is_active ? 'visibility_off' : 'visibility'} className="text-lg" />
                      </button>
                      <button className="p-2 text-slate-400 dark:text-[var(--text-muted)] hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(reward)} aria-label="删除">
                        <Icon name="delete" className="text-lg" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* 兑换记录 */}
        {activeTab === 'redemptions' && (
          <>
            {user?.children && user.children.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedChildId === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white dark:bg-[var(--bg-surface)] border border-slate-200 dark:border-[var(--border-color)] text-slate-600 dark:text-[var(--text-secondary)] hover:border-primary/40'
                  }`}
                  onClick={() => setSelectedChildId('all')}
                >
                  全部孩子
                </button>
                {user.children.map(child => (
                  <button
                    key={child.id}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      selectedChildId === child.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white dark:bg-[var(--bg-surface)] border border-slate-200 dark:border-[var(--border-color)] text-slate-600 dark:text-[var(--text-secondary)] hover:border-primary/40'
                    }`}
                    onClick={() => setSelectedChildId(child.id)}
                  >
                    <Icon name={child.gender === 'female' ? 'face_3' : 'face'} className="text-base" />
                    {child.name}
                  </button>
                ))}
              </div>
            )}

            {isLoadingRedemptions ? (
              <div className="flex justify-center py-12">
                <Icon name="receipt_long" className="text-primary text-4xl animate-pulse" />
              </div>
            ) : filteredRedemptions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-[var(--text-muted)]">
                <Icon name="receipt_long" className="text-5xl mb-3 block" />
                <p>{selectedChildId === 'all' ? '暂无兑换记录' : '该孩子暂无兑换记录'}</p>
              </div>
            ) : (
              filteredRedemptions.map(r => {
                const isCash = r.redemption_type === 'cash';
                const fruitsSpent = getSpentFruits(r);
                return (
                  <div key={r.id} className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-primary/5 dark:border-[var(--border-color)] overflow-hidden transition-colors">
                    <div className="p-4 flex gap-3 items-center">
                      <div className={`w-16 h-16 rounded-xl shrink-0 flex items-center justify-center ${isCash ? 'bg-emerald-50 text-primary dark:bg-emerald-900/20' : 'bg-slate-100 dark:bg-[var(--bg-card)] text-slate-300 dark:text-[var(--text-muted)]'}`}>
                        <Icon name={isCash ? 'diamond' : 'redeem'} className="text-3xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {selectedChildId === 'all' && r.childName && (
                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">{r.childName}</span>
                          )}
                          <p className="font-bold text-slate-900 dark:text-[var(--text-primary)] truncate">{getRedemptionName(r)}</p>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-[var(--text-muted)]">
                          {fruitsSpent} 🍎{isCash && r.fruits_per_yuan ? ` · ${formatExchangeRate(r.fruits_per_yuan, r.yuan_amount)}` : ''} · {new Date(r.redeemed_at).toLocaleDateString('zh-CN')}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {r.status === 'completed' ? '已发放' : '待发放'}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-[var(--bg-card)] dark:text-[var(--text-muted)]">
                            {isCash ? '现金兑换' : '奖品兑换'}
                          </span>
                        </div>
                      </div>
                      {r.status === 'pending' && (
                        <div className="shrink-0 flex flex-col sm:flex-row gap-2">
                          <button
                            className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
                            onClick={() => handleConfirm(r)}
                            disabled={confirmingId === r.id || cancelingId === r.id}
                            aria-label="确认发放"
                          >
                            {confirmingId === r.id ? '确认中...' : '确认发放'}
                          </button>
                          <button
                            className="px-3 py-2 bg-slate-100 dark:bg-[var(--bg-card)] text-slate-600 dark:text-[var(--text-secondary)] text-xs font-bold rounded-xl disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-[var(--bg-surface)] transition-colors"
                            onClick={() => handleCancel(r)}
                            disabled={confirmingId === r.id || cancelingId === r.id}
                            aria-label="撤回兑换"
                          >
                            {cancelingId === r.id ? '撤回中...' : '撤回'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* 现金兑换比例 */}
        {activeTab === 'cash' && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-green-500 p-5 text-white shadow-lg shadow-primary/20">
              <div className="relative z-10 flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20">
                  <Icon name="diamond" className="text-3xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold opacity-90">当前现金兑换比例</p>
                  <p className="mt-1 text-3xl font-extrabold">
                    {cashSetting ? formatExchangeRate(cashSetting.fruits_per_yuan, cashSetting.yuan_amount) : '读取中'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/80">孩子提交后会生成待发放记录，家长线下付款后再确认完成。</p>
                </div>
              </div>
              <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/20 blur-2xl" />
            </div>

            <div className="rounded-3xl bg-white dark:bg-[var(--bg-surface)] p-5 shadow-sm border border-primary/5 dark:border-[var(--border-color)] space-y-4">
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-[var(--text-primary)]">配置兑换比例</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-[var(--text-secondary)]">
                  填写“一组果实可以兑换多少人民币”。历史记录会保存当时比例，之后修改不会影响旧记录。
                </p>
              </div>

              {cashError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{cashError}</p>}

              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-[var(--text-secondary)]">兑换比例</span>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <input
                    className="h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:bg-white dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)]"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    aria-label="兑换果实数"
                    placeholder="果实数"
                    value={cashRateInput}
                    onChange={e => setCashRateInput(e.target.value)}
                    disabled={isLoadingCashSetting || isSavingCashSetting}
                  />
                  <span className="text-sm font-bold text-slate-500 dark:text-[var(--text-secondary)]">🍎 = ¥</span>
                  <input
                    className="h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:bg-white dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)]"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    aria-label="兑换人民币金额"
                    placeholder="金额"
                    value={cashAmountInput}
                    onChange={e => setCashAmountInput(e.target.value)}
                    disabled={isLoadingCashSetting || isSavingCashSetting}
                  />
                </div>
              </div>

              <button
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${cashEnabled ? 'border-primary/20 bg-primary/5' : 'border-slate-200 bg-slate-50 dark:border-[var(--border-color)] dark:bg-[var(--bg-card)]'}`}
                onClick={() => setCashEnabled(v => !v)}
                type="button"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-[var(--text-primary)]">开启果实换人民币</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[var(--text-secondary)]">关闭后孩子在商店中不能提交现金兑换。</p>
                </div>
                <span className={`relative h-7 w-12 rounded-full transition-colors ${cashEnabled ? 'bg-primary' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${cashEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </span>
              </button>

              <div className="rounded-2xl bg-slate-50 dark:bg-[var(--bg-card)] p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[var(--text-secondary)]">示例</span>
                  <span className="font-bold text-slate-900 dark:text-[var(--text-primary)]">
                    {cashRateNumber > 0 && cashAmountNumber > 0
                      ? `${(cashRateNumber * 10).toLocaleString()} 🍎 = ${formatMoney(cashAmountNumber * 10)}`
                      : '请输入比例'}
                  </span>
                </div>
              </div>

              <button
                className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleSaveCashSetting}
                disabled={isLoadingCashSetting || isSavingCashSetting}
              >
                {isSavingCashSetting ? '保存中...' : '保存兑换比例'}
              </button>
            </div>
          </div>
        )}
      </main>
      </motion.div>
    </PullToRefresh>
  );
}
