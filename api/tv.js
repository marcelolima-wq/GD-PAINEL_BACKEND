import { noStore } from '../lib/auth.js';
import { getJson, redisKeys } from '../lib/redis.js';
import { publicPlaylist } from '../lib/state.js';

export default async function handler(request, response) {
  noStore(response);
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Método não permitido.' });
  }
  try {
    const result = publicPlaylist(await getJson(redisKeys.state), request.query.code);
    if (!result) return response.status(404).json({ error: 'Este link de TV não é mais válido.' });
    return response.status(200).json(result);
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Programação indisponível.' });
  }
}

