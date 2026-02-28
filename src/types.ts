export type ViewType = 'forest' | 'tasks' | 'messages' | 'medals' | 'parent' | 'store' | 'add-goal' | 'register' | 'profile' | 'parent-control';

export interface Tree {
  id: string;
  name: string;
  image: string;
  status: 'growing' | 'completed';
  level?: number;
  progress: number; // 0-100
}

export interface Task {
  id: string;
  title: string;
  type: string;
  time: string;
  status: 'pending' | 'approved' | 'rejected';
  childName: string;
  treeName: string;
  image: string;
  progress: number;
}

export interface Medal {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
  color: string;
}

export interface Reward {
  id: string;
  name: string;
  price: number;
  image: string;
  category: 'activity' | 'toy' | 'snack';
}

export interface Message {
  id: string;
  sender: 'Mom' | 'System';
  text: string;
  time: string;
  type: 'text' | 'image' | 'sticker';
  content?: string;
}
