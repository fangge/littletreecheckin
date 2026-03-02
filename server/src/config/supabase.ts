import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 在 Vercel 环境中，环境变量由 Vercel 直接注入，不需要 dotenv
// 在本地开发时，由此处加载 .env 文件
if (!process.env.VERCEL) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // server/src/config/ -> server/src/ -> server/ -> 项目根目录
  const rootDir = resolve(__dirname, '../../..');
  dotenv.config({ path: resolve(rootDir, '.env.local') });
  dotenv.config({ path: resolve(rootDir, '.env') });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
}

// 使用 service key 绕过 RLS，后端完全控制数据访问
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});