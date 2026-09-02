import { noStore } from '../lib/auth.js';
import { getJson, redisKeys, setJson } from '../lib/redis.js';
import { requireUser } from '../lib/session.js';
import { publicPlaylist } from '../lib/state.js';

const ACTIVE_WINDOW_MS = 45_000;

export default async function handler(request, response) {
  noStore(response);
  try {
    if (request.method === 'POST') {
      const reference = String(request.body?.code || '').trim();
      const selected = publicPlaylist(await getJson(redisKeys.state), reference);
      if (!selected) return response.status(404).json({ error: 'Playlist não encontrada.' });
      const playlist = selected.state.playlists[0];
      const now = Date.now();
      const deviceId = String(request.body?.deviceId || '').trim().slice(0, 80);
      const fullscreen = request.body?.fullscreen === true;
      const current = await getJson(redisKeys.playback);
      const currentIsFresh = Boolean(current && now - Number(current.lastSeenAt || 0) <= ACTIVE_WINDOW_MS);
      const sameDevice = Boolean(deviceId && current?.deviceId === deviceId);
      if (currentIsFresh && current?.fullscreen && !fullscreen && !sameDevice) {
        return response.status(200).json({ playback: current, accepted: false });
      }
      const requestedStart = Number(request.body?.startedAt);
      const startedAt = Number.isFinite(requestedStart) && requestedStart <= now && requestedStart >= now - 7 * 24 * 60 * 60 * 1000 ? requestedStart : now;
      const playback = {
        playlistId: playlist.id,
        code: playlist.code,
        deviceId,
        fullscreen,
        startedAt,
        currentIndex: Math.max(0, Math.min(playlist.items.length - 1, Number(request.body?.currentIndex) || 0)),
        itemStartedAt: Number(request.body?.itemStartedAt) || now,
        lastSeenAt: now
      };
      await setJson(redisKeys.playback, playback, 120);
      return response.status(200).json({ playback, accepted: true });
    }
    if (request.method === 'GET') {
      if (!requireUser(request, response)) return;
      const playback = await getJson(redisKeys.playback);
      const active = Boolean(playback && Date.now() - Number(playback.lastSeenAt || 0) <= ACTIVE_WINDOW_MS);
      return response.status(200).json({ active, playback: active ? playback : null });
    }
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Falha ao atualizar reprodução.' });
  }
}
