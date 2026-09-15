import { authConfiguration, isAuthorizedSession, noStore, readSessionCookie, verifyToken } from '../../lib/auth.js';

export default function handler(request, response) {
  noStore(response);
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  const config = authConfiguration();
  if (!config) return response.status(503).json({ authenticated: false });

  const payload = verifyToken(readSessionCookie(request), config.jwtSecret);
  if (!isAuthorizedSession(payload, config)) return response.status(401).json({ authenticated: false });

  return response.status(200).json({ authenticated: true, email: payload.email, name: payload.name || '', picture: payload.picture || '', provider: payload.provider || 'local' });
}
