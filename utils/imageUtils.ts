
export const processImage = async (source: File | string, padding: boolean = false): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    let objectUrl: string | null = null;

    try {
      if (typeof source === 'string') {
        const separator = source.includes('?') ? '&' : '?';
        const finalUrl = `${source}${separator}t=${Date.now()}`;
        
        const response = await fetch(finalUrl, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP fetch error! status: ${response.status}`);
        const blob = await response.blob();
        if (!blob) throw new Error("Failed to fetch image blob");
        objectUrl = URL.createObjectURL(blob);
      } else {
        objectUrl = URL.createObjectURL(source);
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Canvas is 768 for padding mode, 512 for standard.
        canvas.width = padding ? 768 : 512;
        canvas.height = padding ? 768 : 512;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          return reject('No context');
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
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

        // Content sizing logic: 384 for padding mode, 512 for standard.
        const contentDim = padding ? 384 : 512;
        const scale = Math.min(contentDim / img.width, contentDim / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject('Image rendering failed');
      };

      img.src = objectUrl;

    } catch (err) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(err instanceof Error ? err.message : 'Unknown image load error');
    }
  });
};

export const sliceSpriteSheet = async (url: string, apiLength: number = 25): Promise<string[]> => {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const finalUrl = `${url}${separator}t=${Date.now()}`;
    
    const response = await fetch(finalUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const img = new Image();
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
          
          URL.revokeObjectURL(objectUrl);
          resolve(frames);
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image rendering failed"));
      };
      img.src = objectUrl;
    });
  } catch (err) {
    console.error("Sprite sheet fetch error:", err);
    throw err;
  }
};
