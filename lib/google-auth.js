import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { authConfiguration } from './auth.js';
import { setIfAbsent } from './redis.js';

const CSRF_COOKIE = 'gd_google_csrf';

export function googleConfiguration() {
  const auth = authConfiguration();
  if (!auth?.googleClientId || !auth.googleAllowedDomain) return null;
  return { ...auth, clientId: auth.googleClientId, allowedDomain: auth.googleAllowedDomain };
}

export function createGoogleCsrfToken() {
  return randomBytes(32).toString('base64url');
}

export function googleCsrfCookie(token, maxAge = 600) {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  return [`${CSRF_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', secure ? 'Secure' : '', `Max-Age=${maxAge}`].filter(Boolean).join('; ');
}

export function readCookie(request, name) {
  const prefix = `${name}=`;
  const match = String(request.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : '';
}

export function validCsrf(request, submitted) {
  const cookie = readCookie(request, CSRF_COOKIE);
  const left = Buffer.from(cookie);
  const right = Buffer.from(String(submitted || ''));
  return left.length >= 32 && left.length === right.length && timingSafeEqual(left, right);
}

export function authorizeGooglePayload(payload, configuration) {
  const email = String(payload?.email || '').trim().toLowerCase();
  const hd = String(payload?.hd || '').trim().toLowerCase();
  if (!payload?.sub || !email || payload.email_verified !== true) throw new Error('O Google não confirmou este e-mail.');
  if (hd !== configuration.allowedDomain || !email.endsWith(`@${configuration.allowedDomain}`)) {
    const error = new Error(`Use uma conta Google @${configuration.allowedDomain}.`);
    error.code = 'DOMAIN_NOT_ALLOWED';
    throw error;
  }
  return { sub: String(payload.sub), email, hd, name: String(payload.name || '').slice(0, 180), picture: /^https:\/\//.test(payload.picture || '') ? String(payload.picture).slice(0, 1000) : '', exp: Number(payload.exp) || 0 };
}

export async function verifyGoogleCredential(credential, configuration) {
  const client = new OAuth2Client(configuration.clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: configuration.clientId });
  return authorizeGooglePayload(ticket.getPayload(), configuration);
}

export async function consumeGoogleCredential(credential, expiresAt) {
  const digest = createHash('sha256').update(credential).digest('hex');
  const ttl = Math.max(60, Math.min(3600, expiresAt - Math.floor(Date.now() / 1000)));
  return setIfAbsent(`gd:google-token:${digest}`, true, ttl);
}
