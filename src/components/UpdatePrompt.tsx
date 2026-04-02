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

  useEffect(() => {
    // 监听 SW 更新事件
    const handleUpdate = () => setShowUpdate(true);
    window.addEventListener('pwa-update-available', handleUpdate);

    // 监听安装提示事件
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 检查是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false);
    }

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdate);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleUpdate = () => {
    setShowUpdate(false);
    // 发送消息给 SW 让其跳过等待
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
    window.location.reload();
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
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
                onClick={() => setShowInstall(false)}
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
