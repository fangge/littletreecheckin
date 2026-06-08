// ============================================================
// 前端 API 服务层 - 统一封装所有后端 API 调用
// 使用 Supabase Auth 管理 session，自动获取最新 access token
// ============================================================

import { cachedRequest, invalidateChildCache } from '../utils/requestCache';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * 获取当前 Supabase session 的 access token
 * Supabase 客户端会自动刷新过期的 token
 */
const getToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

// ============================================================
// HTTP 客户端基础封装（token 由 Supabase 自动管理）
// ============================================================
const request = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getToken();
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

  const data = await response.json();

  // 处理 401：Supabase token 无效，触发登出
  if (response.status === 401) {
    await supabase.auth.signOut();
    throw new Error('认证已过期，请重新登录');
  }

  if (!response.ok) {
    let errorMessage = data.error || `请求失败: ${response.status}`;
    if (data.details) errorMessage += `\n详情: ${data.details}`;
    if (data.hint) errorMessage += `\n提示: ${data.hint}`;
    if (data.code) errorMessage += `\n错误代码: ${data.code}`;
    console.error('API 请求失败:', {
      endpoint,
      status: response.status,
      error: data.error,
      details: data.details,
      hint: data.hint,
      code: data.code,
    });
    throw new Error(errorMessage);
  }

  return data;
};

/**
 * 带缓存的 GET 请求（用于数据读取接口，避免短时间内重复请求）
 * 默认 30 秒缓存，写操作后可调用 invalidateChildCache 清除
 */
const cachedGet = <T>(endpoint: string, ttl = 30000) =>
  cachedRequest<T>(
    endpoint,
    () => request<T>(endpoint),
    ttl,
  );

/** 清除指定孩子相关的所有缓存（打卡/审核后调用） */
export const invalidateChildDataCache = (childId: string) => invalidateChildCache(childId);

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
  is_shared?: boolean;
  shared_child_ids?: string[];
}

export interface SharedTaskProgress {
  child_id: string;
  child_name: string;
  child_gender?: string | null;
  child_avatar?: string | null;
  completed_days: number;
  progress: number;
  tree_status?: string;
  is_completed: boolean;
  completion_date?: string | null;
  is_winner: boolean;
}

export interface SharedTaskSummaryData {
  goal: GoalData;
  progress: SharedTaskProgress[];
  winner_child_id: string | null;
  is_completed: boolean;
  earliest_completion_date?: string | null;
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
  created_at?: string;
  updated_at?: string;
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
  category: 'activity' | 'toy' | 'snack';
}

export interface RedemptionData {
  id: string;
  redeemed_at: string;
  status: 'pending' | 'completed';
  rewards?: {
    name: string;
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
  shared_completed_dates: string[];
  tasks_by_date: Record<string, CalendarTask[]>;
}

export interface FruitsHistoryItem {
  id: string;
  title: string;
  checkin_time: string;
  fruits_earned: number;
  bonus_fruits: number;
  goal_icon?: string | null;
  is_shared?: boolean;
}

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
    cachedGet<{ data: StatsData }>(
      `/api/v1/children/${childId}/stats${period ? `?period=${period}` : ''}`
    ),

  getCheckinCalendar: (childId: string, year: number, month: number) =>
    cachedGet<{ data: CalendarData }>(
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
    cachedGet<{ data: TreeData[] }>(
      `/api/v1/children/${childId}/trees${status ? `?status=${status}` : ''}`
    ),

  // 聚合接口：一次请求获取树木+目标+统计数据（替代分别调用三个接口）
  dashboardData: (childId: string, period?: 'month' | 'quarter' | 'year') =>
    cachedGet<{ data: { trees: TreeData[]; goals: Array<GoalData & { completed_days?: number; checked_in_today?: boolean; calculated_progress?: number }>; stats: StatsData } }>(
      `/api/v1/children/${childId}/dashboard-data${period ? `?period=${period}` : ''}`
    ),

  createGoal: (childId: string, goal: {
    title: string;
    icon?: string;
    duration_days: number;
    duration_minutes?: number;
    daily_count?: number | null;
    reward_tree_name?: string;
    fruits_per_task?: number;
    is_shared?: boolean;
    shared_child_ids?: string[];
  }) =>
    request<{ data: { goal: GoalData; tree: TreeData } }>(
      `/api/v1/children/${childId}/goals`,
      { method: 'POST', body: JSON.stringify(goal) }
    ),

  getSharedTaskProgress: (goalId: string) =>
    request<{ data: SharedTaskSummaryData }>(
      `/api/v1/goals/${goalId}/shared-progress`
    ),

  listGoals: (childId: string, activeOnly = false) =>
    cachedGet<{ data: Array<GoalData & { trees?: TreeData[] }> }>(
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
    shared_child_ids?: string[];
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
  list: (childId: string, status?: string, goalId?: string, limit = 200) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (goalId) params.set('goal_id', goalId);
    params.set('limit', String(limit));
    return cachedGet<{ data: TaskData[]; total: number; hasMore: boolean }>(
      `/api/v1/children/${childId}/tasks?${params.toString()}`
    );
  },

  /** 直接请求待审核任务（不走缓存），用于实时刷新角标数量 */
  listPending: (childId: string) =>
    request<{ data: TaskData[]; total: number; hasMore: boolean }>(
      `/api/v1/children/${childId}/tasks?status=pending&limit=200`
    ),


  checkin: (goalId: string, childId: string, imageUrl?: string, checkinDate?: string) => {
    const now = new Date();
    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const offsetMins = String(absOffset % 60).padStart(2, '0');

    let checkinTime: string;
    if (checkinDate) {
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      checkinTime = `${checkinDate}T${timeStr}${sign}${offsetHours}:${offsetMins}`;
    } else {
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
    cachedGet<{ data: MedalData[] }>(`/api/v1/children/${childId}/medals`),
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

  // 批量获取多个孩子的兑换记录（性能优化）
  redemptionsBatch: (childIds: string) =>
    request<{ data: (RedemptionData & { child_id: string; children?: { name: string } })[] }>(
      `/api/v1/rewards/redemptions/batch?child_ids=${childIds}`
    ),

  confirmRedemption: (redemptionId: string) =>
    request<{ message: string }>(`/api/v1/rewards/redemptions/${redemptionId}/complete`, { method: 'PUT' }),

  cancelRedemption: (redemptionId: string) =>
    request<{ message: string }>(`/api/v1/rewards/redemptions/${redemptionId}/cancel`, { method: 'PUT' }),

  listAll: () =>
    request<{ data: (RewardData & { is_active: boolean })[] }>('/api/v1/rewards/all'),

  create: (data: { name: string; price: number; category: string }) =>
    request<{ data: RewardData }>('/api/v1/rewards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (rewardId: string, data: { name?: string; price?: number; category?: string; is_active?: boolean }) =>
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
