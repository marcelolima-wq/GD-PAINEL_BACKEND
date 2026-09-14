import { noStore } from '../../lib/auth.js';
import { requireUser } from '../../lib/session.js';
import { uploadAuthorization } from '../../lib/cloudinary.js';

export default async function handler(request, response) {
  noStore(response);
  if (!requireUser(request, response)) return;
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }
  try {
    return response.status(200).json(uploadAuthorization(request.body));
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
}
