import { Request, Response, Router, IRouter } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';
import webPush from 'web-push';

const router: IRouter = Router();

// ============================================================
// VAPID 配置（环境变量中获取）
// ============================================================
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'noreply@example.com';

// 检查 VAPID 密钥是否配置
const isPushEnabled = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isPushEnabled) {
  // 配置 web-push
  try {
    webPush.setVapidDetails(
      `mailto:${VAPID_EMAIL}`,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    console.log('[Push] VAPID 配置成功，推送功能已启用');
  } catch (error) {
    console.error('[Push] VAPID 配置失败:', error);
    console.warn('[Push] 推送功能将不可用');
  }
} else {
  console.warn('[Push] 未配置 VAPID 密钥，推送功能已禁用');
  console.warn('[Push] 请设置 VAPID_PUBLIC_KEY 和 VAPID_PRIVATE_KEY 环境变量');
}

/**
 * 获取 VAPID 公钥（无需认证）
 */
router.get('/vapid-key', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!isPushEnabled) {
      res.json({
        success: false,
        error: '推送功能未启用',
        data: {
          vapidPublicKey: '',
          pushEnabled: false,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        vapidPublicKey: VAPID_PUBLIC_KEY,
        pushEnabled: true,
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
router.post('/subscribe', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isPushEnabled) {
      res.status(503).json({
        success: false,
        error: '推送功能未启用，请联系管理员配置 VAPID 密钥'
      });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const subscription = req.body;

    // 验证订阅信息格式
    if (!subscription.endpoint || !subscription.keys) {
      res.status(400).json({ success: false, error: '订阅信息格式错误' });
      return;
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
      res.status(500).json({ success: false, error: '保存订阅失败' });
      return;
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
router.delete('/unsubscribe', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[Push] 取消订阅失败:', error);
      res.status(500).json({ success: false, error: '取消订阅失败' });
      return;
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
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Push] 检查订阅状态失败:', error);
      res.status(500).json({ success: false, error: '服务器错误' });
      return;
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
