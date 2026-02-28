import { Request } from 'express';

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}