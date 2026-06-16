import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

import Icon from '../components/Icon';
type Step = 'request' | 'sent' | 'reset' | 'success';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 检测 Supabase 密码重置回调（URL hash 中包含 type=recovery）
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setStep('reset');
      // 清除 URL hash，避免重复处理
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // 第一步：发送重置邮件
  const handleRequest = async () => {
    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const redirectTo = `${window.location.origin}/forgot-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) throw resetError;
      setStep('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 第二步：设置新密码（用户通过邮件链接回到此页面后）
  const handleReset = async () => {
    if (!newPassword) {
      setError('请输入新密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码重置失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  const handleBack = () => {
    if (step === 'success' || step === 'sent') {
      navigate('/login');
    } else if (step === 'reset') {
      setStep('request');
    } else {
      navigate('/login');
    }
  };

  const titleMap: Record<Step, string> = {
    request: '找回密码',
    sent: '邮件已发送',
    reset: '重置密码',
    success: '重置成功',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col bg-white dark:bg-[var(--bg-primary)] overflow-y-auto pb-10 min-h-screen lg:justify-center transition-colors"
    >
      <div className="lg:max-w-md lg:mx-auto lg:w-full lg:bg-white lg:dark:bg-[var(--bg-surface)] lg:rounded-2xl lg:shadow-xl lg:border lg:border-primary/10 lg:dark:border-[var(--border-color)] lg:my-12 transition-colors">
        {/* Top Navigation */}
        <div className="flex items-center px-4 pt-6 pb-2 justify-between sticky top-0 bg-white/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md z-10 lg:rounded-t-2xl transition-colors">
          <button
            onClick={handleBack}
            className="text-slate-900 dark:text-[var(--text-primary)] flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            aria-label="返回"
          >
            <Icon name="arrow_back_ios_new" />
          </button>
          <h2 className="text-slate-900 dark:text-[var(--text-primary)] text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
            {titleMap[step]}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {/* ====== 步骤1：输入用户名 ====== */}
          {step === 'request' && (
            <motion.div
              key="request"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="px-6 pt-12 pb-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 rounded-3xl mb-6">
                  <Icon name="lock_reset" filled className="text-amber-500 text-4xl" />
                </div>
                <h3 className="text-slate-900 dark:text-[var(--text-primary)] text-3xl font-bold leading-tight mb-2">忘记密码？</h3>
                <p className="text-slate-500 dark:text-[var(--text-secondary)] text-sm">请输入您的用户名，我们将发送重置链接</p>
              </div>

              {error && (
                <div className="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-5 px-6 py-2">
                <div className="flex flex-col">
                  <p className="text-slate-800 dark:text-[var(--text-primary)] text-sm font-semibold pb-2 px-1">邮箱</p>
                  <input
                    className="form-input flex w-full rounded-xl border border-slate-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-surface)] text-slate-900 dark:text-[var(--text-primary)] h-14 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all px-4"
                    placeholder="请输入注册时的邮箱地址"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => handleKeyDown(e, handleRequest)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-6 space-y-4">
                <button
                  onClick={handleRequest}
                  disabled={isLoading}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? '发送中...' : '发送重置链接'}
                </button>
                <div className="text-center">
                  <button onClick={() => navigate('/login')} className="text-sm text-slate-500 cursor-pointer">
                    返回登录
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ====== 步骤2：已发送提示 ====== */}
          {step === 'sent' && (
            <motion.div
              key="sent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 pt-16 pb-8 text-center"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-50 rounded-full mb-6">
                <Icon name="mark_email_read" filled className="text-blue-500 text-5xl" />
              </div>
              <h3 className="text-slate-900 dark:text-[var(--text-primary)] text-2xl font-bold leading-tight mb-3">重置链接已发送</h3>
              <p className="text-slate-500 dark:text-[var(--text-secondary)] text-sm mb-2">
                重置链接已发送至 <strong className="text-slate-700 dark:text-[var(--text-primary)]">{email}</strong>，请检查收件箱。
              </p>
              <p className="text-slate-400 text-xs mb-8">请点击邮件中的链接完成密码重置。链接有效期为1小时。</p>
              <div className="space-y-3">
                <button
                  onClick={handleRequest}
                  disabled={isLoading}
                  className="w-full border border-primary text-primary py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {isLoading ? '发送中...' : '重新发送'}
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  返回登录
                </button>
              </div>
            </motion.div>
          )}

          {/* ====== 步骤3：设置新密码（通过邮件链接跳转回来后） ====== */}
          {step === 'reset' && (
            <motion.div
              key="reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="px-6 pt-8 pb-4 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-3xl mb-4">
                  <Icon name="lock_open" filled className="text-green-500 text-4xl" />
                </div>
                <h3 className="text-slate-900 dark:text-[var(--text-primary)] text-2xl font-bold leading-tight mb-2">设置新密码</h3>
                <p className="text-slate-500 dark:text-[var(--text-secondary)] text-sm">请输入您的新密码</p>
              </div>

              {error && (
                <div className="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-5 px-6 py-2">
                <div className="flex flex-col">
                  <p className="text-slate-800 dark:text-[var(--text-primary)] text-sm font-semibold pb-2 px-1">新密码</p>
                  <div className="flex w-full items-stretch rounded-xl border border-slate-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-surface)] overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <input
                      className="form-input flex w-full border-none bg-transparent text-slate-900 dark:text-[var(--text-primary)] h-14 placeholder:text-slate-400 px-4 focus:ring-0"
                      placeholder="至少6位新密码"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      onKeyDown={e => handleKeyDown(e, handleReset)}
                      autoFocus
                    />
                    <button
                      className="flex items-center justify-center px-4 text-slate-400 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={0}
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col">
                  <p className="text-slate-800 dark:text-[var(--text-primary)] text-sm font-semibold pb-2 px-1">确认新密码</p>
                  <input
                    className="form-input flex w-full rounded-xl border border-slate-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-surface)] text-slate-900 dark:text-[var(--text-primary)] h-14 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all px-4"
                    placeholder="再次输入新密码"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => handleKeyDown(e, handleReset)}
                  />
                </div>
              </div>

              <div className="p-6 space-y-4">
                <button
                  onClick={handleReset}
                  disabled={isLoading}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? '重置中...' : '确认重置密码'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ====== 步骤4：成功 ====== */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 pt-16 pb-8 text-center"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-50 rounded-full mb-6">
                <Icon name="check_circle" filled className="text-green-500 text-5xl" />
              </div>
              <h3 className="text-slate-900 dark:text-[var(--text-primary)] text-2xl font-bold leading-tight mb-3">密码重置成功！</h3>
              <p className="text-slate-500 dark:text-[var(--text-secondary)] text-sm mb-8">您的新密码已生效，可以使用新密码重新登录了</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              >
                立即登录
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 bg-amber-100/40 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-40 left-0 w-24 h-24 -ml-12 bg-amber-100/30 rounded-full blur-2xl -z-10 pointer-events-none"></div>
      </div>
    </motion.div>
  );
}
