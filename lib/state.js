function text(value, limit = 180) {
  return String(value || '').trim().slice(0, limit);
}

function safeUrl(value) {
  const source = String(value || '');
  if (source.startsWith('data:image/') || source.startsWith('https://') || source.startsWith('http://')) return source;
  return '';
}

export function normalizeState(input) {
  if (!input || typeof input !== 'object') throw new Error('Estado inválido.');
  const library = Array.isArray(input.library) ? input.library.slice(0, 1000).map(media => ({
    id: text(media.id, 100),
    name: text(media.name),
    type: media.type === 'video' ? 'video' : 'image',
    size: Math.max(0, Number(media.size) || 0),
    source: text(media.source, 30) || 'remote',
    src: safeUrl(media.src)
  })).filter(media => media.id && media.src) : [];
  const mediaIds = new Set(library.map(media => media.id));
  const playlists = Array.isArray(input.playlists) ? input.playlists.slice(0, 200).map(playlist => ({
    id: text(playlist.id, 100),
    code: text(playlist.code, 30).toUpperCase(),
    name: text(playlist.name) || 'Playlist',
    repeat: playlist.repeat !== false,
    createdAt: Number(playlist.createdAt) || Date.now(),
    items: Array.isArray(playlist.items) ? playlist.items.slice(0, 1000).map(item => ({
      id: text(item.id, 100),
      mediaId: text(item.mediaId, 100),
      duration: Math.min(3600, Math.max(1, Number(item.duration) || 8))
    })).filter(item => item.id && mediaIds.has(item.mediaId)) : []
  })).filter(playlist => playlist.id && playlist.code) : [];
  const activePlaylistId = playlists.some(item => item.id === input.activePlaylistId)
    ? input.activePlaylistId
    : playlists[0]?.id || null;
  return { library, playlists, activePlaylistId };
}

export function publicPlaylist(document, reference) {
  const state = document?.state;
  if (!state || !Array.isArray(state.playlists)) return null;
  const wanted = String(reference || '').trim().toUpperCase();
  const playlist = state.playlists.find(item => item.code === wanted || item.id === reference);
  if (!playlist) return null;
  const used = new Set(playlist.items.map(item => item.mediaId));
  return {
    version: document.version,
    updatedAt: document.updatedAt,
    state: {
      activePlaylistId: playlist.id,
      playlists: [playlist],
      library: state.library.filter(media => used.has(media.id))
    }
  };
}
