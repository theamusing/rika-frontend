import { RGB } from './editorUtils.ts';

type Lab = [number, number, number];

const rgbCode = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;
const codeToRgb = (code: number): RGB => ({
  r: (code >> 16) & 255,
  g: (code >> 8) & 255,
  b: code & 255,
  a: 255,
});

/** CIE Lab conversion matching the perceptual space used by the backend fast palette. */
const rgbToLab = (r: number, g: number, b: number): Lab => {
  const linear = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const lr = linear(r), lg = linear(g), lb = linear(b);
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
  const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;
  const pivot = (value: number) => value > 0.008856451679
    ? Math.cbrt(value)
    : (903.296296296 * value + 16) / 116;
  const fx = pivot(x), fy = pivot(y), fz = pivot(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const labDistanceSquared = (a: Lab, b: Lab) => {
  const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
  return dl * dl + da * da + db * db;
};

/**
 * Browser port of the production backend fast-palette core:
 * exact RGB histogram -> mass-weighted Lab k-means -> observed-color medoids.
 * The palette never introduces a synthesized RGB color or dithering.
 */
export const extractBackendPalette = (
  data: Uint8ClampedArray,
  requestedColors: number,
  excludeColor?: RGB,
): RGB[] => {
  const histogram = new Map<number, number>();
  const excludedCode = excludeColor ? rgbCode(excludeColor.r, excludeColor.g, excludeColor.b) : -1;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const code = rgbCode(data[i], data[i + 1], data[i + 2]);
    if (code === excludedCode) continue;
    histogram.set(code, (histogram.get(code) || 0) + 1);
  }
  if (!histogram.size) return [];

  const codes = Array.from(histogram.keys()).sort((a, b) => a - b);
  const count = codes.length;
  const clusterCount = Math.min(Math.max(1, Math.round(requestedColors)), count);
  const masses = new Float64Array(count);
  const weights = new Float64Array(count);
  const labs: Lab[] = new Array(count);
  let dominantIndex = 0;
  for (let i = 0; i < count; i++) {
    const rgb = codeToRgb(codes[i]);
    const mass = histogram.get(codes[i]) || 0;
    masses[i] = mass;
    weights[i] = Math.pow(mass, 0.7);
    labs[i] = rgbToLab(rgb.r, rgb.g, rgb.b);
    if (mass > masses[dominantIndex]) dominantIndex = i;
  }

  // Deterministic farthest-point initialization: dominant color first, then
  // perceptually distant colors weighted by their observed pixel mass.
  const centers: Lab[] = [labs[dominantIndex].slice() as Lab];
  const nearest = new Float64Array(count);
  nearest.fill(Number.POSITIVE_INFINITY);
  while (centers.length < clusterCount) {
    const newest = centers[centers.length - 1];
    let nextIndex = 0;
    let nextScore = -1;
    for (let i = 0; i < count; i++) {
      nearest[i] = Math.min(nearest[i], labDistanceSquared(labs[i], newest));
      const score = nearest[i] * Math.sqrt(weights[i]);
      if (score > nextScore) { nextScore = score; nextIndex = i; }
    }
    centers.push(labs[nextIndex].slice() as Lab);
  }

  const assignments = new Uint16Array(count);
  assignments.fill(65535);
  for (let iteration = 0; iteration < 20; iteration++) {
    const totals = Array.from({ length: clusterCount }, () => [0, 0, 0] as Lab);
    const totalWeights = new Float64Array(clusterCount);
    let changed = false;
    for (let i = 0; i < count; i++) {
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let c = 0; c < clusterCount; c++) {
        const distance = labDistanceSquared(labs[i], centers[c]);
        if (distance < bestDistance) { bestDistance = distance; best = c; }
      }
      if (assignments[i] !== best) changed = true;
      assignments[i] = best;
      const weight = weights[i];
      totalWeights[best] += weight;
      totals[best][0] += labs[i][0] * weight;
      totals[best][1] += labs[i][1] * weight;
      totals[best][2] += labs[i][2] * weight;
    }
    if (!changed) break;
    for (let c = 0; c < clusterCount; c++) {
      if (totalWeights[c] > 0) {
        centers[c] = [
          totals[c][0] / totalWeights[c],
          totals[c][1] / totalWeights[c],
          totals[c][2] / totalWeights[c],
        ];
      }
    }
  }

  // Match every center to a real observed RGB color, like the CUDA medoid path.
  const paletteCodes: number[] = [];
  for (const center of centers) {
    let representative = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < count; i++) {
      const distance = labDistanceSquared(labs[i], center);
      if (distance < bestDistance) { bestDistance = distance; representative = i; }
    }
    if (!paletteCodes.includes(codes[representative])) paletteCodes.push(codes[representative]);
  }

  // Preserve the exact dominant reference color. In pixel-art inputs this is
  // commonly the background and prevents a global one- or two-level RGB shift.
  const dominantCode = codes[dominantIndex];
  if (!paletteCodes.includes(dominantCode)) {
    const dominantLab = labs[dominantIndex];
    let replace = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < paletteCodes.length; i++) {
      const color = codeToRgb(paletteCodes[i]);
      const distance = labDistanceSquared(dominantLab, rgbToLab(color.r, color.g, color.b));
      if (distance < bestDistance) { bestDistance = distance; replace = i; }
    }
    paletteCodes[replace] = dominantCode;
  }

  return Array.from(new Set(paletteCodes))
    .map(codeToRgb)
    .sort((a, b) => rgbToLab(a.r, a.g, a.b)[0] - rgbToLab(b.r, b.g, b.b)[0]);
};

export const extractBackendCentroids = (
  imageData: ImageData,
  colorCount: number,
  excludeColor?: RGB,
): RGB[] => extractBackendPalette(imageData.data, colorCount, excludeColor);

/** Map each distinct source RGB only once, then reuse it for every matching pixel. */
export const applyBackendCentroids = (
  imageData: ImageData,
  centroids: RGB[],
  excludeColor?: RGB,
): void => {
  if (!centroids.length) return;
  const { data } = imageData;
  const paletteLabs = centroids.map(color => rgbToLab(color.r, color.g, color.b));
  const lookup = new Map<number, number>();
  const excludedCode = excludeColor ? rgbCode(excludeColor.r, excludeColor.g, excludeColor.b) : -1;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const code = rgbCode(data[i], data[i + 1], data[i + 2]);
    if (code === excludedCode) continue;
    let closestIndex = lookup.get(code);
    if (closestIndex === undefined) {
      const lab = rgbToLab(data[i], data[i + 1], data[i + 2]);
      let bestDistance = Number.POSITIVE_INFINITY;
      closestIndex = 0;
      for (let c = 0; c < paletteLabs.length; c++) {
        const distance = labDistanceSquared(lab, paletteLabs[c]);
        if (distance < bestDistance) { bestDistance = distance; closestIndex = c; }
      }
      lookup.set(code, closestIndex);
    }
    const closest = centroids[closestIndex];
    data[i] = closest.r;
    data[i + 1] = closest.g;
    data[i + 2] = closest.b;
  }
};

export const quantizeImageDataBackend = (
  imageData: ImageData,
  colorCount: number,
  excludeColor?: RGB,
): ImageData => {
  const palette = extractBackendCentroids(imageData, colorCount, excludeColor);
  applyBackendCentroids(imageData, palette, excludeColor);
  return imageData;
};
