import { getJson, setJson } from './redis.js';

const emailKey = email => `gd:user:email:${String(email).trim().toLowerCase()}`;
const googleKey = subject => `gd:user:google:${subject}`;

export function mergeGoogleUser(existing, profile, now = Date.now()) {
  const providers = new Set(existing?.providers || (existing?.provider ? [existing.provider] : []));
  providers.add('google');
  return {
    id: existing?.id || `google:${profile.sub}`,
    email: profile.email,
    name: profile.name || existing?.name || profile.email.split('@')[0],
    picture: profile.picture || existing?.picture || '',
    providers: [...providers],
    googleSub: profile.sub,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

export async function upsertLocalUser(email, now = Date.now()) {
  const normalized = String(email).trim().toLowerCase();
  const existing = await getJson(emailKey(normalized));
  const providers = new Set(existing?.providers || []);
  providers.add('local');
  const user = {
    id: existing?.id || `local:${normalized}`,
    email: normalized,
    name: existing?.name || normalized.split('@')[0],
    picture: existing?.picture || '',
    providers: [...providers],
    googleSub: existing?.googleSub || '',
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await setJson(emailKey(normalized), user);
  return user;
}

export async function upsertGoogleUser(profile) {
  const normalized = profile.email.trim().toLowerCase();
  const linkedEmail = await getJson(googleKey(profile.sub));
  if (linkedEmail && linkedEmail !== normalized) throw new Error('Esta conta Google já está vinculada a outro e-mail.');
  const existing = await getJson(emailKey(normalized));
  const user = mergeGoogleUser(existing, { ...profile, email: normalized });
  await setJson(emailKey(normalized), user);
  await setJson(googleKey(profile.sub), normalized);
  return user;
}
