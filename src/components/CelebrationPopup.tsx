import { motion, AnimatePresence } from 'motion/react';

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
      footer: `${treeName}已经长成参天大树！🌳`,
      iconColor: 'from-orange-400 to-red-500',
      bgColor: 'bg-orange-50'
    };
  }
  if (progress >= 80) {
    return {
      title: '坚持住！',
      subtitle: '马上就要结果啦！',
      footer: `${treeName}快长成了！再加把劲！🌿`,
      iconColor: 'from-emerald-400 to-green-600',
      bgColor: 'bg-emerald-50'
    };
  }
  if (progress >= 50) {
    return {
      title: '真棒！',
      subtitle: '小树越来越壮了！',
      footer: `${treeName}正在茁壮成长！🌱`,
      iconColor: 'from-primary to-green-500',
      bgColor: 'bg-primary/10'
    };
  }
  return {
    title: '打卡成功！',
    subtitle: '继续坚持，小树在成长！',
    footer: `${treeName}又长高了一点！🌱`,
    iconColor: 'from-primary to-green-500',
    bgColor: 'bg-primary/10'
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
              {/* 主图区域 */}
              <div className="relative py-8 flex justify-center">
                <div className="absolute inset-0 bg-primary/20 scale-150 opacity-80 blur-3xl rounded-full" />

                {/* 装饰星星 */}
                <div className="absolute inset-0 pointer-events-none">
                  <span className="material-symbols-outlined absolute text-yellow-400 text-2xl -top-2 left-1/4 fill-icon">
                    star
                  </span>
                  <span className="material-symbols-outlined absolute text-yellow-300 text-xl top-12 right-12 fill-icon">
                    star
                  </span>
                  <span className="material-symbols-outlined absolute text-yellow-500 text-3xl bottom-10 left-8 fill-icon">
                    stars
                  </span>
                  <span className="material-symbols-outlined absolute text-green-400 text-2xl top-0 right-1/4 rotate-45">
                    eco
                  </span>
                </div>

                {/* 果实图案（完成时）或树木图案（进行中） */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  {isTreeCompleted ? (
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
                    /* 进行中：大图标 */
                    <div
                      className={`w-36 h-36 rounded-full bg-gradient-to-br ${content.iconColor} flex items-center justify-center shadow-2xl`}
                    >
                      <span className="material-symbols-outlined text-white text-7xl fill-icon">
                        park
                      </span>
                    </div>
                  )}
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
