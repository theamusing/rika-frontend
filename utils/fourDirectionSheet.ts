import { Job } from '../types.ts';
import { ensureOriginalSpriteCache } from './originalSpriteCache.ts';
import { fourDirectionGridFrames, fourDirectionPlaybackOrder } from './fourDirectionPlayback.ts';
import { reconstructSpriteSheet, sliceSpriteSheet } from './imageUtils.ts';

/** Use the latest editable pixels, restoring the source template's spatial layout. */
export const loadFourDirectionAnimationSheet = async (job: Job): Promise<string> => {
  const cached = await ensureOriginalSpriteCache(job);
  const metadata = cached.customData?.frameMetadata;
  const count = Array.isArray(metadata) ? metadata.length : 4;
  const frames = await sliceSpriteSheet(cached.spriteSheet, count, 33, cached.customData?.columns);
  const order = fourDirectionPlaybackOrder(count, metadata, cached.customData?.source,
    cached.customData?.fourDirectionOrderVersion);
  const turnFrames = order ? order.map(index => frames[index]) : frames;
  return reconstructSpriteSheet(fourDirectionGridFrames(turnFrames), 2);
};
