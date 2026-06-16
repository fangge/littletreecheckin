import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

import Icon from '../components/Icon';
const REMEMBER_KEY = 'login_remember_credentials';

const loadSavedEmail = (): string => {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    // 兼容旧格式（含 password 字段）和新格式（只含 email）
    return parsed?.email || '';
  } catch {
    return '';
  }
};

const saveEmail = (email: string) => {
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
};

const clearSavedEmail = () => {
  localStorage.removeItem(REMEMBER_KEY);
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // 初始化：如果有记住的邮箱，自动填充
  useEffect(() => {
    const savedEmail = loadSavedEmail();
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(email.trim(), password);
      // 登录成功后根据是否勾选"记住我"来决定是否保存邮箱
      if (rememberMe) {
        saveEmail(email.trim());
      } else {
        clearSavedEmail();
      }
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
          <Icon name="arrow_back_ios_new" />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">家长登录</h2>
      </div>

      {/* Header Content */}
      <div className="px-6 pt-12 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6">
          <Icon name="forest" filled className="text-primary text-4xl" />
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
          <p className="text-slate-800 text-sm font-semibold pb-2 px-1">邮箱</p>
          <div className="relative">
            <input
              className="form-input flex w-full rounded-xl border border-slate-200 bg-white text-slate-900 h-14 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all px-4"
              placeholder="请输入您的邮箱地址"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="邮箱"
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
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
            </button>
          </div>
        </div>
        </div>

        {/* 记住登录信息 */}
        <div className="px-6 flex items-center -mt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer"
            />
            <span className="text-sm text-slate-600">记住邮箱</span>
          </label>
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
            <button onClick={() => navigate('/register')} className="text-primary font-bold">免费创建，30秒开始培养好习惯</button>
          </p>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-40 left-0 w-24 h-24 -ml-12 bg-primary/5 rounded-full blur-2xl -z-10"></div>
      </div>
    </motion.div>
  );
}
