import { motion, AnimatePresence } from 'motion/react';
import type { PetSpecies } from '../services/api';
import { PET_LIST, formatPoints, getPetImage } from '../data/pets';
import PetCharacter from './PetCharacter';
import Icon from './Icon';

interface PetAdoptSheetProps {
  open: boolean;
  childName?: string;
  fruitsBalance: number;
  hasCards: boolean;
  adoptingSpecies: PetSpecies | null;
  onClose: () => void;
  onAdopt: (species: PetSpecies) => void | Promise<void>;
}

export default function PetAdoptSheet({
  open,
  childName,
  fruitsBalance,
  hasCards,
  adoptingSpecies,
  onClose,
  onAdopt,
}: PetAdoptSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[125] flex items-end justify-center bg-[#2b1a1a]/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="选择宠物"
        >
          <motion.div
            initial={{ y: 70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white/80 bg-[#fdfaf6] p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-start justify-between gap-4 bg-[#fdfaf6]/95 px-5 pb-3 pt-5 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#b28f7f]">
                  <Icon name="pets" className="text-sm" />
                  ADOPT A FRIEND
                </div>
                <h2 className="text-xl font-black tracking-tight text-[#3d2a22]">
                  {hasCards ? '再养一只小树宠' : '选择你的第一只小树宠'}
                </h2>
                <p className="mt-1 text-xs font-medium leading-relaxed text-[#9a7d70]">
                  {childName ? `${childName}现在有 ` : '现在有 '}
                  <span className="font-extrabold text-[#7a4a2c]">{formatPoints(fruitsBalance)}</span> 成长积分。
                  每次领养都会从种子开始，长大后自动收藏成宠物卡片。
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#8d6e60] shadow-sm transition hover:bg-[#f7efe9]"
                aria-label="关闭"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PET_LIST.map((meta) => {
                const isAdopting = adoptingSpecies === meta.id;
                return (
                  <motion.button
                    key={meta.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onAdopt(meta.id)}
                    disabled={Boolean(adoptingSpecies)}
                    className={`group relative overflow-hidden rounded-[1.4rem] border border-white/80 bg-gradient-to-br ${meta.gradient} p-3 text-left shadow-[0_10px_28px_-18px_rgba(90,50,40,0.55)] transition disabled:cursor-wait`}
                    aria-label={`领养${meta.name}`}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.chip}`}>
                        {meta.emoji} {meta.name}
                      </span>
                      <span className="text-[9px] font-bold tracking-[0.14em] text-[#8d6e60]/60">{meta.en.split(' ')[0]}</span>
                    </div>

                    <div className="relative mt-1 flex h-[108px] items-end justify-center">
                      <PetCharacter
                        species={meta.id}
                        stage={4}
                        variant="card"
                        showParticles={false}
                        animateIn={false}
                        sizeClassName="h-[108px] w-[92px]"
                      />
                    </div>

                    <div className="mt-1 flex items-end justify-center gap-1">
                      {[0, 1, 2, 3, 4].map((stage) => (
                        <img
                          key={stage}
                          src={getPetImage(meta.id, stage)}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className="h-6 w-auto object-contain opacity-80"
                          style={{ maxWidth: '18%' }}
                        />
                      ))}
                    </div>

                    <p className="mt-2 line-clamp-1 text-[11px] font-extrabold text-[#4c332a]">{meta.tagline}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-[#9a7d70]">{meta.description}</p>

                    <div className="mt-2 flex items-center justify-between gap-1.5">
                      <span className="shrink-0 text-[9px] font-bold text-[#8d6e60]">5 阶段</span>
                      <span
                        className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/80 px-1.5 py-1 text-[9px] font-extrabold shadow-sm"
                        style={{ color: meta.accentDeep }}
                      >
                        {isAdopting ? '领养中…' : '带它回家'}
                        {!isAdopting && <Icon name="arrow_forward" className="text-[10px]" />}
                      </span>
                    </div>

                    {isAdopting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[1px]">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#7a4a2c] shadow">
                          <span className="size-3 animate-spin rounded-full border-2 border-[#e0a477] border-r-transparent" />
                          正在迎接
                        </span>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <p className="mt-4 rounded-2xl bg-[#fff5e9] px-4 py-3 text-[11px] font-medium leading-relaxed text-[#9a7d70]">
              <span className="font-extrabold text-[#7a4a2c]">小提示：</span>
              同一种宠物可以反复领养，每一只毕业后的宠物都会单独成为一张卡片。当前正在长大的宠物毕业之后，才能迎接下一位伙伴。
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
