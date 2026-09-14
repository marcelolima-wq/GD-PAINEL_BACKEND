import { createHash, randomUUID } from 'node:crypto';

export function cloudinaryConfiguration() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret || !/^[a-z0-9_-]+$/i.test(cloudName)) {
    throw new Error('Cloudinary ainda não configurado no servidor.');
  }
  return { cloudName, apiKey, apiSecret };
}

export function signParameters(parameters, secret) {
  const serialized = Object.keys(parameters).sort().map(key => `${key}=${parameters[key]}`).join('&');
  // Cloudinary's direct-upload API expects SHA-1 unless the account is
  // explicitly configured to use another signature algorithm.
  return createHash('sha1').update(serialized + secret).digest('hex');
}

export function uploadAuthorization(file, config = cloudinaryConfiguration()) {
  const resourceType = String(file?.type || '').startsWith('video/') ? 'video' : 'image';
  if (!/^(image|video)\//.test(file?.type || '')) throw new Error('Selecione uma imagem ou vídeo.');
  const limit = (resourceType === 'video' ? 100 : 10) * 1024 * 1024;
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > limit) {
    throw new Error(resourceType === 'video' ? 'O vídeo deve ter até 100 MB.' : 'A imagem deve ter até 10 MB.');
  }
  const parameters = {
    public_id: `gd-painel/${randomUUID()}`,
    timestamp: Math.floor(Date.now() / 1000),
    overwrite: false,
    allowed_formats: resourceType === 'video' ? 'mp4,webm,mov,m4v' : 'jpg,jpeg,png,webp,gif,avif'
  };
  return {
    url: `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    cloudName: config.cloudName,
    resourceType,
    parameters: { ...parameters, api_key: config.apiKey, signature: signParameters(parameters, config.apiSecret) }
  };
}

export function ownedCloudinaryAsset(value, config = cloudinaryConfiguration()) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.search || url.hash) throw new Error('URL de mídia inválida.');
  const parts = url.pathname.split('/');
  if (parts[1] !== config.cloudName || !['image', 'video'].includes(parts[2]) || parts[3] !== 'upload' || !/^v\d+$/.test(parts[4])) throw new Error('Mídia de outro ambiente.');
  const match = parts.slice(5).join('/').match(/^(gd-painel\/[a-f0-9-]{36})\.[a-z0-9]+$/i);
  if (!match) throw new Error('Mídia fora da pasta do painel.');
  return { publicId: match[1], resourceType: parts[2] };
}

export async function deleteCloudinaryAsset(url) {
  const config = cloudinaryConfiguration();
  const asset = ownedCloudinaryAsset(url, config);
  const parameters = { public_id: asset.publicId, timestamp: Math.floor(Date.now() / 1000), invalidate: true };
  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${asset.resourceType}/destroy`, {
    method: 'POST',
    body: new URLSearchParams({ ...parameters, api_key: config.apiKey, signature: signParameters(parameters, config.apiSecret) }),
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json();
  if (!response.ok || !['ok', 'not found'].includes(data.result)) throw new Error('Falha ao excluir o arquivo do armazenamento.');
}
