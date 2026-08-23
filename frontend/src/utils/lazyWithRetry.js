import { lazy } from 'react';

/**
 * Wraps dynamic import with an automatic reload mechanism if a new version
 * was deployed and older chunk hashes are no longer found on the server.
 */
export function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const lastReloadTimestamp = Number(window.sessionStorage.getItem('last_chunk_reload_time') || '0');
    const now = Date.now();
    // Allow auto-reload if not reloaded within the last 15 seconds
    const canReload = now - lastReloadTimestamp > 15000;

    try {
      const component = await componentImport();
      return component;
    } catch (error) {
      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        /failed to fetch dynamically imported module/i.test(error?.message || '') ||
        /error loading dynamically imported module/i.test(error?.message || '') ||
        /importing a module script failed/i.test(error?.message || '') ||
        /loading chunk [\d]+ failed/i.test(error?.message || '');

      if (isChunkError && canReload) {
        window.sessionStorage.setItem('last_chunk_reload_time', String(now));
        console.warn('New software deployment detected. Auto-refreshing to load latest assets...', error);
        window.location.reload();
        return new Promise(() => {});
      }

      throw error;
    }
  });
}

export default lazyWithRetry;
