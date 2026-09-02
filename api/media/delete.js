import { del } from '@vercel/blob';
import { noStore } from '../../lib/auth.js';
import { requireUser } from '../../lib/session.js';

export default async function handler(request, response) {
  noStore(response);
  if (!requireUser(request, response)) return;
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }
  try {
    const url = new URL(request.body?.url);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.public.blob.vercel-storage.com')) {
      return response.status(400).json({ error: 'URL de mídia inválida.' });
    }
    await del(url.toString());
    return response.status(200).json({ deleted: true });
  } catch (error) {
    return response.status(400).json({ error: error.message || 'Falha ao excluir mídia.' });
  }
}

