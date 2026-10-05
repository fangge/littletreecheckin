import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const projectDirectory = resolve(scriptDirectory, '..', '..');
dotenv.config({ path: resolve(projectDirectory, '.env.local') });
dotenv.config({ path: resolve(projectDirectory, '.env') });

const users = [
  { id: '31e8abe1-e962-4a2d-8ef8-7a76bf3d59fa', email: '19630642@qq.com', username: 'Jo' },
  { id: '6ea7dfb0-87d0-4b43-b3a8-1657a7de6af2', email: '420249001@qq.com', username: 'vitionxp' },
  { id: 'bae3f9e4-c67f-4ee5-92db-5d32b622c3b3', email: 'fangge-sun@163.com', username: 'mrfangge' },
];

const readInitialPassword = async () => {
  if (process.env.INITIAL_AUTH_PASSWORD) return process.env.INITIAL_AUTH_PASSWORD;
  if (!input.isTTY) throw new Error('请在交互终端运行账号导入，或通过受保护的临时环境变量提供初始密码');
  const readline = createInterface({ input, output });
  try {
    const password = await readline.question('请输入三个迁移账号的初始密码（输入不会写入数据库明文）：');
    return password;
  } finally {
    readline.close();
  }
};

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const initialPassword = await readInitialPassword();
  if (initialPassword.length < 6) throw new Error('初始密码至少需要6位');

  const passwordHash = await bcrypt.hash(initialPassword, Number(process.env.BCRYPT_ROUNDS || 12));
  const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, charset: 'utf8mb4', timezone: 'Z' });
  try {
    for (const user of users) {
      const [result] = await connection.query(
        `INSERT INTO auth_users (id, email, username, password_hash, email_verified, must_change_password)
         VALUES (?, ?, ?, ?, 1, 1)
         ON DUPLICATE KEY UPDATE email = VALUES(email), username = VALUES(username), email_verified = 1`,
        [user.id, user.email, user.username, passwordHash],
      );
      await connection.query(
        `INSERT INTO profiles (id, username)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE username = VALUES(username), updated_at = CURRENT_TIMESTAMP(3)`,
        [user.id, user.username],
      );
      const affectedRows = Number(result.affectedRows || 0);
      console.log(`Processed account ${user.email}: ${affectedRows ? 'created' : 'unchanged'}`);
    }
  } finally {
    await connection.end();
  }
};

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) await main();

export { users };
