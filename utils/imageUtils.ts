
import { getAssetFromCache, saveAssetToCache } from './dbUtils.ts';

/**
 * Checks if a URL points to a user-generated image that should be cached.
 */
export const isUserImage = (url: string): boolean => {
  return url.includes('cdn.rika-ai.com/users/');
};

/**
 * Helper to fetch a remote image and return a Data URL.
 * Implements persistent caching via IndexedDB for user images and robust CORS handling.
 */
export const fetchAsDataUrl = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) return url;

  const shouldCache = isUserImage(url);

  // 1. Check persistent cache first (only for user images)
  if (shouldCache) {
    try {
      const cached = await getAssetFromCache(url);
      if (cached) {
        return cached;
      }
    } catch (err) {
      console.warn("Persistent cache read failure", err);
    }
  }

  // 2. Try fetching via XHR/fetch first (preferred for blobs)
  try {
    const response = await fetch(url, { 
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      if (shouldCache) {
        try { await saveAssetToCache(url, dataUrl); } catch (e) {}
      }
      return dataUrl;
    }
  } catch (err) {
    console.warn(`Fetch API failed for ${url.slice(-20)}, trying Image fallback...`);
  }

  // 3. Fallback: Try loading via Image element
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.drawImage(img, 0, 0);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        if (shouldCache) {
          saveAssetToCache(url, dataUrl).catch(() => {});
        }
        resolve(dataUrl);
      } catch (e) {
        reject(new Error("Canvas toDataURL failed - likely CORS"));
      }
    };
    img.onerror = () => reject(new Error(`Failed to fetch image via all protocols: ${url}`));
    img.src = url;
  });
};

export const processImage = async (
  source: File | string, 
  padding: boolean = false, 
  flip: boolean = false,
  pixelSize: string = '128',
  overrideBgColor?: string
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    let sourceDataUrl: string | null = null;
    let isRevocable = false;

    try {
      if (source instanceof File) {
        sourceDataUrl = URL.createObjectURL(source);
        isRevocable = true;
      } else if (typeof source === 'string') {
        if (source.startsWith('data:')) {
          sourceDataUrl = source;
        } else {
          sourceDataUrl = await fetchAsDataUrl(source);
        }
      }

      if (!sourceDataUrl) return reject('Invalid image source');

      const img = new Image();
      if (!sourceDataUrl.startsWith('data:')) img.crossOrigin = "anonymous";

      img.onload = () => {
        const pixelInt = parseInt(pixelSize);
        let canvasDim = 512;
        let contentDim = 512;

        if (padding) {
          canvasDim = 768;
          contentDim = 384;
        } else {
          if (pixelInt === 64 || pixelInt === 128) {
            canvasDim = 512;
            contentDim = 512;
          } else {
            canvasDim = 768;
            contentDim = 768;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasDim;
        canvas.height = canvasDim;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (isRevocable && sourceDataUrl) URL.revokeObjectURL(sourceDataUrl);
          return reject('No context');
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          if (isRevocable && sourceDataUrl) URL.revokeObjectURL(sourceDataUrl);
          return reject('No temp context');
        }
        tempCtx.drawImage(img, 0, 0);

        const cornerData = [
          tempCtx.getImageData(0, 0, 1, 1).data,
          tempCtx.getImageData(img.width - 1, 0, 1, 1).data,
          tempCtx.getImageData(0, img.height - 1, 1, 1).data,
          tempCtx.getImageData(img.width - 1, img.height - 1, 1, 1).data
        ];

        const hasTransparency = cornerData.some(pixel => pixel[3] < 255);
        let bgColor: string;

        if (hasTransparency) {
          bgColor = overrideBgColor || 'rgb(128, 128, 128)';
        } else {
          const avgR = Math.round(cornerData.reduce((acc, p) => acc + p[0], 0) / 4);
          const avgG = Math.round(cornerData.reduce((acc, p) => acc + p[1], 0) / 4);
          const avgB = Math.round(cornerData.reduce((acc, p) => acc + p[2], 0) / 4);
          bgColor = `rgb(${avgR}, ${avgG}, ${avgB})`;
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const scale = Math.min(contentDim / img.width, contentDim / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;

        ctx.imageSmoothingEnabled = false;

        ctx.save();
        if (flip) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        ctx.restore();

        if (isRevocable && sourceDataUrl) URL.revokeObjectURL(sourceDataUrl);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => {
        if (isRevocable && sourceDataUrl) URL.revokeObjectURL(sourceDataUrl);
        reject('Image rendering failed');
      };

      img.src = sourceDataUrl;

    } catch (err) {
      if (isRevocable && sourceDataUrl) URL.revokeObjectURL(sourceDataUrl);
      reject(err instanceof Error ? err.message : 'Unknown image load error');
    }
  });
};

export const unprocessImage = async (url: string, pixelSize: string = '128'): Promise<string> => {
  try {
    const sourceDataUrl = await fetchAsDataUrl(url);
    const isDataUrl = sourceDataUrl.startsWith('data:');

    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!isDataUrl) img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');
        
        ctx.imageSmoothingEnabled = false;
        
        if (img.width === 768) {
            const contentDim = 384;
            const offset = (768 - contentDim) / 2;
            ctx.drawImage(img, offset, offset, contentDim, contentDim, 0, 0, 512, 512);
        } else {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 512, 512);
        }
        
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => {
        reject('Failed to load image for unprocessing');
      };
      
      img.src = sourceDataUrl;
    });
  } catch (err) {
    throw err;
  }
};

