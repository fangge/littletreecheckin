import { Request, Response, Router, type Express } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types.js';
import webPush from 'web-push';
import { pushScheduler } from '../cron/pushScheduler.js';
import { sendDailyCheckinSummary } from '../services/pushService.js';

const router: ReturnType<typeof Router> = Router();

// ============================================================
// VAPID 配置（动态获取环境变量）
// ============================================================
console.log('[Push] 模块加载时环境变量检查:');
console.log('  VAPID_PUBLIC_KEY:', process.env.VAPID_PUBLIC_KEY ? `已设置 (${process.env.VAPID_PUBLIC_KEY.length} 字符)` : '❌ 未设置');
console.log('  VAPID_PRIVATE_KEY:', process.env.VAPID_PRIVATE_KEY ? `已设置 (${process.env.VAPID_PRIVATE_KEY.length} 字符)` : '❌ 未设置');
console.log('  VAPID_EMAIL:', process.env.VAPID_EMAIL || '❌ 未设置');

// 动态获取 VAPID 配置的辅助函数
function getVapidConfig() {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    email: process.env.VAPID_EMAIL || 'noreply@example.com',
  };
}

// 检查推送是否启用
function isPushEnabled(): boolean {
  const config = getVapidConfig();
  return !!(config.publicKey && config.privateKey);
}

// 初始化 web-push（如果配置可用）
function initWebPush(): boolean {
  const config = getVapidConfig();
  if (!config.publicKey || !config.privateKey) {
    console.warn('[Push] 未配置 VAPID 密钥，推送功能已禁用');
    return false;
  }

  try {
    webPush.setVapidDetails(
      `mailto:${config.email}`,
      config.publicKey,
      config.privateKey
    );
    console.log('[Push] ✅ VAPID 配置成功，推送功能已启用');
    return true;
  } catch (error) {
    console.error('[Push] ❌ VAPID 配置失败:', error);
    return false;
  }
}

/**
 * 获取 VAPID 公钥（无需认证）
 */
