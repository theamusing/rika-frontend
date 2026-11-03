import { Job } from '../types.ts';
import { CachedSprite, createSpriteCacheIfAbsent, getSpriteFromCache, recoverSpriteCache } from './dbUtils.ts';
import { fetchAsDataUrl, getSpriteSheetLayout } from './imageUtils.ts';
import { decodeImage } from './imageLoader.ts';

const pending = new Map<string, Promise<CachedSprite>>();

export const animationSpec = (job: Job) => {
  const isV2 = Number(job.animation_version ?? job.input_params?.animation_version) === 2;
  const frameCount = isV2 ? Number(job.input_params?.output_frames)
    : Math.floor((Number(job.input_params?.length ?? 33) - 1) / 2);
  if (!Number.isInteger(frameCount) || frameCount < 1) throw new Error('Invalid animation frame count');
  return { frameCount, columns: Math.min(isV2 ? 6 : 4, frameCount) };
};

/** Validate stored edits, seed originals, and recover only provably invalid legacy copies. */
export const ensureOriginalSpriteCache = (job: Job): Promise<CachedSprite> => {
  const existing = pending.get(job.gen_id);
  if (existing) return existing;
  const task = (async () => {
    const spec = animationSpec(job);
    const originalLayout = async (sheet: string) => {
      const image = await decodeImage(sheet);
      const layout = getSpriteSheetLayout(image.naturalWidth, image.naturalHeight, spec.frameCount, 33, spec.columns);
      const size = job.input_params?.pixel_size;
      if (Number(job.animation_version ?? job.input_params?.animation_version) === 2 && size?.x && size?.y) {
        if (image.naturalWidth !== Number(size.x) * layout.columns || image.naturalHeight !== Number(size.y) * layout.rows) {
          throw new Error('Generated sprite sheet dimensions do not match this task');
        }
      }
      return layout;
    };
    let original: Promise<CachedSprite> | undefined;
    const loadOriginal = () => original ||= (async () => {
      const outputUrl = job.output_images?.[0]?.url;
      if (job.status !== 'succeeded' || !outputUrl) throw new Error('No generated image is available');
      let spriteSheet = await fetchAsDataUrl(outputUrl);
      try { await originalLayout(spriteSheet); }
      catch {
        spriteSheet = await fetchAsDataUrl(outputUrl, { refresh: true });
        await originalLayout(spriteSheet);
      }
      return {
        gen_id: job.gen_id, spriteSheet, updatedAt: Date.now(),
        customData: {
          cacheVersion: 3, source: 'generated', sourceFrameCount: spec.frameCount,
          columns: spec.columns,
          frameMetadata: Array.from({ length: spec.frameCount }, (_, index) => ({
            id: `original-${job.gen_id}-${index}`, isOriginal: true, isExcluded: false,
          })),
        },
      };
    })();

    const usable = async (cached: CachedSprite): Promise<boolean> => {
      if (!cached?.spriteSheet) return false;
      let image: HTMLImageElement;
      const metadata = cached.customData?.frameMetadata;
      const count = Array.isArray(metadata) ? metadata.length : spec.frameCount;
      try {
        image = await decodeImage(cached.spriteSheet);
        getSpriteSheetLayout(image.naturalWidth, image.naturalHeight, count, 33, cached.customData?.columns);
        if (cached.customData?.source === 'generated') await originalLayout(cached.spriteSheet);
      } catch (error) { console.warn('Stored animation could not be decoded or sliced.', error); return false; }
      // A legacy one-frame copy with input-resolution dimensions was a waiting preview.
      // Legitimate single-frame edits have output-frame dimensions and are kept.
      if (!cached.customData?.cacheVersion && spec.frameCount > 1 && count === 1 && metadata?.[0]?.isOriginal === true) {
        try {
          const source = await loadOriginal();
          const sourceImage = await decodeImage(source.spriteSheet);
          const layout = getSpriteSheetLayout(sourceImage.naturalWidth, sourceImage.naturalHeight, spec.frameCount, 33, spec.columns);
          if (image.naturalWidth !== layout.frameWidth || image.naturalHeight !== layout.frameHeight) return false;
        } catch (error) {
          // Keep readable local work available when the original cannot be checked.
          console.warn('Could not check a legacy single-frame copy against its original.', error);
        }
      }
      return true;
    };

    const cached = await getSpriteFromCache(job.gen_id).catch(() => null);
    if (cached && await usable(cached)) return cached;
    const initial = await loadOriginal();
    try {
      const stored = cached ? await recoverSpriteCache(initial, cached) : await createSpriteCacheIfAbsent(initial);
      if (stored === initial || await usable(stored)) return stored;
      // An older tab may have saved a placeholder while the original was downloading.
      const recovered = await recoverSpriteCache(initial, stored);
      if (recovered === initial || await usable(recovered)) return recovered;
    } catch (error) { console.warn('Original animation is usable but could not be saved locally.', error); }
    return initial;
  })();
  pending.set(job.gen_id, task);
  void task.finally(() => { if (pending.get(job.gen_id) === task) pending.delete(job.gen_id); }).catch(() => {});
  return task;
};
