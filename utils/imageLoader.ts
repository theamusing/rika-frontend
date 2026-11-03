import { getAssetFromCache, saveAssetToCache, deleteAssetFromCache } from './dbUtils.ts';

export const isUserImage = (url: string): boolean => {
  try { const parsed = new URL(url); return parsed.hostname === 'cdn.rika-ai.com' && parsed.pathname.startsWith('/users/'); }
  catch { return false; }
};

const pending = new Map<string, Promise<string>>();
const memory = new Map<string, string>();
const decoded = new Map<string, Promise<HTMLImageElement>>();
const TIMEOUT = 15000;
export interface ImageLoadOptions { refresh?: boolean; }

export const decodeImage = (src: string): Promise<HTMLImageElement> => {
  const existing = decoded.get(src);
  if (existing) { decoded.delete(src); decoded.set(src, existing); return existing; }
  const task = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => { image.onload = image.onerror = null; image.src = ''; reject(new Error('Image decoding timed out')); }, TIMEOUT);
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
    const attempts: string[] = [];
    const retry = new URL(url, window.location.href);
    if (isUserImage(url)) retry.searchParams.set('_rika_retry', String(Date.now()));
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      try {
        const fresh = options.refresh || attempt > 0;
        const response = await fetch(fresh ? retry.href : url, {
          mode: 'cors', credentials: 'omit', signal: controller.signal,
          cache: fresh ? 'no-store' : 'default',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.size || (blob.type && !blob.type.startsWith('image/'))) throw new Error('Response is not an image');
        const data = await blobDataUrl(blob);
        await decodeImage(data);
        remember(url, data);
        if (isUserImage(url)) void saveAssetToCache(url, data).catch(() => {});
        return data;
      } catch (error) { attempts.push(error instanceof Error ? error.message : String(error)); }
      finally { clearTimeout(timer); }
    }
    try {
      const image = await decodeImage(retry.href);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.drawImage(image, 0, 0);
      const data = canvas.toDataURL('image/png');
      remember(url, data);
      if (isUserImage(url)) void saveAssetToCache(url, data).catch(() => {});
      return data;
    } catch (error) { attempts.push(error instanceof Error ? error.message : String(error)); }
    console.error('Image loading failed.', { url: url.split('?')[0], attempts });
    const httpError = attempts.find(message => /^HTTP \d+$/.test(message));
    throw new Error(httpError ? `Image download failed (${httpError}). Please retry.` : 'Image could not be downloaded or decoded. Please retry.');
  })();
  pending.set(url, task);
  void task.finally(() => { if (pending.get(url) === task) pending.delete(url); }).catch(() => {});
  return task;
};

export const loadReadableImage = async (url: string, options?: ImageLoadOptions): Promise<HTMLImageElement> =>
  decodeImage(await fetchAsDataUrl(url, options));
