import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import {
  petsApi,
  invalidateChildDataCache,
  type PetData,
  type PetSpecies,
  type PetsOverview,
} from '../services/api';
import {
  DEFAULT_STAGE_COSTS,
  PET_LIST,
  PET_STAGE_LABELS,
  PET_STAGE_SUBTITLES,
  formatPoints,
  getPetImage,
  getPetMeta,
  getRemainingToGrow,
  getTotalRequired,
} from '../data/pets';
import PetCharacter from '../components/PetCharacter';
import PetCard from '../components/PetCard';
import PetAdoptSheet from '../components/PetAdoptSheet';
import PetSettingsModal from '../components/PetSettingsModal';
import PetStageUpModal from '../components/PetStageUpModal';
import PullToRefresh from '../components/PullToRefresh';
import Icon from '../components/Icon';

const STAGE_EMOJI = ['🌰', '🌱', '🌸', '🌳', '🎓'] as const;
const FEED_PRESETS = [10, 50, 100] as const;

interface CelebrationState {
  species: PetSpecies;
  stage: number;
  previousStage: number;
  completed: boolean;
  spent: number;
  totalPoints: number;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const daysBetween = (start?: string, end?: string | null) => {
  if (!start || !end) return 1;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(diff / 86_400_000));
};

export default function Pets() {
  const navigate = useNavigate();
  const { user, currentChild, setCurrentChild, isChildMode, refreshUser } = useAuth();
  const [overview, setOverview] = useState<PetsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedAmount, setFeedAmount] = useState<number>(50);
  const [isFeeding, setIsFeeding] = useState(false);
  const [cheer, setCheer] = useState(false);
  const [floatGain, setFloatGain] = useState<{ amount: number; id: number } | null>(null);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [showAdopt, setShowAdopt] = useState(false);
  const [adoptingSpecies, setAdoptingSpecies] = useState<PetSpecies | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [selectedCard, setSelectedCard] = useState<PetData | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    if (!currentChild) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await petsApi.overview(currentChild.id);
      setOverview(res.data);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '获取宠物信息失败');
    } finally {
      setIsLoading(false);
    }
  }, [currentChild]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    setShowAdopt(false);
    setSelectedCard(null);
    setCelebration(null);
    setError('');
    setToast('');
    setFeedAmount(50);
  }, [currentChild?.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 3200);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!floatGain) return;
    const timer = window.setTimeout(() => setFloatGain(null), 1400);
    return () => window.clearTimeout(timer);
  }, [floatGain]);

  useEffect(() => {
    if (!cheer) return;
    const timer = window.setTimeout(() => setCheer(false), 720);
    return () => window.clearTimeout(timer);
  }, [cheer]);

  const costs = overview?.settings.stage_costs ?? [...DEFAULT_STAGE_COSTS];
  const activePet = overview?.active_pet ?? null;
  const cards = overview?.cards ?? [];
  const fruitsBalance = overview?.fruits_balance ?? 0;
  const totalRequired = getTotalRequired(costs);
  const stage = activePet?.stage ?? 0;
  const meta = getPetMeta(activePet?.species ?? 'tao');
  const stageCost = costs[stage] ?? 0;
  const stageRemaining = activePet ? Math.max(0, stageCost - activePet.stage_points) : 0;
  const remainingToGrow = activePet
    ? getRemainingToGrow(activePet.stage, activePet.stage_points, costs)
    : 0;
  const plannedFeed = Math.max(
    0,
    Math.min(Math.floor(feedAmount) || 0, fruitsBalance, remainingToGrow),
  );
  const feedAll = Math.min(fruitsBalance, remainingToGrow);
  const nextStageLabel = PET_STAGE_LABELS[Math.min(4, stage + 1)];

  // 预加载当前宠物 5 个阶段图片，阶段进化弹层不会闪白
  useEffect(() => {
    if (!activePet) return;
    for (let stageIndex = 0; stageIndex < 5; stageIndex += 1) {
      const image = new Image();
      image.src = getPetImage(activePet.species, stageIndex);
    }
  }, [activePet?.species]);

  const cardsWithSerial = useMemo(() => {
    const chronological = [...cards].sort(
      (a, b) => new Date(a.grown_at ?? a.updated_at).getTime() - new Date(b.grown_at ?? b.updated_at).getTime(),
    );
    const serialMap = new Map<string, number>();
    const counters = new Map<PetSpecies, number>();
    chronological.forEach((pet) => {
      const next = (counters.get(pet.species) ?? 0) + 1;
      counters.set(pet.species, next);
      serialMap.set(pet.id, next);
    });
    return [...cards]
      .sort((a, b) => new Date(b.grown_at ?? b.updated_at).getTime() - new Date(a.grown_at ?? a.updated_at).getTime())
      .map((pet, index) => ({ pet, serial: serialMap.get(pet.id) ?? 1, cardNumber: index + 1 }));
  }, [cards]);

  const selectedCardEntry = selectedCard
    ? cardsWithSerial.find((item) => item.pet.id === selectedCard.id)
    : undefined;
  const selectedCardSerial = selectedCardEntry?.serial ?? 1;
  const selectedCardNumber = selectedCardEntry?.cardNumber ?? 1;
  const isMissingPetSchema = /pet_settings|child_pets|pet_feedings|PGRST205/.test(loadError);

  const handleRefresh = useCallback(async () => {
    if (currentChild) invalidateChildDataCache(currentChild.id);
    await fetchOverview();
  }, [currentChild, fetchOverview]);

  const handleFeed = async () => {
    if (!currentChild || !activePet || plannedFeed <= 0 || isFeeding) return;

    const previousStage = activePet.stage;
    setIsFeeding(true);
    setCheer(true);
    setFloatGain({ amount: plannedFeed, id: Date.now() });
    setError('');

    try {
      const res = await petsApi.feed(currentChild.id, activePet.id, plannedFeed);
      invalidateChildDataCache(currentChild.id);
      void refreshUser();

      const nextPet = res.data.pet;
      setOverview((prev) => {
        if (!prev) return prev;
        const nextCards = res.data.completed
          ? [nextPet, ...prev.cards.filter((pet) => pet.id !== nextPet.id)]
          : prev.cards;
        return {
          ...prev,
          active_pet: res.data.completed ? null : nextPet,
          cards: nextCards,
          fruits_balance: res.data.fruits_balance,
        };
      });

      if (res.data.spent < plannedFeed) {
        setToast(`本次实际投入 ${formatPoints(res.data.spent)} 积分，超出的积分还留在账户里`);
      } else if (!res.data.stage_up && !res.data.completed) {
        setToast(`${meta.name}吃到了 ${formatPoints(res.data.spent)} 点成长能量`);
      }

      if (res.data.stage_up || res.data.completed) {
        setCelebration({
          species: activePet.species,
          stage: nextPet.stage,
          previousStage,
          completed: res.data.completed,
          spent: res.data.spent,
          totalPoints: nextPet.total_points,
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '喂养失败，请稍后再试');
    } finally {
      setIsFeeding(false);
    }
  };

  const handleAdopt = async (species: PetSpecies) => {
    if (!currentChild || adoptingSpecies) return;
    setAdoptingSpecies(species);
    setError('');

    try {
      const res = await petsApi.adopt(currentChild.id, species);
      invalidateChildDataCache(currentChild.id);
      const adoptedMeta = getPetMeta(species);
      setOverview((prev) => prev
        ? { ...prev, active_pet: res.data.pet, fruits_balance: res.data.fruits_balance }
        : prev);
      setShowAdopt(false);
      setToast(`${adoptedMeta.name}来到你的花园啦！`);
      setFeedAmount(50);
    } catch (err) {
      setError(err instanceof Error ? err.message : '领养失败，请稍后再试');
    } finally {
      setAdoptingSpecies(null);
    }
  };

  const handleSaveSettings = async (nextCosts: number[]) => {
    if (!currentChild || isSavingSettings) return;
    setIsSavingSettings(true);
    setSettingsError('');
    setError('');

    const previousStage = activePet?.stage ?? 0;

    try {
      const res = await petsApi.updateSettings(currentChild.id, nextCosts);
      invalidateChildDataCache(currentChild.id);

      setOverview((prev) => {
        if (!prev) return prev;
        const updatedPet = res.data.pet;
        const nextCards = updatedPet?.status === 'grown'
          ? [updatedPet, ...prev.cards.filter((pet) => pet.id !== updatedPet.id)]
          : prev.cards;
        return {
          ...prev,
          settings: res.data.settings,
          active_pet: updatedPet && updatedPet.status === 'growing' ? updatedPet : null,
          cards: nextCards,
        };
      });

      setShowSettings(false);

      if (res.data.auto_completed) {
        setToast('新规则生效后，进行中的宠物直接毕业啦，已收藏成卡片');
      } else if (res.data.pet && res.data.pet.stage !== previousStage) {
        setToast(`成长规则已更新，宠物阶段调整为「${PET_STAGE_LABELS[res.data.pet.stage]}」`);
      } else {
        setToast('成长规则已更新');
      }
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : '保存成长规则失败');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleOpenAdopt = () => {
    if (activePet) {
      setToast('当前宠物还在成长，先陪它毕业吧');
      return;
    }
    setShowAdopt(true);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-full bg-[#fbf6ef] pb-40 transition-colors dark:bg-[var(--bg-primary)] lg:pb-12"
      >
        {/* 顶部 */}
        <header className="sticky top-0 z-30 border-b border-[#eadfd4]/70 bg-[#fbf6ef]/85 backdrop-blur-xl dark:border-[var(--border-color)] dark:bg-[var(--bg-primary)]/85">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <button
              onClick={() => navigate('/')}
              className="flex size-10 items-center justify-center rounded-full border border-[#e8ddd2] bg-white/80 text-[#6b4f42] shadow-sm transition hover:border-[#e0b59d] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)]"
              aria-label="返回首页"
            >
              <Icon name="arrow_back" className="text-xl" />
            </button>

            <div className="text-center">
              <h1 className="text-lg font-black tracking-tight text-[#3d2a22] dark:text-[var(--text-primary)]">宠物养成</h1>
              <p className="text-[9px] font-bold tracking-[0.26em] text-[#b49a8b]">PET GARDEN</p>
            </div>

            {!isChildMode ? (
              <button
                onClick={() => {
                  setSettingsError('');
                  setShowSettings(true);
                }}
                className="flex size-10 items-center justify-center rounded-full border border-[#e8ddd2] bg-white/80 text-[#6b4f42] shadow-sm transition hover:border-[#e0b59d] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)]"
                aria-label="调整成长积分规则"
                title="家长设置"
              >
                <Icon name="settings" className="text-lg" />
              </button>
            ) : (
              <div className="size-10" />
            )}
          </div>

          {user?.children && user.children.length > 1 && (
            <div className="no-scrollbar mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 pb-3">
              {user.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setCurrentChild(child)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    currentChild?.id === child.id
                      ? 'bg-[#7a4a2c] text-white shadow-sm'
                      : 'border border-[#e8ddd2] bg-white/80 text-[#7d6357] hover:border-[#d9a98c] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-secondary)]'
                  }`}
                  aria-label={`切换到${child.name}`}
                >
                  <Icon name={child.gender === 'female' ? 'face_3' : 'face'} className="text-sm" />
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </header>

        <main className="mx-auto max-w-3xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center px-4 py-24 text-[#b49a8b]">
              <div className="relative mb-4 flex size-24 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#f3d6c4]/50" />
                <span className="relative flex size-16 items-center justify-center rounded-full bg-white shadow-md">
                  <Icon name="pets" className="text-3xl text-[#c98a67]" />
                </span>
              </div>
              <p className="text-sm font-bold">正在唤醒小树宠…</p>
            </div>
          ) : loadError ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto max-w-sm rounded-3xl border border-[#f0d9c8] bg-white p-6 shadow-sm">
                <Icon name="error" className="mx-auto text-4xl text-[#d9825a]" />
                <p className="mt-3 text-sm font-bold text-[#5d4237]">宠物花园暂时打不开</p>
                <p className="mt-1 text-xs leading-relaxed text-[#9a7d70]">
                  {isMissingPetSchema
                    ? '宠物数据库还没有初始化。请先在 Supabase SQL Editor 执行 supabase/migrations/20261022000001_add_pet_system.sql，然后刷新页面。'
                    : loadError}
                </p>
                <button
                  onClick={() => void fetchOverview()}
                  className="mt-4 rounded-full bg-[#7a4a2c] px-5 py-2 text-xs font-extrabold text-white"
                >
                  重新尝试
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 积分 & 当前宠物 */}
              {activePet ? (
                <section className="px-4 pt-4">
                  <div className={`relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br ${meta.heroGradient} p-4 shadow-[0_24px_60px_-32px_rgba(90,50,40,0.55)]`}>
                    <div
                      className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full blur-3xl"
                      style={{ background: `${meta.ring}55` }}
                    />
                    <div
                      className="pointer-events-none absolute -bottom-28 -right-16 size-64 rounded-full blur-3xl"
                      style={{ background: `${meta.accent}33` }}
                    />

                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${meta.chip}`}>
                            第 {stage + 1} 阶段 · {PET_STAGE_LABELS[stage]}
                          </span>
                          <span className="rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-bold text-[#8d6e60]">
                            {PET_STAGE_SUBTITLES[stage]}
                          </span>
                        </div>
                        <h2 className="mt-2 truncate text-2xl font-black tracking-tight text-[#3d2a22]">
                          {meta.name}
                        </h2>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#8d6e60]">{meta.tagline}</p>
                      </div>

                      <div className="shrink-0 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-right shadow-sm backdrop-blur">
                        <p className="text-[9px] font-bold tracking-[0.12em] text-[#b29a8c]">成长积分</p>
                        <p className="mt-0.5 text-xl font-black leading-none text-[#7a4a2c]">
                          {formatPoints(fruitsBalance)}
                        </p>
                        <p className="mt-0.5 text-[9px] font-semibold text-[#b29a8c]">🍎 果实余额</p>
                      </div>
                    </div>

                    <div className="relative z-10 flex justify-center">
                      <PetCharacter
                        species={activePet.species}
                        stage={stage}
                        variant="hero"
                        showParticles
                        particleCount={cheer ? 8 : 6}
                        isFeeding={cheer}
                        isEvolving={isFeeding}
                        className="my-1"
                      />

                      <AnimatePresence>
                        {floatGain && (
                          <motion.div
                            key={floatGain.id}
                            initial={{ opacity: 0, y: 16, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="pet-float-up pointer-events-none absolute left-1/2 top-[28%] z-20 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-sm font-black shadow-lg"
                            style={{ color: meta.accentDeep }}
                          >
                            +{formatPoints(floatGain.amount)} 成长
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative z-10 rounded-2xl border border-white/80 bg-white/75 p-3 shadow-sm backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black text-[#5d4237]">
                          {activePet.stage === 4 ? '准备毕业啦' : `正在长成「${nextStageLabel}」`}
                        </p>
                        <p className="text-[11px] font-extrabold" style={{ color: meta.accentDeep }}>
                          {formatPoints(activePet.stage_points)} / {formatPoints(stageCost)}
                        </p>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#f1e6dd]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${activePet.stage_progress}%` }}
                          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${meta.ring}, ${meta.accent})` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-[#9a7d70]">
                        <span>
                          {stageRemaining > 0
                            ? `还差 ${formatPoints(stageRemaining)} 积分${activePet.stage === 4 ? '毕业' : `进入${nextStageLabel}`}`
                            : '这一阶段已经喂满啦'}
                        </span>
                        <span>总进度 {activePet.total_progress}%</span>
                      </div>
                    </div>

                    {/* 五阶段轨道 */}
                    <div className="relative z-10 mt-4 px-1">
                      <div className="absolute left-[10%] right-[10%] top-4 h-1 rounded-full bg-white/70" />
                      <div
                        className="absolute left-[10%] top-4 h-1 rounded-full transition-all duration-500"
                        style={{
                          width: `${(stage / 4) * 80}%`,
                          background: `linear-gradient(90deg, ${meta.ring}, ${meta.accent})`,
                        }}
                      />
                      <div className="relative flex justify-between">
                        {PET_STAGE_LABELS.map((label, index) => {
                          const done = index < stage;
                          const current = index === stage;
                          return (
                            <div key={label} className="flex w-1/5 flex-col items-center gap-1">
                              <span
                                className={`flex size-8 items-center justify-center rounded-full border text-[13px] shadow-sm transition ${
                                  current ? 'scale-110 border-white' : 'border-white/70'
                                }`}
                                style={{
                                  background: done || current ? meta.accent : 'rgba(255,255,255,0.72)',
                                  color: done || current ? '#fff' : '#a58a7d',
                                }}
                              >
                                {done ? <Icon name="check" className="text-sm" /> : STAGE_EMOJI[index]}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold ${
                                  current ? 'text-[#5d4237]' : 'text-[#a58a7d]'
                                }`}
                              >
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="px-4 pt-4">
                  <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-[#fff8ee] via-[#ffeeda] to-[#ffdcc0] p-5 shadow-[0_24px_60px_-35px_rgba(120,70,40,0.5)]">
                    <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#ffd0a8]/60 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-14 size-52 rounded-full bg-[#ffe4c9]/70 blur-3xl" />

                    <div className="relative z-10 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[10px] font-extrabold tracking-[0.16em] text-[#a1765f] shadow-sm">
                        <Icon name="pets" className="text-sm" />
                        {cards.length > 0 ? 'NEXT FRIEND' : 'YOUR FIRST FRIEND'}
                      </span>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-[#3d2a22]">
                        {cards.length > 0 ? '花园里还缺一位新伙伴' : '领养你的第一只小树宠'}
                      </h2>
                      <p className="mx-auto mt-1.5 max-w-sm text-xs font-medium leading-relaxed text-[#8d6e60]">
                        打卡获得的果实就是成长积分。陪它从种子、幼苗、花苞、小树一路长到成长期，毕业后会变成一张专属宠物卡片。
                      </p>

                      <div className="mt-1 flex justify-center">
                        <PetCharacter
                          species={PET_LIST[cards.length % PET_LIST.length]?.id ?? 'tao'}
                          stage={4}
                          variant="hero"
                          showParticles
                          particleCount={7}
                          sizeClassName="h-[230px] w-[190px]"
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-center gap-2">
                        <span className="rounded-full bg-white/75 px-3 py-1.5 text-[11px] font-extrabold text-[#7a4a2c] shadow-sm">
                          🍎 {formatPoints(fruitsBalance)} 成长积分可用
                        </span>
                        <span className="rounded-full bg-white/60 px-3 py-1.5 text-[11px] font-bold text-[#9a7d70]">
                          已收藏 {cards.length} 张卡片
                        </span>
                      </div>

                      <button
                        onClick={handleOpenAdopt}
                        className="mt-4 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f2a35f] to-[#e07b3f] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-[#e07b3f]/25 transition active:scale-[0.98]"
                      >
                        <Icon name="pets" className="text-lg" />
                        选择一只宠物
                        <Icon name="arrow_forward" className="text-base" />
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* 喂养区 */}
              {activePet && (
                <section className="px-4 pt-3">
                  <div className="rounded-[1.8rem] border border-[#efe2d7] bg-white p-4 shadow-[0_16px_40px_-30px_rgba(90,50,40,0.5)] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#3d2a22] dark:text-[var(--text-primary)]">喂它吃点成长积分</p>
                        <p className="mt-0.5 text-[11px] font-medium text-[#9a7d70] dark:text-[var(--text-muted)]">
                          1 积分 = 1 点成长能量 · 和商店共用果实余额
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#fff3e6] px-2.5 py-1 text-[10px] font-extrabold text-[#a1765f]">
                        可用 {formatPoints(fruitsBalance)}
                      </span>
                    </div>

                    <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-0.5">
                      {FEED_PRESETS.map((preset) => {
                        const selected = feedAmount === preset;
                        return (
                          <button
                            key={preset}
                            onClick={() => setFeedAmount(preset)}
                            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                              selected
                                ? 'bg-[#7a4a2c] text-white shadow-sm'
                                : 'bg-[#fbf3ea] text-[#8d6e60] hover:bg-[#f6e9dc]'
                            }`}
                          >
                            +{preset}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setFeedAmount(Math.max(1, feedAll))}
                        disabled={feedAll <= 0}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition disabled:opacity-40 ${
                          feedAmount === feedAll && feedAll > 0
                            ? 'bg-[#7a4a2c] text-white shadow-sm'
                            : 'bg-[#fbf3ea] text-[#8d6e60] hover:bg-[#f6e9dc]'
                        }`}
                      >
                        全部（{formatPoints(feedAll)}）
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#ead9cc] bg-[#fffaf5] px-3 py-2.5">
                        <span className="text-lg">🍎</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={Math.max(1, feedAll)}
                          value={Number.isFinite(feedAmount) ? feedAmount : ''}
                          onChange={(event) => setFeedAmount(Number(event.target.value))}
                          className="min-w-0 flex-1 bg-transparent text-lg font-black text-[#4a3027] outline-none"
                          aria-label="本次喂养积分"
                        />
                        <span className="shrink-0 text-[10px] font-bold text-[#b39b8e] dark:text-[var(--text-muted)]">积分</span>
                      </div>
                      <button
                        onClick={() => void handleFeed()}
                        disabled={plannedFeed <= 0 || isFeeding}
                        className={`flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r ${meta.buttonGradient} px-4 py-3 text-sm font-black text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        {isFeeding ? (
                          <>
                            <span className="size-4 animate-spin rounded-full border-2 border-white/60 border-r-transparent" />
                            喂养中
                          </>
                        ) : (
                          <>
                            <Icon name="restaurant" className="text-base" />
                            投入 {formatPoints(plannedFeed)}
                          </>
                        )}
                      </button>
                    </div>

                    {fruitsBalance <= 0 ? (
                      <button
                        onClick={() => navigate('/')}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#fff5e9] px-3 py-2 text-[11px] font-extrabold text-[#a1765f] transition hover:bg-[#ffeeda]"
                      >
                        积分不够啦，去完成任务赚果实
                        <Icon name="arrow_forward" className="text-sm" />
                      </button>
                    ) : plannedFeed < Math.floor(feedAmount) ? (
                      <p className="mt-2 text-center text-[10px] font-semibold text-[#b39b8e] dark:text-[var(--text-muted)]">
                        本次实际只需投入 {formatPoints(plannedFeed)} 积分，多余的会留在账户里
                      </p>
                    ) : (
                      <p className="mt-2 text-center text-[10px] font-semibold text-[#b39b8e] dark:text-[var(--text-muted)]">
                        喂满当前阶段后，宠物会进化到下一阶段
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* 宠物卡片册 */}
              <section className="px-4 pt-6">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-lg font-black tracking-tight text-[#3d2a22] dark:text-[var(--text-primary)]">宠物卡片册</h3>
                      <span className="rounded-full bg-[#f3e6da] px-2 py-0.5 text-[10px] font-extrabold text-[#a1765f]">
                        {cards.length} 张
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-[#9a7d70] dark:text-[var(--text-muted)]">
                      每一只毕业的宠物都会留在这里，同一种可以养很多次
                    </p>
                  </div>
                  {!activePet && (
                    <button
                      onClick={handleOpenAdopt}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#7a4a2c] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-[#633a22]"
                    >
                      <Icon name="add" className="text-sm" />
                      再养一只
                    </button>
                  )}
                </div>

                {cardsWithSerial.length === 0 ? (
                  <div className="rounded-[1.6rem] border border-dashed border-[#e2cdbd] bg-white/55 px-5 py-9 text-center dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]/60">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#f7eadf] text-2xl">
                      🗂️
                    </div>
                    <p className="mt-3 text-sm font-black text-[#5d4237] dark:text-[var(--text-primary)]">还没有宠物卡片</p>
                    <p className="mx-auto mt-1 max-w-xs text-[11px] font-medium leading-relaxed text-[#9a7d70] dark:text-[var(--text-muted)]">
                      {activePet ? '陪当前宠物走完成长期，这里就会出现它的毕业卡片。' : '先领养一只小树宠，陪它慢慢长大吧。'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {cardsWithSerial.map(({ pet, serial, cardNumber }, index) => (
                      <PetCard
                        key={pet.id}
                        pet={pet}
                        serial={serial}
                        cardNumber={cardNumber}
                        index={index}
                        onClick={() => setSelectedCard(pet)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* 家长提示 */}
              {!isChildMode && (
                <section className="px-4 pt-5">
                  <button
                    onClick={() => {
                      setSettingsError('');
                      setShowSettings(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#efe0d4] bg-white/65 px-4 py-3 text-left transition hover:border-[#ddb99f] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]/70"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff3e6] text-[#b57a4f]">
                      <Icon name="shield_person" className="text-lg" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold text-[#5d4237] dark:text-[var(--text-primary)]">家长设置</span>
                      <span className="mt-0.5 block truncate text-[10px] font-medium text-[#9a7d70] dark:text-[var(--text-muted)]">
                        当前规则：{costs.map((cost) => formatPoints(cost)).join(' / ')} 积分
                      </span>
                    </span>
                    <Icon name="chevron_right" className="text-lg text-[#b9a294]" />
                  </button>
                </section>
              )}

              <div className="h-4" />
            </>
          )}
        </main>

        {/* 提示条 */}
        <AnimatePresence>
          {(toast || error) && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className={`fixed bottom-24 left-1/2 z-[110] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-xs font-bold shadow-xl backdrop-blur lg:bottom-8 ${
                error
                  ? 'bg-red-500/95 text-white'
                  : 'bg-[#3d2a22]/92 text-white'
              }`}
              role="status"
            >
              {error || toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 领养弹层 */}
        <PetAdoptSheet
          open={showAdopt}
          childName={currentChild?.name}
          fruitsBalance={fruitsBalance}
          hasCards={cards.length > 0}
          adoptingSpecies={adoptingSpecies}
          onClose={() => {
            if (!adoptingSpecies) setShowAdopt(false);
          }}
          onAdopt={handleAdopt}
        />

        {/* 家长规则设置 */}
        <PetSettingsModal
          open={showSettings}
          costs={costs}
          childName={currentChild?.name}
          saving={isSavingSettings}
          error={settingsError}
          onClose={() => {
            if (!isSavingSettings) setShowSettings(false);
          }}
          onSave={handleSaveSettings}
        />

        {/* 升级 / 毕业庆祝 */}
        <AnimatePresence>
          {celebration && (
            <PetStageUpModal
              key={`${celebration.species}-${celebration.stage}-${celebration.completed}`}
              species={celebration.species}
              stage={celebration.stage}
              previousStage={celebration.previousStage}
              completed={celebration.completed}
              spent={celebration.spent}
              totalPoints={celebration.totalPoints}
              childName={currentChild?.name}
              onClose={() => setCelebration(null)}
            />
          )}
        </AnimatePresence>

        {/* 卡片详情 */}
        <AnimatePresence>
          {selectedCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2b1a1a]/55 p-4 backdrop-blur-md"
              onClick={() => setSelectedCard(null)}
              role="dialog"
              aria-modal="true"
              aria-label="宠物卡片详情"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className={`relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br ${getPetMeta(selectedCard.species).gradient} shadow-2xl`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-5 pb-5 pt-5">
                  <div className="flex items-start justify-between">
                    <span className="rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.14em] text-[#8d6e60]">
                      PET CARD · No.{String(selectedCardNumber).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => setSelectedCard(null)}
                      className="flex size-8 items-center justify-center rounded-full bg-white/70 text-[#8d6e60] shadow-sm"
                      aria-label="关闭"
                    >
                      <Icon name="close" className="text-base" />
                    </button>
                  </div>

                  <div className="mt-1 flex justify-center">
                    <PetCharacter
                      species={selectedCard.species}
                      stage={4}
                      variant="hero"
                      showParticles
                      particleCount={7}
                      sizeClassName="h-[250px] w-[210px]"
                    />
                  </div>

                  <div className="text-center">
                    <h3 className="text-2xl font-black tracking-tight text-[#3d2a22]">
                      {getPetMeta(selectedCard.species).name}
                    </h3>
                    <p className="text-[9px] font-bold tracking-[0.24em] text-[#9a7d70]">
                      {getPetMeta(selectedCard.species).en}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#8d6e60]">
                      {getPetMeta(selectedCard.species).tagline}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      ['成长阶段', PET_STAGE_LABELS[4]],
                      ['累计投入', `${formatPoints(selectedCard.total_points)} 积分`],
                      ['成长天数', `${daysBetween(selectedCard.started_at, selectedCard.grown_at)} 天`],
                      ['毕业日期', formatDate(selectedCard.grown_at)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-white/70 px-3 py-2.5">
                        <p className="text-[9px] font-bold tracking-wide text-[#b29a8c]">{label}</p>
                        <p className="mt-0.5 text-xs font-black text-[#5d4237]">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-2xl bg-white/55 px-3 py-2 text-center text-[10px] font-medium leading-relaxed text-[#9a7d70]">
                    {PET_STAGE_SUBTITLES[4]} · 这是{currentChild?.name ? `${currentChild.name}的` : '你的'}第 {selectedCardSerial} 只
                    {getPetMeta(selectedCard.species).name}
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
