import { randomUUID } from 'node:crypto';
import { noStore } from '../lib/auth.js';
import { getJson, redisKeys, setJson } from '../lib/redis.js';
import { requireUser } from '../lib/session.js';
import { normalizeState } from '../lib/state.js';

export default async function handler(request, response) {
  noStore(response);
  if (!requireUser(request, response)) return;
  try {
    if (request.method === 'GET') {
      return response.status(200).json({ document: await getJson(redisKeys.state) });
    }
    if (request.method === 'PUT') {
      const state = normalizeState(request.body?.state ?? request.body);
      const document = { state, version: randomUUID(), updatedAt: Date.now() };
      await setJson(redisKeys.state, document);
      return response.status(200).json({ document });
    }
    response.setHeader('Allow', 'GET, PUT');
    return response.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Falha ao sincronizar dados.' });
  }
}

