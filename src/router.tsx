import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';
import Dashboard from './views/Dashboard';
import CheckIn from './views/CheckIn';
import Messages from './views/Messages';
import Medals from './views/Medals';
import ParentControl from './views/ParentControl';
import Store from './views/Store';
import FruitsHistory from './views/FruitsHistory';
import GoalSetting from './views/GoalSetting';
import Register from './views/Register';
import Login from './views/Login';
import Profile from './views/Profile';
import RewardsManagement from './views/RewardsManagement';
import ForgotPassword from './views/ForgotPassword';

// 受保护的路由包装器：未登录时重定向到 /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null; // App 层已有 loading UI
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// 公共路由：已登录时重定向到 /
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// 根布局：提供 Auth + Theme 上下文，确保 useNavigate 可用
function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        {children}
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
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tasks',
        element: (
          <ProtectedRoute>
            <CheckIn />
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
        path: 'add-goal',
        element: (
          <ProtectedRoute>
            <GoalSetting />
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
