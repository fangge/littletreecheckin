import { useState, useEffect } from 'react';
import ChangelogModal from './ChangelogModal';

// 当前应用版本号，每次发版时更新此常量
const APP_VERSION = '3.4';
const VERSION_STORAGE_KEY = 'app_last_seen_version';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    'pwa-install-prompt': CustomEvent;
  }
}

export default function UpdatePrompt() {
  const [showChangelog, setShowChangelog] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 检测版本号：如果本地存储的版本与当前版本不同，则弹出更新日志
    const lastSeenVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    if (lastSeenVersion !== APP_VERSION) {
      setShowChangelog(true);
    }

    // 监听手动触发的安装提示事件
    const handleInstallPrompt = () => {
      setShowInstall(true);
    };
    window.addEventListener('pwa-install-prompt', handleInstallPrompt);

    // 监听浏览器原生安装提示事件（保存 prompt 对象，但不自动触发）
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('pwa-install-prompt', handleInstallPrompt);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleChangelogClose = () => {
    // 关闭更新日志时，将当前版本号保存到本地存储
    localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
    setShowChangelog(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowInstall(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('安装提示失败:', err);
      }
    }
    setShowInstall(false);
  };

  return (
    <>
      {/* 版本更新日志弹层 */}
      <ChangelogModal isOpen={showChangelog} onClose={handleChangelogClose} />

      {/* PWA 安装提示弹层 */}
      {showInstall && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
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
                取消
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                安装
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