router.get('/vapid-key', async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('[Push] 收到 VAPID 公钥请求');
    const config = getVapidConfig();
    console.log('[Push] VAPID_PUBLIC_KEY 长度:', config.publicKey?.length || 0);
    console.log('[Push] VAPID_PUBLIC_KEY 前20字符:', config.publicKey?.substring(0, 20) || '(空)');
    console.log('[Push] isPushEnabled:', isPushEnabled());
    
    if (!isPushEnabled()) {
      console.warn('[Push] ⚠️ 推送功能未启用，返回空公钥');
      res.json({
        success: false,
        error: '推送功能未启用',
        data: {
          vapidPublicKey: '',
        },
      });
      return;
    }

    // 初始化 web-push
    initWebPush();

    console.log('[Push] ✅ 返回 VAPID 公钥');
    res.json({
      success: true,
      data: {
        vapidPublicKey: config.publicKey,
      },
    });
  } catch (error) {
    console.error('[Push] ❌ 获取 VAPID 公钥失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 订阅推送（需要认证）
 */
router.post('/subscribe', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isPushEnabled()) {
      res.status(503).json({
        success: false,
        error: '推送功能未启用，请联系管理员配置 VAPID 密钥'
      });
      return;
    }

    // 确保 web-push 已初始化
    initWebPush();

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

/**
 * 欢迎推送（需要认证）
 * 用户打开页面时发送一次欢迎提醒
 */
router.post('/welcome', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isPushEnabled()) {
      res.status(503).json({
        success: false,
        error: '推送功能未启用'
      });
      return;
    }

    // 确保 web-push 已初始化
    initWebPush();

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    console.log('[Push] 发送欢迎推送，用户:', userId);

    // 获取用户订阅信息
    const { data: subscriptionData, error: subError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError || !subscriptionData) {
      console.log('[Push] 用户未订阅推送:', userId);
      res.status(404).json({ success: false, error: '未找到订阅信息' });
      return;
    }

    // 获取用户信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    const username = userData?.username || '家长';

    // 获取用户的所有孩子
    const { data: children } = await supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', userId);

    // 获取今天的打卡情况
    const today = new Date().toISOString().split('T')[0];
    let bodyText = `${username}，欢迎回来！`;

    if (children && children.length > 0) {
      const checkinSummary = [];
      
      for (const child of children) {
        // 获取孩子的任务总数
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('child_id', child.id);

        // 获取今天已完成的任务数
        const { data: completions } = await supabase
          .from('task_completions')
          .select('task_id')
          .eq('child_id', child.id)
          .eq('date', today);

        const totalTasks = tasks?.length || 0;
        const completedTasks = completions?.length || 0;

        if (totalTasks > 0) {
          checkinSummary.push(`${child.name}: ${completedTasks}/${totalTasks}`);
        }
      }

      if (checkinSummary.length > 0) {
        bodyText += '\n\n📊 今日打卡情况：\n' + checkinSummary.join('\n');
      }
    }

    // 发送推送
    const payload = {
      title: '🌿 成就丛林',
      body: bodyText,
      icon: '/logo2.png',
      badge: '/logo2.png',
      url: '/',
    };

    try {
      await webPush.sendNotification(
        subscriptionData.subscription as any,
        JSON.stringify(payload)
      );
      console.log('[Push] ✅ 欢迎推送发送成功');
      res.json({
        success: true,
        message: '欢迎推送已发送',
        timestamp: new Date().toISOString()
      });
    } catch (pushError: any) {
      // 处理推送失败（如订阅已过期）
      console.error('[Push] 推送发送失败 - 详细错误:', {
        message: pushError.message,
        statusCode: pushError.statusCode,
        body: pushError.body,
        stack: pushError.stack
      });
      
      if (pushError.statusCode === 404 || pushError.statusCode === 410) {
        console.log('[Push] 订阅已失效，删除订阅记录');
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId);
        res.status(410).json({ success: false, error: '订阅已失效' });
      } else {
        res.status(500).json({ success: false, error: '推送发送失败' });
      }
    }
  } catch (error) {
    console.error('[Push] 欢迎推送失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * 测试推送（需要认证，仅管理员）
 * 手动触发一次推送，用于测试推送功能是否正常
 */
router.post('/test', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isPushEnabled()) {
      res.status(503).json({
        success: false,
        error: '推送功能未启用'
      });
      return;
    }

    // 确保 web-push 已初始化
    initWebPush();

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    console.log('[Push] 手动触发测试推送，用户:', userId);
    
    // 触发推送调度器的手动推送
    await pushScheduler.triggerDailySummary();

    res.json({
      success: true,
      message: '测试推送已触发，请检查是否收到通知',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Push] 测试推送失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ============================================================
// Vercel Cron Jobs 端点
// ============================================================

/**
 * Vercel Cron Job - 早晨推送 (8:00 中国时间 = 0:00 UTC)
 */
router.get('/cron/morning', async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证请求来自 Vercel Cron（可选，增加安全性）
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron] 未授权的 Cron 请求');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    console.log('[Cron] ☀️ 触发早晨推送 (8:00 中国时间)');
    await sendDailyCheckinSummary();
    
    res.json({
      success: true,
      message: '早晨推送已触发',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] 早晨推送失败:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Vercel Cron Job - 午间推送 (12:00 中国时间 = 4:00 UTC)
 */
router.get('/cron/noon', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron] 未授权的 Cron 请求');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    console.log('[Cron] 🌤️ 触发午间推送 (12:00 中国时间)');
    await sendDailyCheckinSummary();
    
    res.json({
      success: true,
      message: '午间推送已触发',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] 午间推送失败:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Vercel Cron Job - 晚间推送 (21:30 中国时间 = 13:30 UTC)
 */
router.get('/cron/evening', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron] 未授权的 Cron 请求');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    console.log('[Cron] 🌙 触发晚间推送 (21:30 中国时间)');
    await sendDailyCheckinSummary();
    
    res.json({
      success: true,
      message: '晚间推送已触发',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] 晚间推送失败:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
