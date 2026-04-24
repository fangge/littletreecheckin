/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TreeGrowAnimation from './TreeGrowAnimation';

interface CelebrationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  treeProgress?: number;
  treeName?: string;
  isTreeCompleted?: boolean;
}

const getContent = (
  progress: number,
  treeName: string,
  isCompleted: boolean
) => {
  if (isCompleted) {
    return {
      title: '太厉害了！',
      subtitle: `${treeName}果实成熟啦！🍎`,
      footer: `${treeName}已经长成参天大树！🌳`
    };
  }
  if (progress >= 80) {
    return {
      title: '坚持住！',
      subtitle: '马上就要结果啦！',
      footer: `${treeName}快长成了！再加把劲！🌿`
    };
  }
  if (progress >= 50) {
    return {
      title: '真棒！',
      subtitle: '小树越来越壮了！',
      footer: `${treeName}正在茁壮成长！🌱`
    };
  }
  return {
    title: '打卡成功！',
    subtitle: '继续坚持，小树在成长！',
    footer: `${treeName}又长高了一点！🌱`
  };
};

export default function CelebrationPopup({
  isOpen,
  onClose,
  treeProgress = 0,
  treeName = '小树',
  isTreeCompleted = false
}: CelebrationPopupProps) {
  const content = getContent(treeProgress, treeName, isTreeCompleted);

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
            <div className="flex h-6 w-full items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-[var(--bg-card)]" />
            </div>

            <div className="px-6 pb-12 pt-4 text-center">
              {/* 3D 树木成长动画区域 */}
              <div className="relative py-4 flex justify-center">
                {/* Three.js 3D 动画 */}
                <div className="relative flex items-center justify-center w-[280px] h-[280px]">
                  <TreeGrowAnimation isActive={isOpen} />
                </div>
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
