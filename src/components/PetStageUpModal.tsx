import { motion } from 'motion/react';
import type { PetSpecies } from '../services/api';
import {
  PET_STAGE_LABELS,
  PET_STAGE_SUBTITLES,
  formatPoints,
  getPetMeta,
} from '../data/pets';
import PetCharacter from './PetCharacter';

interface PetStageUpModalProps {
  species: PetSpecies;
  stage: number;
  previousStage: number;
  completed: boolean;
  spent: number;
  totalPoints: number;
  childName?: string;
  onClose: () => void;
}

const CONFETTI = Array.from({ length: 22 }, (_, index) => ({
  left: 4 + ((index * 37) % 92),
  drift: ((index % 2 === 0 ? 1 : -1) * (12 + (index * 13) % 70)),
  duration: 2.8 + (index % 5) * 0.32,
  delay: (index % 7) * 0.18,
  spin: 320 + (index % 4) * 160,
}));

export default function PetStageUpModal({
  species,
  stage,
  previousStage,
  completed,
  spent,
  totalPoints,
  childName,
  onClose,
}: PetStageUpModalProps) {
  const meta = getPetMeta(species);
  const safeStage = Math.min(4, Math.max(0, stage));
  const title = completed ? '毕业啦！' : `进化到「${PET_STAGE_LABELS[safeStage]}」`;
  const subtitle = completed
    ? `${meta.name}已经长成一只独立的宠物，会被收藏进你的宠物卡片册。`
    : `每一次积分浇灌，都让${meta.name}离长大更近一步。`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[#2b1a1a]/55 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* 彩纸 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {CONFETTI.map((piece, index) => (
          <span
            key={`confetti-${index}`}
            className="pet-confetti-piece"
            style={{
              left: `${piece.left}%`,
              background: meta.particleColors[index % meta.particleColors.length],
              ['--left' as string]: `${piece.left}%`,
              ['--ccolor' as string]: meta.particleColors[index % meta.particleColors.length],
              ['--cdur' as string]: `${piece.duration}s`,
              ['--cdelay' as string]: `${piece.delay}s`,
              ['--drift' as string]: `${piece.drift}px`,
              ['--spin' as string]: `${piece.spin}deg`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="pet-light-surface relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-[#fffdfb] shadow-[0_30px_90px_-25px_rgba(80,30,40,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`relative overflow-hidden bg-gradient-to-br ${meta.heroGradient} px-6 pb-4 pt-7 text-center`}>
          <div
            className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full blur-3xl"
            style={{ background: `${meta.ring}55` }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-12 size-52 rounded-full blur-3xl"
            style={{ background: `${meta.accent}33` }}
          />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[11px] font-extrabold tracking-[0.18em] text-[#7a4a2c] shadow-sm backdrop-blur">
              {completed ? 'PET CARD · 毕业收藏' : 'STAGE UP · 成长时刻'}
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-[#3f2a24]">{title}</h2>
            <p className="mx-auto mt-1.5 max-w-xs text-xs font-medium leading-relaxed text-[#6b4f42]">{subtitle}</p>
          </div>

          <div className="relative z-10 mt-1 flex justify-center">
            <PetCharacter
              species={species}
              stage={safeStage}
              variant="hero"
              showParticles
              particleCount={8}
              isEvolving
              animateIn
              sizeClassName="h-[250px] w-[210px]"
            />
          </div>

          {!completed && (
            <div className="relative z-10 -mt-2 flex items-center justify-center gap-3 text-[11px] font-bold text-[#6b4f42]">
              <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm">
                {PET_STAGE_LABELS[Math.min(4, Math.max(0, previousStage))]}
              </span>
              <span className="text-base" style={{ color: meta.accent }}>→</span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm" style={{ color: meta.accentDeep }}>
                {PET_STAGE_LABELS[safeStage]}
              </span>
            </div>
          )}

          {completed && (
            <div className="relative z-10 mx-auto mt-1 max-w-[260px] rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-left shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-[#6b4f42]">PET CARD</p>
                  <p className="text-sm font-black text-[#3f2a24]">{meta.name}</p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold" style={{ background: `${meta.ring}33`, color: meta.accentDeep }}>
                  {PET_STAGE_LABELS[4]}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-[#6b4f42]">
                <span>累计投入 {formatPoints(totalPoints)} 积分</span>
                <span>{childName ? `${childName}的伙伴` : '成长纪念'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-1">
          <div className="mb-4 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#6b4f42]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f8f0ea] px-2.5 py-1">
              <span className="text-sm">✨</span>
              本次投入 {formatPoints(spent)} 积分
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f8f0ea] px-2.5 py-1">
              <span className="text-sm">🌱</span>
              {PET_STAGE_SUBTITLES[safeStage]}
            </span>
          </div>

          <button
            onClick={onClose}
            className={`w-full rounded-2xl bg-gradient-to-r ${meta.buttonGradient} px-5 py-3.5 text-sm font-black text-white shadow-lg transition active:scale-[0.98]`}
          >
            {completed ? '收下宠物卡片' : '继续陪它长大'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
