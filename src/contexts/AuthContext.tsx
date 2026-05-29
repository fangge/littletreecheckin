import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, Child } from '../services/api';

interface AuthContextType {
  user: User | null;
  currentChild: Child | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isChildMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    phone?: string;
    children: Array<{ name: string; age?: number; gender?: string }>;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentChild: (child: Child) => void;
  refreshUser: () => Promise<void>;
  enableChildMode: (password: string) => Promise<void>;
  disableChildMode: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEYS = {
  CHILD_ID: 'current_child_id',
  CHILD_MODE: 'child_mode',
} as const;

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentChild, setCurrentChildState] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChildMode, setIsChildMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.CHILD_MODE) === 'true';
  });

  // 从后端获取用户完整信息（包含 children）
  const fetchUserProfile = useCallback(async (session: Session): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.data as User;
    } catch {
      return null;
    }
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

  // 监听 Supabase Auth 状态变化
  useEffect(() => {
    // 初始化时获取当前 session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const userData = await fetchUserProfile(session);
        if (userData) {
          setUser(userData);
          restoreChild(userData);
        }
      }
      setIsLoading(false);
    });

    // 监听 auth 状态变化（登录/登出/token 刷新）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const userData = await fetchUserProfile(session);
          if (userData) {
            setUser(userData);
            restoreChild(userData);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setCurrentChildState(null);
          setIsChildMode(false);
          localStorage.removeItem(STORAGE_KEYS.CHILD_ID);
          localStorage.removeItem(STORAGE_KEYS.CHILD_MODE);
          navigate('/login', { replace: true });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token 自动刷新，无需额外操作
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, restoreChild, navigate]);

  const handleLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('用户名或密码错误');
      }
      throw new Error(error.message || '登录失败，请重试');
    }
    // onAuthStateChange 会处理后续的用户数据加载和导航
    navigate('/', { replace: true });
  };

  const handleRegister = async (data: {
    email: string;
    username: string;
    password: string;
    phone?: string;
    children: Array<{ name: string; age?: number; gender?: string }>;
  }) => {
    // 1. 在 Supabase Auth 创建用户
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { username: data.username },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        throw new Error('用户名已存在');
      }
      throw new Error(signUpError.message || '注册失败，请重试');
    }

    if (!authData.session) {
      throw new Error('注册成功，请检查邮箱验证（如已启用）');
    }

    // 2. 通过后端 API 创建孩子记录（后端使用 service role 操作数据库）
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register-children`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: data.phone,
        children: data.children,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      // 注册失败时删除已创建的 auth 用户
      await supabase.auth.admin?.deleteUser(authData.user!.id).catch(() => {});
      throw new Error(errData.error || '创建孩子信息失败');
    }

    const result = await response.json();
    setUser(result.data);
    if (result.data.children?.length > 0) {
      setCurrentChildState(result.data.children[0]);
      localStorage.setItem(STORAGE_KEYS.CHILD_ID, result.data.children[0].id);
    }

    navigate('/', { replace: true });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange 会处理清理和导航
  };

  const handleSetCurrentChild = (child: Child) => {
    setCurrentChildState(child);
    localStorage.setItem(STORAGE_KEYS.CHILD_ID, child.id);
  };

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userData = await fetchUserProfile(session);
      if (userData) {
        setUser(userData);
        if (currentChild) {
          const updated = userData.children.find((c: Child) => c.id === currentChild.id);
          if (updated) setCurrentChildState(updated);
        }
      }
    } catch {
      // 忽略刷新错误
    }
  };

  const enableChildMode = async (password: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('未登录');

    // 通过重新登录验证密码
    const { error } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password,
    });
    if (error) throw new Error('密码错误，请重试');

    localStorage.setItem(STORAGE_KEYS.CHILD_MODE, 'true');
    setIsChildMode(true);
  };

  const disableChildMode = async (password: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('未登录');

    const { error } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password,
    });
    if (error) throw new Error('密码错误，请重试');

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
