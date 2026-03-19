#!/usr/bin/env node

/**
 * 生成本地开发用的自签名 HTTPS 证书
 * 使用 mkcert 或 openssl
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.join(__dirname, '..', '.cert');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// 创建证书目录
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

// 检查证书是否已存在
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ HTTPS 证书已存在');
  process.exit(0);
}

console.log('🔐 生成本地 HTTPS 证书...');

try {
  // 尝试使用 mkcert（推荐）
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
    console.log('使用 mkcert 生成证书...');
    execSync(`mkcert -key-file ${keyPath} -cert-file ${certPath} localhost 127.0.0.1 ::1`, {
      stdio: 'inherit'
    });
    console.log('✅ 证书生成成功！');
  } catch {
    // 如果 mkcert 不可用，使用 openssl
    console.log('使用 openssl 生成自签名证书...');
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' ` +
      `-keyout ${keyPath} -out ${certPath} -days 365`,
      { stdio: 'inherit' }
    );
    console.log('✅ 证书生成成功！');
    console.log('⚠️  浏览器会显示证书警告，点击"继续访问"即可');
  }
} catch (error) {
  console.error('❌ 证书生成失败:', error.message);
  console.log('\n💡 解决方案：');
  console.log('1. 安装 mkcert: https://github.com/FiloSottile/mkcert');
  console.log('   macOS: brew install mkcert && mkcert -install');
  console.log('   Windows: choco install mkcert && mkcert -install');
  console.log('2. 或者在 vite.config.ts 中移除 https 配置');
  process.exit(1);
}
