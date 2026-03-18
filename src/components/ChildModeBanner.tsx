import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import PasswordConfirmModal from './PasswordConfirmModal';

export default function ChildModeBanner() {
  const { isChildMode, disableChildMode } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDisableClick = () => {
    setError('');
    setShowModal(true);
  };

  const handleConfirm = async (password: string) => {
    setIsLoading(true);
    setError('');
    try {
      await disableChildMode(password);
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setError('');
  };

  if (!isChildMode) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-amber-400 px-4 py-2 flex items-center justify-between gap-3 shadow-sm"
        role="banner"
        aria-label="儿童模式提示"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-amber-900 text-lg shrink-0">child_care</span>
          <p className="text-amber-900 text-xs font-bold truncate">当前处于儿童模式，部分功能已限制</p>
        </div>
        <button
          onClick={handleDisableClick}
          className="shrink-0 flex items-center gap-1 bg-amber-900/15 hover:bg-amber-900/25 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full transition-colors active:scale-95"
          aria-label="退出儿童模式"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && handleDisableClick()}
        >
          <span className="material-symbols-outlined text-sm">lock_open</span>
          退出儿童模式
        </button>
      </motion.div>

      <PasswordConfirmModal
        isOpen={showModal}
        title="退出儿童模式"
        description="请输入账户登录密码以退出儿童模式，恢复完整功能"
        confirmLabel="退出儿童模式"
        isLoading={isLoading}
        error={error}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
