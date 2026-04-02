import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// PWA 版本更新插件：构建时自动更新 sw.js 中的缓存版本号
function pwaVersionPlugin() {
  return {
    name: 'pwa-version',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(swPath)) {
        const version = Date.now().toString();
        let content = fs.readFileSync(swPath, 'utf-8');
        content = content.replace(
          /const CACHE_NAME = 'happygrow-[^']+';/,
          `const CACHE_NAME = 'happygrow-${version}';`
        );
        content = content.replace(
          /const STATIC_CACHE_NAME = 'happygrow-static-[^']+';/,
          `const STATIC_CACHE_NAME = 'happygrow-static-${version}';`
        );
        fs.writeFileSync(swPath, content);
        console.log(`[PWA] Cache version updated to: ${version}`);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  // 检查是否存在本地 HTTPS 证书
  const certPath = path.resolve(__dirname, '.cert/cert.pem');
  const keyPath = path.resolve(__dirname, '.cert/key.pem');
  return {
    plugins: [react(), tailwindcss(), pwaVersionPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // 本地开发：将 /api 请求代理到后端服务器，避免跨域问题
      // 生产环境（Vercel）：/api 请求由 Vercel Serverless Function 处理，无需代理
      proxy: {
        '/api': {
          target: `http://localhost:${env.PORT || '3001'}`,
          changeOrigin: true,
        },
      },
    },
  };
});
