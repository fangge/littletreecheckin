import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions, type VerifyOptions, type JwtPayload } from 'jsonwebtoken';

const ACCESS_TOKEN_ISSUER = 'littletreecheckin';
const DEFAULT_ACCESS_TOKEN_TTL = '15m';

export interface AuthTokenUser {
  id: string;
  username: string;
}

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  username: string;
  role: 'parent' | 'child';
  token_type: 'access';
}

export interface OpaqueToken {
  token: string;
  tokenHash: string;
}

export interface ResetTokenRecord {
  token_hash: string;
  expires_at: Date | string;
  used_at: Date | string | null;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
};

export const hashPassword = (password: string): Promise<string> => {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
  return bcrypt.hash(password, rounds);
};

export const verifyPassword = (password: string, passwordHash: string): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};

export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

export const createOpaqueToken = (): OpaqueToken => {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
};

export const signAccessToken = (
  user: AuthTokenUser,
  options: Pick<SignOptions, 'expiresIn'> = {},
): string => {
  return jwt.sign(
    { username: user.username, role: 'parent', token_type: 'access' },
    getJwtSecret(),
    {
      subject: user.id,
      issuer: ACCESS_TOKEN_ISSUER,
      expiresIn: options.expiresIn
        || (process.env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'])
        || DEFAULT_ACCESS_TOKEN_TTL,
    },
  );
};

export const verifyAccessToken = (
  token: string,
  options: VerifyOptions = {},
): AccessTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret(), {
    issuer: ACCESS_TOKEN_ISSUER,
    ...options,
  });
  if (typeof decoded === 'string') throw new Error('Invalid access token claims');
  const payload = decoded as JwtPayload & Partial<AccessTokenPayload>;
  if (payload.token_type !== 'access' || typeof payload.sub !== 'string' || typeof payload.username !== 'string') {
    throw new Error('Invalid access token claims');
  }
  return {
    ...payload,
    sub: payload.sub,
    username: payload.username,
    role: payload.role === 'child' ? 'child' : 'parent',
    token_type: 'access',
  };
};

const hashesEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const isExpired = (value: Date | string): boolean => {
  const normalizedValue = typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;
  const timestamp = new Date(normalizedValue).getTime();
  return Number.isNaN(timestamp) || timestamp <= Date.now();
};

export const consumeResetToken = async (
  token: string,
  record: ResetTokenRecord | null,
  markUsed: () => Promise<boolean>,
): Promise<boolean> => {
  if (!record || record.used_at || isExpired(record.expires_at)) return false;
  if (!hashesEqual(hashToken(token), record.token_hash)) return false;
  return markUsed();
};
