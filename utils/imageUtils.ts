
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
  pixelSize: string = '128'
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
        const canvas = document.createElement('canvas');
        canvas.width = padding ? 768 : 512;
        canvas.height = padding ? 768 : 512;
        
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
        let bgColor = 'rgb(0, 60, 60)';

        if (!hasTransparency) {
          const avgR = Math.round(cornerData.reduce((acc, p) => acc + p[0], 0) / 4);
          const avgG = Math.round(cornerData.reduce((acc, p) => acc + p[1], 0) / 4);
          const avgB = Math.round(cornerData.reduce((acc, p) => acc + p[2], 0) / 4);
          bgColor = `rgb(${avgR}, ${avgG}, ${avgB})`;
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const contentDim = padding ? 384 : 512;
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
