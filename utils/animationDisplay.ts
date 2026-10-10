import { Job } from '../types.ts';

export interface ImageDimensions { width: number; height: number; }

// One shared scale for both axes: preview/export must never stretch the sprite.
export const fitImageDimensions = (
  size: ImageDimensions, maxWidth = 512, maxHeight = 512,
): ImageDimensions => {
  if (![size.width, size.height, maxWidth, maxHeight].every(value => Number.isFinite(value) && value > 0)) {
    return { width: 512, height: 512 };
  }
  const scale = Math.min(maxWidth / size.width, maxHeight / size.height);
  return { width: size.width * scale, height: size.height * scale };
};

export const jobFrameAspectRatio = (job: Job): number => {
  const size = job.input_params?.pixel_size;
  if ((job.animation_version === 2 || job.input_params?.animation_version === 2) &&
      typeof size?.x === 'number' && typeof size?.y === 'number' &&
      Number.isFinite(size.x) && Number.isFinite(size.y) && size.x > 0 && size.y > 0) {
    // pixel_size already includes padding; content_pixel_size does not.
    return size.x / size.y;
  }
  return 1;
};
