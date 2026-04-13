/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import ChildModeBanner from './components/ChildModeBanner';
import TodayProgressModal from './components/TodayProgressModal';
import UpdatePrompt from './components/UpdatePrompt';

// 儿童模式下受限的路径列表
const CHILD_MODE_RESTRICTED_PATHS = ['/parent-control', '/add-goal', '/rewards-management'];

export default function App() {
  const { isAuthenticated, isChildMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 路由守卫：儿童模式下访问受限页面时重定向到首页
  useEffect(() => {
    if (
      isAuthenticated &&
      isChildMode &&
      CHILD_MODE_RESTRICTED_PATHS.some(path => location.pathname.startsWith(path))
    ) {
      navigate('/', { replace: true });
    }
  }, [isChildMode, location.pathname, navigate, isAuthenticated]);

  // 初始化时，未登录且不在登录页 → 跳转登录页（作为额外保障）
  const handleAuthRedirect = useCallback(() => {
    if (!isAuthenticated && !['/login', '/register', '/forgot-password'].includes(location.pathname)) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    handleAuthRedirect();
  }, [handleAuthRedirect]);

  // 判断是否显示导航栏：排除特定页面 + 需要认证
  const showNav =
    isAuthenticated &&
    !['/login', '/register', '/add-goal'].includes(location.pathname) &&
    !location.pathname.startsWith('/login');

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-background-light dark:bg-[var(--bg-primary)] lg:flex-row transition-colors">
      {showNav && <Navigation />}
      <div className={`flex flex-1 flex-col${showNav ? ' lg:ml-60' : ''}`}>
        {isAuthenticated && <ChildModeBanner />}
        {/* 渲染子路由 */}
        <Outlet />
      </div>
      {/* 今日任务进度弹层 */}
      <TodayProgressModal />
      {/* PWA 更新提示 */}
      <UpdatePrompt />
    </div>
  );
}
