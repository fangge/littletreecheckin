import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import type { PetSpecies } from '../services/api';
import {
  PET_STAGE_LABELS,
  PET_STAGE_SIZE,
  getPetImage,
  getPetMeta,
} from '../data/pets';

type PetCharacterVariant = 'hero' | 'card' | 'picker' | 'mini';

interface PetCharacterProps {
  species: PetSpecies;
  stage: number;
  variant?: PetCharacterVariant;
  showParticles?: boolean;
  particleCount?: number;
  isFeeding?: boolean;
  isEvolving?: boolean;
  className?: string;
  sizeClassName?: string;
  imageClassName?: string;
  alt?: string;
  animateIn?: boolean;
}

const PARTICLE_LAYOUT = [
  { left: 35, drift: -28, delay: 0, duration: 4.8, size: 8, rise: -92, rotate: 55 },
  { left: 63, drift: 24, delay: 0.7, duration: 5.4, size: 10, rise: -108, rotate: -40 },
  { left: 46, drift: 12, delay: 1.5, duration: 4.3, size: 7, rise: -78, rotate: 90 },
  { left: 70, drift: -18, delay: 2.1, duration: 5.8, size: 9, rise: -116, rotate: 25 },
  { left: 30, drift: 18, delay: 2.8, duration: 5.1, size: 11, rise: -86, rotate: -70 },
  { left: 55, drift: -22, delay: 3.4, duration: 4.6, size: 8, rise: -102, rotate: 45 },
] as const;

const VARIANT_CLASS: Record<PetCharacterVariant, string> = {
  hero: 'h-[280px] w-[230px] sm:h-[340px] sm:w-[280px]',
  card: 'h-36 w-32',
  picker: 'h-24 w-20',
  mini: 'h-12 w-10',
};

const asVars = (vars: Record<string, string | number>): CSSProperties =>
  vars as unknown as CSSProperties;

export default function PetCharacter({
  species,
  stage,
  variant = 'hero',
  showParticles = true,
  particleCount = 6,
  isFeeding = false,
  isEvolving = false,
  className = '',
  sizeClassName,
  imageClassName = '',
  alt,
  animateIn = true,
}: PetCharacterProps) {
  const meta = getPetMeta(species);
  const safeStage = Math.min(4, Math.max(0, stage));
  const src = getPetImage(species, safeStage);
  const label = `${meta.name} · ${PET_STAGE_LABELS[safeStage]}`;
  const particles = PARTICLE_LAYOUT.slice(0, particleCount);

  const stageScale = variant === 'hero' ? PET_STAGE_SIZE[safeStage] : 1;

  return (
    <div
      className={`relative flex items-end justify-center ${sizeClassName ?? VARIANT_CLASS[variant]} ${className}`}
      aria-label={label}
    >
      {/* 柔光背景 */}
      <div
        className={`pet-aura pointer-events-none absolute bottom-[8%] left-1/2 -translate-x-1/2 rounded-full blur-2xl ${
          variant === 'hero' ? 'h-[78%] w-[82%]' : 'h-[70%] w-[78%]'
        }`}
        style={{ background: `radial-gradient(circle, ${meta.ring}66 0%, ${meta.accent}22 52%, transparent 72%)` }}
      />

      {/* 漂浮粒子 */}
      {showParticles && (
        <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
          {particles.map((particle, index) => {
            const color = meta.particleColors[index % meta.particleColors.length];
            const size = meta.particle === 'note' || meta.particle === 'heart'
              ? particle.size + 6
              : particle.size;
            return (
              <span
                key={`${species}-${safeStage}-particle-${index}`}
                className={`pet-particle pet-particle-${meta.particle}`}
                style={asVars({
                  left: `${particle.left}%`,
                  '--pcolor': color,
                  '--dx': `${particle.drift}px`,
                  '--dy': `${particle.rise}px`,
                  '--rot': `${particle.rotate}deg`,
                  '--delay': `${particle.delay}s`,
                  '--dur': `${particle.duration}s`,
                  '--size': `${size}px`,
                })}
              />
            );
          })}
        </div>
      )}

      {/* 宠物本体 */}
      <motion.div
        key={`${species}-${safeStage}`}
        initial={animateIn ? { opacity: 0, scale: 0.86, y: 12 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className="relative z-10 flex h-full w-full items-end justify-center"
      >
        <img
          src={src}
          alt={alt ?? label}
          draggable={false}
          loading={variant === 'hero' ? 'eager' : 'lazy'}
          className={`relative z-10 max-w-full select-none object-contain ${meta.idleClass} ${
            isFeeding ? 'pet-cheer' : ''
          } ${isEvolving ? 'pet-evolving' : ''} ${imageClassName}`}
          style={{
            height: `${stageScale * 100}%`,
            width: 'auto',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 97%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, #000 97%, transparent 100%)',
          }}
        />
      </motion.div>

      {/* 脚底投影 */}
      <div
        className="pointer-events-none absolute bottom-[2%] left-1/2 h-3 w-[52%] -translate-x-1/2 rounded-[50%] blur-[3px]"
        style={{ background: `radial-gradient(ellipse, ${meta.accentDeep}33 0%, transparent 72%)` }}
        aria-hidden="true"
      />
    </div>
  );
}
