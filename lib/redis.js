const STATE_KEY = 'gd:state';
const PLAYBACK_KEY = 'gd:playback';

function configuration() {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis não configurado.');
  return { url, token };
}

async function command(parts) {
  const { url, token } = configuration();
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parts),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Falha no Redis (${response.status}).`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

export async function getJson(key) {
  const value = await command(['GET', key]);
  if (value == null) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export async function setJson(key, value, ttlSeconds) {
  const parts = ['SET', key, JSON.stringify(value)];
  if (ttlSeconds) parts.push('EX', String(ttlSeconds));
  await command(parts);
  return value;
}

export const redisKeys = { state: STATE_KEY, playback: PLAYBACK_KEY };
