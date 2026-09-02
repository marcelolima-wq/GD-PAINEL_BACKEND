import { expiredSessionCookie, noStore } from '../../lib/auth.js';

export default function handler(request, response) {
  noStore(response);
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  response.setHeader('Set-Cookie', expiredSessionCookie());
  return response.status(200).json({ authenticated: false });
}

