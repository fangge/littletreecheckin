import { Router, Request, Response, IRouter } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

// Access Token: 短期有效（15分钟），用于 API 认证
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
// Refresh Token: 长期有效（7天），用于续签
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
// 密码重置 token 有效期（1小时）
const RESET_TOKEN_EXPIRES = 60 * 60 * 1000;

// ============================================================
// 工具函数
// ============================================================

/** 生成安全的随机 token */
const generateRefreshToken = (): string => crypto.randomBytes(40).toString('hex');

/** 生成 access token */
const signAccessToken = (payload: { id: string; username: string; role?: string }): string => {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
};

/** 保存 refresh token 到数据库 */
const saveRefreshToken = async (userId: string, token: string): Promise<void> => {
  const expiresAt = new Date();
  // 解析过期时间（如 "7d" → 7天）
  const match = REFRESH_TOKEN_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': expiresAt.setSeconds(expiresAt.getSeconds() + value); break;
      case 'm': expiresAt.setMinutes(expiresAt.getMinutes() + value); break;
      case 'h': expiresAt.setHours(expiresAt.getHours() + value); break;
      case 'd': expiresAt.setDate(expiresAt.getDate() + value); break;
    }
  } else {
    expiresAt.setDate(expiresAt.getDate() + 7);
  }

  await supabase.from('refresh_tokens').insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });
};

/** 验证 refresh token */
const verifyRefreshToken = async (token: string): Promise<{ userId: string; tokenId: string } | null> => {
  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('id, user_id, expires_at')
    .eq('token', token)
    .single();

  if (error || !data) return null;

  // 检查是否过期
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from('refresh_tokens').delete().eq('id', data.id);
    return null;
  }

  return { userId: data.user_id, tokenId: data.id };
};

/** 吊销用户的所有 refresh token（登出/改密码时） */
const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await supabase.from('refresh_tokens').delete().eq('user_id', userId);
};

// ============================================================
// POST /api/v1/auth/register
// ============================================================
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password, phone, children } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: '密码长度不能少于6位' });
    return;
  }

  if (!children || !Array.isArray(children) || children.length === 0) {
    res.status(400).json({ error: '请至少添加一个孩子信息' });
    return;
  }

  // 检查用户名是否已存在
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (existingUser) {
    res.status(409).json({ error: '用户名已存在' });
    return;
  }

  // 加密密码
  const passwordHash = await bcrypt.hash(password, 10);

  // 创建用户
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({ username, phone: phone || null, password_hash: passwordHash })
    .select('id, username, phone, created_at')
    .single();

  if (userError || !newUser) {
    res.status(500).json({ error: '创建用户失败' });
    return;
  }

  // 创建孩子记录
  const childrenData = children.map((child: { name: string; age: number; gender: string }) => ({
    parent_id: newUser.id,
    name: child.name,
    age: child.age || null,
    gender: child.gender || null,
    fruits_balance: 0,
  }));

  const { data: newChildren, error: childrenError } = await supabase
    .from('children')
    .insert(childrenData)
    .select('id, name, age, gender, fruits_balance');

  if (childrenError) {
    await supabase.from('users').delete().eq('id', newUser.id);
    res.status(500).json({ error: '创建孩子信息失败' });
    return;
  }

  // 双令牌：Access Token + Refresh Token
  const accessToken = signAccessToken({
    id: newUser.id,
    username: newUser.username,
    role: 'parent',
  });

  const refreshToken = generateRefreshToken();
  await saveRefreshToken(newUser.id, refreshToken);

  res.status(201).json({
    data: {
      accessToken,
      refreshToken,
      user: { ...newUser, children: newChildren },
    },
    message: '注册成功',
  });
});

// ============================================================
// POST /api/v1/auth/login
// ============================================================
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    console.log('[Login] 尝试登录:', { username, timestamp: new Date().toISOString() });

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    // 查询用户（支持用户名或手机号登录）
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, phone, password_hash, created_at')
      .eq('username', username)
      .maybeSingle();

    if (!user && !userError) {
      const phoneResult = await supabase
        .from('users')
        .select('id, username, phone, password_hash, created_at')
        .eq('phone', username)
        .maybeSingle();
      user = phoneResult.data;
      userError = phoneResult.error;
    }

    if (userError) {
      res.status(500).json({ error: '登录失败，请稍后重试' });
      return;
    }

    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    // 获取孩子列表
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name, age, gender, avatar, fruits_balance')
      .eq('parent_id', user.id)
      .eq('is_deleted', false);

    if (childrenError) {
      console.error('[Login] 获取孩子列表错误:', childrenError);
    }

    // 双令牌
    const accessToken = signAccessToken({
      id: user.id,
      username: user.username,
      role: 'parent',
    });

    const refreshToken = generateRefreshToken();
    await saveRefreshToken(user.id, refreshToken);

    const { password_hash: _, ...userWithoutPassword } = user;

    res.json({
      data: {
        accessToken,
        refreshToken,
        user: { ...userWithoutPassword, children: children || [] },
      },
      message: '登录成功',
    });
  } catch (error) {
    console.error('[Login] 未捕获的错误:', error);
    res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  }
});

