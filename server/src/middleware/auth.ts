import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/authService.js';
import { findAuthUserById } from '../services/authRepository.js';
import { AuthRequest, AuthUser } from '../types.js';

/**
 * 验证本地 JWT，并确认账号仍存在于 MySQL。
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    const authUser = await findAuthUserById(payload.sub);
    if (!authUser) {
      res.status(401).json({ error: '认证令牌无效', code: 'TOKEN_INVALID' });
      return;
    }

    (req as AuthRequest).user = {
      id: authUser.id,
      username: authUser.username,
      email: authUser.email,
      must_change_password: Boolean(authUser.must_change_password),
      role: payload.role,
    } satisfies AuthUser;

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
