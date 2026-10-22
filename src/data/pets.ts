import type { PetSpecies } from '../services/api';

export const PET_STAGE_LABELS = ['种子', '幼苗', '花苞', '小树', '成长期'] as const;
export const PET_STAGE_SUBTITLES = ['安静沉睡', '冒出嫩芽', '开出小花', '开始唱歌', '阳光成长'] as const;
export const DEFAULT_STAGE_COSTS = [100, 200, 300, 400, 500] as const;

export const STAGE_COST_LABELS = [
  '种子 → 幼苗',
  '幼苗 → 花苞',
  '花苞 → 小树',
  '小树 → 成长期',
  '成长期 → 毕业',
] as const;

export const PET_STAGE_SIZE = [0.6, 0.7, 0.8, 0.9, 1] as const;

export type PetParticleKind = 'petal' | 'seed' | 'spark' | 'note' | 'heart' | 'leaf';

export interface PetMeta {
  id: PetSpecies;
  name: string;
  en: string;
  tagline: string;
  description: string;
  emoji: string;
  /** 主色（图标、进度、强调文字） */
  accent: string;
  accentDeep: string;
  accentSoft: string;
  /** 卡片渐变 / 按钮渐变（Tailwind 静态类） */
  gradient: string;
  heroGradient: string;
  buttonGradient: string;
  ring: string;
  chip: string;
  particle: PetParticleKind;
  particleColors: string[];
  idleClass: string;
}

