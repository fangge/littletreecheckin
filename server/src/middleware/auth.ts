import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { AuthRequest, AuthUser } from '../types.js';

/**
 * 认证中间件 - 验证 Supabase JWT
 * 使用 supabase.auth.getUser(token) 验证令牌有效性
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: '认证令牌无效', code: 'TOKEN_INVALID' });
      return;
    }

    // 从 user_metadata 获取 username（注册时存入）
    const username = (user.user_metadata?.username as string)
      || user.email?.split('@')[0]
      || '';

    (req as AuthRequest).user = {
      id: user.id,
      username,
      role: 'parent',
    } as AuthUser;

    next();
  } catch {
    res.status(401).json({ error: '认证令牌无效', code: 'TOKEN_INVALID' });
  }
};

/**
 * 角色权限中间件
 * - 拒绝 child 角色的写操作（POST/PUT/PATCH/DELETE）
 * - GET 请求允许（儿童可查看但不能修改数据）
 */
export const requireParentRole = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as AuthRequest).user;

  if (!user?.role || user.role === 'parent') {
    return next();
  }

  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  res.status(403).json({
    error: '儿童模式下不允许执行此操作',
    code: 'CHILD_MODE_FORBIDDEN',
  });
};
