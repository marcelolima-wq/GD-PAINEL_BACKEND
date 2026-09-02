import {
  authConfiguration,
  createToken,
  noStore,
  sessionCookie,
  verifyPassword
} from '../../lib/auth.js';

export default async function handler(request, response) {
  noStore(response);
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  const config = authConfiguration();
  if (!config) return response.status(503).json({ error: 'Autenticação ainda não configurada no servidor.' });

  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
  } catch {
    return response.status(400).json({ error: 'Corpo da requisição inválido.' });
  }
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const valid = email === config.email && verifyPassword(password, config.passwordHash);

  if (!valid) return response.status(401).json({ error: 'E-mail ou senha inválidos.' });

  const token = createToken(email, config.jwtSecret);
  response.setHeader('Set-Cookie', sessionCookie(token));
  return response.status(200).json({ authenticated: true, email });
}
