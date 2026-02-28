// ============================================================
// 前端 API 服务层 - 统一封装所有后端 API 调用
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ============================================================
// HTTP 客户端基础封装
// ============================================================
const getToken = (): string | null => localStorage.getItem('auth_token');

const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token 过期，清除本地存储并跳转登录
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new Error('认证已过期，请重新登录');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `请求失败: ${response.status}`);
  }

  return data;
};

// ============================================================
// 类型定义
// ============================================================
export interface Child {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  avatar?: string;
  fruits_balance: number;
}

export interface User {
  id: string;
  username: string;
  phone?: string;
  children: Child[];
}

export interface TreeData {
  id: string;
  name: string;
  image?: string;
  status: 'growing' | 'completed';
  level: number;
  progress: number;
  goal_id?: string;
}

export interface GoalData {
  id: string;
  title: string;
  icon?: string;
  duration_days: number;
  duration_minutes: number;
  reward_tree_name?: string;
  is_active: boolean;
}

export interface TaskData {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  checkin_time: string;
  image_url?: string;
  progress: number;
  reject_reason?: string;
  goals?: { title: string; icon?: string };
  trees?: { name: string; image?: string };
}

export interface MedalData {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  unlocked: boolean;
  unlocked_at?: string;
}

export interface RewardData {
  id: string;
  name: string;
  price: number;
  image?: string;
  category: 'activity' | 'toy' | 'snack';
}

export interface MessageData {
  id: string;
  sender_type: 'parent' | 'child' | 'system';
  text?: string;
  type: 'text' | 'image' | 'sticker';
  content?: string;
  is_read: boolean;
  created_at: string;
}

export interface StatsData {
  forestHealth: number;
  totalApprovedTasks: number;
  activeGoals: number;
  completedTrees: number;
  fruitsBalance: number;
}

// ============================================================
// 认证 API
// ============================================================
export const authApi = {
  register: (data: {
    username: string;
    password: string;
    phone?: string;
    children: Array<{ name: string; age?: number; gender?: string }>;
  }) => request<{ data: { token: string; user: User } }>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  login: (username: string, password: string) =>
    request<{ data: { token: string; user: User } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ data: User }>('/api/v1/auth/me'),

  logout: () => request<{ message: string }>('/api/v1/auth/logout', { method: 'POST' }),
};

// ============================================================
// 孩子管理 API
// ============================================================
export const childrenApi = {
  list: (userId: string) =>
    request<{ data: Child[] }>(`/api/v1/users/${userId}/children`),

  add: (userId: string, child: { name: string; age?: number; gender?: string }) =>
    request<{ data: Child }>(`/api/v1/users/${userId}/children`, {
      method: 'POST',
      body: JSON.stringify(child),
    }),

  update: (userId: string, childId: string, data: Partial<Child>) =>
    request<{ data: Child }>(`/api/v1/users/${userId}/children/${childId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (userId: string, childId: string) =>
    request<{ message: string }>(`/api/v1/users/${userId}/children/${childId}`, {
      method: 'DELETE',
    }),

  stats: (childId: string) =>
    request<{ data: StatsData }>(`/api/v1/children/${childId}/stats`),
};

// ============================================================
// 树木/目标 API
// ============================================================
export const treesApi = {
  list: (childId: string, status?: 'growing' | 'completed') =>
    request<{ data: TreeData[] }>(
      `/api/v1/children/${childId}/trees${status ? `?status=${status}` : ''}`
    ),

  createGoal: (childId: string, goal: {
    title: string;
    icon?: string;
    duration_days: number;
    duration_minutes?: number;
    reward_tree_name?: string;
  }) =>
    request<{ data: { goal: GoalData; tree: TreeData } }>(
      `/api/v1/children/${childId}/goals`,
      { method: 'POST', body: JSON.stringify(goal) }
    ),
};

// ============================================================
// 任务打卡 API
// ============================================================
export const tasksApi = {
  list: (childId: string, status?: string) =>
    request<{ data: TaskData[] }>(
      `/api/v1/children/${childId}/tasks${status ? `?status=${status}` : ''}`
    ),

  checkin: (goalId: string, childId: string, imageUrl?: string) =>
    request<{ data: TaskData }>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({ goal_id: goalId, child_id: childId, image_url: imageUrl }),
    }),

  approve: (taskId: string) =>
    request<{ data: TaskData }>(`/api/v1/tasks/${taskId}/approve`, { method: 'PUT' }),

  reject: (taskId: string, reason?: string) =>
    request<{ data: TaskData }>(`/api/v1/tasks/${taskId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),
};

// ============================================================
// 勋章 API
// ============================================================
export const medalsApi = {
  list: (childId: string) =>
    request<{ data: MedalData[] }>(`/api/v1/children/${childId}/medals`),
};

// ============================================================
// 奖励商店 API
// ============================================================
export const rewardsApi = {
  list: (category?: string) =>
    request<{ data: RewardData[] }>(
      `/api/v1/rewards${category ? `?category=${category}` : ''}`
    ),

  getFruits: (childId: string) =>
    request<{ data: { fruits_balance: number } }>(`/api/v1/rewards/children/${childId}/fruits`),

  redeem: (rewardId: string, childId: string) =>
    request<{ data: { remaining_balance: number }; message: string }>(
      `/api/v1/rewards/${rewardId}/redeem`,
      { method: 'POST', body: JSON.stringify({ child_id: childId }) }
    ),

  redemptions: (childId: string) =>
    request<{ data: unknown[] }>(`/api/v1/rewards/children/${childId}/redemptions`),
};

// ============================================================
// 消息 API
// ============================================================
export const messagesApi = {
  list: (childId: string, page = 1, limit = 20) =>
    request<{ data: MessageData[]; pagination: { total: number } }>(
      `/api/v1/children/${childId}/messages?page=${page}&limit=${limit}`
    ),

  unreadCount: (childId: string) =>
    request<{ data: { unread_count: number } }>(
      `/api/v1/children/${childId}/messages/unread-count`
    ),

  send: (childId: string, text: string, type: 'text' | 'sticker' | 'image' = 'text', content?: string) =>
    request<{ data: MessageData }>('/api/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, text, type, content }),
    }),

  markRead: (messageId: string) =>
    request<{ message: string }>(`/api/v1/messages/${messageId}/read`, { method: 'PUT' }),

  markAllRead: (childId: string) =>
    request<{ message: string }>(`/api/v1/children/${childId}/messages/read-all`, { method: 'PUT' }),
};