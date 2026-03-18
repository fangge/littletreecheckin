#!/usr/bin/env node

/**
 * VAPID 密钥生成脚本
 * 运行: node server/scripts/generate-vapid-keys.js
 */

import webPush from 'web-push';

// 生成 VAPID 密钥对
const vapidKeys = webPush.generateVAPIDKeys();

console.log('='.repeat(60));
console.log('🔐 VAPID 密钥生成完成');
console.log('='.repeat(60));
console.log('');
console.log('请将以下配置添加到您的 .env 文件中：');
console.log('');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('VAPID_EMAIL=your_email@example.com');
console.log('');
console.log('⚠️  重要提示：');
console.log('  - VAPID_PRIVATE_KEY 必须保密，不要提交到代码仓库');
console.log('  - VAPID_PUBLIC_KEY 可以在前端使用');
console.log('  - 请将 VAPID_EMAIL 替换为您的真实邮箱');
console.log('='.repeat(60));
