import cron from 'node-cron';
import { sendDailyCheckinSummary } from '../services/pushService.js';

/**
 * 推送定时任务调度器
 */
export class PushScheduler {
  private static instance: PushScheduler;

  private constructor() {}

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
    console.log('[PushScheduler] 启动定时任务...');

    // 每天晚上 9:30 发送打卡汇总
    // Cron 表达式: 分 时 日 月 星期
    // 30 21 * * * = 每天 21:30
    cron.schedule('30 21 * * *', async () => {
      console.log('[PushScheduler] 触发每日打卡汇总推送');
      await sendDailyCheckinSummary();
    });

    // 可选：测试用 - 每分钟执行一次（调试时使用，生产环境请注释掉）
    // cron.schedule('* * * * *', async () => {
    //   console.log('[PushScheduler] 测试推送');
    //   await sendDailyCheckinSummary();
    // });

    console.log('[PushScheduler] 定时任务已启动 - 每天 21:30 发送打卡汇总');
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
