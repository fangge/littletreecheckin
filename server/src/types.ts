import { Request } from 'express';

export interface AuthUser {
  id: string;
  username: string;
  role?: 'parent' | 'child';  // 角色标识：parent=家长, child=儿童模式
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

// Refresh Token payload
export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;  // 用于吊销特定 token
}
