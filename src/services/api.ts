// ============================================================
// 前端 API 服务层 - 统一封装所有后端 API 调用
// ============================================================

// 生产环境（Vercel）：前后端同域，使用相对路径
// 本地开发：Vite 代理 /api 到 localhost:3001（见 vite.config.ts）
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
  progress: number;
  goal_id?: string;
  completed_days?: number;
  checked_in_today?: boolean;
}

export interface GoalData {
  id: string;
  title: string;
  icon?: string;
  duration_days: number;
  duration_minutes: number;
  daily_count?: number | null;
  reward_tree_name?: string;
  is_active: boolean;
  fruits_per_task?: number;
}

export interface TaskData {
  id: string;
  goal_id?: string;
  title: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  checkin_time: string;
  image_url?: string;
  progress: number;
  reject_reason?: string;
  goals?: { title: string; icon?: string; fruits_per_task?: number };
  fruits_earned?: number;
  bonus_fruits?: number;
  trees?: { name: string; image?: string };
}

export interface MedalData {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  unlock_condition?: {
    type: string;
    threshold: number;
  };
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

export interface RedemptionData {
  id: string;
  redeemed_at: string;
  status: 'pending' | 'completed';
  rewards?: {
    name: string;
    image?: string;
    price: number;
    category: string;
  };
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

export interface CalendarTask {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  checkin_time: string;
  goal_title?: string;
}

export interface CalendarData {
  checkin_dates: string[];
  tasks_by_date: Record<string, CalendarTask[]>;
}

export interface FruitsHistoryItem {
  id: string;
  title: string;
  checkin_time: string;
  fruits_earned: number;
  bonus_fruits: number;
  goal_icon?: string | null;
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

  verifyPassword: (password: string) =>
    request<{ success: boolean }>('/api/v1/auth/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    request<{ success: boolean; message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    }),
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

  stats: (childId: string, period?: 'month' | 'quarter' | 'year') =>
    request<{ data: StatsData }>(
      `/api/v1/children/${childId}/stats${period ? `?period=${period}` : ''}`
    ),

  getCheckinCalendar: (childId: string, year: number, month: number) =>
    request<{ data: CalendarData }>(
      `/api/v1/children/${childId}/checkin-calendar?year=${year}&month=${month}`
    ),

  getFruitsHistory: (childId: string) =>
    request<{ data: FruitsHistoryItem[]; fruits_balance: number }>(
      `/api/v1/children/${childId}/fruits-history`
    ),
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
    daily_count?: number | null;
    reward_tree_name?: string;
    fruits_per_task?: number;
  }) =>
    request<{ data: { goal: GoalData; tree: TreeData } }>(
      `/api/v1/children/${childId}/goals`,
      { method: 'POST', body: JSON.stringify(goal) }
    ),

  listGoals: (childId: string, activeOnly = false) =>
    request<{ data: Array<GoalData & { trees?: TreeData[] }> }>(
      `/api/v1/children/${childId}/goals${activeOnly ? '?active=true' : ''}`
    ),

  updateGoal: (goalId: string, data: {
    title?: string;
    icon?: string;
    duration_days?: number;
    duration_minutes?: number;
    daily_count?: number | null;
    reward_tree_name?: string;
    child_id?: string;
    fruits_per_task?: number;
  }) =>
    request<{ data: GoalData }>(
      `/api/v1/goals/${goalId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),

  deleteGoal: (goalId: string) =>
    request<{ message: string }>(
      `/api/v1/goals/${goalId}`,
      { method: 'DELETE' }
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

  checkin: (goalId: string, childId: string, imageUrl?: string, checkinDate?: string) => {
    // 获取设备本地时间（带时区偏移的 ISO 字符串，如 2024-03-04T10:00:00.000+08:00）
    const now = new Date();
    const offsetMinutes = -now.getTimezoneOffset(); // 正数表示东时区
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const offsetMins = String(absOffset % 60).padStart(2, '0');

    let checkinTime: string;
    if (checkinDate) {
      // 补打卡：使用指定日期 + 当前时间的时分秒
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      checkinTime = `${checkinDate}T${timeStr}${sign}${offsetHours}:${offsetMins}`;
    } else {
      // 正常打卡：使用当前本地时间
      const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      checkinTime = localDate.toISOString().replace('Z', `${sign}${offsetHours}:${offsetMins}`);
    }

    return request<{ data: TaskData }>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({ goal_id: goalId, child_id: childId, image_url: imageUrl, checkin_time: checkinTime }),
    });
  },

  approve: (taskId: string, bonusFruits?: number) =>
    request<{ data: TaskData }>(`/api/v1/tasks/${taskId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ bonus_fruits: bonusFruits ?? 0 }),
    }),

  reject: (taskId: string, reason?: string) =>
    request<{ data: TaskData }>(`/api/v1/tasks/${taskId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),

  revoke: (taskId: string) =>
    request<{ data: TaskData }>(`/api/v1/tasks/${taskId}/revoke`, {
      method: 'PUT',
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
    request<{ data: RedemptionData[] }>(`/api/v1/rewards/children/${childId}/redemptions`),

  confirmRedemption: (redemptionId: string) =>
    request<{ message: string }>(`/api/v1/rewards/redemptions/${redemptionId}/complete`, { method: 'PUT' }),

  listAll: () =>
    request<{ data: (RewardData & { is_active: boolean })[] }>('/api/v1/rewards/all'),

  create: (data: { name: string; price: number; image?: string; category: string }) =>
    request<{ data: RewardData }>('/api/v1/rewards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (rewardId: string, data: { name?: string; price?: number; image?: string; category?: string; is_active?: boolean }) =>
    request<{ data: RewardData & { is_active: boolean } }>(`/api/v1/rewards/${rewardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (rewardId: string) =>
    request<{ message: string }>(`/api/v1/rewards/${rewardId}`, { method: 'DELETE' }),
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