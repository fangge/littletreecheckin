import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { rewardsApi, RewardData, RedemptionData } from '../services/api';

interface RewardsManagementProps {
  onBack: () => void;
}

interface RewardForm {
  name: string;
  price: string;
  image: string;
  category: 'activity' | 'toy' | 'snack';
}

const EMPTY_FORM: RewardForm = { name: '', price: '', image: '', category: 'activity' };
const CATEGORY_LABELS = { activity: '活动', toy: '玩具', snack: '零食' };

export default function RewardsManagement({ onBack }: RewardsManagementProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'rewards' | 'redemptions'>('rewards');

  // 奖品管理
  const [rewards, setRewards] = useState<(RewardData & { is_active: boolean })[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<(RewardData & { is_active: boolean }) | null>(null);
  const [form, setForm] = useState<RewardForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // 兑换记录
  const [redemptions, setRedemptions] = useState<(RedemptionData & { childName?: string })[]>([]);
  const [isLoadingRedemptions, setIsLoadingRedemptions] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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
      const results = await Promise.all(
        user.children.map(child =>
          rewardsApi.redemptions(child.id).then(res =>
            res.data.map(r => ({ ...r, childName: child.name }))
          )
        )
      );
      const all = results.flat().sort(
        (a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime()
      );
      setRedemptions(all);
    } catch (err) {
      console.error('获取兑换记录失败:', err);
    } finally {
      setIsLoadingRedemptions(false);
    }
  }, [user?.children]);

  useEffect(() => {
    fetchRewards();
    fetchRedemptions();
  }, [fetchRewards, fetchRedemptions]);

  const handleOpenAdd = () => {
    setEditingReward(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEdit = (reward: RewardData & { is_active: boolean }) => {
    setEditingReward(reward);
    setForm({ name: reward.name, price: String(reward.price), image: reward.image || '', category: reward.category as 'activity' | 'toy' | 'snack' });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('请输入奖品名称'); return; }
    const price = parseInt(form.price);
    if (!form.price || isNaN(price) || price <= 0) { setFormError('请输入有效的价格'); return; }
    setIsSaving(true);
    setFormError('');
    try {
      if (editingReward) {
        await rewardsApi.update(editingReward.id, { name: form.name.trim(), price, image: form.image.trim() || undefined, category: form.category });
      } else {
        await rewardsApi.create({ name: form.name.trim(), price, image: form.image.trim() || undefined, category: form.category });
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

  const handleConfirm = async (redemptionId: string) => {
    setConfirmingId(redemptionId);
    try {
      await rewardsApi.confirmRedemption(redemptionId);
      await fetchRedemptions();
    } catch (err) {
      console.error('确认失败:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  const pendingCount = redemptions.filter(r => r.status === 'pending').length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col bg-background-light min-h-screen overflow-hidden"
    >
      <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md border-b border-primary/10">
        <div className="flex items-center px-4 py-4 justify-between lg:max-w-2xl lg:mx-auto">
          <button onClick={onBack} className="p-2 hover:bg-primary/10 rounded-full transition-colors" aria-label="返回">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">奖品与兑换管理</h1>
          {activeTab === 'rewards' && (
            <button className="flex items-center gap-1 text-primary text-sm font-bold" onClick={handleOpenAdd} aria-label="添加奖品">
              <span className="material-symbols-outlined text-lg">add_circle</span>
              添加
            </button>
          )}
          {activeTab === 'redemptions' && <div className="w-16" />}
        </div>

        <div className="flex px-4 pb-3 gap-2 lg:max-w-2xl lg:mx-auto">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${activeTab === 'rewards' ? 'bg-primary text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'}`}
            onClick={() => setActiveTab('rewards')}
          >
            奖品管理
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${activeTab === 'redemptions' ? 'bg-primary text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'}`}
            onClick={() => setActiveTab('redemptions')}
          >
            兑换记录 {pendingCount > 0 && `(${pendingCount})`}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-32 overflow-y-auto space-y-4 pt-4 lg:max-w-2xl lg:mx-auto lg:w-full lg:pb-8">
        {/* 奖品管理 */}
        {activeTab === 'rewards' && (
          <>
            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-3">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">{editingReward ? '编辑奖品' : '新增奖品'}</p>
                    {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
                    <input className="form-input w-full rounded-xl border-slate-200 bg-white text-slate-900 h-11 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary px-3" placeholder="奖品名称 *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="form-input w-full rounded-xl border-slate-200 bg-white text-slate-900 h-11 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary px-3" placeholder="价格（果实数）*" type="number" min="1" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
                      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
                        {(['activity', 'toy', 'snack'] as const).map(cat => (
                          <button key={cat} className={`flex-1 rounded-lg text-[10px] font-bold py-1.5 transition-all ${form.category === cat ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setForm(p => ({ ...p, category: cat }))}>{CATEGORY_LABELS[cat]}</button>
                        ))}
                      </div>
                    </div>
                    <input className="form-input w-full rounded-xl border-slate-200 bg-white text-slate-900 h-11 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary px-3" placeholder="图片 URL（可选）" value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} />
                    <div className="flex gap-2">
                      <button className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-60" onClick={handleSave} disabled={isSaving}>{isSaving ? '保存中...' : '保存'}</button>
                      <button className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl" onClick={() => setShowForm(false)}>取消</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoadingRewards ? (
              <div className="flex justify-center py-12">
                <span className="material-symbols-outlined text-primary text-4xl animate-pulse">redeem</span>
              </div>
            ) : rewards.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">redeem</span>
                <p>暂无奖品，点击右上角"添加"创建</p>
              </div>
            ) : (
              rewards.map(reward => (
                <div key={reward.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${!reward.is_active ? 'opacity-60 border-slate-200' : 'border-primary/5'}`}>
                  <div className="p-4 flex gap-3 items-center">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                      {reward.image ? (
                        <img alt={reward.name} className="w-full h-full object-cover" src={reward.image} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <span className="material-symbols-outlined text-3xl">redeem</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 truncate">{reward.name}</p>
                        {!reward.is_active && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-bold shrink-0">已下架</span>}
                      </div>
                      <p className="text-sm text-primary font-bold">{reward.price} 🍎</p>
                      <p className="text-xs text-slate-400">{CATEGORY_LABELS[reward.category as keyof typeof CATEGORY_LABELS]}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-primary/10" onClick={() => handleOpenEdit(reward)} aria-label="编辑">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button className={`p-2 transition-colors rounded-lg ${reward.is_active ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`} onClick={() => handleToggle(reward)} aria-label={reward.is_active ? '下架' : '上架'} title={reward.is_active ? '点击下架' : '点击上架'}>
                        <span className="material-symbols-outlined text-lg">{reward.is_active ? 'visibility_off' : 'visibility'}</span>
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" onClick={() => handleDelete(reward)} aria-label="删除">
                        <span className="material-symbols-outlined text-lg">delete</span>
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
            {isLoadingRedemptions ? (
              <div className="flex justify-center py-12">
                <span className="material-symbols-outlined text-primary text-4xl animate-pulse">receipt_long</span>
              </div>
            ) : redemptions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">receipt_long</span>
                <p>暂无兑换记录</p>
              </div>
            ) : (
              redemptions.map(r => (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-primary/5 overflow-hidden">
                  <div className="p-4 flex gap-3 items-center">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                      {r.rewards?.image ? (
                        <img alt={r.rewards.name} className="w-full h-full object-cover" src={r.rewards.image} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <span className="material-symbols-outlined text-3xl">redeem</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{r.rewards?.name || '未知奖品'}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        兑换人：<span className="text-primary font-bold">{r.childName || '未知'}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {r.rewards?.price} 🍎 · {new Date(r.redeemed_at).toLocaleDateString('zh-CN')}
                      </p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        {r.status === 'completed' ? '已发放' : '待发放'}
                      </span>
                    </div>
                    {r.status === 'pending' && (
                      <button
                        className="shrink-0 px-3 py-2 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
                        onClick={() => handleConfirm(r.id)}
                        disabled={confirmingId === r.id}
                        aria-label="确认发放"
                      >
                        {confirmingId === r.id ? '确认中...' : '确认发放'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </main>
    </motion.div>
  );
}