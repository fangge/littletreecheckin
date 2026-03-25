import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 使用文件绝对路径定位 .env（server/src/ -> server/ -> 项目根目录）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
// .env.local 优先级高于 .env
dotenv.config({ path: resolve(rootDir, '.env.local') });
dotenv.config({ path: resolve(rootDir, '.env') });

import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🌳 成就丛林后端服务已启动: http://localhost:${PORT}`);
  console.log(`📋 健康检查: http://localhost:${PORT}/health`);
});

export default app;