import { useState, useEffect } from 'react';
import { pushService } from '../services/push';

interface PushSettingsProps {
  onSubscriptionChange?: (subscribed: boolean) => void;
}

export function PushSettings({ onSubscriptionChange }: PushSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      await pushService.initialize();
      setPermission(pushService.getPermissionState());
      const subscribed = await pushService.checkSubscriptionStatus();
      setIsSubscribed(subscribed);
      onSubscriptionChange?.(subscribed);
    } catch (error) {
      console.error('检查推送状态失败:', error);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await pushService.subscribe();
      if (success) {
        setIsSubscribed(true);
        setPermission('granted');
        onSubscriptionChange?.(true);
      }
    } catch (error) {
      console.error('订阅失败:', error);
      alert('订阅失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await pushService.unsubscribe();
      if (success) {
        setIsSubscribed(false);
        setPermission('default');
        onSubscriptionChange?.(false);
      }
    } catch (error) {
      console.error('取消订阅失败:', error);
      alert('取消订阅失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl p-4 shadow-sm border border-primary/5 dark:border-[var(--border-color)] transition-colors">
      <h3 className="text-slate-900 dark:text-[var(--text-primary)] text-base font-bold leading-tight mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-sm">
          {isSubscribed ? 'notifications_active' : 'notifications_none'}
        </span>
        消息推送设置
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-slate-900 dark:text-[var(--text-primary)] text-sm font-medium">
              每日打卡汇总通知
            </p>
            <p className="text-xs text-slate-500 dark:text-[var(--text-muted)] mt-1">
              每天 21:30 推送今日打卡情况
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <span className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-xs font-medium">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                已启用
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400 bg-slate-100 dark:bg-slate-700/30 px-3 py-1 rounded-full text-xs">
                <span className="material-symbols-outlined text-sm">cancel</span>
                未启用
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {!isSubscribed ? (
            <button
              onClick={handleSubscribe}
              disabled={isLoading || permission === 'denied'}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              <span className="material-symbols-outlined text-base">notifications</span>
              {isLoading ? '处理中...' : permission === 'denied' ? '权限被拒绝' : '开启推送'}
            </button>
          ) : (
            <button
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              <span className="material-symbols-outlined text-base">notifications_off</span>
              {isLoading ? '处理中...' : '关闭推送'}
            </button>
          )}
        </div>

        {permission === 'denied' && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-start gap-1">
            <span className="material-symbols-outlined text-sm mt-0.5">error</span>
            <span>您已拒绝推送权限。请在浏览器设置中允许通知后重试。</span>
          </p>
        )}

        {permission === 'default' && !isSubscribed && (
          <p className="text-xs text-slate-500 dark:text-[var(--text-muted)] mt-2">
            💡 开启后可及时接收孩子的打卡完成情况提醒
          </p>
        )}
      </div>
    </div>
  );
}
