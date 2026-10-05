import { randomUUID } from 'node:crypto';
import { Router, IRouter, Request, Response } from 'express';
import { pool, database } from '../config/database.js';
import {
  consumeResetToken,
  createOpaqueToken,
  hashPassword,
  hashToken,
  signAccessToken,
  verifyPassword,
} from '../services/authService.js';
import { findAuthUserByEmail, findAuthUserById, type AuthDbUser } from '../services/authRepository.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

const router: IRouter = Router();
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type ChildInput = { name: string; age?: number; gender?: string };

const normalizeEmail = (email: unknown): string => String(email || '').trim().toLowerCase();
const normalizeUsername = (username: unknown): string => String(username || '').trim();
const isValidPassword = (password: unknown): password is string => typeof password === 'string' && password.length >= 6;
const mysqlDate = (date: Date): string => date.toISOString().slice(0, 23).replace('T', ' ');

const publicUser = async (authUser: AuthDbUser) => {
  const [{ data: profile }, { data: children }] = await Promise.all([
    database.from('profiles').select('username, phone').eq('id', authUser.id).maybeSingle(),
    database.from('children').select('id, name, age, gender, avatar, fruits_balance').eq('parent_id', authUser.id).eq('is_deleted', false),
  ]);

  return {
    id: authUser.id,
    username: profile?.username || authUser.username,
    phone: profile?.phone || null,
    children: children || [],
  };
};

const createSession = async (userId: string, req: Request) => {
  const opaque = createOpaqueToken();
  await pool.query(
    `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      userId,
      opaque.tokenHash,
      mysqlDate(new Date(Date.now() + REFRESH_TOKEN_TTL_MS)),
      String(req.get('user-agent') || '').slice(0, 512) || null,
      req.ip || null,
    ],
  );
  return opaque.token;
};

const authResponse = async (authUser: AuthDbUser, req: Request) => ({
  access_token: signAccessToken({ id: authUser.id, username: authUser.username }),
  refresh_token: await createSession(authUser.id, req),
  user: await publicUser(authUser),
  must_change_password: Boolean(authUser.must_change_password),
});

const insertChildren = async (
  connection: { query: (sql: string, values?: unknown[]) => Promise<[unknown, unknown]> },
  parentId: string,
  children: ChildInput[],
) => {
  for (const child of children) {
    const name = String(child.name || '').trim();
    if (!name) continue;
    await connection.query(
      `INSERT INTO children (id, parent_id, name, age, gender, fruits_balance)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [randomUUID(), parentId, name, child.age || null, child.gender || null],
    );
  }
};

