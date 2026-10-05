import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  authApi,
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  User,
  Child,
  childrenApi,
} from '../services/api';

interface AuthContextType {
  user: User | null;
  currentChild: Child | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isChildMode: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    phone?: string;
    children?: Array<{ name: string; age?: number; gender?: string }>;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentChild: (child: Child) => void;
  refreshUser: () => Promise<void>;
  enableChildMode: (password: string) => Promise<void>;
  disableChildMode: (password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  addChildren: (children: Array<{ name: string; age?: number; gender?: string }>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEYS = {
  CHILD_ID: 'current_child_id',
  CHILD_MODE: 'child_mode',
} as const;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentChild, setCurrentChildState] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isChildMode, setIsChildMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.CHILD_MODE) === 'true';
  });

  const restoreChild = useCallback((userData: User) => {
    const savedChildId = localStorage.getItem(STORAGE_KEYS.CHILD_ID);
    const savedChild = userData.children?.find(child => child.id === savedChildId);
    if (savedChild) {
      setCurrentChildState(savedChild);
    } else if (userData.children?.length > 0) {
      setCurrentChildState(userData.children[0]);
      localStorage.setItem(STORAGE_KEYS.CHILD_ID, userData.children[0].id);
    } else {
      setCurrentChildState(null);
      localStorage.removeItem(STORAGE_KEYS.CHILD_ID);
    }
  }, []);

  const applyAuthPayload = useCallback((payload: { access_token: string; refresh_token: string; user: User; must_change_password: boolean }) => {
    setAuthTokens(payload);
    setUser(payload.user);
    setMustChangePassword(payload.must_change_password);
    restoreChild(payload.user);
  }, [restoreChild]);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      if (!getAccessToken() && !getRefreshToken()) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const response = await authApi.me();
        if (active) {
          setUser(response.data);
          setMustChangePassword(Boolean(response.must_change_password));
          restoreChild(response.data);
        }
      } catch {
        clearAuthTokens();
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void restoreSession();
    return () => {
      active = false;
    };
  }, [restoreChild]);

  const handleLogin = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    applyAuthPayload(response.data);
    navigate('/', { replace: true });
  };

  const handleRegister = async (data: {
    email: string;
    username: string;
    password: string;
    phone?: string;
    children?: Array<{ name: string; age?: number; gender?: string }>;
  }) => {
    const response = await authApi.register(data);
    applyAuthPayload(response.data);
  };

  const clearAuthState = useCallback(() => {
    clearAuthTokens();
    setUser(null);
    setCurrentChildState(null);
    setMustChangePassword(false);
    setIsChildMode(false);
    localStorage.removeItem(STORAGE_KEYS.CHILD_ID);
    localStorage.removeItem(STORAGE_KEYS.CHILD_MODE);
  }, []);

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken && getAccessToken()) await authApi.logout(refreshToken);
    } finally {
      clearAuthState();
      navigate('/login', { replace: true });
    }
  };

  const handleSetCurrentChild = (child: Child) => {
    setCurrentChildState(child);
    localStorage.setItem(STORAGE_KEYS.CHILD_ID, child.id);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.me();
      setUser(response.data);
      setMustChangePassword(Boolean(response.must_change_password));
      restoreChild(response.data);
    } catch {
      // 请求层负责清理失效 token；页面保持当前状态直到路由重新判断。
    }
  };

  const verifyCurrentPassword = async (password: string) => {
    if (!getAccessToken() && !getRefreshToken()) throw new Error('未登录');
    try {
      await authApi.verifyPassword(password);
    } catch {
      throw new Error('密码错误，请重试');
    }
  };

  const enableChildMode = async (password: string) => {
    await verifyCurrentPassword(password);
    localStorage.setItem(STORAGE_KEYS.CHILD_MODE, 'true');
    setIsChildMode(true);
  };

  const disableChildMode = async (password: string) => {
    await verifyCurrentPassword(password);
    localStorage.removeItem(STORAGE_KEYS.CHILD_MODE);
    setIsChildMode(false);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authApi.changePassword(currentPassword, newPassword);
    setMustChangePassword(false);
  };

  const handleAddChildren = async (childrenData: Array<{ name: string; age?: number; gender?: string }>) => {
    if (!user) throw new Error('未登录');
    const addedChildren: Child[] = [];
    for (const child of childrenData) {
      const result = await childrenApi.add(user.id, child);
      addedChildren.push(result.data);
    }
    await refreshUser();
    if (addedChildren.length > 0) handleSetCurrentChild(addedChildren[0]);
  };

  return (
    <AuthContext.Provider value={{
      user,
      currentChild,
      isLoading,
      isAuthenticated: !!user,
      isChildMode,
      mustChangePassword,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      setCurrentChild: handleSetCurrentChild,
      refreshUser,
      enableChildMode,
      disableChildMode,
      changePassword,
      addChildren: handleAddChildren,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