export const PET_META: Record<PetSpecies, PetMeta> = {
  tao: {
    id: 'tao',
    name: '桃小树',
    en: 'TAO XIAOSHU',
    tagline: '一棵爱唱歌的桃子树',
    description: '软萌多汁，带着蜜桃的甜香',
    emoji: '🍑',
    accent: '#f27593',
    accentDeep: '#b83f61',
    accentSoft: '#fff0f4',
    gradient: 'from-[#fff4f7] via-[#ffe3eb] to-[#ffc9d8]',
    heroGradient: 'from-[#fff8fa] via-[#ffe9f0] to-[#ffd4e0]',
    buttonGradient: 'from-[#ff91ad] to-[#ef5f84]',
    ring: '#f7a8bd',
    chip: 'bg-[#ffe4ec] text-[#b83f61]',
    particle: 'petal',
    particleColors: ['#ffb3c7', '#ffd0dc', '#ff8fab'],
    idleClass: 'pet-idle-tao',
  },
  xigua: {
    id: 'xigua',
    name: '西瓜小树',
    en: 'XIGUA XIAOSHU',
    tagline: '一棵爱唱歌的西瓜树',
    description: '清爽解暑，带着夏日的瓜香',
    emoji: '🍉',
    accent: '#e95d63',
    accentDeep: '#a92f3d',
    accentSoft: '#fff0ed',
    gradient: 'from-[#fff6f1] via-[#ffe4dc] to-[#ffc9be]',
    heroGradient: 'from-[#fff9f4] via-[#ffebe4] to-[#ffd4c8]',
    buttonGradient: 'from-[#ff8178] to-[#e54c58]',
    ring: '#f3a29c',
    chip: 'bg-[#ffe6df] text-[#a92f3d]',
    particle: 'seed',
    particleColors: ['#7fb069', '#a8d08d', '#e95d63'],
    idleClass: 'pet-idle-xigua',
  },
  ping: {
    id: 'ping',
    name: '苹小树',
    en: 'PING XIAOSHU',
    tagline: '一棵爱唱歌的苹果树',
    description: '脆甜红润，带着苹果园清香',
    emoji: '🍎',
    accent: '#e84b53',
    accentDeep: '#a82d36',
    accentSoft: '#fff0ef',
    gradient: 'from-[#fff5f3] via-[#ffe3e0] to-[#ffc8c3]',
    heroGradient: 'from-[#fff9f7] via-[#ffebe8] to-[#ffd6d0]',
    buttonGradient: 'from-[#fb6c6c] to-[#dd3f4a]',
    ring: '#f19c9f',
    chip: 'bg-[#ffe5e2] text-[#a82d36]',
    particle: 'spark',
    particleColors: ['#ffffff', '#ffd2c9', '#f7b267'],
    idleClass: 'pet-idle-ping',
  },
  li: {
    id: 'li',
    name: '梨小树',
    en: 'LI XIAOSHU',
    tagline: '一棵爱唱歌的梨子树',
    description: '水润清甜，带着梨花的淡香',
    emoji: '🍐',
    accent: '#d9b52e',
    accentDeep: '#8f6f0c',
    accentSoft: '#fffbea',
    gradient: 'from-[#fffdf1] via-[#fff8cd] to-[#f7eaa0]',
    heroGradient: 'from-[#fffef6] via-[#fff9d9] to-[#f8eda8]',
    buttonGradient: 'from-[#f4d34e] to-[#dcb226]',
    ring: '#e8d071',
    chip: 'bg-[#fff6cc] text-[#8f6f0c]',
    particle: 'note',
    particleColors: ['#e2bd36', '#9ac46e', '#fff3b0'],
    idleClass: 'pet-idle-li',
  },
  mei: {
    id: 'mei',
    name: '莓小树',
    en: 'MEI XIAOSHU',
    tagline: '一棵爱唱歌的草莓树',
    description: '酸甜可爱，带着草莓的奶香',
    emoji: '🍓',
    accent: '#e94c63',
    accentDeep: '#a92a3d',
    accentSoft: '#fff0f2',
    gradient: 'from-[#fff4f5] via-[#ffe1e5] to-[#ffc7d0]',
    heroGradient: 'from-[#fff8f8] via-[#ffe9ec] to-[#ffd4da]',
    buttonGradient: 'from-[#f76b7d] to-[#d93b55]',
    ring: '#f09aa6',
    chip: 'bg-[#ffe4e8] text-[#a92a3d]',
    particle: 'heart',
    particleColors: ['#ff9aab', '#ffc2cd', '#ff7189'],
    idleClass: 'pet-idle-mei',
  },
  jiao: {
    id: 'jiao',
    name: '蕉小树',
    en: 'JIAO XIAOSHU',
    tagline: '一棵爱唱歌的香蕉树',
    description: '软糯香甜，带着热带的阳光',
    emoji: '🍌',
    accent: '#dfb62c',
    accentDeep: '#8a6508',
    accentSoft: '#fffbe8',
    gradient: 'from-[#fffdf0] via-[#fff7c8] to-[#f5e79b]',
    heroGradient: 'from-[#fffef6] via-[#fff9d8] to-[#f7eaa6]',
    buttonGradient: 'from-[#f3cc3f] to-[#d9ad1d]',
    ring: '#ead275',
    chip: 'bg-[#fff5c7] text-[#8a6508]',
    particle: 'note',
    particleColors: ['#e2bd36', '#88b85b', '#fff3b0'],
    idleClass: 'pet-idle-jiao',
  },
};

export const PET_LIST: PetMeta[] = (Object.keys(PET_META) as PetSpecies[]).map((id) => PET_META[id]);

export const getPetImage = (species: PetSpecies, stage: number): string => {
  const safeStage = Math.min(4, Math.max(0, Math.round(stage)));
  return `/pets/stages/${species}-${safeStage + 1}.webp`;
};

export const getPetMeta = (species: PetSpecies): PetMeta => PET_META[species] ?? PET_META.tao;

export const formatPoints = (points: number): string =>
  Number.isFinite(points) ? Math.max(0, Math.round(points)).toLocaleString('zh-CN') : '0';

export const getTotalRequired = (costs: number[]): number =>
  costs.reduce((sum, cost) => sum + Math.max(0, Number(cost) || 0), 0);

/** 距离毕业还差多少积分（含当前阶段 + 后续阶段） */
export const getRemainingToGrow = (stage: number, stagePoints: number, costs: number[]): number => {
  const current = Math.max(0, (costs[stage] ?? 0) - stagePoints);
  const future = costs.slice(stage + 1).reduce((sum, cost) => sum + Math.max(0, Number(cost) || 0), 0);
  return current + future;
};
