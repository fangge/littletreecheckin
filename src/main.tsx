import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import router from './router';

// ============================================================
// 移动端调试：URL 包含 ?debug=1 时加载 vConsole
// 用法：访问 https://xxx.com/?debug=1
// ============================================================
const urlParams = new URLSearchParams(window.location.search);
const isDebug = urlParams.get('debug') === '1' || urlParams.get('debug') === 'true';

if (isDebug) {
  import('vconsole').then(({ default: VConsole }) => {
    const vc = new VConsole({
      target: document.body,
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    });

    // 调试模式视觉提示
    const debugBar = document.createElement('div');
    debugBar.id = '__debug-bar';
    debugBar.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
      background: linear-gradient(135deg, #e11d48, #f59e0b);
      color: white; font-family: -apple-system, sans-serif;
      font-size: 12px; font-weight: 600;
      text-align: center; padding: 4px 8px;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    `;
    debugBar.innerHTML = `<span>🔧 DEBUG MODE</span><span style="opacity:0.7;font-weight:400">${window.location.href}</span>`;
    
    // 点击关闭
    debugBar.addEventListener('click', () => {
      debugBar.style.display = 'none';
      vc.hide();
    });
    
    document.body.prepend(debugBar);

    // 控制台醒目提示
    console.log('%c🔧 Debug Mode Active', 'background:#e11d48;color:white;padding:4px 8px;border-radius:4px;font-size:14px;font-weight:bold;');
    console.log('%c访问地址: %s', 'color:#f59e0b', window.location.href);
    console.log('%c点击顶部橙色条可隐藏调试面板', 'color:#888');
  }).catch(() => {
    console.warn('[Debug] vConsole 加载失败');
  });
}

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
