import { authConfiguration, noStore, readSessionCookie, verifyToken } from './auth.js';

export function authenticatedUser(request) {
  const configuration = authConfiguration();
  if (!configuration) return null;
  const session = verifyToken(readSessionCookie(request), configuration.jwtSecret);
  if (!session || session.email !== configuration.email) return null;
  return session;
}

export function requireUser(request, response) {
  const user = authenticatedUser(request);
  if (user) return user;
  noStore(response);
  response.status(401).json({ error: 'Autenticação necessária.' });
  return null;
}

