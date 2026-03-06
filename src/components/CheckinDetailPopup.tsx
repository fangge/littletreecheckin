import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarTask } from '../services/api';

interface CheckinDetailPopupProps {
  date: string | null;
  tasks: CalendarTask[];
  onClose: () => void;
}

const parseDate = (dateStr: string): { month: number; day: number } => {
  const parts = dateStr.split('-');
  return { month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
};

export default function CheckinDetailPopup({ date, tasks, onClose }: CheckinDetailPopupProps) {
  const isOpen = !!date;

  const parsedDate = date ? parseDate(date) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* 浮层内容 */}
          <motion.div
            key="popup"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto lg:max-w-lg lg:mx-auto lg:rounded-2xl lg:bottom-8"
            role="dialog"
            aria-modal="true"
            aria-label={parsedDate ? `${parsedDate.month}月${parsedDate.day}日打卡详情` : '打卡详情'}
          >
            <div className="p-6">
              {/* 顶部拖拽条 */}
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

              {/* 标题区 */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-slate-900 text-xl font-extrabold">
                    {parsedDate ? `${parsedDate.month}月${parsedDate.day}日 成就` : '成就'}
                  </h2>
                  <p className="text-primary text-sm font-semibold mt-0.5">
                    收获了 {tasks.length} 个成长点
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex size-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 shrink-0"
                  aria-label="关闭"
                  tabIndex={0}
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              {/* 任务列表 */}
              <div className="flex flex-col gap-3">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 bg-primary/5 rounded-2xl px-4 py-3"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <span className="material-symbols-outlined text-white text-base fill-icon">check</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-semibold text-sm truncate">{task.title}</p>
                      {task.goal_title && task.goal_title !== task.title && (
                        <p className="text-slate-400 text-xs truncate">{task.goal_title}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 底部鼓励文案 */}
              <div className="flex items-center justify-center gap-1.5 mt-6 pb-2">
                <span className="material-symbols-outlined text-primary text-base fill-icon">eco</span>
                <p className="text-slate-500 text-sm font-medium">树苗又长高了一些！</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
