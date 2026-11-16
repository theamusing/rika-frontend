import { Job } from '../types.ts';
import { fetchAsDataUrl } from './imageUtils.ts';
import { decodeImage } from './imageLoader.ts';

// Cache format after moving generated-image processing to the server.
export const SPRITE_PIXELIZER_VERSION = 3;

export const hasProcessedSprite = (job: Job): boolean =>
  job.output_params?.sprite_processed === true;

/** Load the final native-size PNG. Generation-time processing runs on the server. */
export const loadGeneratedSprite = async (job: Job): Promise<string> => {
  const url = job.output_images?.[0]?.url;
  const size = Number(job.output_params?.pixel_size);
  if (!url || !hasProcessedSprite(job) || !Number.isInteger(size) || size < 1) {
    throw new Error('The processed image is not ready. Please refresh the task.');
  }
  const source = await fetchAsDataUrl(url);
  const image = await decodeImage(source);
  if (image.naturalWidth !== size || image.naturalHeight !== size) {
    throw new Error('The image dimensions do not match this task. Please reload the image.');
  }
  return source;
};
