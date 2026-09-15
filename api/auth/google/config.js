import { noStore } from '../../../lib/auth.js';
import { createGoogleCsrfToken, googleConfiguration, googleCsrfCookie } from '../../../lib/google-auth.js';

export default function handler(request, response) {
  noStore(response);
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Método não permitido.' });
  }
  const config = googleConfiguration();
  if (!config) return response.status(503).json({ enabled: false, error: 'Login com Google ainda não configurado.' });
  const csrfToken = createGoogleCsrfToken();
  response.setHeader('Set-Cookie', googleCsrfCookie(csrfToken));
  return response.status(200).json({ enabled: true, clientId: config.clientId, allowedDomain: config.allowedDomain, csrfToken });
}
