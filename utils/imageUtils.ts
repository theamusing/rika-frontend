
/**
 * Helper to fetch a remote image and return an object URL.
 * Includes cache busting and handles CORS errors gracefully.
 */
const fetchAsObjectUrl = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) return url;

  const separator = url.includes('?') ? '&' : '?';
  const finalUrl = `${url}${separator}t=${Date.now()}`;
  
  try {
    const response = await fetch(finalUrl, { 
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`Asset server returned ${response.status}`);
    }
    
    const blob = await response.blob();
    if (!blob) throw new Error("Received empty blob from server");
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("CORS/Network error fetching asset:", url);
    throw new Error("Failed to fetch image. Ensure the server allows CORS for this origin.");
  }
};

export const processImage = async (
  source: File | string, 
  padding: boolean = false, 
  flip: boolean = false,
  pixelSize: string = '128'
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    let objectUrl: string | null = null;
    let isDataUrl = false;

    try {
      if (source instanceof File) {
        objectUrl = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        if (source.startsWith('data:')) {
          objectUrl = source;
          isDataUrl = true;
        } else {
          objectUrl = await fetchAsObjectUrl(source);
        }
      }

      if (!objectUrl) return reject('Invalid image source');

      const img = new Image();
      if (!isDataUrl) img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = padding ? 768 : 512;
        canvas.height = padding ? 768 : 512;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (objectUrl && !isDataUrl) URL.revokeObjectURL(objectUrl);
          return reject('No context');
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          if (objectUrl && !isDataUrl) URL.revokeObjectURL(objectUrl);
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

        // Reverted Logic: Uniform content dimension for padding mode
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

        if (objectUrl && !isDataUrl) URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => {
        if (objectUrl && !isDataUrl) URL.revokeObjectURL(objectUrl);
        reject('Image rendering failed');
      };

      img.src = objectUrl;

    } catch (err) {
      if (objectUrl && !isDataUrl) URL.revokeObjectURL(objectUrl);
      reject(err instanceof Error ? err.message : 'Unknown image load error');
    }
  });
};

export const unprocessImage = async (url: string, pixelSize: string = '128'): Promise<string> => {
  try {
    const objectUrl = await fetchAsObjectUrl(url);
    const isDataUrl = objectUrl.startsWith('data:');

    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!isDataUrl) img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (!isDataUrl) URL.revokeObjectURL(objectUrl);
          return reject('No context');
        }
        
        ctx.imageSmoothingEnabled = false;
        
        // Reverted Logic: If image is 768px (padded), always crop the central 384px area.
        if (img.width === 768) {
            const contentDim = 384;
            const offset = (768 - contentDim) / 2;
            ctx.drawImage(img, offset, offset, contentDim, contentDim, 0, 0, 512, 512);
        } else {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 512, 512);
        }
        
        if (!isDataUrl) URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => {
        if (!isDataUrl) URL.revokeObjectURL(objectUrl);
        reject('Failed to load image for unprocessing');
      };
      
      img.src = objectUrl;
    });
  } catch (err) {
    throw err;
  }
};

export const sliceSpriteSheet = async (url: string, apiLength: number = 25): Promise<string[]> => {
  try {
    const objectUrl = await fetchAsObjectUrl(url);
    const isDataUrl = objectUrl.startsWith('data:');

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
          
          if (!isDataUrl) URL.revokeObjectURL(objectUrl);
          resolve(frames);
        } catch (e) {
          if (!isDataUrl) URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };
      img.onerror = () => {
        if (!isDataUrl) URL.revokeObjectURL(objectUrl);
        reject(new Error("Image rendering failed"));
      };
      img.src = objectUrl;
    });
  } catch (err) {
    console.error("Sprite sheet fetch error:", err);
    throw err;
  }
};

/**
 * Reconstructs a sprite sheet from a list of frame Data URLs.
 * Arranges active frames in a 4-column grid.
 */
export const reconstructSpriteSheet = async (frames: string[]): Promise<string> => {
  if (frames.length === 0) throw new Error("No frames provided");

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
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

    // Fill with transparent black (explicitly)
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