/**
 * Extracts a color palette from an image (excluding transparent pixels).
 */
export const extractPalette = async (source: string | File, maxColors: number = 32): Promise<string[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      let dataUrl: string;
      if (source instanceof File) {
        dataUrl = URL.createObjectURL(source);
      } else {
        dataUrl = source.startsWith('data:') ? source : await fetchAsDataUrl(source);
      }

      const img = new Image();
      if (!dataUrl.startsWith('data:')) img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');

        // Scale down for faster processing if needed, but for palette extraction 
        // we can just use a reasonable size.
        const scale = Math.min(1, 256 / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const colors: {r: number, g: number, b: number}[] = [];

        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 128) { // Only non-transparent
            colors.push({ r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] });
          }
        }

        if (source instanceof File) URL.revokeObjectURL(dataUrl);

        if (colors.length === 0) return resolve([]);

        // Simple Median Cut or K-Means would be better, but for now let's do a basic popularity/clustering
        // Actually, let's implement a simple Median Cut.
        const palette = medianCut(colors, maxColors);
        resolve(palette.map(c => rgbToHex(c.r, c.g, c.b)));
      };
      img.onerror = () => reject('Failed to load image for palette');
      img.src = dataUrl;
    } catch (e) {
      reject(e);
    }
  });
};

