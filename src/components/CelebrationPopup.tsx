/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// GIF 资源地址（男孩/女孩种树成功动画）
export const BOY_TREE_GIF = 'https://diy-assets.msstatic.com/mrfangge/littletree/boytree.gif';
export const GIRL_TREE_GIF = 'https://diy-assets.msstatic.com/mrfangge/littletree/girltree.gif';
export const Gold_Apple = 'https://diy-assets.msstatic.com/mrfangge/littletree/goldapple.gif';

// 音效资源地址
export const BOY_TREE_MP3 = 'https://diy-assets.msstatic.com/mrfangge/littletree/boytree.mp3';
export const GIRL_TREE_MP3 = 'https://diy-assets.msstatic.com/mrfangge/littletree/girltree.mp3';
export const Gold_Apple_MP3 = 'https://diy-assets.msstatic.com/mrfangge/littletree/goldapple.mp3';

/** 预加载 GIF 和音频到浏览器缓存，供外部页面在合适时机调用 */
export function preloadTreeGifs(): void {
  [BOY_TREE_GIF, GIRL_TREE_GIF].forEach(src => {
    const img = new Image();
    img.src = src;
  });
  [BOY_TREE_MP3, GIRL_TREE_MP3].forEach(src => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;
  });
}

// GIF/音效时长（毫秒）
const GIF_DURATION_MS = 10_000;

interface CelebrationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  treeProgress?: number;
  treeName?: string;
  isTreeCompleted?: boolean;
  /** 孩子性别：'male' 显示男孩动画，'female' 或未传则显示女孩动画 */
  childGender?: string;
  /** 是否为共享任务：true 时使用金苹果动画和音效 */
  isSharedTask?: boolean;
}

const getContent = (progress: number, treeName: string, isCompleted: boolean) => {
  if (isCompleted) {
    return {
      title: '太厉害了！',
      subtitle: `${treeName}果实成熟啦！🍎`,
      footer: `${treeName}已经长成参天大树！🌳`,
    };
  }
  if (progress >= 80) {
    return {
      title: '坚持住！',
      subtitle: '马上就要结果啦！',
      footer: `${treeName}快长成了！再加把劲！🌿`,
    };
  }
  if (progress >= 50) {
    return {
      title: '真棒！',
      subtitle: '小树越来越壮了！',
      footer: `${treeName}正在茁壮成长！🌱`,
    };
  }
  return {
    title: '打卡成功！',
    subtitle: '继续坚持，小树在成长！',
    footer: `${treeName}又长高了一点！🌱`,
  };
};

export default function CelebrationPopup({
  isOpen,
  onClose,
  treeProgress = 0,
  treeName = '小树',
  isTreeCompleted = false,
  childGender,
  isSharedTask = false,
}: CelebrationPopupProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 用 ref 保存最新值，避免 useEffect 因引用变化而重复触发
  const onCloseRef = useRef(onClose);
  const mp3UrlRef = useRef('');
  onCloseRef.current = onClose;

  const content = getContent(treeProgress, treeName, isTreeCompleted);
  // 共享任务 → 金苹果动画/音效；'male' → 男孩动画/音效；其他 → 女孩动画/音效
  const gifUrl = isSharedTask ? Gold_Apple : (childGender === 'male' ? BOY_TREE_GIF : GIRL_TREE_GIF);
  mp3UrlRef.current = isSharedTask ? Gold_Apple_MP3 : (childGender === 'male' ? BOY_TREE_MP3 : GIRL_TREE_MP3);

  // 只依赖 isOpen，避免 onClose/mp3Url 引用变化导致重复触发
  useEffect(() => {
    if (!isOpen) return;

    // 播放对应音效
    const audio = new Audio(mp3UrlRef.current);
    audioRef.current = audio;
    audio.play().catch(() => {
      // 浏览器自动播放策略限制时静默失败
    });

    // 10s 后自动关闭
    timerRef.current = setTimeout(() => {
      onCloseRef.current();
    }, GIF_DURATION_MS);

    return () => {
      // 清理：停止音效、清除计时器
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col items-stretch bg-white dark:bg-[var(--bg-surface)] rounded-t-[40px] shadow-2xl overflow-hidden max-w-md mx-auto w-full transition-colors"
          >
            {/* 顶部拖拽指示条 */}
            <div className="flex h-6 w-full items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-[var(--bg-card)]" />
            </div>

            <div className="px-6 pb-12 pt-4 text-center">
              {/* GIF 动画区域 */}
              <div className="flex justify-center py-4">
                <img
                  src={gifUrl}
                  alt="树木成长动画"
                  width={300}
                  height={300}
                  className="object-contain"
                />
              </div>

              {/* 文案 */}
              <div className="mt-2">
                <h1 className="text-slate-900 dark:text-[var(--text-primary)] tracking-tighter text-5xl font-[900] leading-tight drop-shadow-sm">
                  {content.title}
                </h1>
                <p className="text-slate-500 dark:text-[var(--text-secondary)] text-lg font-bold mt-1">
                  {content.subtitle}
                </p>
              </div>

              <p className="mt-8 text-slate-500 dark:text-[var(--text-secondary)] text-base font-medium">
                {content.footer}
              </p>

              <div className="mt-10 px-2">
                <button
                  onClick={onClose}
                  className="w-full bg-primary hover:bg-primary/90 text-slate-900 font-black text-2xl py-6 rounded-3xl shadow-[0_10px_0_rgb(11,180,51)] transition-all active:translate-y-1 active:shadow-none"
                >
                  太棒了！
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
