import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthUser } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as AuthRequest).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: '认证令牌无效或已过期' });
  }
};