// ============================================================
// POST /api/v1/auth/register
// ============================================================
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const email = normalizeEmail(req.body?.email);
  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;
  const phone = req.body?.phone;
  const children = Array.isArray(req.body?.children) ? req.body.children as ChildInput[] : [];

  if (!email || !email.includes('@') || !username || username.length > 50 || !isValidPassword(password)) {
    res.status(400).json({ error: '邮箱、用户名或密码格式不正确' });
    return;
  }

  if (await findAuthUserByEmail(email)) {
    res.status(409).json({ error: '该邮箱已注册', code: 'EMAIL_EXISTS' });
    return;
  }

  const connection = await pool.getConnection();
  const userId = randomUUID();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO auth_users (id, email, username, password_hash, email_verified, must_change_password)
       VALUES (?, ?, ?, ?, 1, 0)`,
      [userId, email, username, await hashPassword(password)],
    );
    await connection.query(
      'INSERT INTO profiles (id, username, phone) VALUES (?, ?, ?)',
      [userId, username, phone || null],
    );
    await insertChildren(connection, userId, children);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    const duplicate = (error as { errno?: number }).errno === 1062;
    res.status(duplicate ? 409 : 500).json({
      error: duplicate ? '用户名或邮箱已存在' : '注册失败，请稍后重试',
      code: duplicate ? 'DUPLICATE' : 'REGISTER_FAILED',
    });
    return;
  } finally {
    connection.release();
  }

  const authUser = await findAuthUserById(userId);
  if (!authUser) {
    res.status(500).json({ error: '注册成功但读取用户失败' });
    return;
  }
  res.status(201).json({ data: await authResponse(authUser, req), message: '注册成功' });
});

// ============================================================
// POST /api/v1/auth/login
// ============================================================
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const authUser = await findAuthUserByEmail(normalizeEmail(req.body?.email));
  const password = req.body?.password;
  if (!authUser || typeof password !== 'string' || !(await verifyPassword(password, authUser.password_hash))) {
    res.status(401).json({ error: '用户名或密码错误', code: 'INVALID_CREDENTIALS' });
    return;
  }
  res.json({ data: await authResponse(authUser, req) });
});

// ============================================================
// POST /api/v1/auth/refresh
// ============================================================
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = String(req.body?.refresh_token || '');
  if (!refreshToken) {
    res.status(401).json({ error: '未提供刷新令牌', code: 'REFRESH_TOKEN_MISSING' });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, user_id FROM auth_sessions
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(3)
       LIMIT 1 FOR UPDATE`,
      [hashToken(refreshToken)],
    );
    const session = (Array.isArray(rows) ? rows : [])[0] as { id: string; user_id: string } | undefined;
    if (!session) {
      await connection.rollback();
      res.status(401).json({ error: '刷新令牌无效或已过期', code: 'REFRESH_TOKEN_INVALID' });
      return;
    }

    await connection.query('UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [session.id]);
    const newOpaque = createOpaqueToken();
    await connection.query(
      `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), session.user_id, newOpaque.tokenHash, mysqlDate(new Date(Date.now() + REFRESH_TOKEN_TTL_MS)), String(req.get('user-agent') || '').slice(0, 512) || null, req.ip || null],
    );
    const authUser = await findAuthUserById(session.user_id);
    if (!authUser) throw new Error('用户不存在');
    await connection.commit();
    res.json({ data: {
      access_token: signAccessToken({ id: authUser.id, username: authUser.username }),
      refresh_token: newOpaque.token,
      user: await publicUser(authUser),
      must_change_password: Boolean(authUser.must_change_password),
    } });
  } catch (error) {
    await connection.rollback();
    console.error('[auth/refresh] 刷新会话失败:', error);
    res.status(401).json({ error: '刷新令牌无效', code: 'REFRESH_TOKEN_INVALID' });
  } finally {
    connection.release();
  }
});

// ============================================================
// POST /api/v1/auth/logout
// ============================================================
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const refreshToken = String(req.body?.refresh_token || '');
  if (refreshToken) {
    await pool.query(
      'UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND token_hash = ? AND revoked_at IS NULL',
      [req.user!.id, hashToken(refreshToken)],
    );
  }
  res.json({ message: '已退出登录' });
});

// ============================================================
// GET /api/v1/auth/me
// ============================================================
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const authUser = await findAuthUserById(req.user!.id);
  if (!authUser) {
    res.status(401).json({ error: '用户不存在', code: 'USER_NOT_FOUND' });
    return;
  }
  try {
    const profile = await database.from('profiles').select('id').eq('id', authUser.id).maybeSingle();
    if (!profile.data) {
      await database.from('profiles').insert({ id: authUser.id, username: authUser.username });
    }
    res.json({ data: await publicUser(authUser), must_change_password: Boolean(authUser.must_change_password) });
  } catch (error) {
    console.error('[/me] 获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// ============================================================
// POST /api/v1/auth/register-children
// ============================================================
router.post('/register-children', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const children = Array.isArray(req.body?.children) ? req.body.children as ChildInput[] : [];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      'UPDATE profiles SET phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [req.body?.phone || null, req.user!.id],
    );
    await insertChildren(connection, req.user!.id, children);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: '创建孩子信息失败', details: (error as Error).message });
    return;
  } finally {
    connection.release();
  }

  const authUser = await findAuthUserById(req.user!.id);
  if (!authUser) {
    res.status(401).json({ error: '用户不存在' });
    return;
  }
  res.status(201).json({ data: await publicUser(authUser), message: '孩子信息已保存' });
});

// ============================================================
// POST /api/v1/auth/verify-password
// ============================================================
router.post('/verify-password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const authUser = await findAuthUserById(req.user!.id);
  if (!authUser || typeof req.body?.password !== 'string' || !(await verifyPassword(req.body.password, authUser.password_hash))) {
    res.status(401).json({ error: '密码错误', code: 'INVALID_PASSWORD' });
    return;
  }
  res.json({ data: { valid: true } });
});

// ============================================================
// POST /api/v1/auth/change-password
// ============================================================
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const currentPassword = req.body?.current_password;
  const newPassword = req.body?.new_password;
  if (!isValidPassword(newPassword)) {
    res.status(400).json({ error: '新密码至少需要6位', code: 'PASSWORD_TOO_SHORT' });
    return;
  }

  const authUser = await findAuthUserById(req.user!.id);
  if (!authUser || typeof currentPassword !== 'string' || !(await verifyPassword(currentPassword, authUser.password_hash))) {
    res.status(401).json({ error: '当前密码错误', code: 'INVALID_PASSWORD' });
    return;
  }
  if (currentPassword === newPassword) {
    res.status(400).json({ error: '新密码不能与当前密码相同', code: 'PASSWORD_UNCHANGED' });
    return;
  }

  await pool.query(
    'UPDATE auth_users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
    [await hashPassword(newPassword), authUser.id],
  );
  res.json({ message: '密码修改成功', must_change_password: false });
});

// ============================================================
// POST /api/v1/auth/request-password-reset
// ============================================================
router.post('/request-password-reset', async (req: Request, res: Response): Promise<void> => {
  const authUser = await findAuthUserByEmail(normalizeEmail(req.body?.email));
  if (authUser) {
    const opaque = createOpaqueToken();
    await pool.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND used_at IS NULL', [authUser.id]);
    await pool.query(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [randomUUID(), authUser.id, opaque.tokenHash, mysqlDate(new Date(Date.now() + RESET_TOKEN_TTL_MS))],
    );
  }
  res.json({ message: '如果该邮箱存在，重置链接将按配置发送' });
});

// ============================================================
// POST /api/v1/auth/reset-password
// ============================================================
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const token = String(req.body?.token || '');
  const newPassword = req.body?.new_password;
  if (!token || !isValidPassword(newPassword)) {
    res.status(400).json({ error: '重置令牌或新密码无效' });
    return;
  }

  const [rows] = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, used_at FROM password_reset_tokens
     WHERE token_hash = ? LIMIT 1`,
    [hashToken(token)],
  );
  const record = (Array.isArray(rows) ? rows : [])[0] as { id: string; user_id: string; token_hash: string; expires_at: Date; used_at: Date | null } | undefined;
  if (!record) {
    res.status(400).json({ error: '重置链接无效或已过期', code: 'RESET_TOKEN_INVALID' });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const consumed = await consumeResetToken(token, record, async () => {
      const [result] = await connection.query(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3)',
        [record.id],
      );
      return Number((result as { affectedRows?: number }).affectedRows || 0) === 1;
    });
    if (!consumed) {
      await connection.rollback();
      res.status(400).json({ error: '重置链接无效或已过期', code: 'RESET_TOKEN_INVALID' });
      return;
    }
    await connection.query(
      'UPDATE auth_users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [await hashPassword(newPassword), record.user_id],
    );
    await connection.query('UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL', [record.user_id]);
    await connection.commit();
    res.json({ message: '密码重置成功' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: '密码重置失败', details: (error as Error).message });
  } finally {
    connection.release();
  }
});

export default router;
