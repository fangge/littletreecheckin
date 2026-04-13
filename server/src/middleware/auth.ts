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
  } catch (err) {
    // Token 过期返回特定错误码，方便前端触发 refresh 逻辑
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: '认证令牌已过期', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: '认证令牌无效', code: 'TOKEN_INVALID' });
  }
};

/**
 * 角色权限中间件
 * - 拒绝 child 角色的写操作（POST/PUT/PATCH/DELETE）
 * - GET 请求允许（儿童可查看但不能修改数据）
 * 
 * 使用方式：
 *   router.post('/some-route', authMiddleware, requireParentRole, handler)
 */
export const requireParentRole = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as AuthRequest).user;

  // 未设置 role 或 role 为 parent → 允许通过
  if (!user?.role || user.role === 'parent') {
    return next();
  }

  // child 角色：拒绝非 GET 请求的写操作
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next(); // 读操作放行
  }

  res.status(403).json({
    error: '儿童模式下不允许执行此操作',
    code: 'CHILD_MODE_FORBIDDEN',
  });
};

/**
 * 可选中间件：从查询参数中获取 child_id 来模拟儿童角色
 * 仅在需要时使用（如 API 测试），正常流程由 access token 的 role 字段决定
 */
export const optionalChildRole = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // 如果请求中有 as_child=1 参数且 user 存在，标记为 child 模式
  if (req.query.as_child === '1' && (req as AuthRequest).user) {
    (req as AuthRequest).user!.role = 'child';
  }
  next();
};
