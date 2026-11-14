import { getAssetFromCache, saveAssetToCache, deleteAssetFromCache } from './dbUtils.ts';

export const isUserImage = (url: string): boolean => {
  try { const parsed = new URL(url); return parsed.hostname === 'cdn.rika-ai.com' && parsed.pathname.startsWith('/users/'); }
  catch { return false; }
};

const pending = new Map<string, Promise<string>>();
const memory = new Map<string, string>();
const decoded = new Map<string, Promise<HTMLImageElement>>();
const DECODE_TIMEOUT = 15000;
const DOWNLOAD_IDLE_TIMEOUT = 30000;
const MAX_DOWNLOADS = 4;
const RETRY_DELAYS = [0, 2000, 5000];
let activeDownloads = 0;
const downloadQueue: Array<() => void> = [];

// Share one limit across thumbnails, previews and Player. Waiting here does not
// consume a request's timeout, and retry delays do not occupy a download slot.
const withDownloadSlot = async <T>(run: () => Promise<T>): Promise<T> => {
  await new Promise<void>(resolve => {
    const start = () => { activeDownloads++; resolve(); };
    if (activeDownloads < MAX_DOWNLOADS) start();
    else downloadQueue.push(start);
  });
  try { return await run(); }
  finally { activeDownloads--; downloadQueue.shift()?.(); }
};

const downloadImage = (url: string, fresh: boolean): Promise<Blob> => withDownloadSlot(async () => {
  const controller = new AbortController();
  let stalled = false;
  let timer: ReturnType<typeof setTimeout>;
  const resetIdleTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { stalled = true; controller.abort(); }, DOWNLOAD_IDLE_TIMEOUT);
  };
  resetIdleTimer();
  try {
    const response = await fetch(url, {
      mode: 'cors', credentials: 'omit', signal: controller.signal,
      cache: fresh ? 'no-store' : 'default',
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`HTTP ${response.status}`);
    }
    resetIdleTimer();
    if (!response.body) return await response.blob();
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.byteLength) { chunks.push(value); resetIdleTimer(); }
      }
    } finally { reader.releaseLock(); }
    return new Blob(chunks, { type: response.headers.get('Content-Type') || '' });
  } catch (error) {
    if (stalled) throw new Error('Image download made no progress for 30 seconds');
    throw error;
  } finally { clearTimeout(timer!); }
});
export interface ImageLoadOptions { refresh?: boolean; }

export const decodeImage = (src: string): Promise<HTMLImageElement> => {
  const existing = decoded.get(src);
  if (existing) { decoded.delete(src); decoded.set(src, existing); return existing; }
  const task = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const remote = !src.startsWith('data:') && !src.startsWith('blob:');
    const timer = setTimeout(() => { image.onload = image.onerror = null; image.src = ''; reject(new Error(remote ? 'Image download timed out' : 'Image decoding timed out')); }, remote ? DOWNLOAD_IDLE_TIMEOUT : DECODE_TIMEOUT);
    image.onload = () => {
      clearTimeout(timer);
      if (!image.naturalWidth || !image.naturalHeight) reject(new Error('Image has invalid dimensions'));
      else resolve(image);
    };
    image.onerror = () => { clearTimeout(timer); reject(new Error('Image data could not be decoded')); };
    if (!src.startsWith('data:') && !src.startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.src = src;
  });
  decoded.set(src, task);
  while (decoded.size > 8) decoded.delete(decoded.keys().next().value!);
  void task.catch(() => { if (decoded.get(src) === task) decoded.delete(src); });
  return task;
};

const remember = (url: string, data: string) => {
  memory.delete(url); memory.set(url, data);
  let size = [...memory.values()].reduce((n, value) => n + value.length, 0);
  while (memory.size > 24 || size > 16 * 1024 * 1024) {
    const key = memory.keys().next().value!;
    size -= memory.get(key)!.length; memory.delete(key);
  }
};

const blobDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error || new Error('Image bytes could not be read'));
  reader.readAsDataURL(blob);
});

/** Shared by previews, Player and exports: only return validated, readable pixels. */
export const fetchAsDataUrl = (url: string, options: ImageLoadOptions = {}): Promise<string> => {
  if (url.startsWith('data:')) return decodeImage(url).then(() => url);
  const inflight = pending.get(url);
  if (inflight) return inflight;
  if (!options.refresh && memory.has(url)) return Promise.resolve(memory.get(url)!);
  const task = (async () => {
    if (isUserImage(url) && !options.refresh) {
      const cached = await getAssetFromCache(url).catch(() => null);
      if (cached) {
        try {
          if (!cached.startsWith('data:image/')) throw new Error('Invalid cached image type');
          await decodeImage(cached); remember(url, cached); return cached;
        } catch (error) {
          console.warn('Discarding unreadable image cache.', error);
          await deleteAssetFromCache(url, cached).catch(() => {});
        }
      }
    }
    const attempts: Array<{ stage: string; message: string; elapsedMs: number }> = [];
    const requestUrl = (fresh: boolean, attempt: number) => {
      const parsed = new URL(url, window.location.href);
      if (fresh && isUserImage(url)) parsed.searchParams.set('_rika_retry', `${Date.now()}-${attempt}`);
      return parsed.href;
    };
    for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
      if (RETRY_DELAYS[attempt]) await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      const started = Date.now();
      let stage = 'download';
      try {
        const fresh = options.refresh || attempt > 0;
        const blob = await downloadImage(requestUrl(Boolean(fresh), attempt), Boolean(fresh));
        stage = 'response validation';
        if (!blob.size || (blob.type && !blob.type.startsWith('image/'))) throw new Error('Response is not an image');
        stage = 'read image bytes';
        const data = await blobDataUrl(blob);
        stage = 'decode';
        await decodeImage(data);
        remember(url, data);
        if (isUserImage(url)) void saveAssetToCache(url, data).catch(() => {});
        return data;
      } catch (error) { attempts.push({ stage, message: error instanceof Error ? error.message : String(error), elapsedMs: Date.now() - started }); }
    }
    const fallbackStarted = Date.now();
    try {
      const image = await withDownloadSlot(() => decodeImage(requestUrl(true, RETRY_DELAYS.length)));
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.drawImage(image, 0, 0);
      const data = canvas.toDataURL('image/png');
      remember(url, data);
      if (isUserImage(url)) void saveAssetToCache(url, data).catch(() => {});
      return data;
    } catch (error) { attempts.push({ stage: 'image element fallback', message: error instanceof Error ? error.message : String(error), elapsedMs: Date.now() - fallbackStarted }); }
    console.error('Image loading failed.', { url: url.split('?')[0], attempts });
    const httpError = attempts.find(attempt => /^HTTP \d+$/.test(attempt.message));
    throw new Error(httpError ? `Image download failed (${httpError.message}). Please retry.` : 'Image could not be downloaded or decoded. Please retry.');
  })();
  pending.set(url, task);
  void task.finally(() => { if (pending.get(url) === task) pending.delete(url); }).catch(() => {});
  return task;
};

export const loadReadableImage = async (url: string, options?: ImageLoadOptions): Promise<HTMLImageElement> =>
  decodeImage(await fetchAsDataUrl(url, options));