const rgbToHex = (r: number, g: number, b: number) => 
  "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const medianCut = (pixels: {r: number, g: number, b: number}[], maxColors: number): {r: number, g: number, b: number}[] => {
  let boxes = [pixels];
  
  while (boxes.length < maxColors) {
    let boxToSplit = -1;
    let maxRange = -1;

    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length <= 1) continue;
      
      let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
      for (const p of boxes[i]) {
        minR = Math.min(minR, p.r); maxR = Math.max(maxR, p.r);
        minG = Math.min(minG, p.g); maxG = Math.max(maxG, p.g);
        minB = Math.min(minB, p.b); maxB = Math.max(maxB, p.b);
      }
      
      const range = Math.max(maxR - minR, maxG - minG, maxB - minB);
      if (range > maxRange) {
        maxRange = range;
        boxToSplit = i;
      }
    }

    if (boxToSplit === -1) break;

    const box = boxes.splice(boxToSplit, 1)[0];
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (const p of box) {
      minR = Math.min(minR, p.r); maxR = Math.max(maxR, p.r);
      minG = Math.min(minG, p.g); maxG = Math.max(maxG, p.g);
      minB = Math.min(minB, p.b); maxB = Math.max(maxB, p.b);
    }

    const rRange = maxR - minR;
    const gRange = maxG - minG;
    const bRange = maxB - minB;

    let component: 'r' | 'g' | 'b' = 'r';
    if (gRange >= rRange && gRange >= bRange) component = 'g';
    else if (bRange >= rRange && bRange >= gRange) component = 'b';

    box.sort((a, b) => a[component] - b[component]);
    const mid = Math.floor(box.length / 2);
    boxes.push(box.slice(0, mid));
    boxes.push(box.slice(mid));
  }

  return boxes.map(box => {
    const sum = box.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }), { r: 0, g: 0, b: 0 });
    return {
      r: Math.round(sum.r / box.length),
      g: Math.round(sum.g / box.length),
      b: Math.round(sum.b / box.length)
    };
  });
};

/**
 * Quantizes an image to a given palette.
 */
export const quantizeImage = async (dataUrl: string, palette: string[]): Promise<string> => {
  if (palette.length === 0) return dataUrl;
  
  const paletteRgb = palette.map(hexToRgb);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No context');

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          let bestColor = paletteRgb[0];
          let minDistance = Infinity;

          for (const color of paletteRgb) {
            const dist = Math.pow(r - color.r, 2) + Math.pow(g - color.g, 2) + Math.pow(b - color.b, 2);
            if (dist < minDistance) {
              minDistance = dist;
              bestColor = color;
            }
          }

          pixels[i] = bestColor.r;
          pixels[i + 1] = bestColor.g;
          pixels[i + 2] = bestColor.b;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject('Failed to load image for quantization');
    img.src = dataUrl;
  });
};

export const sliceSpriteSheet = async (url: string, apiLength: number = 25): Promise<string[]> => {
  try {
    const sourceDataUrl = await fetchAsDataUrl(url);
    const isDataUrl = sourceDataUrl.startsWith('data:');

    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!isDataUrl) img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const frames: string[] = [];
          const targetLength = (apiLength - 1) / 2;
          const cols = 4;
          const rows = Math.ceil(targetLength / cols);
          
          const frameWidth = Math.floor(img.width / cols);
          const frameHeight = Math.floor(img.height / rows);
          
          if (frameWidth === 0 || frameHeight === 0) {
            throw new Error("Invalid image dimensions");
          }

          let extractedCount = 0;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              if (extractedCount >= targetLength) break;

              const canvas = document.createElement('canvas');
              canvas.width = frameWidth;
              canvas.height = frameHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(
                  img, 
                  col * frameWidth, row * frameHeight, frameWidth, frameHeight,
                  0, 0, frameWidth, frameHeight
                );
                frames.push(canvas.toDataURL('image/png'));
              }
              extractedCount++;
            }
          }
          
          resolve(frames);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        reject(new Error("Image rendering failed"));
      };
      img.src = sourceDataUrl;
    });
  } catch (err) {
    console.error("Sprite sheet fetch error:", err);
    throw err;
  }
};

export const reconstructSpriteSheet = async (frames: string[]): Promise<string> => {
  if (frames.length === 0) throw new Error("No frames provided");

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (src.startsWith('http')) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  try {
    const imgObjects = await Promise.all(frames.map(loadImage));
    const frameWidth = imgObjects[0].width;
    const frameHeight = imgObjects[0].height;

    const cols = 4;
    const rows = Math.ceil(imgObjects.length / cols);

    const canvas = document.createElement('canvas');
    canvas.width = cols * frameWidth;
    canvas.height = rows * frameHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not create reconstruction context");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    imgObjects.forEach((img, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, col * frameWidth, row * frameHeight);
    });

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error("Reconstruction failed:", err);
    throw err;
  }
};
