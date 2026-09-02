import { handleUpload } from '@vercel/blob/client';
import { noStore } from '../../lib/auth.js';
import { authenticatedUser } from '../../lib/session.js';

export default async function handler(request, response) {
  noStore(response);
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }
  try {
    const result = await handleUpload({
      request,
      body: request.body,
      onBeforeGenerateToken: async () => {
        if (!authenticatedUser(request)) throw new Error('Autenticação necessária.');
        return {
          allowedContentTypes: ['image/*', 'video/*'],
          maximumSizeInBytes: 250 * 1024 * 1024,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => {}
    });
    return response.status(200).json(result);
  } catch (error) {
    return response.status(400).json({ error: error.message || 'Falha ao preparar o envio.' });
  }
}

