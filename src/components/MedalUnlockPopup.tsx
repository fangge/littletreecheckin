import { motion, AnimatePresence } from 'motion/react';
import { MedalData } from '../services/api';

import Icon from '../components/Icon';
interface MedalUnlockPopupProps {
  medals: MedalData[];
  childName?: string;
  onClose: () => void;
}

const CONDITION_LABELS: Record<string, string> = {
  total_tasks: '累计打卡',
  consecutive_days: '连续打卡',
  early_checkin: '早起打卡',
  trees_completed: '完成培育',
  total_fruits: '累计获得果实',
  weekly_goals: '一周完成目标',
};

const CONDITION_UNITS: Record<string, string> = {
  total_tasks: '次',
  consecutive_days: '天',
  early_checkin: '天',
  trees_completed: '棵树',
  total_fruits: '个果实',
  weekly_goals: '个目标',
};

export default function MedalUnlockPopup({ medals, childName, onClose }: MedalUnlockPopupProps) {
  if (!medals.length) return null;

  // 只展示第一个新勋章（逐个展示）
  const medal = medals[0];
  const conditionType = medal.unlock_condition?.type ?? '';
  const threshold = medal.unlock_condition?.threshold ?? 0;
  const conditionLabel = CONDITION_LABELS[conditionType] ?? '完成条件';
  const conditionUnit = CONDITION_UNITS[conditionType] ?? '';

  return (
    <AnimatePresence>
      <motion.div
        key="medal-unlock-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          key="medal-unlock-card"
          initial={{ scale: 0.7, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          className="relative w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 顶部绿色标签 */}
          <div className="flex justify-center pt-6 pb-2">
            <div className="bg-green-50 border border-green-200 rounded-full px-5 py-1.5 flex flex-col items-center">
              <span className="text-green-700 font-extrabold text-sm tracking-widest">成就丛林</span>
              <span className="text-green-500 text-[10px] tracking-[0.2em] font-semibold">ACHIEVEMENT JUNGLE</span>
            </div>
          </div>

          {/* 解锁标题 */}
          <div className="flex items-center justify-center gap-2 mt-3 mb-1">
            <span className="text-2xl">🏆</span>
            <span className="text-slate-800 font-extrabold text-lg">解锁新勋章</span>
          </div>

          {/* 勋章图标 */}
          <div className="flex justify-center my-4">
            <motion.div
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${medal.color} flex items-center justify-center shadow-2xl border-4 border-white`}
            >
              <Icon name={medal.icon} filled className="text-6xl text-white drop-shadow-lg" />
            </motion.div>
          </div>

          {/* 孩子名字 */}
          {childName && (
            <p className="text-center text-slate-500 text-sm font-semibold mb-1">{childName}</p>
          )}

          {/* 勋章名称 */}
          <h2 className="text-center text-green-600 font-extrabold text-2xl tracking-wide mb-1">
            「{medal.name}」
          </h2>

          {/* 分割线 */}
          <div className="mx-8 border-t border-slate-100 my-3" />

          {/* 解锁条件 */}
          <p className="text-center text-slate-500 text-sm mb-3">
            {conditionLabel} {threshold} {conditionUnit}
          </p>

          {/* 装饰点 */}
          <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 300 }}
                className="w-2 h-2 rounded-full bg-green-400 inline-block"
              />
            ))}
          </div>

          {/* 鼓励文案 */}
          <p className="text-center text-slate-400 text-xs mb-1">继续加油，成为更好的自己！</p>
          <p className="text-center text-slate-300 text-[10px] mb-5">成就丛林 · 记录每一步成长</p>

          {/* 按钮 */}
          <div className="px-6 pb-6">
            <button
              onClick={onClose}
              className="w-full py-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-extrabold text-lg rounded-2xl shadow-lg transition-colors"
            >
              太棒了！
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
