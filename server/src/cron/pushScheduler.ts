import cron from 'node-cron';
import { sendDailyCheckinSummary } from '../services/pushService.js';

/**
 * 推送定时任务调度器
 */
export class PushScheduler {
  private static instance: PushScheduler;
  private isPushEnabled: boolean;

  private constructor() {
    // 检查 VAPID 密钥是否配置
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    this.isPushEnabled = !!(vapidPublicKey && vapidPrivateKey);
  }

  static getInstance(): PushScheduler {
    if (!PushScheduler.instance) {
      PushScheduler.instance = new PushScheduler();
    }
    return PushScheduler.instance;
  }

  /**
   * 启动定时任务
   */
  start(): void {
    if (!this.isPushEnabled) {
      console.log('[PushScheduler] 推送功能未启用，跳过定时任务启动');
      return;
    }

    console.log('[PushScheduler] 启动定时任务...');
    console.log('[PushScheduler] 时区设置: Asia/Shanghai (UTC+8)');

    // 早上 8:00 推送 - 提醒开始新的一天
    cron.schedule('0 8 * * *', async () => {
      console.log('[PushScheduler] 触发早晨打卡提醒推送 (8:00)');
      await sendDailyCheckinSummary();
    }, {
      timezone: 'Asia/Shanghai'
    });

    // 中午 12:00 推送 - 午间打卡提醒
    cron.schedule('0 12 * * *', async () => {
      console.log('[PushScheduler] 触发午间打卡提醒推送 (12:00)');
      await sendDailyCheckinSummary();
    }, {
      timezone: 'Asia/Shanghai'
    });

    // 晚上 21:30 推送 - 每日打卡汇总
    cron.schedule('30 21 * * *', async () => {
      console.log('[PushScheduler] 触发每日打卡汇总推送 (21:30)');
      await sendDailyCheckinSummary();
    }, {
      timezone: 'Asia/Shanghai'
    });

    console.log('[PushScheduler] 定时任务已启动:');
    console.log('  - 早上 08:00 (中国时间)');
    console.log('  - 中午 12:00 (中国时间)');
    console.log('  - 晚上 21:30 (中国时间)');
  }

  /**
   * 手动触发推送（用于测试）
   */
  async triggerDailySummary(): Promise<void> {
    console.log('[PushScheduler] 手动触发打卡汇总推送');
    await sendDailyCheckinSummary();
  }
}

export const pushScheduler = PushScheduler.getInstance();
