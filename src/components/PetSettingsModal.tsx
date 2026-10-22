import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_STAGE_COSTS, STAGE_COST_LABELS, formatPoints, getTotalRequired } from '../data/pets';
import Icon from './Icon';

interface PetSettingsModalProps {
  open: boolean;
  costs: number[];
  childName?: string;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (costs: number[]) => void | Promise<void>;
}

const MAX_COST = 100000;

export default function PetSettingsModal({
  open,
  costs,
  childName,
  saving = false,
  error,
  onClose,
  onSave,
}: PetSettingsModalProps) {
  const [draft, setDraft] = useState<string[]>(() => costs.map(String));

  useEffect(() => {
    if (open) setDraft(costs.map((cost) => String(cost)));
    // 只在打开或家长保存后同步，避免输入过程中被父组件重置
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, costs.join(',')]);

  const parsed = useMemo(() => draft.map((value) => Number(value)), [draft]);
  const invalid = parsed.some((value) => !Number.isSafeInteger(value) || value <= 0 || value > MAX_COST);
  const total = getTotalRequired(parsed);

  const updateAt = (index: number, value: string) => {
    setDraft((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-end justify-center bg-[#2b1a1a]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="成长规则设置"
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-white/80 bg-[#fffdfb] p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#b28f7f]">
                  <Icon name="shield_person" className="text-sm" />
                  家长设置
                </div>
                <h2 className="text-xl font-black tracking-tight text-[#3d2a22]">成长积分规则</h2>
                <p className="mt-1 text-xs font-medium leading-relaxed text-[#9a7d70]">
                  为 5 个阶段分别设置所需积分。家长可以随时调整{childName ? `，${childName}的宠物会按新规则重新计算` : '，进行中的宠物会按新规则重新计算'}。
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f7efe9] text-[#8d6e60] transition hover:bg-[#efe3db]"
                aria-label="关闭"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="space-y-2.5">
              {STAGE_COST_LABELS.map((label, index) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-[#f1e4db] bg-white px-3.5 py-3 shadow-[0_2px_10px_-6px_rgba(120,80,60,0.3)]"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff4e8] text-base">
                    {['🌰', '🌱', '🌸', '🌳', '🎓'][index]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-[#5d4237]">{label}</p>
                    <p className="text-[10px] font-medium text-[#b39b8e]">
                      {index === 4 ? '喂满后毕业，收藏为宠物卡片' : '喂满后进入下一阶段'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_COST}
                      value={draft[index] ?? ''}
                      onChange={(event) => updateAt(index, event.target.value)}
                      className="w-20 rounded-xl border border-[#ecd9cc] bg-[#fffaf6] px-2 py-2 text-right text-sm font-black text-[#4a3027] outline-none transition focus:border-[#e9a98e] focus:ring-2 focus:ring-[#f6c9b6]"
                      aria-label={`${label}所需积分`}
                    />
                    <span className="text-[10px] font-bold text-[#b39b8e]">分</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#fff6ec] px-4 py-3">
              <div>
                <p className="text-[10px] font-bold tracking-wide text-[#b28f7f]">从种子到毕业共需要</p>
                <p className="text-lg font-black text-[#7a4a2c]">
                  {invalid ? '—' : formatPoints(total)} <span className="text-xs font-bold">积分</span>
                </p>
              </div>
              <button
                onClick={() => setDraft(DEFAULT_STAGE_COSTS.map(String))}
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#a1765f] shadow-sm transition hover:bg-[#fff1e5]"
              >
                恢复默认
              </button>
            </div>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
            )}

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl border border-[#ecd9cc] bg-white px-4 py-3 text-sm font-extrabold text-[#8d6e60] transition hover:bg-[#fff8f2]"
              >
                取消
              </button>
              <button
                onClick={() => onSave(parsed)}
                disabled={invalid || saving}
                className="flex-[1.6] rounded-2xl bg-gradient-to-r from-[#f2a35f] to-[#e07b3f] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#e07b3f]/25 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? '保存中…' : '保存规则'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
