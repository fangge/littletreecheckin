import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  error?: string;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export default function PasswordConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = '确认',
  isLoading = false,
  error,
  onConfirm,
  onCancel,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleConfirm = () => {
    if (!password.trim()) return;
    onConfirm(password);
  };

  const handleCancel = () => {
    setPassword('');
    setShowPassword(false);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* 图标 + 标题 */}
            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">lock</span>
              </div>
              <h3 className="text-slate-900 text-lg font-bold text-center">{title}</h3>
              {description && (
                <p className="text-slate-500 text-sm text-center leading-relaxed">{description}</p>
              )}
            </div>

            {/* 密码输入框 */}
            <div className="relative mb-3">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="请输入账户登录密码"
                className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                aria-label="账户登录密码"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                tabIndex={0}
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* 错误提示 */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg mb-3 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </motion.p>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                aria-label="取消"
                tabIndex={0}
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || !password.trim()}
                className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 active:scale-[0.98]"
                aria-label={confirmLabel}
                tabIndex={0}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    验证中...
                  </span>
                ) : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
