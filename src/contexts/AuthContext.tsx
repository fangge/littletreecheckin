import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, User, Child } from '../services/api';

interface AuthContextType {
  user: User | null;
  currentChild: Child | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isChildMode: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    password: string;
    phone?: string;
    children: Array<{ name: string; age?: number; gender?: string }>;
  }) => Promise<void>;
  logout: () => void;
  setCurrentChild: (child: Child) => void;
  refreshUser: () => Promise<void>;
  enableChildMode: (password: string) => Promise<void>;
  disableChildMode: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  CHILD_ID: 'current_child_id',
  CHILD_MODE: 'child_mode',
} as const;

const saveUserToCache = (userData: User) => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
};

const loadUserFromCache = (): User | null => {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.USER);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentChild, setCurrentChildState] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChildMode, setIsChildMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.CHILD_MODE) === 'true';
  });

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.CHILD_ID);
    localStorage.removeItem(STORAGE_KEYS.CHILD_MODE);
    setUser(null);
    setCurrentChildState(null);
    setIsChildMode(false);
  }, []);

  const restoreChild = useCallback((userData: User) => {
    const savedChildId = localStorage.getItem(STORAGE_KEYS.CHILD_ID);
    const savedChild = userData.children?.find(c => c.id === savedChildId);
    if (savedChild) {
      setCurrentChildState(savedChild);
    } else if (userData.children?.length > 0) {
      setCurrentChildState(userData.children[0]);
      localStorage.setItem(STORAGE_KEYS.CHILD_ID, userData.children[0].id);
    }
  }, []);

  // 监听 token 过期事件（401 响应）
  useEffect(() => {
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [handleLogout]);

  // 初始化：优先从缓存恢复，再从服务器验证
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) {
        setIsLoading(false);
        return;
      }

      // 第一步：立即从缓存恢复用户信息，避免白屏
      const cachedUser = loadUserFromCache();
      if (cachedUser) {
        setUser(cachedUser);
        restoreChild(cachedUser);
        setIsLoading(false); // 先结束 loading，让页面可以显示
      }

      // 第二步：后台静默验证 token 并刷新用户数据
      try {
        const response = await authApi.me();
        const userData = response.data;
        setUser(userData);
        saveUserToCache(userData);
        restoreChild(userData);
      } catch (err) {
        // 只有 401（token 无效/过期）才清除登录状态
        // 网络错误等情况保留缓存，允许离线浏览
        if (err instanceof Error && err.message.includes('认证已过期')) {
          handleLogout();
        }
        // 其他错误（网络不可用等）：保留缓存的用户信息，不强制退出
      } finally {
        if (!cachedUser) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
  }, [handleLogout, restoreChild]);

  const handleLogin = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    const { token, user: userData } = response.data;

    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    saveUserToCache(userData);
    setUser(userData);

    if (userData.children.length > 0) {
      setCurrentChildState(userData.children[0]);
      localStorage.setItem(STORAGE_KEYS.CHILD_ID, userData.children[0].id);
    }
  };

  const handleRegister = async (data: {
    username: string;
    password: string;
    phone?: string;
    children: Array<{ name: string; age?: number; gender?: string }>;
  }) => {
    const response = await authApi.register(data);
    const { token, user: userData } = response.data;

    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    saveUserToCache(userData);
    setUser(userData);

    if (userData.children.length > 0) {
      setCurrentChildState(userData.children[0]);
      localStorage.setItem(STORAGE_KEYS.CHILD_ID, userData.children[0].id);
    }
  };

  const handleSetCurrentChild = (child: Child) => {
    setCurrentChildState(child);
    localStorage.setItem(STORAGE_KEYS.CHILD_ID, child.id);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.me();
      const userData = response.data;
      setUser(userData);
      saveUserToCache(userData);
      // 更新当前孩子的最新数据（如果当前孩子存在）
      if (currentChild) {
        const updated = userData.children.find(c => c.id === currentChild.id);
        if (updated) setCurrentChildState(updated);
      }
    } catch {
      // 忽略刷新错误
    }
  };

  const enableChildMode = async (password: string) => {
    const result = await authApi.verifyPassword(password);
    if (!result.success) {
      throw new Error('密码错误，请重试');
    }
    localStorage.setItem(STORAGE_KEYS.CHILD_MODE, 'true');
    setIsChildMode(true);
  };

  const disableChildMode = async (password: string) => {
    const result = await authApi.verifyPassword(password);
    if (!result.success) {
      throw new Error('密码错误，请重试');
    }
    localStorage.removeItem(STORAGE_KEYS.CHILD_MODE);
    setIsChildMode(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      currentChild,
      isLoading,
      isAuthenticated: !!user,
      isChildMode,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      setCurrentChild: handleSetCurrentChild,
      refreshUser,
      enableChildMode,
      disableChildMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};