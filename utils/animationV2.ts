import { PaddingOffsets, PixelDimensions } from '../types.ts';
import { applyCentroids, quantizeImageData, RGB } from './editorUtils.ts';
import { fetchAsDataUrl } from './imageUtils.ts';

export const EMPTY_PADDING: PaddingOffsets = { left: 0, right: 0, top: 0, bottom: 0 };
export const snapPixelSize = (value: number) => Math.max(32, Math.min(256, Math.round((Number.isFinite(value) ? value : 128) / 32) * 32));

export const constrainPadding = (size: PixelDimensions, padding: PaddingOffsets): PaddingOffsets => {
  const snap = (value: number) => Math.max(0, Math.round((Number.isFinite(value) ? value : 0) / 32) * 32);
  const left = Math.min(256 - size.x, snap(padding.left));
  const right = Math.min(256 - size.x - left, snap(padding.right));
  const top = Math.min(256 - size.y, snap(padding.top));
  const bottom = Math.min(256 - size.y - top, snap(padding.bottom));
  return { left, right, top, bottom };
};

export const paddedDimensions = (size: PixelDimensions, padding: PaddingOffsets): PixelDimensions => ({
  x: size.x + padding.left + padding.right,
  y: size.y + padding.top + padding.bottom,
});

export const scaleForV2 = (size: PixelDimensions): number => {
  const longSide = Math.max(size.x, size.y);
  const target = longSide <= 192 ? 768 : 1024;
  const candidates = Array.from({ length: 32 }, (_, index) => index + 1)
    .filter(scale => longSide * scale >= 768 && longSide * scale <= 1024);
  return candidates.reduce((best, scale) =>
    Math.abs(longSide * scale - target) <= Math.abs(longSide * best - target) ? scale : best,
  candidates[0]);
};

const loadImage = async (source: File | string): Promise<HTMLImageElement> => {
  const revocable = source instanceof File;
  const url = revocable ? URL.createObjectURL(source) : await fetchAsDataUrl(source);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Asset processing failed: image cannot be loaded'));
      image.src = url;
    });
  } finally {
    if (revocable) URL.revokeObjectURL(url);
  }
};

export const processImageV2 = async (
  source: File | string, size: PixelDimensions, padding: PaddingOffsets, flip: boolean,
  bgColor: string, useQuantization = false, colorCount = 32, centroids: RGB[] = [],
): Promise<{ image: string; contentImage: string }> => {
  const image = await loadImage(source);
  const content = document.createElement('canvas');
  content.width = size.x;
  content.height = size.y;
  const ctx = content.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Asset processing failed: canvas unavailable');
  ctx.imageSmoothingEnabled = false;
  const fit = Math.min(size.x / image.width, size.y / image.height);
  const drawWidth = Math.max(1, Math.round(image.width * fit));
  const drawHeight = Math.max(1, Math.round(image.height * fit));
  const drawX = Math.floor((size.x - drawWidth) / 2);
  const drawY = Math.floor((size.y - drawHeight) / 2);
  ctx.save();
  // Flip content only; the chosen padding remains on its intended sides.
  if (flip) { ctx.translate(size.x, 0); ctx.scale(-1, 1); }
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
  const contentData = ctx.getImageData(0, 0, size.x, size.y);
  const hasTransparency = contentData.data.some((value, i) => i % 4 === 3 && value < 255);
  const corners = [0, (size.x - 1) * 4, (size.y - 1) * size.x * 4, (size.x * size.y - 1) * 4];
  const average = (channel: number) => Math.round(corners.reduce((sum, i) => sum + contentData.data[i + channel], 0) / 4);
  const hex = /^#([a-f\d]{6})$/i.exec(bgColor);
  const background: RGB = hasTransparency ? {
    r: hex ? parseInt(hex[1].slice(0, 2), 16) : 128,
    g: hex ? parseInt(hex[1].slice(2, 4), 16) : 128,
    b: hex ? parseInt(hex[1].slice(4, 6), 16) : 128, a: 255,
  } : { r: average(0), g: average(1), b: average(2), a: 255 };
  const color = `rgb(${background.r},${background.g},${background.b})`;
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size.x, size.y);
  ctx.globalCompositeOperation = 'source-over';
  if (useQuantization) {
    const data = ctx.getImageData(0, 0, size.x, size.y);
    if (centroids.length) applyCentroids(data, centroids, background);
    else quantizeImageData(data, colorCount, background);
    ctx.putImageData(data, 0, 0);
  }
  const constrained = constrainPadding(size, padding);
  const dimensions = paddedDimensions(size, constrained);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.x;
  canvas.height = dimensions.y;
  const paddedCtx = canvas.getContext('2d');
  if (!paddedCtx) throw new Error('Asset processing failed: canvas unavailable');
  paddedCtx.imageSmoothingEnabled = false;
  paddedCtx.fillStyle = color;
  paddedCtx.fillRect(0, 0, canvas.width, canvas.height);
  paddedCtx.drawImage(content, constrained.left, constrained.top);
  return { image: canvas.toDataURL('image/png'), contentImage: content.toDataURL('image/png') };
};

export const removePaddingV2 = async (url: string, size: PixelDimensions, padding: PaddingOffsets): Promise<string> => {
  const image = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = size.x;
  canvas.height = size.y;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, padding.left, padding.top, size.x, size.y, 0, 0, size.x, size.y);
  return canvas.toDataURL('image/png');
};
