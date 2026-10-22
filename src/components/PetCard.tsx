import { motion } from 'motion/react';
import type { PetData } from '../services/api';
import { formatPoints, getPetMeta } from '../data/pets';
import PetCharacter from './PetCharacter';

interface PetCardProps {
  pet: PetData;
  serial: number;
  cardNumber: number;
  index: number;
  onClick: () => void;
}

export default function PetCard({ pet, serial, cardNumber, index, onClick }: PetCardProps) {
  const meta = getPetMeta(pet.species);
  const grownDate = new Date(pet.grown_at ?? pet.updated_at ?? pet.created_at).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`pet-card-shine group relative overflow-hidden rounded-[1.5rem] border border-white/85 bg-gradient-to-br ${meta.gradient} p-3 text-left shadow-[0_16px_35px_-22px_rgba(90,50,40,0.65)]`}
      aria-label={`查看${meta.name}宠物卡片`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-white/75 px-2 py-0.5 text-[9px] font-extrabold tracking-[0.12em] text-[#8d6e60] shadow-sm">
          No.{String(cardNumber).padStart(2, '0')}
        </span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-bold text-[#9a7d70]">
          {grownDate}
        </span>
      </div>

      <div className="relative mt-1 flex h-[132px] items-end justify-center">
        <div
          className="pointer-events-none absolute bottom-2 left-1/2 h-16 w-24 -translate-x-1/2 rounded-full blur-2xl"
          style={{ background: `${meta.ring}55` }}
        />
        <PetCharacter
          species={pet.species}
          stage={4}
          variant="card"
          showParticles={false}
          animateIn={false}
          sizeClassName="h-[132px] w-[112px]"
        />
        <span className="absolute right-0 top-1 rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-extrabold shadow-sm" style={{ color: meta.accentDeep }}>
          毕业
        </span>
      </div>

      <div className="mt-1.5">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-[#3d2a22]">{meta.name}</p>
            <p className="text-[9px] font-bold tracking-[0.14em] text-[#9a7d70]">{meta.en}</p>
          </div>
          <span className="shrink-0 text-[10px] font-extrabold" style={{ color: meta.accentDeep }}>
            第 {serial} 只
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between rounded-xl bg-white/65 px-2.5 py-1.5">
          <span className="text-[9px] font-bold text-[#9a7d70]">累计投入</span>
          <span className="text-[10px] font-black text-[#7a4a2c]">{formatPoints(pet.total_points)} 积分</span>
        </div>
      </div>
    </motion.button>
  );
}
