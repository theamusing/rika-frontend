import { extractBackendPalette } from './backendPalette.ts';
import { RGB } from './editorUtils.ts';

interface PaletteRequest {
  id: number;
  pixels: ArrayBuffer;
  colorCount: number;
  excludeColor?: RGB;
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<PaletteRequest>) => void) | null;
  postMessage: (message: unknown) => void;
}

const scope = globalThis as unknown as WorkerScope;
scope.onmessage = ({ data }) => {
  try {
    const palette = extractBackendPalette(
      new Uint8ClampedArray(data.pixels),
      data.colorCount,
      data.excludeColor,
    );
    scope.postMessage({ id: data.id, palette });
  } catch (error) {
    scope.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : 'Palette extraction failed',
    });
  }
};
