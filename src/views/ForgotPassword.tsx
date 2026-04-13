import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { authApi } from '../services/api';

type Step = 'request' | 'reset' | 'success';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 支持通过 URL 参数预填 token（开发调试用）
  const prefillToken = searchParams.get('token') || '';

  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState(prefillToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  // 第一步：发送重置请求
  const handleRequest = async () => {
    if (!identifier.trim()) {
      setError('请输入用户名或手机号');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await authApi.forgotPassword(identifier.trim());

      if ((data as any)._debugToken) {
        setDebugInfo(`开发模式 Token: ${(data as any)._debugToken}`);
      }

      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 第二步：提交新密码
  const handleReset = async () => {
    if (!token.trim()) {
      setError('请输入验证码/Token');
      return;
    }
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
      await authApi.resetPassword(token.trim(), newPassword, confirmPassword);
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
            onClick={() => step === 'success' ? navigate('/login') : step === 'reset' ? setStep('request') : navigate('/login')}
            className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="返回"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
            {step === 'request' && '找回密码'}
            {step === 'reset' && '重置密码'}
            {step === 'success' && '重置成功'}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {/* ====== 步骤1：输入账号 ====== */}
          {step === 'request' && (
            <motion.div
              key="request"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Header */}
              <div className="px-6 pt-12 pb-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 rounded-3xl mb-6">
                  <span className="material-symbols-outlined text-amber-500 text-4xl fill-icon">lock_reset</span>
                </div>
                <h3 className="text-slate-900 text-3xl font-bold leading-tight mb-2">忘记密码？</h3>
                <p className="text-slate-500 text-sm">请输入您的用户名或手机号，我们将发送验证码</p>
              </div>

              {/* Error */}
              {error && (
                <div className="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <div className="space-y-5 px-6 py-2">
                <div className="flex flex-col">
                  <p className="text-slate-800 text-sm font-semibold pb-2 px-1">用户名/手机号</p>
                  <input
                    className="form-input flex w-full rounded-xl border border-slate-200 bg-white text-slate-900 h-14 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all px-4"
                    placeholder="请输入用户名或手机号"
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    onKeyDown={e => handleKeyDown(e, handleRequest)}
                  />
                </div>
              </div>

              <div className="p-6 space-y-4">
                <button
                  onClick={handleRequest}
                  disabled={isLoading}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? '发送中...' : '发送验证码'}
                </button>
                <div className="text-center">
                  <button onClick={() => navigate('/login')} className="text-sm text-slate-500 cursor-pointer">
                    返回登录
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ====== 步骤2：输入 token + 新密码 ====== */}
          {step === 'reset' && (
            <motion.div
              key="reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="px-6 pt-8 pb-4 text-center">
                <h3 className="text-slate-900 text-2xl font-bold leading-tight mb-2">输入验证码</h3>
                <p className="text-slate-500 text-sm">
                  已发送至 <strong>{identifier}</strong>，请查收后输入验证码和新密码
                </p>
              </div>

              {error && (
                <div className="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* 开发模式提示 */}
              {debugInfo && (
                <div className="mx-6 mb-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-mono break-all">
                  {debugInfo}
                </div>
              )}

              <div className="space-y-5 px-6 py-2">
                <div className="flex flex-col">
                  <p className="text-slate-800 text-sm font-semibold pb-2 px-1">验证码 / Token</p>
                  <input
                    className="form-input flex w-full rounded-xl border border-slate-200 bg-white text-slate-900 h-14 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all px-4 font-mono"
                    placeholder="请输入收到的验证码或Token"
                    type="text"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex flex-col">
                  <p className="text-slate-800 text-sm font-semibold pb-2 px-1">新密码</p>
                  <div className="flex w-full items-stretch rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <input
                      className="form-input flex w-full border-none bg-transparent text-slate-900 h-14 placeholder:text-slate-400 px-4 focus:ring-0"
                      placeholder="至少6位新密码"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      onKeyDown={e => handleKeyDown(e, handleReset)}
                    />
                    <button
                      className="flex items-center justify-center px-4 text-slate-400 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={0}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col">
                  <p className="text-slate-800 text-sm font-semibold pb-2 px-1">确认新密码</p>
                  <input
                    className="form-input flex w-full rounded-xl border border-slate-200 bg-white text-slate-900 h-14 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all px-4"
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
                <div className="text-center space-x-4">
                  <button onClick={() => setStep('request')} className="text-sm text-primary font-medium cursor-pointer">
                    重新发送验证码
                  </button>
                  <button onClick={() => navigate('/login')} className="text-sm text-slate-500 cursor-pointer">
                    返回登录
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ====== 步骤3：成功 ====== */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 pt-16 pb-8 text-center"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-50 rounded-full mb-6">
                <span className="material-symbols-outlined text-green-500 text-5xl fill-icon">check_circle</span>
              </div>
              <h3 className="text-slate-900 text-2xl font-bold leading-tight mb-3">密码重置成功！</h3>
              <p className="text-slate-500 text-sm mb-8">您的新密码已生效，可以使用新密码重新登录了</p>
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