// ============================================================
// POST /api/v1/auth/refresh - 刷新 Access Token
// ============================================================
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: '缺少 refresh token' });
    return;
  }

  // 验证 refresh token（数据库查询）
  const tokenData = await verifyRefreshToken(refreshToken);
  if (!tokenData) {
    res.status(401).json({ error: 'Refresh token 无效或已过期，请重新登录' });
    return;
  }

  // 获取用户信息
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, phone, created_at')
    .eq('id', tokenData.userId)
    .single();

  if (error || !user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  // 获取孩子列表
  const { data: children } = await supabase
    .from('children')
    .select('id, name, age, gender, avatar, fruits_balance')
    .eq('parent_id', user.id)
    .eq('is_deleted', false);

  // 签发新的 access token 和 refresh token（rotation 策略：旧 refresh token 作废，新 token 生效）
  const newAccessToken = signAccessToken({
    id: user.id,
    username: user.username,
    role: 'parent',
  });

  const newRefreshToken = generateRefreshToken();

  // 删除旧 refresh token，创建新的
  await supabase.from('refresh_tokens').delete().eq('id', tokenData.tokenId);
  await saveRefreshToken(user.id, newRefreshToken);

  res.json({
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { ...user, children: children || [] },
    },
  });
});

// ============================================================
// GET /api/v1/auth/me
// ============================================================
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, phone, created_at')
    .eq('id', userId)
    .single();

  if (error || !user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const { data: children } = await supabase
    .from('children')
    .select('id, name, age, gender, avatar, fruits_balance')
    .eq('parent_id', userId)
    .eq('is_deleted', false);

  res.json({
    data: { ...user, children: children || [] },
  });
});

// ============================================================
// POST /api/v1/auth/logout
// ============================================================
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  // 吊销该用户所有 refresh token
  await revokeAllUserTokens(req.user!.id);
  res.json({ message: '已退出登录' });
});

// ============================================================
// POST /api/v1/auth/verify-password
// ============================================================
router.post('/verify-password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { password } = req.body;
  const userId = req.user!.id;

  if (!password) {
    res.status(400).json({ error: '密码不能为空' });
    return;
  }

  const { data: user } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ success: false, error: '密码错误' });
    return;
  }

  res.json({ success: true });
});

// ============================================================
// POST /api/v1/auth/change-password
// ============================================================
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user!.id;

  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400).json({ error: '请填写所有密码字段' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: '新密码长度不能少于6位' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: '两次输入的新密码不一致' });
    return;
  }

  const { data: user } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    res.status(401).json({ error: '当前密码错误' });
    return;
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: newPasswordHash })
    .eq('id', userId);

  if (updateError) {
    res.status(500).json({ error: '密码更新失败，请重试' });
    return;
  }

  // 改密码后吊销所有 refresh token，强制重新登录
  await revokeAllUserTokens(userId);

  res.json({ success: true, message: '密码修改成功，请重新登录' });
});

// ============================================================
// POST /api/v1/auth/forgot-password - 发起密码重置请求
// ============================================================
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { identifier } = req.body; // 用户名或手机号

  if (!identifier?.trim()) {
    res.status(400).json({ error: '请输入用户名或手机号' });
    return;
  }

  // 查询用户
  let { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username, phone')
    .eq('username', identifier.trim())
    .maybeSingle();

  if (!user && !userError) {
    const phoneResult = await supabase
      .from('users')
      .select('id, username, phone')
      .eq('phone', identifier.trim())
      .maybeSingle();
    user = phoneResult.data;
    userError = phoneResult.error;
  }

  if (userError || !user) {
    // 安全考虑：不暴露用户是否存在，统一返回成功提示
    // 但返回一个标志让前端知道是否需要显示"检查手机/邮箱"
    res.json({
      message: '如果该账号存在，重置链接/验证码已发送到关联的手机号',
      found: false,
    });
    return;
  }

  // 生成重置 token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES).toISOString();

  // 保存重置 token（使用 password_resets 表或 users 表的临时字段）
  // 方案：使用独立的 password_resets 表
  await supabase.from('password_resets').upsert(
    {
      user_id: user.id,
      token: resetToken,
      expires_at: resetExpiresAt,
      used: false,
    },
    { onConflict: 'user_id' }
  );

  // TODO: 实际项目中应集成短信服务（如腾讯云 SMS）或邮件服务发送验证码
  // 当前将 token 返回给前端用于开发调试；生产环境应通过短信/邮件发送
  console.log(`[Password Reset] 重置token已生成: ${resetToken} for user ${user.username}`);

  res.json({
    message: '如果该账号存在，重置验证码已发送',
    found: true,
    hasPhone: !!user.phone,
    // 开发模式：返回 token 用于测试（生产环境应移除）
    ...(process.env.NODE_ENV !== 'production' ? { _debugToken: resetToken } : {}),
  });
});

// ============================================================
// POST /api/v1/auth/reset-password - 通过 token 重置密码
// ============================================================
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    res.status(400).json({ error: '请填写完整信息' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: '密码长度不能少于6位' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: '两次输入的密码不一致' });
    return;
  }

  // 查找有效的重置 token
  const { data: resetRecord, error: resetError } = await supabase
    .from('password_resets')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single();

  if (resetError || !resetRecord) {
    res.status(400).json({ error: '无效的重置链接或验证码' });
    return;
  }

  // 检查是否过期
  if (new Date(resetRecord.expires_at) < new Date()) {
    res.status(400).json({ error: '重置链接已过期，请重新申请' });
    return;
  }

  // 更新密码
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: newPasswordHash })
    .eq('id', resetRecord.user_id);

  if (updateError) {
    res.status(500).json({ error: '密码重置失败，请重试' });
    return;
  }

  // 标记 token 为已使用
  await supabase.from('password_resets').update({ used: true }).eq('id', resetRecord.id);

  // 吊销该用户所有 refresh token
  await revokeAllUserTokens(resetRecord.user_id);

  res.json({ success: true, message: '密码重置成功，请使用新密码登录' });
});

export default router;
