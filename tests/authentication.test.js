import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { isAuthorizedSession, verifyPassword } from '../lib/auth.js';
import { authorizeGooglePayload, googleCsrfCookie, validCsrf } from '../lib/google-auth.js';
import { mergeGoogleUser } from '../lib/users.js';

const configuration = { email: 'marcelo.lima@granddos.tech', googleClientId: 'client.apps.googleusercontent.com', googleAllowedDomain: 'granddos.tech' };

test('login tradicional aceita senha válida e recusa inválida', () => {
  const salt = randomBytes(16).toString('hex');
  const stored = `${salt}:${scryptSync('senha-segura', salt, 64).toString('hex')}`;
  assert.equal(verifyPassword('senha-segura', stored), true);
  assert.equal(verifyPassword('senha-incorreta', stored), false);
});

test('primeiro login Google cria usuário com perfil e data', () => {
  const user = mergeGoogleUser(null, { sub: 'google-1', email: 'novo@granddos.tech', name: 'Novo Usuário', picture: 'https://example.com/photo.jpg' }, 1234);
  assert.deepEqual(user.providers, ['google']);
  assert.equal(user.googleSub, 'google-1');
  assert.equal(user.createdAt, 1234);
  assert.equal(user.name, 'Novo Usuário');
});

test('e-mail local existente é vinculado automaticamente ao Google', () => {
  const existing = { id: 'local:marcelo.lima@granddos.tech', email: 'marcelo.lima@granddos.tech', name: 'Marcelo', providers: ['local'], createdAt: 100 };
  const user = mergeGoogleUser(existing, { sub: 'google-2', email: existing.email, name: 'Marcelo Lima', picture: '' }, 200);
  assert.deepEqual(user.providers.sort(), ['google', 'local']);
  assert.equal(user.id, existing.id);
  assert.equal(user.createdAt, 100);
});

test('domínio externo é recusado usando o claim hd', () => {
  assert.throws(() => authorizeGooglePayload({ sub: '1', email: 'pessoa@gmail.com', email_verified: true, hd: 'gmail.com' }, { allowedDomain: 'granddos.tech' }), /@granddos\.tech/);
});

test('sessão aceita conta local autorizada e Google do domínio', () => {
  assert.equal(isAuthorizedSession({ email: configuration.email, provider: 'local' }, configuration), true);
  assert.equal(isAuthorizedSession({ email: 'equipe@granddos.tech', provider: 'google', hd: 'granddos.tech' }, configuration), true);
  assert.equal(isAuthorizedSession({ email: 'fora@gmail.com', provider: 'google', hd: 'gmail.com' }, configuration), false);
});

test('CSRF exige correspondência entre cookie HttpOnly e corpo', () => {
  const token = 'a'.repeat(43);
  const request = { headers: { cookie: googleCsrfCookie(token).split(';')[0] } };
  assert.equal(validCsrf(request, token), true);
  assert.equal(validCsrf(request, 'b'.repeat(43)), false);
});
