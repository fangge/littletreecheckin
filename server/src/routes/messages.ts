import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';

const router: Router = Router();

// GET /api/v1/children/:childId/messages
router.get('/:childId/messages', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  const { data, error, count } = await supabase
    .from('messages')
    .select('id, sender_type, text, type, content, is_read, created_at', { count: 'exact' })
    .eq('child_id', childId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ error: '获取消息列表失败' });
    return;
  }

  res.json({
    data: data || [],
    pagination: { page, limit, total: count || 0 },
  });
});

// GET /api/v1/children/:childId/messages/unread-count
router.get('/:childId/messages/unread-count', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('is_read', false);

  if (error) {
    res.status(500).json({ error: '查询失败' });
    return;
  }

  res.json({ data: { unread_count: count || 0 } });
});

// POST /api/v1/messages
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { child_id, text, type, content } = req.body;

  if (!child_id) {
    res.status(400).json({ error: '孩子ID不能为空' });
    return;
  }

  if (type === 'text' && !text) {
    res.status(400).json({ error: '消息内容不能为空' });
    return;
  }

  if ((type === 'sticker' || type === 'image') && !content) {
    res.status(400).json({ error: '消息内容不能为空' });
    return;
  }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', child_id)
    .eq('is_deleted', false)
    .single();

  if (!child) {
    res.status(404).json({ error: '孩子不存在' });
    return;
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      child_id,
      sender_id: req.user!.id,
      sender_type: 'parent',
      text: text || null,
      type: type || 'text',
      content: content || null,
      is_read: false,
    })
    .select('id, sender_type, text, type, content, is_read, created_at')
    .single();

  if (error || !message) {
    res.status(500).json({ error: '发送消息失败' });
    return;
  }

  res.status(201).json({ data: message, message: '发送成功' });
});

// PUT /api/v1/messages/:messageId/read
router.put('/:messageId/read', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId);

  if (error) {
    res.status(500).json({ error: '标记失败' });
    return;
  }

  res.json({ message: '已标记为已读' });
});

// PUT /api/v1/children/:childId/messages/read-all
router.put('/:childId/messages/read-all', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { childId } = req.params;

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('child_id', childId)
    .eq('is_read', false);

  if (error) {
    res.status(500).json({ error: '批量标记失败' });
    return;
  }

  res.json({ message: '已全部标记为已读' });
});

export default router;