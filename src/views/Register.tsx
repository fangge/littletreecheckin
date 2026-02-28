import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface RegisterProps {
  onBack: () => void;
  onLogin: () => void;
  onRegisterSuccess: () => void;
}

interface ChildForm {
  name: string;
  age: string;
  gender: 'male' | 'female';
}

export default function Register({ onBack, onLogin, onRegisterSuccess }: RegisterProps) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [childForms, setChildForms] = useState<ChildForm[]>([
    { name: '', age: '', gender: 'male' },
  ]);

  const handleAddChild = () => {
    setChildForms(prev => [...prev, { name: '', age: '', gender: 'male' }]);
  };

  const handleRemoveChild = (index: number) => {
    if (childForms.length <= 1) return;
    setChildForms(prev => prev.filter((_, i) => i !== index));
  };

  const handleChildChange = (index: number, field: keyof ChildForm, value: string) => {
    setChildForms(prev => prev.map((child, i) =>
      i === index ? { ...child, [field]: value } : child
    ));
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    if (password.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }

    const validChildren = childForms.filter(c => c.name.trim());
    if (validChildren.length === 0) {
      setError('请至少填写一个孩子的姓名');
      return;
    }

    if (!agreedToTerms) {
      setError('请阅读并同意用户协议和隐私政策');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await register({
        username: username.trim(),
        password,
        children: validChildren.map(c => ({
          name: c.name.trim(),
          age: c.age ? parseInt(c.age) : undefined,
          gender: c.gender,
        })),
      });
      onRegisterSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col bg-white overflow-y-auto pb-10"
    >
      {/* Top Navigation */}
      <div className="flex items-center px-4 pt-6 pb-2 justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button
          onClick={onBack}
          className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="返回"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">家长注册</h2>
      </div>

      {/* Header Content */}
      <div className="px-6 pt-8 pb-4">
        <h3 className="text-slate-900 text-3xl font-bold leading-tight mb-2">创建家长账户</h3>
        <p className="text-slate-500 text-sm">建立一个安全的空间，见证孩子的成长与进步。</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Parent Info Form */}
      <div className="space-y-4 px-6 py-2">
        <div className="flex flex-col">
          <p className="text-slate-800 text-sm font-semibold pb-2 px-1">用户名</p>
          <input
            className="form-input flex w-full rounded-xl border-slate-200 bg-white text-slate-900 h-14 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all px-4"
            placeholder="请输入您的用户名"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            aria-label="用户名"
          />
        </div>
        <div className="flex flex-col">
          <p className="text-slate-800 text-sm font-semibold pb-2 px-1">密码</p>
          <div className="flex w-full items-stretch rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <input
              className="form-input flex w-full border-none bg-transparent text-slate-900 h-14 placeholder:text-slate-400 px-4 focus:ring-0"
              placeholder="请输入您的密码（至少6位）"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
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

      {/* Child Info Management Section */}
      <div className="mt-8 px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-900 text-xl font-bold tracking-tight">孩子信息管理</h2>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">成长记录</span>
        </div>

        {childForms.map((child, index) => (
          <div key={index} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">孩子 {index + 1}</span>
              {childForms.length > 1 && (
                <button
                  className="text-rose-500 hover:text-rose-600 transition-colors"
                  onClick={() => handleRemoveChild(index)}
                  aria-label={`删除孩子${index + 1}`}
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              )}
            </div>
            <div className="space-y-4">
              <input
                className="form-input w-full rounded-xl border-slate-200 bg-white text-slate-900 h-12 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="姓名"
                type="text"
                value={child.name}
                onChange={e => handleChildChange(index, 'name', e.target.value)}
                aria-label={`孩子${index + 1}姓名`}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="form-input w-full rounded-xl border-slate-200 bg-white text-slate-900 h-12 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="年龄"
                  type="number"
                  min="1"
                  max="18"
                  value={child.age}
                  onChange={e => handleChildChange(index, 'age', e.target.value)}
                  aria-label={`孩子${index + 1}年龄`}
                />
                <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
                  <button
                    className={`flex-1 rounded-lg text-xs font-medium py-2 transition-all ${child.gender === 'male' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                    onClick={() => handleChildChange(index, 'gender', 'male')}
                    aria-label="男孩"
                  >
                    男孩
                  </button>
                  <button
                    className={`flex-1 rounded-lg text-xs font-medium py-2 transition-all ${child.gender === 'female' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                    onClick={() => handleChildChange(index, 'gender', 'female')}
                    aria-label="女孩"
                  >
                    女孩
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Child Button */}
        <button
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:border-primary hover:text-primary transition-all group"
          onClick={handleAddChild}
          aria-label="添加另一个孩子"
        >
          <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">add_circle</span>
          <span className="font-semibold text-sm">添加另一个孩子</span>
        </button>
      </div>

      {/* Submit Section */}
      <div className="mt-8 p-6 space-y-4">
        <div className="flex items-start gap-3 px-1">
          <input
            className="mt-1 rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
            id="terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={e => setAgreedToTerms(e.target.checked)}
          />
          <label className="text-xs text-slate-500 leading-normal" htmlFor="terms">
            我已阅读并同意 <a className="text-primary font-medium" href="#">用户协议</a> 和 <a className="text-primary font-medium" href="#">隐私政策</a>
          </label>
        </div>
        <button
          onClick={handleRegister}
          disabled={isLoading}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="立即注册"
        >
          {isLoading ? '注册中...' : '立即注册'}
        </button>
        <div className="text-center">
          <p className="text-sm text-slate-500">
            已经有账户了？{' '}
            <button onClick={onLogin} className="text-primary font-bold">登录</button>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
