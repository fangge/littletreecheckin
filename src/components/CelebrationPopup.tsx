import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CelebrationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  // 打卡后的树木进度（0-100），用于决定显示文案
  treeProgress?: number;
  // 树木名称
  treeName?: string;
  // 是否任务完成（进度达到100%）
  isTreeCompleted?: boolean;
}

// 根据进度返回对应的文案配置
const getContent = (progress: number, treeName: string, isCompleted: boolean) => {
  if (isCompleted) {
    return {
      title: '太厉害了！',
      subtitle: `${treeName}果实成熟啦！🍎`,
      reward: '+10 果实',
      footer: `${treeName}已经长成参天大树！🌳`,
      icon: 'nutrition',
      iconColor: 'from-orange-400 to-red-500',
      bgColor: 'bg-orange-50',
    };
  }
  if (progress >= 80) {
    return {
      title: '坚持住！',
      subtitle: '马上就要结果啦！',
      reward: '+10 果实',
      footer: `${treeName}快长成了！再加把劲！🌿`,
      icon: 'energy_savings_leaf',
      iconColor: 'from-emerald-400 to-green-600',
      bgColor: 'bg-emerald-50',
    };
  }
  if (progress >= 50) {
    return {
      title: '真棒！',
      subtitle: '小树越来越壮了！',
      reward: '+10 果实',
      footer: `${treeName}正在茁壮成长！🌱`,
      icon: 'park',
      iconColor: 'from-primary to-green-500',
      bgColor: 'bg-primary/10',
    };
  }
  return {
    title: '打卡成功！',
    subtitle: '继续坚持，小树在成长！',
    reward: '+10 果实',
    footer: `${treeName}又长高了一点！🌱`,
    icon: 'task_alt',
    iconColor: 'from-primary to-green-500',
    bgColor: 'bg-primary/10',
  };
};

export default function CelebrationPopup({
  isOpen,
  onClose,
  treeProgress = 0,
  treeName = '小树',
  isTreeCompleted = false,
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
            className="flex flex-col items-stretch bg-white rounded-t-[40px] shadow-2xl overflow-hidden max-w-md mx-auto w-full"
          >
            <div className="flex h-6 w-full items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            <div className="px-6 pb-12 pt-4 text-center">
              <div className="relative py-8 flex justify-center">
                <div className="absolute inset-0 bg-primary/20 scale-150 opacity-80 blur-3xl rounded-full" />

                {/* Floating Icons */}
                <div className="absolute inset-0 pointer-events-none">
                  <span className="material-symbols-outlined absolute text-yellow-400 text-2xl -top-2 left-1/4 fill-icon">star</span>
                  <span className="material-symbols-outlined absolute text-yellow-300 text-xl top-12 right-12 fill-icon">star</span>
                  <span className="material-symbols-outlined absolute text-yellow-500 text-3xl bottom-10 left-8 fill-icon">stars</span>
                  <span className="material-symbols-outlined absolute text-green-400 text-2xl top-0 right-1/4 rotate-45">eco</span>
                </div>

                {/* 进度环 */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  {isTreeCompleted ? (
                    /* 完成状态：显示果实 */
                    <div className="w-44 h-40 bg-gradient-to-br from-red-400 via-orange-300 to-green-400 rounded-[55%_55%_45%_45%] shadow-2xl border-4 border-white/40 relative">
                      <div className="absolute top-4 left-8 w-14 h-10 bg-white/30 rounded-full blur-md -rotate-15" />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="w-2 h-8 bg-amber-800 rounded-full" />
                        <div className="absolute -top-1 left-2 w-12 h-8 bg-green-500 rounded-[100%_0%_100%_0%] rotate-12 border-2 border-green-600" />
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                        <div className="flex gap-10 mb-3">
                          <div className="w-7 h-9 bg-slate-900 rounded-full relative overflow-hidden">
                            <div className="absolute top-1 left-1.5 w-3 h-3 bg-white rounded-full" />
                          </div>
                          <div className="w-7 h-9 bg-slate-900 rounded-full relative overflow-hidden">
                            <div className="absolute top-1 left-1.5 w-3 h-3 bg-white rounded-full" />
                          </div>
                        </div>
                        <div className="w-10 h-5 border-b-4 border-slate-900 rounded-full" />
                      </div>
                    </div>
                  ) : (
                    /* 进行中：显示进度圆环 + 图标 */
                    <div className="relative">
                      <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="50"
                          fill="none"
                          stroke="#0df20d"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - treeProgress / 100)}`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`material-symbols-outlined text-5xl fill-icon bg-gradient-to-br ${content.iconColor} bg-clip-text text-transparent`}>
                          {content.icon}
                        </span>
                        <p className="text-slate-900 font-black text-lg mt-1">{treeProgress}%</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <h1 className="text-slate-900 tracking-tighter text-5xl font-[900] leading-tight drop-shadow-sm">
                  {content.title}
                </h1>
                <p className="text-slate-500 text-lg font-bold mt-1">{content.subtitle}</p>
              </div>

              <div className="mt-8 flex justify-center">
                <div className={`inline-flex items-center gap-4 px-8 py-5 rounded-[2.5rem] ${content.bgColor} border-2 border-primary/30 shadow-sm`}>
                  <div className={`h-14 w-14 bg-gradient-to-br ${content.iconColor} rounded-full flex items-center justify-center text-white shadow-lg ring-4 ring-primary/20`}>
                    <span className="material-symbols-outlined text-3xl font-bold">add</span>
                  </div>
                  <div className="text-left">
                    <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">获得奖励</p>
                    <p className="text-slate-900 tracking-tight text-2xl font-black leading-none mt-1">{content.reward}</p>
                  </div>
                </div>
              </div>

              <p className="mt-8 text-slate-500 text-base font-medium">
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
