import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PendingTasksProvider } from './contexts/PendingTasksContext';
import App from './App';

// bundle-dynamic-imports: 路由级代码分割
// 每个页面组件按需加载，首屏只加载当前路由所需的代码
const Dashboard = lazy(() => import('./views/Dashboard'));
const CheckIn = lazy(() => import('./views/CheckIn'));
const Messages = lazy(() => import('./views/Messages'));
const Medals = lazy(() => import('./views/Medals'));
const ParentControl = lazy(() => import('./views/ParentControl'));
const Store = lazy(() => import('./views/Store'));
const FruitsHistory = lazy(() => import('./views/FruitsHistory'));
const RedemptionHistory = lazy(() => import('./views/RedemptionHistory'));
const GoalSetting = lazy(() => import('./views/GoalSetting'));
const SharedTaskSummary = lazy(() => import('./views/SharedTaskSummary'));
const Register = lazy(() => import('./views/Register'));
const Login = lazy(() => import('./views/Login'));
const Profile = lazy(() => import('./views/Profile'));
const RewardsManagement = lazy(() => import('./views/RewardsManagement'));
const MedalManagement = lazy(() => import('./views/MedalManagement'));
const ForgotPassword = lazy(() => import('./views/ForgotPassword'));

// 加载中的占位组件
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-[var(--bg-primary)]">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="text-gray-600 dark:text-gray-400">加载中...</p>
      </div>
    </div>
  );
}

// 路由级 Suspense 包装器
function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

// 受保护的路由包装器：未登录时重定向到 /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <SuspenseWrapper>{children}</SuspenseWrapper>;
}

// 公共路由：已登录时重定向到 /
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <SuspenseWrapper>{children}</SuspenseWrapper>;
}

// 根布局：提供 Auth + Theme + PendingTasks 上下文，确保 useNavigate 可用
function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PendingTasksProvider>
          {children}
        </PendingTasksProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RootLayout>
        <App />
      </RootLayout>
    ),
    children: [
      // 需要认证的路由
      {
        index: true,
        element: (
          <ProtectedRoute>
            <CheckIn />
          </ProtectedRoute>
        ),
      },
      {
        path: 'forest',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'messages',
        element: (
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        ),
      },
      {
        path: 'medals',
        element: (
          <ProtectedRoute>
            <Medals />
          </ProtectedRoute>
        ),
      },
      {
        path: 'store',
        element: (
          <ProtectedRoute>
            <Store />
          </ProtectedRoute>
        ),
      },
      {
        path: 'store/fruits-history',
        element: (
          <ProtectedRoute>
            <FruitsHistory />
          </ProtectedRoute>
        ),
      },
      {
        path: 'store/redemption-history',
        element: (
          <ProtectedRoute>
            <RedemptionHistory />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'parent-control',
        element: (
          <ProtectedRoute>
            <ParentControl />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rewards-management',
        element: (
          <ProtectedRoute>
            <RewardsManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'medals/manage',
        element: (
          <ProtectedRoute>
            <MedalManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'add-goal',
        element: (
          <ProtectedRoute>
            <GoalSetting />
          </ProtectedRoute>
        ),
      },
      {
        path: 'shared-task/:goalId',
        element: (
          <ProtectedRoute>
            <SharedTaskSummary />
          </ProtectedRoute>
        ),
      },
      // 公开路由
      {
        path: 'login',
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      // 密码找回（公开）
      {
        path: 'forgot-password',
        element: (
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        ),
      },
      // 404 兜底 → 回首页
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;
