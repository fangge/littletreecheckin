import { supabase } from '../config/supabase.js';

// ============================================================
// 推送通知服务
// ============================================================

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

/**
 * 发送推送通知到单个订阅
 */
async function sendPushToSubscription(
  subscription: PushSubscriptionData,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    const vapidEmail = process.env.VAPID_EMAIL || '';

    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      throw new Error('VAPID 配置缺失，请检查环境变量');
    }

    // 设置 VAPID 详情
    const webPush = (await import('web-push')).default;
    webPush.setVapidDetails(
      `mailto:${vapidEmail}`,
      vapidPublicKey,
      vapidPrivateKey
    );

    await webPush.sendNotification(
      subscription as any,
      JSON.stringify(payload)
    );

    console.log('[Push] 推送成功:', subscription.endpoint);
    return { success: true };
  } catch (error: any) {
    // 处理已过期或无效的订阅
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('[Push] 订阅已失效:', subscription.endpoint);
      return { success: false, error: 'subscription_expired' };
    }
    console.error('[Push] 推送失败:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 发送推送通知到所有订阅用户
 */
export async function sendPushToAllUsers(payload: NotificationPayload): Promise<number> {
  try {
    // 获取所有订阅
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription, user_id');

    if (error) {
      console.error('[Push] 获取订阅列表失败:', error);
      return 0;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] 没有订阅用户');
      return 0;
    }

    // 并发发送推送
    const results = await Promise.all(
      subscriptions.map(async ({ subscription, user_id }) => {
        const result = await sendPushToSubscription(subscription, payload);
        if (!result.success && result.error === 'subscription_expired') {
          // 推送失败且订阅已失效，删除无效订阅
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user_id);
        }
        return result;
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`[Push] 推送完成: ${successCount}/${subscriptions.length} 成功`);

    return successCount;
  } catch (error) {
    console.error('[Push] 批量推送失败:', error);
    return 0;
  }
}

/**
 * 发送推送通知到指定用户
 */
export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      console.log('[Push] 用户未订阅:', userId);
      return false;
    }

    const result = await sendPushToSubscription(subscription.subscription, payload);
    return result.success;
  } catch (error) {
    console.error('[Push] 推送给用户失败:', error);
    return false;
  }
}

/**
 * 每日打卡情况推送（定时任务）
 */
export async function sendDailyCheckinSummary(): Promise<void> {
  try {
    const startTime = new Date().toISOString();
    console.log('='.repeat(60));
    console.log(`[Push] 📢 开始发送每日打卡汇总 - ${startTime}`);
    console.log('='.repeat(60));

    // 获取所有家长用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError || !users) {
      console.error('[Push] ❌ 获取用户列表失败:', usersError);
      return;
    }

    console.log(`[Push] 📋 找到 ${users.length} 个用户`);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    console.log(`[Push] 📅 今日日期: ${today}`);

    let totalPushSent = 0;
    let totalPushFailed = 0;

    // 为每个用户构建个性化推送
    for (const user of users) {
      console.log(`[Push] 👤 处理用户: ${user.username} (${user.id})`);
      // 获取用户的所有孩子
      const { data: children, error: childrenError } = await supabase
        .from('children')
        .select('id, name, avatar')
        .eq('user_id', user.id);

      if (childrenError || !children || children.length === 0) {
        console.log(`[Push]   ⚠️  用户 ${user.username} 没有孩子，跳过`);
        continue;
      }

      console.log(`[Push]   👶 找到 ${children.length} 个孩子`);

      // 获取每个孩子今天的打卡情况
      const checkinSummary: { name: string; completed: number; total: number }[] = [];

      for (const child of children) {
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .eq('child_id', child.id);

        if (tasksError || !tasks) continue;

        const { data: completions, error: completionsError } = await supabase
          .from('task_completions')
          .select('task_id')
          .eq('child_id', child.id)
          .eq('date', today);

        if (completionsError) continue;

        checkinSummary.push({
          name: child.name,
          completed: completions?.length || 0,
          total: tasks.length,
        });
      }

      // 构建推送消息
      const completedChildren = checkinSummary.filter(c => c.completed === c.total).length;
      const totalChildren = checkinSummary.length;

      let title = '🌿 成就丛林 - 今日打卡汇总';
      let body = '';

      if (completedChildren === totalChildren) {
        body = `太棒了！所有孩子今天都完成了所有任务！`;
      } else if (completedChildren > 0) {
        body = `${completedChildren}/${totalChildren} 个孩子完成了所有任务，继续加油！`;
      } else {
        body = `今天还没有孩子完成所有任务，记得提醒他们哦！`;
      }

      // 添加详细情况
      const details = checkinSummary
        .map(c => `${c.name}: ${c.completed}/${c.total}`)
        .join('\n');
      body += `\n\n${details}`;

      // 发送推送
      console.log(`[Push]   📤 发送推送给用户 ${user.username}`);
      console.log(`[Push]      标题: ${title}`);
      console.log(`[Push]      内容: ${body.substring(0, 50)}...`);
      
      const success = await sendPushToUser(user.id, {
        title,
        body,
        icon: '/logo2.png',
        badge: '/logo2.png',
        url: '/',
      });

      if (success) {
        totalPushSent++;
        console.log(`[Push]   ✅ 推送成功`);
      } else {
        totalPushFailed++;
        console.log(`[Push]   ❌ 推送失败（用户可能未订阅）`);
      }
    }

    const endTime = new Date().toISOString();
    console.log('='.repeat(60));
    console.log(`[Push] 📊 每日打卡汇总推送完成 - ${endTime}`);
    console.log(`[Push] 📈 统计: 成功 ${totalPushSent} / 失败 ${totalPushFailed} / 总计 ${users.length}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('[Push] 每日打卡汇总失败:', error);
  }
}
