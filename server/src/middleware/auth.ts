import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { verifySupabaseJwt } from '../services/supabaseJwt.js';
import { AuthRequest, AuthUser } from '../types.js';

/**
 * 认证中间件 - 验证 Supabase JWT
 *
 * 优先本地验签（ES256 + 进程内缓存 JWKS），避免每个请求都跨境调用
 * supabase.auth.getUser()。本地无法确认时回退到 getUser()，保证兼容性。
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const user = await resolveUser(token);

    if (!user) {
      res.status(401).json({ error: '认证令牌无效', code: 'TOKEN_INVALID' });
      return;
    }

    (req as AuthRequest).user = user;
    next();
  } catch {
    res.status(401).json({ error: '认证令牌无效', code: 'TOKEN_INVALID' });
  }
};

/**
 * 解析令牌对应的用户：
 *   1. 本地验签（无网络往返，~0.2ms）
 *   2. 本地无法确认（历史 HS256 令牌 / JWKS 不可用）时回退到远程 getUser
 *
 * 应急开关：设置 SUPABASE_JWT_LOCAL_VERIFY=false 可整体关闭本地验签，
 * 无需改代码即可回到「每个请求都问 Supabase」的旧行为。
 */
const LOCAL_VERIFY_ENABLED = process.env.SUPABASE_JWT_LOCAL_VERIFY !== 'false';

let fallbackLogged = false;

const resolveUser = async (token: string): Promise<AuthUser | null> => {
  const claims = LOCAL_VERIFY_ENABLED ? await verifySupabaseJwt(token) : null;

  if (claims?.sub) {
    const username = (claims.user_metadata?.username as string)
      || claims.email?.split('@')[0]
      || '';

    return { id: claims.sub, username, role: 'parent' } as AuthUser;
  }

  // 兜底路径：只在实例内记录一次，便于确认线上令牌是否已全部切换到非对称签名
  if (!fallbackLogged) {
    fallbackLogged = true;
    console.warn('[auth] 本地验签未命中，回退到 supabase.auth.getUser()（可能是 HS256 旧令牌或 JWKS 不可用）');
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  // 从 user_metadata 获取 username（注册时存入）
  const username = (user.user_metadata?.username as string)
    || user.email?.split('@')[0]
    || '';

  return { id: user.id, username, role: 'parent' } as AuthUser;
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
