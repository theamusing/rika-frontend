import { extractBackendCentroids } from './backendPalette.ts';
import { RGB } from './editorUtils.ts';

interface PaletteResponse {
  id: number;
  palette?: RGB[];
  error?: string;
}

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, { resolve: (palette: RGB[]) => void; reject: (error: Error) => void }>();

const getWorker = () => {
  if (worker || typeof Worker === 'undefined') return worker;
  try {
    worker = new Worker(new URL('./paletteQuantizer.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    // Older embedded Chromium builds may not support module workers. The same
    // algorithm remains available synchronously as a compatibility fallback.
    worker = null;
    return null;
  }
  worker.onmessage = ({ data }: MessageEvent<PaletteResponse>) => {
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    if (data.error) request.reject(new Error(data.error));
    else request.resolve(data.palette || []);
  };
  worker.onerror = () => {
    for (const request of pending.values()) request.reject(new Error('Palette worker failed'));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
};

/** Extract the backend-style palette off the browser UI thread. */
export const extractCentroidsAsync = async (
  imageData: ImageData,
  colorCount: number,
  excludeColor?: RGB,
): Promise<RGB[]> => {
  const activeWorker = getWorker();
  if (!activeWorker) return extractBackendCentroids(imageData, colorCount, excludeColor);
  const id = ++requestId;
  const pixels = imageData.data.slice();
  return new Promise<RGB[]>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    activeWorker.postMessage(
      { id, pixels: pixels.buffer, colorCount, excludeColor },
      [pixels.buffer],
    );
  }).catch(() => extractBackendCentroids(imageData, colorCount, excludeColor));
};
