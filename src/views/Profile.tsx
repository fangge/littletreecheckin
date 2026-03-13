import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { childrenApi, authApi, Child } from '../services/api';
import PasswordConfirmModal from '../components/PasswordConfirmModal';

interface ProfileProps {
  onBack: () => void;
  onLogout: () => void;
  onViewParentControl: () => void;
  onViewRewardsManagement: () => void;
}

interface AddChildForm {
  name: string;
  age: string;
  gender: 'male' | 'female';
}

export default function Profile({ onBack, onLogout, onViewParentControl, onViewRewardsManagement }: ProfileProps) {
  const { user, currentChild, setCurrentChild, logout, isChildMode, enableChildMode, disableChildMode } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddChildForm>({ name: '', age: '', gender: 'male' });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // 儿童模式弹窗状态
  const [showChildModeModal, setShowChildModeModal] = useState(false);
  const [childModeLoading, setChildModeLoading] = useState(false);
  const [childModeError, setChildModeError] = useState('');

  // 修改密码弹窗状态
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 实时验证密码
  const validatePassword = (field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) => {
    const errors = { ...passwordErrors };
    
    if (field === 'currentPassword') {
      errors.currentPassword = value.length === 0 ? '请输入当前密码' : '';
    } else if (field === 'newPassword') {
      if (value.length === 0) {
        errors.newPassword = '请输入新密码';
      } else if (value.length < 6) {
        errors.newPassword = '新密码至少6位';
      } else if (value === passwordForm.currentPassword) {
        errors.newPassword = '新密码不能与当前密码相同';
      } else {
        errors.newPassword = '';
      }
    } else if (field === 'confirmPassword') {
      if (value.length === 0) {
        errors.confirmPassword = '请再次输入新密码';
      } else if (value !== passwordForm.newPassword) {
        errors.confirmPassword = '两次输入的密码不一致';
      } else {
        errors.confirmPassword = '';
      }
    }
    
    setPasswordErrors(errors);
  };

  const handlePasswordChange = (field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    validatePassword(field, value);
  };

  const handleSubmitPassword = async () => {
    // 验证所有字段
    const errors = {
      currentPassword: passwordForm.currentPassword ? '' : '请输入当前密码',
      newPassword: passwordForm.newPassword.length < 6 ? '新密码至少6位' : 
                   passwordForm.newPassword === passwordForm.currentPassword ? '新密码不能与当前密码相同' : '',
      confirmPassword: passwordForm.confirmPassword !== passwordForm.newPassword ? '两次输入的密码不一致' : '',
    };
    setPasswordErrors(errors);

    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) {
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '密码修改失败';
      if (errorMessage.includes('当前密码错误')) {
        setPasswordErrors({ currentPassword: '当前密码错误' });
      } else if (errorMessage.includes('新密码')) {
        setPasswordErrors({ newPassword: errorMessage });
      } else {
        setPasswordErrors({ currentPassword: errorMessage });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
    onLogout();
  };

  const handleChildModeToggleClick = () => {
    setChildModeError('');
    setShowChildModeModal(true);
  };

  const handleChildModeConfirm = async (password: string) => {
    setChildModeLoading(true);
    setChildModeError('');
    try {
      if (isChildMode) {
        await disableChildMode(password);
      } else {
        await enableChildMode(password);
      }
      setShowChildModeModal(false);
    } catch (err) {
      setChildModeError(err instanceof Error ? err.message : '验证失败，请重试');
    } finally {
      setChildModeLoading(false);
    }
  };

  const handleChildModeCancel = () => {
    setShowChildModeModal(false);
    setChildModeError('');
  };

  const handleSwitchChild = (child: Child) => setCurrentChild(child);

  const handleDeleteChild = async (childId: string) => {
    if (!user) return;
    if (!confirm('确定要删除这个孩子的信息吗？此操作不可恢复。')) return;
    try {
      await childrenApi.delete(user.id, childId);
      // 刷新用户数据
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleAddChild = async () => {
    if (!user) return;
    if (!addForm.name.trim()) { setAddError('请输入孩子姓名'); return; }
    setIsAdding(true);
    setAddError('');
    try {
      await childrenApi.add(user.id, {
        name: addForm.name.trim(),
        age: addForm.age ? parseInt(addForm.age) : undefined,
        gender: addForm.gender,
      });
      // 刷新用户数据
      window.location.reload();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '添加失败，请重试');
      setIsAdding(false);
    }
  };

  const genderLabel = (gender?: string) => gender === 'male' ? '男孩' : gender === 'female' ? '女孩' : '';
  const genderIcon = (gender?: string) => gender === 'female' ? 'face_3' : 'face';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col bg-background-light min-h-screen overflow-x-hidden pb-32 lg:pb-8"
    >
      <div className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-10 border-b border-primary/10 lg:max-w-2xl lg:mx-auto lg:w-full">
        <button onClick={onBack} className="text-slate-900 flex size-12 shrink-0 items-center justify-center cursor-pointer" aria-label="返回">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">个人管理中心</h2>
      </div>

      {/* 用户信息头部 */}
      <div className="flex p-6 lg:max-w-2xl lg:mx-auto lg:w-full">
        <div className="flex w-full flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div className="size-20 rounded-full border-4 border-primary/20 bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-4xl">person</span>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-[20px] font-bold leading-tight">{user?.username || '家长'}</p>
              <p className="text-primary font-medium text-sm">管理您的家庭与账户信息</p>
              {user?.phone && <p className="text-slate-400 text-xs mt-0.5">{user.phone}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 flex-grow lg:max-w-2xl lg:mx-auto lg:w-full">
        {/* 家长审核入口（儿童模式下隐藏） */}
        {!isChildMode && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/5">
            <h3 className="text-slate-900 text-base font-bold leading-tight mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">shield_person</span>
              家长审核
            </h3>
            <button onClick={onViewParentControl} className="w-full flex items-center justify-between py-2 hover:bg-slate-50 transition-colors rounded-lg px-2" aria-label="进入待审核任务">
              <p className="text-slate-600 text-sm">进入待审核任务</p>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        )}

        {/* 奖品与兑换管理入口（儿童模式下隐藏） */}
        {!isChildMode && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/5">
            <h3 className="text-slate-900 text-base font-bold leading-tight mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">redeem</span>
              奖品与兑换
            </h3>
            <button onClick={onViewRewardsManagement} className="w-full flex items-center justify-between py-2 hover:bg-slate-50 transition-colors rounded-lg px-2" aria-label="管理奖品和兑换记录">
              <p className="text-slate-600 text-sm">管理奖品 · 查看兑换记录</p>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        )}

        {/* 账户设置 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/5">
          <h3 className="text-slate-900 text-base font-bold leading-tight mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">settings</span>
            账户设置
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-background-light">
              <p className="text-slate-600 text-sm">用户名</p>
              <p className="text-slate-900 text-sm font-medium">{user?.username || '--'}</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between py-2 hover:bg-slate-50 transition-colors rounded-lg px-2"
              aria-label="修改密码"
            >
              <p className="text-slate-600 text-sm">修改密码</p>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </div>

        {/* 儿童模式切换 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/5">
          <h3 className="text-slate-900 text-base font-bold leading-tight mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-sm">child_care</span>
            儿童模式
          </h3>
          <div className="flex items-center justify-between py-2">
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-slate-600 text-sm">
                {isChildMode ? '儿童模式已开启' : '儿童模式已关闭'}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {isChildMode
                  ? '已隐藏任务编辑、目标添加和家长中心功能'
                  : '开启后将隐藏编辑和家长管理功能，需密码验证'}
              </p>
            </div>
            <button
              onClick={handleChildModeToggleClick}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                isChildMode
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
              aria-label={isChildMode ? '关闭儿童模式' : '开启儿童模式'}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleChildModeToggleClick()}
            >
              <span className="material-symbols-outlined text-sm">
                {isChildMode ? 'lock_open' : 'lock'}
              </span>
              {isChildMode ? '关闭' : '开启'}
            </button>
          </div>
        </div>

        {/* 孩子信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900 text-base font-bold leading-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">child_care</span>
              孩子信息
            </h3>
            <button className="text-primary text-sm font-bold flex items-center gap-1 hover:text-primary/80 transition-colors" onClick={() => setShowAddForm(v => !v)} aria-label="添加孩子">
              <span className="material-symbols-outlined text-sm">{showAddForm ? 'remove_circle' : 'add_circle'}</span>
              {showAddForm ? '取消' : '添加'}
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-primary/5 rounded-xl p-4 mb-4 space-y-3 border border-primary/10">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">新增孩子</p>
                  {addError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>}
                  <input className="form-input w-full rounded-xl border-slate-200 bg-white text-slate-900 h-11 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary px-3" placeholder="孩子姓名 *" type="text" value={addForm.name} onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))} aria-label="孩子姓名" />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="form-input w-full rounded-xl border-slate-200 bg-white text-slate-900 h-11 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary px-3" placeholder="年龄（可选）" type="number" min="1" max="18" value={addForm.age} onChange={e => setAddForm(prev => ({ ...prev, age: e.target.value }))} aria-label="孩子年龄" />
                    <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
                      <button className={`flex-1 rounded-lg text-xs font-medium py-2 transition-all ${addForm.gender === 'male' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setAddForm(prev => ({ ...prev, gender: 'male' }))}>男孩</button>
                      <button className={`flex-1 rounded-lg text-xs font-medium py-2 transition-all ${addForm.gender === 'female' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setAddForm(prev => ({ ...prev, gender: 'female' }))}>女孩</button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-all active:scale-[0.98]" onClick={handleAddChild} disabled={isAdding} aria-label="确认添加">{isAdding ? '添加中...' : '确认添加'}</button>
                    <button className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all" onClick={() => { setShowAddForm(false); setAddForm({ name: '', age: '', gender: 'male' }); setAddError(''); }} aria-label="取消">取消</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!user?.children || user.children.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">暂无孩子信息，点击上方"添加"按钮添加</p>
          ) : (
            <div className="space-y-3">
              {user.children.map(child => (
                <div key={child.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${currentChild?.id === child.id ? 'bg-primary/10 border border-primary/30' : 'bg-background-light hover:bg-primary/5'}`} onClick={() => handleSwitchChild(child)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSwitchChild(child)} aria-label={`切换到${child.name}`}>
                  <div className={`size-10 rounded-full flex items-center justify-center ${currentChild?.id === child.id ? 'bg-primary/30' : 'bg-primary/20'}`}>
                    <span className="material-symbols-outlined text-primary">{genderIcon(child.gender)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 text-sm font-bold">{child.name}</p>
                      {currentChild?.id === child.id && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-bold">当前</span>}
                    </div>
                    <p className="text-slate-500 text-xs">
                      {child.age ? `${child.age}岁` : ''}{child.age && child.gender ? ' • ' : ''}{genderLabel(child.gender)}{(child.age || child.gender) ? ' • ' : ''}🍎 {child.fruits_balance} 果实
                    </p>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" onClick={() => handleDeleteChild(child.id)} aria-label={`删除${child.name}`}>
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <button onClick={handleLogout} disabled={isLoggingOut} className="w-full mt-4 text-red-400 text-sm font-medium py-3 border border-red-100 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50" aria-label="退出登录">
          {isLoggingOut ? '退出中...' : '退出登录'}
        </button>
      </div>

      <PasswordConfirmModal
        isOpen={showChildModeModal}
        title={isChildMode ? '关闭儿童模式' : '开启儿童模式'}
        description={
          isChildMode
            ? '请输入账户登录密码以关闭儿童模式，恢复完整功能'
            : '请输入账户登录密码以开启儿童模式，开启后将隐藏编辑和家长管理功能'
        }
        confirmLabel={isChildMode ? '关闭儿童模式' : '开启儿童模式'}
        isLoading={childModeLoading}
        error={childModeError}
        onConfirm={handleChildModeConfirm}
        onCancel={handleChildModeCancel}
      />

      {/* 修改密码弹窗 */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => { if (!isChangingPassword) setShowPasswordModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {passwordSuccess ? (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-2">密码修改成功</h3>
                  <p className="text-slate-600 text-sm">请使用新密码重新登录</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-4 text-center">修改密码</h3>
                  <div className="space-y-4">
                    <div>
                      <input
                        type="password"
                        placeholder="当前密码"
                        className={`w-full h-11 px-3 rounded-xl border text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                          passwordErrors.currentPassword
                            ? 'border-red-300 focus:ring-red-200'
                            : 'border-slate-200 focus:border-primary focus:ring-primary/20'
                        }`}
                        value={passwordForm.currentPassword}
                        onChange={e => handlePasswordChange('currentPassword', e.target.value)}
                        disabled={isChangingPassword}
                      />
                      {passwordErrors.currentPassword && (
                        <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="新密码（至少6位）"
                        className={`w-full h-11 px-3 rounded-xl border text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                          passwordErrors.newPassword
                            ? 'border-red-300 focus:ring-red-200'
                            : 'border-slate-200 focus:border-primary focus:ring-primary/20'
                        }`}
                        value={passwordForm.newPassword}
                        onChange={e => handlePasswordChange('newPassword', e.target.value)}
                        disabled={isChangingPassword}
                      />
                      {passwordErrors.newPassword && (
                        <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="确认新密码"
                        className={`w-full h-11 px-3 rounded-xl border text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                          passwordErrors.confirmPassword
                            ? 'border-red-300 focus:ring-red-200'
                            : 'border-slate-200 focus:border-primary focus:ring-primary/20'
                        }`}
                        value={passwordForm.confirmPassword}
                        onChange={e => handlePasswordChange('confirmPassword', e.target.value)}
                        disabled={isChangingPassword}
                      />
                      {passwordErrors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => { setShowPasswordModal(false); setPasswordErrors({}); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                      disabled={isChangingPassword}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSubmitPassword}
                      className="flex-1 py-3 bg-primary text-slate-900 font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? '修改中...' : '确认修改'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
