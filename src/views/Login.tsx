import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(username.trim(), password);
      // 登录成功后 AuthContext 会自动导航到首页
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
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
          onClick={() => navigate('/')}
          className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="返回"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">家长登录</h2>
      </div>

      {/* Header Content */}
      <div className="px-6 pt-12 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6">
          <span className="material-symbols-outlined text-primary text-4xl fill-icon">forest</span>
        </div>
        <h3 className="text-slate-900 text-3xl font-bold leading-tight mb-2">欢迎回来</h3>
        <p className="text-slate-500 text-sm">登录账户，继续记录孩子的成长点滴</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Login Form */}
      <div className="space-y-5 px-6 py-2">
        <div className="flex flex-col">
          <p className="text-slate-800 text-sm font-semibold pb-2 px-1">用户名/手机号</p>
          <div className="relative">
            <input
              className="form-input flex w-full rounded-xl border border-slate-200 bg-white text-slate-900 h-14 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all px-4"
              placeholder="请输入您的用户名或手机号"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="用户名或手机号"
            />
          </div>
        </div>
        <div className="flex flex-col">
          <p className="text-slate-800 text-sm font-semibold pb-2 px-1">密码</p>
          <div className="flex w-full items-stretch rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <input
              className="form-input flex w-full border-none bg-transparent text-slate-900 h-14 placeholder:text-slate-400 px-4 focus:ring-0"
              placeholder="请输入您的密码"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="密码"
            />
            <button
              className="flex items-center justify-center px-4 text-slate-400 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
              tabIndex={0}
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
        </div>

        {/* 忘记密码 */}
        <div className="px-6 flex justify-end -mt-1">
          <button
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-primary font-medium cursor-pointer"
          >
            忘记密码？
          </button>
        </div>

      {/* Submit Section */}
      <div className="p-6 space-y-6">
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="立即登录"
        >
          {isLoading ? '登录中...' : '立即登录'}
        </button>
        <div className="text-center">
          <p className="text-sm text-slate-500">
            还没有账户？{' '}
            <button onClick={() => navigate('/register')} className="text-primary font-bold">新用户注册</button>
          </p>
        </div>

        {/* Third Party Login */}
        {/* <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-slate-400">第三方登录</span>
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-transform active:scale-90" aria-label="微信登录">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M8.22,12.18c0,0,0,0,0,0c-0.21,0-0.42-0.01-0.63-0.03C7.02,12,6.5,11.75,6.1,11.33c-0.41-0.44-0.61-1-0.61-1.6 c0-0.63,0.22-1.2,0.66-1.63c0.44-0.44,1-0.66,1.64-0.66c0.63,0,1.2,0.22,1.63,0.65c0.44,0.44,0.66,1.01,0.66,1.64 c0,0.63-0.22,1.2-0.66,1.63C9.4,12.01,8.83,12.18,8.22,12.18z M15.78,12.18c-0.63,0-1.2-0.22-1.63-0.65 c-0.44-0.44-0.66-1.01-0.66-1.64c0-0.63,0.22-1.2,0.66-1.63s1.01-0.65,1.63-0.65s1.2,0.22,1.64,0.66c0.44,0.44,0.66,1,0.66,1.63 c0,0.6-0.2,1.16-0.61,1.6c-0.4,0.42-0.92,0.67-1.49,0.82C15.9,12.17,15.84,12.18,15.78,12.18z M12,2C6.48,2,2,5.58,2,10 c0,2.4,1.31,4.52,3.35,5.92c-0.1,0.36-0.38,1.3-0.38,1.3l-0.11,0.42c-0.02,0.11,0,0.2,0.06,0.26s0.14,0.1,0.24,0.08 c0.1-0.02,1.16-0.34,2.37-1.1c0.82,0.23,1.68,0.35,2.58,0.35c0.35,0,0.7-0.02,1.04-0.05c-0.13-0.34-0.21-0.7-0.21-1.07 c0-1.66,1.35-3,3-3c0.64,0,1.22,0.2,1.72,0.54C16.59,10.66,17.92,10,19.33,10c0.38,0,0.74,0.05,1.08,0.15C20.3,5.64,16.58,2,12,2z M21.5,14c-1.38,0-2.5,1.12-2.5,2.5s1.12,2.5,2.5,2.5s2.5-1.12,2.5-2.5S22.88,14,21.5,14z"></path>
            </svg>
          </button>
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 text-slate-800 transition-transform active:scale-90" aria-label="手机号登录">
            <span className="material-symbols-outlined text-2xl">smartphone</span>
          </button>
        </div> */}
      </div>

      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-40 left-0 w-24 h-24 -ml-12 bg-primary/5 rounded-full blur-2xl -z-10"></div>
      </div>
    </motion.div>
  );
}
