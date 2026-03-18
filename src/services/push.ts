// ============================================================
// 推送通知服务 - PWA Push Notifications
// ============================================================

import { pushApi } from './api';

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * 初始化推送服务
   */
  async initialize(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push] 推送通知不支持');
        return false;
      }

      this.registration = await navigator.serviceWorker.getRegistration();
      if (!this.registration) {
        console.warn('[Push] Service Worker 未注册');
        return false;
      }

      console.log('[Push] 推送服务已初始化');
      return true;
    } catch (error) {
      console.error('[Push] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 检查推送权限状态
   */
  getPermissionState(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * 请求推送权限
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('浏览器不支持通知');
    }

    const permission = await Notification.requestPermission();
    console.log('[Push] 权限状态:', permission);
    return permission;
  }

  /**
   * 订阅推送
   */
  async subscribe(): Promise<PushSubscription | null> {
    try {
      if (!this.registration) {
        throw new Error('Service Worker 未初始化');
      }

      // 请求权限
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('推送权限被拒绝');
      }

      // 获取 VAPID 公钥
      const { data } = await pushApi.getVapidKey();
      const vapidKey = data.vapidPublicKey;

      // 订阅推送
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToBufferSource(vapidKey),
      });

      // 发送订阅信息到后端
      await pushApi.subscribe(subscription);

      console.log('[Push] 订阅成功:', subscription);
      return subscription;
    } catch (error) {
      console.error('[Push] 订阅失败:', error);
      return null;
    }
  }

  /**
   * 取消订阅
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.registration) {
        throw new Error('Service Worker 未初始化');
      }

      const subscription = await this.registration.pushManager.getSubscription();
      if (!subscription) {
        console.log('[Push] 未订阅');
        return true;
      }

      await subscription.unsubscribe();
      await pushApi.unsubscribe(subscription);

      console.log('[Push] 取消订阅成功');
      return true;
    } catch (error) {
      console.error('[Push] 取消订阅失败:', error);
      return false;
    }
  }

  /**
   * 检查订阅状态
   */
  async checkSubscriptionStatus(): Promise<boolean> {
    try {
      const { data } = await pushApi.status();
      return data.subscribed;
    } catch (error) {
      console.error('[Push] 检查订阅状态失败:', error);
      return false;
    }
  }

  /**
   * 获取当前订阅
   */
  async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null;
    return await this.registration.pushManager.getSubscription();
  }

  /**
   * URL Base64 转 Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * URL Base64 转 BufferSource
   */
  private urlBase64ToBufferSource(base64String: string): BufferSource {
    return this.urlBase64ToUint8Array(base64String);
  }
}

// 导出单例
export const pushService = PushNotificationService.getInstance();
