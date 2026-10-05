import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import Icon from './Icon';

export default function ForcedPasswordChangeModal() {
  const { mustChangePassword, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!mustChangePassword) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword) {
      setError('请输入当前密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少需要6位');
      return;
    }
    if (newPassword === currentPassword) {
      setError('新密码不能与当前密码相同');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码修改失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="forced-password-title">
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-primary/10 bg-white p-6 shadow-2xl dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Icon name="lock_reset" className="text-3xl text-primary" />
          </div>
          <h2 id="forced-password-title" className="text-xl font-extrabold text-slate-900 dark:text-[var(--text-primary)]">请先修改初始密码</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-[var(--text-secondary)]">为了保护账户和孩子的成长记录，首次登录需要设置一个新的登录密码。</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            placeholder="当前密码"
            aria-label="当前密码"
            disabled={isLoading}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-[var(--border-color)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-primary)]"
            autoFocus
          />
          <input
            type="password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            placeholder="新密码（至少6位）"
            aria-label="新密码"
            disabled={isLoading}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-[var(--border-color)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-primary)]"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            placeholder="确认新密码"
            aria-label="确认新密码"
            disabled={isLoading}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-[var(--border-color)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-primary)]"
          />
        </div>

        <button type="submit" disabled={isLoading} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading && <Icon name="progress_activity" className="animate-spin text-base" />}
          {isLoading ? '保存中...' : '保存新密码'}
        </button>
      </motion.form>
    </div>
  );
}
