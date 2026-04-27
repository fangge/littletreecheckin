import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import router from './router';

// ============================================================
// PWA 缓存版本检测：防止移动端因旧缓存导致白屏
// 每次构建时 Vite 会注入环境变量，版本号随构建变化
// ============================================================
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
const STORED_VERSION = localStorage.getItem('app_version');

if (STORED_VERSION && STORED_VERSION !== APP_VERSION) {
  console.log(`[App] 版本更新: ${STORED_VERSION} → ${APP_VERSION}，清除旧缓存...`);
  
  // 清除 API 数据缓存（保留认证状态和用户偏好）
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key &&
          !key.startsWith('auth_') &&
          key !== 'theme' &&
          key !== 'selected_child_id' &&
          key !== 'child_mode' &&
          key !== 'app_version') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // 尝试注销旧版 Service Worker（让新版本接管）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          console.log('[App] 注销旧 Service Worker:', reg.scope);
          reg.unregister();
        });
      }).catch(() => {});
    }
    
    // 更新版本号
    localStorage.setItem('app_version', APP_VERSION);
    
    // 使用 replace 避免浏览器后退历史问题
    window.location.replace(window.location.href);
  } catch (e) {
    console.warn('[App] 清除缓存失败:', e);
    // 即使清除失败也更新版本号，避免死循环
    localStorage.setItem('app_version', APP_VERSION);
  }
} else if (!STORED_VERSION) {
  localStorage.setItem('app_version', APP_VERSION);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
