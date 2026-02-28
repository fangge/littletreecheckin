import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, User, Child } from '../services/api';

interface AuthContextType {
  user: User | null;
  currentChild: Child | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentChild, setCurrentChild] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('current_child_id');
    setUser(null);
    setCurrentChild(null);
  }, []);

  // 监听 token 过期事件
  useEffect(() => {
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [handleLogout]);

  // 初始化：从 localStorage 恢复登录状态
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.me();
        const userData = response.data;
        setUser(userData);

        // 恢复上次选择的孩子
        const savedChildId = localStorage.getItem('current_child_id');
        const savedChild = userData.children.find(c => c.id === savedChildId);
        if (savedChild) {
          setCurrentChild(savedChild);
        } else if (userData.children.length > 0) {
          setCurrentChild(userData.children[0]);
          localStorage.setItem('current_child_id', userData.children[0].id);
        }
      } catch {
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [handleLogout]);

  const handleLogin = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    const { token, user: userData } = response.data;

    localStorage.setItem('auth_token', token);
    setUser(userData);

    if (userData.children.length > 0) {
      setCurrentChild(userData.children[0]);
      localStorage.setItem('current_child_id', userData.children[0].id);
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

    localStorage.setItem('auth_token', token);
    setUser(userData);

    if (userData.children.length > 0) {
      setCurrentChild(userData.children[0]);
      localStorage.setItem('current_child_id', userData.children[0].id);
    }
  };

  const handleSetCurrentChild = (child: Child) => {
    setCurrentChild(child);
    localStorage.setItem('current_child_id', child.id);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.me();
      setUser(response.data);
      // 更新当前孩子的果实余额
      if (currentChild) {
        const updated = response.data.children.find(c => c.id === currentChild.id);
        if (updated) setCurrentChild(updated);
      }
    } catch {
      // 忽略刷新错误
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      currentChild,
      isLoading,
      isAuthenticated: !!user,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      setCurrentChild: handleSetCurrentChild,
      refreshUser,
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