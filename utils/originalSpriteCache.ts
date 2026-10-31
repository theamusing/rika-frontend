import { Job } from '../types.ts';
import { apiService } from '../services/apiService.ts';
import { CachedSprite, createSpriteCacheIfAbsent, getSpriteFromCache } from './dbUtils.ts';
import { fetchAsDataUrl, getSpriteSheetLayout } from './imageUtils.ts';

const pending = new Map<string, Promise<CachedSprite>>();

/** Save the exact generated sheet as the first local edit revision. */
export const ensureOriginalSpriteCache = (job: Job): Promise<CachedSprite> => {
  const existing = pending.get(job.gen_id);
  if (existing) return existing;
  const task = (async () => {
    const cached = await getSpriteFromCache(job.gen_id).catch(error => {
      console.warn('Local animation cache could not be read.', error);
      return null;
    });
    if (cached?.spriteSheet) return cached;
    const outputUrl = job.output_images?.[0]?.url;
    if (job.status !== 'succeeded' || !outputUrl) throw new Error('No generated image is available');
    const isV2 = Number(job.animation_version ?? job.input_params?.animation_version) === 2;
    const frameCount = isV2
      ? Number(job.input_params?.output_frames)
      : Math.floor((Number(job.input_params?.length ?? 33) - 1) / 2);
    if (!Number.isInteger(frameCount) || frameCount < 1) throw new Error('Invalid animation frame count');
    const columns = Math.min(isV2 ? 6 : 4, frameCount);

    let spriteSheet: string;
    try {
      spriteSheet = await fetchAsDataUrl(outputUrl);
    } catch (cdnError) {
      // Older CDN objects can render in an <img> while blocking browser pixel reads.
      // The authenticated job endpoint supplies the same stored bytes for editing.
      console.warn('Direct image download failed; using the job image endpoint.', cdnError);
      spriteSheet = await apiService.getJobOutputDataUrl(job.gen_id);
    }

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error('Generated image could not be decoded'));
      candidate.src = spriteSheet;
    });
    getSpriteSheetLayout(image.naturalWidth, image.naturalHeight, frameCount, 33, columns);

    const initial: CachedSprite = {
      gen_id: job.gen_id,
      spriteSheet,
      updatedAt: Date.now(),
      customData: {
        columns,
        frameMetadata: Array.from({ length: frameCount }, (_, index) => ({
          id: `original-${job.gen_id}-${index}`,
          isOriginal: true,
          isExcluded: false,
        })),
      },
    };
    try {
      return await createSpriteCacheIfAbsent(initial);
    } catch (error) {
      console.warn('The original animation could not be saved locally.', error);
      return initial;
    }
  })();
  pending.set(job.gen_id, task);
  void task.finally(() => {
    if (pending.get(job.gen_id) === task) pending.delete(job.gen_id);
  }).catch(() => {});
  return task;
};
