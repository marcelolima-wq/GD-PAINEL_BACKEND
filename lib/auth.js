import { createHmac, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'gd_session';
const TOKEN_ISSUER = 'gd-painel';
const TOKEN_AUDIENCE = 'gd-painel-web';
const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signatureFor(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function authConfiguration() {
  const email = process.env.AUTH_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.APP_PASSWORD_HASH?.trim();
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!email || !passwordHash || !jwtSecret || jwtSecret.length < 32) return null;
  return { email, passwordHash, jwtSecret };
}

export function verifyPassword(password, storedValue) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 256) return false;
  const [salt, expected] = String(storedValue).split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString('hex');
  return safeEqual(actual, expected);
}

export function createToken(email, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: email,
    email,
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
    jti: randomUUID()
  });
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${signatureFor(unsigned, secret)}`;
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const unsigned = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(signatureFor(unsigned, secret), parts[2])) return null;
  try {
    const payload = decode(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== TOKEN_ISSUER || payload.aud !== TOKEN_AUDIENCE || !payload.email) return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readSessionCookie(request) {
  const cookies = String(request.headers.cookie || '').split(';');
  const match = cookies.find(cookie => cookie.trim().startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.trim().slice(COOKIE_NAME.length + 1)) : null;
}

export function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    secure ? 'Secure' : '',
    `Max-Age=${TOKEN_LIFETIME_SECONDS}`
  ].filter(Boolean).join('; ');
}

export function expiredSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    secure ? 'Secure' : '',
    'Max-Age=0'
  ].filter(Boolean).join('; ');
}

export function noStore(response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

