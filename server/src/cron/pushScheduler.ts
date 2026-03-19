/**
 * 推送定时任务调度器
 * 
 * ⚠️ 注意：此文件在 Vercel Serverless 环境中不会被使用
 * 
 * Vercel Serverless Functions 是按需执行的，没有持久运行的进程，
 * 因此 node-cron 无法在 Vercel 环境中工作。
 * 
 * 定时推送功能已改用 GitHub Actions 实现。
 * 详见：.github/workflows/push-notifications.yml
 * 
 * 本文件仅用于本地开发环境测试。
 */

import { sendDailyCheckinSummary } from '../services/pushService.js';

/**
 * 推送定时任务调度器（仅用于本地开发）
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
   * 启动定时任务（仅在本地开发环境有效）
   */
  start(): void {
    console.log('[PushScheduler] ⚠️  定时任务在 Vercel 环境中不会运行');
    console.log('[PushScheduler] 生产环境使用 GitHub Actions 实现定时推送');
    console.log('[PushScheduler] 详见：.github/workflows/push-notifications.yml');
    
    // 在 Vercel 环境中不启动定时任务
    if (process.env.VERCEL) {
      console.log('[PushScheduler] 检测到 Vercel 环境，跳过定时任务启动');
      return;
    }

    if (!this.isPushEnabled) {
      console.log('[PushScheduler] 推送功能未启用，跳过定时任务启动');
      return;
    }

    console.log('[PushScheduler] 本地开发环境：定时任务已禁用');
    console.log('[PushScheduler] 如需测试，请手动调用 API 端点：');
    console.log('[PushScheduler]   - GET /api/v1/push/cron/morning');
    console.log('[PushScheduler]   - GET /api/v1/push/cron/noon');
    console.log('[PushScheduler]   - GET /api/v1/push/cron/evening');

    // 本地开发环境也不启动 cron，避免混淆
    // 如需测试，请直接调用 API 端点
  }

  /**
   * 手动触发推送（用于测试）
   * @deprecated 请使用 API 端点 /api/v1/push/cron/{type} 代替
   */
  async triggerDailySummary(): Promise<void> {
    console.log('[PushScheduler] 手动触发打卡汇总推送');
    await sendDailyCheckinSummary();
  }
}

export const pushScheduler = PushScheduler.getInstance();
