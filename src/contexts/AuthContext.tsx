import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ACCESS_TOKEN: 'auth_access_token',     // 新：access token
  REFRESH_TOKEN: 'auth_refresh_token',   // 新：refresh token
  TOKEN: 'auth_token',                   // 兼容旧版（逐步废弃）
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

// 获取当前 token（优先 access token，兼容旧 token）
const getToken = (): string | null =>
  localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || localStorage.getItem(STORAGE_KEYS.TOKEN);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentChild, setCurrentChildState] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // 防止并发刷新
  const [isChildMode, setIsChildMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.CHILD_MODE) === 'true';
  });

  // 完整登出：清除所有认证状态
  const handleLogout = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    setUser(null);
    setCurrentChildState(null);
    setIsChildMode(false);
    navigate('/login', { replace: true });
  }, [navigate]);

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

  // 监听 token 过期事件
  useEffect(() => {
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [handleLogout]);

  /**
   * 使用 refresh token 刷新 access token
   * 返回 true 表示成功，false 表示需要重新登录
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) return false; // 防止并发
    setIsRefreshing(true);

    try {
      const rt = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!rt) {
        handleLogout();
        return false;
      }

      const response = await authApi.refreshToken(rt);
      const { accessToken, refreshToken: newRt, user: userData } = response.data;

      // 更新 tokens 和用户信息
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRt);
      // 同步更新到旧的 key 以兼容
      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);

      setUser(userData);
      saveUserToCache(userData);
      restoreChild(userData);

      return true;
    } catch (err) {
      console.error('[Auth] Token 刷新失败:', err);
      handleLogout();
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, handleLogout, restoreChild]);

  // 初始化：优先从缓存恢复，再验证
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // 第一步：立即从缓存恢复 UI
      const cachedUser = loadUserFromCache();
      if (cachedUser) {
        setUser(cachedUser);
        restoreChild(cachedUser);
        setIsLoading(false);
      }

      // 第二步：后台静默验证
      try {
        const response = await authApi.me();
        const userData = response.data;
        setUser(userData);
        saveUserToCache(userData);
        restoreChild(userData);
      } catch (err) {
        // 如果是 token 过期错误，尝试用 refresh token 续签
        if (
          err instanceof Error &&
          (err.message.includes('已过期') || err.message.includes('TOKEN_EXPIRED'))
        ) {
          const refreshed = await refreshToken();
          if (!refreshed && !cachedUser) {
            setIsLoading(false);
          }
        } else if (err instanceof Error && err.message.includes('认证已过期')) {
          handleLogout();
        }
        // 网络错误保留缓存
      } finally {
        if (!cachedUser) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- 仅在挂载时执行一次

  const handleLogin = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    const { accessToken, refreshToken: rt, user: userData } = response.data;

    // 存储双令牌
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, rt);
    localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken); // 兼容

    saveUserToCache(userData);
    setUser(userData);

    if (userData.children.length > 0) {
      setCurrentChildState(userData.children[0]);
      localStorage.setItem(STORAGE_KEYS.CHILD_ID, userData.children[0].id);
    }

    navigate('/', { replace: true });
  };

  const handleRegister = async (data: {
    username: string;
    password: string;
    phone?: string;
    children: Array<{ name: string; age?: number; gender?: string }>;
  }) => {
    const response = await authApi.register(data);
    const { accessToken, refreshToken: rt, user: userData } = response.data;

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, rt);
    localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);

    saveUserToCache(userData);
    setUser(userData);

    if (userData.children.length > 0) {
      setCurrentChildState(userData.children[0]);
      localStorage.setItem(STORAGE_KEYS.CHILD_ID, userData.children[0].id);
    }

    navigate('/', { replace: true });
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
      if (currentChild) {
        const updated = userData.children.find((c: Child) => c.id === currentChild.id);
        if (updated) setCurrentChildState(updated);
      }
    } catch {
      // 忽略刷新错误
    }
  };

  const enableChildMode = async (password: string) => {
    const result = await authApi.verifyPassword(password);
    if (!result.success) throw new Error('密码错误，请重试');
    localStorage.setItem(STORAGE_KEYS.CHILD_MODE, 'true');
    setIsChildMode(true);
  };

  const disableChildMode = async (password: string) => {
    const result = await authApi.verifyPassword(password);
    if (!result.success) throw new Error('密码错误，请重试');
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
