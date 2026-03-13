import { Router, Request, Response, IRouter } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/v1/auth/register
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
    // 回滚：删除已创建的用户
    await supabase.from('users').delete().eq('id', newUser.id);
    res.status(500).json({ error: '创建孩子信息失败' });
    return;
  }

  // 生成 JWT
  const token = jwt.sign(
    { id: newUser.id, username: newUser.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  res.status(201).json({
    data: {
      token,
      user: { ...newUser, children: newChildren },
    },
    message: '注册成功',
  });
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  // 查询用户（支持用户名或手机号登录）
  const { data: user } = await supabase
    .from('users')
    .select('id, username, phone, password_hash, created_at')
    .or(`username.eq.${username},phone.eq.${username}`)
    .single();

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
  const { data: children } = await supabase
    .from('children')
    .select('id, name, age, gender, avatar, fruits_balance')
    .eq('parent_id', user.id)
    .eq('is_deleted', false);

  // 生成 JWT
  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  const { password_hash: _, ...userWithoutPassword } = user;

  res.json({
    data: {
      token,
      user: { ...userWithoutPassword, children: children || [] },
    },
    message: '登录成功',
  });
});

// GET /api/v1/auth/me
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

// POST /api/v1/auth/logout
router.post('/logout', authMiddleware, (_req: AuthRequest, res: Response): void => {
  // JWT 无状态，客户端删除 token 即可
  res.json({ message: '已退出登录' });
});

// POST /api/v1/auth/verify-password
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

// POST /api/v1/auth/change-password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user!.id;

  // 验证输入
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

  // 获取当前用户
  const { data: user } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  // 验证当前密码
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    res.status(401).json({ error: '当前密码错误' });
    return;
  }

  // 加密新密码
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // 更新密码
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: newPasswordHash })
    .eq('id', userId);

  if (updateError) {
    res.status(500).json({ error: '密码更新失败，请重试' });
    return;
  }

  res.json({ success: true, message: '密码修改成功' });
});

export default router;