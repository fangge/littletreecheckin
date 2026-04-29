import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// 全局事件：SW 更新可用
declare global {
  interface WindowEventMap {
    'pwa-update-available': CustomEvent;
  }
}

export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // 防止重复弹出的锁：用户点击"立即更新"后的一段时间内不再提示
  const [updateLockUntil, setUpdateLockUntil] = useState<number>(0);

  useEffect(() => {
    // 监听 SW 更新事件
    const handleUpdate = () => {
      // 防重复：如果在冷却期内，忽略该事件
      if (Date.now() < updateLockUntil) return;
      setShowUpdate(true);
    };
    window.addEventListener('pwa-update-available', handleUpdate);

    // 检查是否已安装 PWA
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;

    // 检查是否在冷却期内（用户最近拒绝过安装）
    const installDismissedUntil = parseInt(localStorage.getItem('pwa-install-dismissed-until') || '0');
    const isInCooldown = Date.now() < installDismissedUntil;

    if (!isInstalled && !isInCooldown) {
      // 监听浏览器原生安装提示事件
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        const promptEvent = e as BeforeInstallPromptEvent;
        setDeferredPrompt(promptEvent);
        
        // 延迟一小段时间后自动触发浏览器原生安装提示
        // 这样用户体验更好，不会立即弹出
        setTimeout(() => {
          promptEvent.prompt().catch(() => {
            // 如果浏览器原生提示失败，显示自定义弹窗
            setShowInstall(true);
          });
        }, 2000);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      // 对于不支持 beforeinstallprompt 的浏览器（如 iOS Safari）
      // 延迟显示自定义安装指引
      const timer = setTimeout(() => {
        if (!deferredPrompt && !isInstalled) {
          setShowInstall(true);
        }
      }, 5000);

      return () => {
        window.removeEventListener('pwa-update-available', handleUpdate);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, [deferredPrompt, updateLockUntil]);

  const handleUpdate = () => {
    setShowUpdate(false);
    // 设置 10 秒冷却期，防止 reload 后 SW updatefound 事件再次触发弹窗
    setUpdateLockUntil(Date.now() + 10_000);

    // 发送消息给 SW 让其跳过等待
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }).catch(() => {});
    }

    // 延迟一小段时间确保 SW 消息发送完成后再 reload
    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      // 如果有浏览器原生提示，使用它
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowInstall(false);
        } else {
          // 用户拒绝，设置 7 天冷却期
          const cooldownUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
          localStorage.setItem('pwa-install-dismissed-until', cooldownUntil.toString());
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('安装提示失败:', err);
      }
    }
    setShowInstall(false);
  };

  const handleDismissInstall = () => {
    setShowInstall(false);
    // 用户点击"暂不安装"，设置 7 天冷却期
    const cooldownUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa-install-dismissed-until', cooldownUntil.toString());
  };

  if (!showUpdate && !showInstall) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        {showUpdate ? (
          <>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">发现新版本</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">已有更新可用</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
              应用已更新到最新版本，点击下方按钮刷新即可体验新功能。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpdate(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                稍后再说
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                立即更新
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">安装应用</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">添加到主屏幕</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
              安装「成就丛林」到手机主屏幕，获得更好的使用体验。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDismissInstall}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                暂不安装
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                安装
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
