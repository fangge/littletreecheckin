import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 使用文件绝对路径定位 .env，避免 CWD 不同导致路径错误
// server/src/config/supabase.ts -> server/src/config/ -> server/src/ -> server/ -> 项目根目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../..');
// .env.local 优先级高于 .env（dotenv 不覆盖已存在的变量）
dotenv.config({ path: resolve(rootDir, '.env.local') });
dotenv.config({ path: resolve(rootDir, '.env') });

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