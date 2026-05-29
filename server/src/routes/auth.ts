import { Router, IRouter, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

const router: IRouter = Router();

// ============================================================
// GET /api/v1/auth/me
// 获取当前登录用户的完整信息（含孩子列表）
// ============================================================
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const username = req.user!.username;

  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, name, age, gender, avatar, fruits_balance')
    .eq('parent_id', userId)
    .eq('is_deleted', false);

  if (childrenError) {
    const activeKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
    const keyPreview = activeKey ? activeKey.substring(0, 30) + '...' : '(not set)';
    console.error('[/me] 获取孩子列表失败:', JSON.stringify(childrenError));
    console.error('[/me] 诊断 - userId:', userId);
    console.error('[/me] 诊断 - key source:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_SERVICE_KEY');
    console.error('[/me] 诊断 - key preview:', keyPreview);
  } else {
    console.log('[/me] 查询成功 - userId:', userId, '| children count:', children?.length ?? 0);
  }

  // 尝试从 profiles 表获取 phone（如果存在）
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .maybeSingle();

  res.json({
    data: {
      id: userId,
      username,
      phone: profile?.phone || null,
      children: children || [],
    },
  });
});

// ============================================================
// POST /api/v1/auth/register-children
// 注册后创建孩子记录（由前端在 signUp 成功后调用）
// ============================================================
router.post('/register-children', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const username = req.user!.username;
  const { phone, children } = req.body;

  if (!children || !Array.isArray(children) || children.length === 0) {
    res.status(400).json({ error: '请至少添加一个孩子信息' });
    return;
  }

  // 如果提供了手机号，更新 profiles 表
  if (phone) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ phone })
      .eq('id', userId);

    if (profileError) {
      console.error('[register-children] 更新 profile 失败:', profileError);
    }
  }

  // 创建孩子记录
  const childrenData = children.map((child: { name: string; age?: number; gender?: string }) => ({
    parent_id: userId,
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
    console.error('[register-children] 创建孩子失败:', childrenError);
    res.status(500).json({ error: '创建孩子信息失败', details: childrenError.message });
    return;
  }

  res.status(201).json({
    data: {
      id: userId,
      username,
      phone: phone || null,
      children: newChildren || [],
    },
    message: '注册成功',
  });
});

export default router;
