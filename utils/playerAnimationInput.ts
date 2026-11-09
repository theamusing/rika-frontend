import { AnimationVersion, PaddingOffsets, PixelDimensions, PixelSize } from '../types.ts';
import { decodeImage } from './imageLoader.ts';
import { EMPTY_PADDING, paddedDimensions, processImageV2 } from './animationV2.ts';
import { RGB } from './editorUtils.ts';

const PRESETS = [32, 64, 128, 256];
export interface PlayerFrameInput {
  image: string;
  width: number;
  height: number;
  squareSize: PixelSize;
  contentSize: PixelDimensions;
  padding: PaddingOffsets;
  background: string;
  version: AnimationVersion;
}

// Recover native dimensions from pixels, not from the original model resolution.
export async function readPlayerFrameInput(image: string, sourceParams: any = {}, version: AnimationVersion = 'v1'): Promise<PlayerFrameInput> {
  sourceParams = sourceParams || {};
  let img = await decodeImage(image);
  if (Math.max(img.naturalWidth, img.naturalHeight) > 256) {
    // Uploaded/custom frames can exceed the generator's native 256px limit.
    const scale = 256 / Math.max(img.naturalWidth, img.naturalHeight);
    const fitted = document.createElement('canvas');
    fitted.width = Math.max(1, Math.round(img.naturalWidth * scale));
    fitted.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = fitted.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    context.drawImage(img, 0, 0, fitted.width, fitted.height);
    image = fitted.toDataURL('image/png');
    img = await decodeImage(image);
    sourceParams = { ...sourceParams, padding: undefined };
  }
  const width = img.naturalWidth, height = img.naturalHeight;
  const squareSize = String(PRESETS.find(side => side >= Math.max(width, height)) || 256) as PixelSize;
  const gridWidth = Math.min(256, Math.max(32, Math.ceil(width / 32) * 32));
  const gridHeight = Math.min(256, Math.max(32, Math.ceil(height / 32) * 32));
  const base = PRESETS.filter(side => side <= Math.min(gridWidth, gridHeight)).pop()!;
  let contentSize = { x: base, y: base };
  // Without source metadata, distribute added space on the existing 32px grid.
  const left = Math.floor((gridWidth - base) / 64) * 32;
  const top = Math.floor((gridHeight - base) / 64) * 32;
  let padding = { left, top, right: gridWidth - base - left, bottom: gridHeight - base - top };
  const stored = sourceParams.padding;
  if (stored && ['left', 'right', 'top', 'bottom'].every(side => Number.isInteger(stored[side]) && stored[side] >= 0 && stored[side] % 32 === 0)) {
    const x = width - stored.left - stored.right, y = height - stored.top - stored.bottom;
    if (x === y && PRESETS.includes(x) && width === gridWidth && height === gridHeight) {
      contentSize = { x, y };
      padding = { left: stored.left, right: stored.right, top: stored.top, bottom: stored.bottom };
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]
    .map(([x, y]) => ctx.getImageData(x, y, 1, 1).data);
  const background = corners.every(color => color[3] === 255)
    ? '#' + [0, 1, 2].map(channel => Math.round(corners.reduce((sum, color) => sum + color[channel], 0) / 4).toString(16).padStart(2, '0')).join('')
    : (/^#[0-9a-f]{6}$/i.test(sourceParams.bg_color) ? sourceParams.bg_color : '#004040');
  return { image, width, height, squareSize, contentSize, padding, background, version };
}

export async function squarePlayerFrame(frame: PlayerFrameInput, side: number, background: string): Promise<string> {
  const image = await decodeImage(frame.image);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, side, side);
  // Native pixels are never enlarged merely to fill the chosen preset.
  const scale = Math.min(1, side / frame.width, side / frame.height);
  const w = Math.max(1, Math.round(frame.width * scale)), h = Math.max(1, Math.round(frame.height * scale));
  ctx.drawImage(image, Math.floor((side - w) / 2), Math.floor((side - h) / 2), w, h);
  return canvas.toDataURL('image/png');
}

export async function processPlayerFrameV2(frame: PlayerFrameInput, size: PixelDimensions, padding: PaddingOffsets,
  flip: boolean, background: string, quantize: boolean, colors: number, centroids: RGB[]) {
  const image = await decodeImage(frame.image);
  const total = paddedDimensions(size, padding);
  const canvas = document.createElement('canvas');
  canvas.width = total.x; canvas.height = total.y;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background; ctx.fillRect(0, 0, total.x, total.y);
  ctx.imageSmoothingEnabled = false;
  const sx = size.x / frame.contentSize.x, sy = size.y / frame.contentSize.y;
  // Keep the whole frame, including pixels the animation moved into padding.
  ctx.save();
  if (flip) { ctx.translate(2 * padding.left + size.x, 0); ctx.scale(-1, 1); }
  ctx.drawImage(image, padding.left - frame.padding.left * sx, padding.top - frame.padding.top * sy,
    frame.width * sx, frame.height * sy);
  ctx.restore();
  const result = await processImageV2(canvas.toDataURL('image/png'), total, EMPTY_PADDING, false, background, quantize, colors, centroids);
  const processed = await decodeImage(result.image);
  const content = document.createElement('canvas');
  content.width = size.x; content.height = size.y;
  content.getContext('2d')!.drawImage(processed, padding.left, padding.top, size.x, size.y, 0, 0, size.x, size.y);
  return { ...result, contentImage: content.toDataURL('image/png') };
}
