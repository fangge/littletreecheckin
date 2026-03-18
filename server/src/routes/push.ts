import { Request, Response, Router } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import webPush from 'web-push';

const router = Router();

// ============================================================
// VAPID 配置（环境变量中获取）
// ============================================================
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || '';

// 配置 web-push
webPush.setVapidDetails(
  `mailto:${VAPID_EMAIL}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/**
 * 获取 VAPID 公钥（无需认证）
 */
router.get('/vapid-key', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        vapidPublicKey: VAPID_PUBLIC_KEY,
      },
    });
  } catch (error) {
    console.error('[Push] 获取 VAPID 公钥失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 订阅推送（需要认证）
 */
router.post('/subscribe', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    const subscription = req.body;

    // 验证订阅信息格式
    if (!subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, error: '订阅信息格式错误' });
    }

    // 保存订阅信息到数据库
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          subscription: subscription,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Push] 保存订阅失败:', error);
      return res.status(500).json({ success: false, error: '保存订阅失败' });
    }

    console.log('[Push] 用户订阅成功:', userId);
    res.json({ success: true, message: '订阅成功', data });
  } catch (error) {
    console.error('[Push] 订阅失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 取消订阅（需要认证）
 */
router.delete('/unsubscribe', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[Push] 取消订阅失败:', error);
      return res.status(500).json({ success: false, error: '取消订阅失败' });
    }

    console.log('[Push] 用户取消订阅:', userId);
    res.json({ success: true, message: '取消订阅成功' });
  } catch (error) {
    console.error('[Push] 取消订阅失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 检查订阅状态（需要认证）
 */
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Push] 检查订阅状态失败:', error);
      return res.status(500).json({ success: false, error: '服务器错误' });
    }

    res.json({
      success: true,
      data: {
        subscribed: !!data,
        subscription: data?.subscription || null,
      },
    });
  } catch (error) {
    console.error('[Push] 检查订阅状态失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
