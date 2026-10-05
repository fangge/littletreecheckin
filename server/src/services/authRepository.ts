import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';

export interface AuthDbUser {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  email_verified: boolean;
  must_change_password: boolean;
}

const rowsFrom = (rows: unknown): AuthDbUser[] => {
  return Array.isArray(rows) ? rows as (AuthDbUser & RowDataPacket)[] : [];
};

export const findAuthUserById = async (id: string): Promise<AuthDbUser | null> => {
  const [rows] = await pool.query(
    'SELECT id, email, username, password_hash, email_verified, must_change_password FROM auth_users WHERE id = ? LIMIT 1',
    [id],
  );
  return rowsFrom(rows)[0] || null;
};

export const findAuthUserByEmail = async (email: string): Promise<AuthDbUser | null> => {
  const [rows] = await pool.query(
    'SELECT id, email, username, password_hash, email_verified, must_change_password FROM auth_users WHERE email = ? LIMIT 1',
    [email],
  );
  return rowsFrom(rows)[0] || null;
};
