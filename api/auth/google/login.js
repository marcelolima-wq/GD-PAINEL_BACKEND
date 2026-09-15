import { createToken, noStore, sessionCookie } from '../../../lib/auth.js';
import { consumeGoogleCredential, googleConfiguration, googleCsrfCookie, validCsrf, verifyGoogleCredential } from '../../../lib/google-auth.js';
import { upsertGoogleUser } from '../../../lib/users.js';

export default async function handler(request, response) {
  noStore(response);
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }
  const config = googleConfiguration();
  if (!config) return response.status(503).json({ error: 'Login com Google ainda não configurado.' });
  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
  } catch {
    return response.status(400).json({ error: 'Corpo da requisição inválido.' });
  }
  if (!validCsrf(request, body.csrfToken)) return response.status(403).json({ error: 'Sessão de login expirada. Recarregue a página.' });
  const credential = String(body.credential || '');
  if (!credential || credential.length > 10000) return response.status(400).json({ error: 'Resposta do Google inválida.' });
  try {
    const profile = await verifyGoogleCredential(credential, config);
    if (!(await consumeGoogleCredential(credential, profile.exp))) return response.status(409).json({ error: 'Este login do Google já foi utilizado. Tente novamente.' });
    const user = await upsertGoogleUser(profile);
    const token = createToken(user.email, config.jwtSecret, { sub: profile.sub, provider: 'google', hd: profile.hd, name: user.name, picture: user.picture });
    response.setHeader('Set-Cookie', [sessionCookie(token), googleCsrfCookie('', 0)]);
    return response.status(200).json({ authenticated: true, email: user.email, name: user.name, picture: user.picture, provider: 'google' });
  } catch (error) {
    const status = error.code === 'DOMAIN_NOT_ALLOWED' ? 403 : error.message?.includes('vinculada') ? 409 : 401;
    return response.status(status).json({ error: status === 401 ? 'Não foi possível validar o login do Google.' : error.message });
  }
}
