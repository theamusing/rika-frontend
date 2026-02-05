
export interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * 颜色距离计算 (欧几里得距离)
 */
export const colorDistance = (c1: RGB, c2: RGB): number => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
};

/**
 * 泛洪填充/魔棒算法
 */
export const floodFill = (
  imageData: ImageData,
  startX: number,
  startY: number,
  targetColor: RGB,
  tolerance: number,
  fillColor: RGB | null // null 表示删除/透明
) => {
  const { width, height, data } = imageData;
  const stack: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(width * height);
  
  const getPixel = (x: number, y: number): RGB => {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i+1], b: data[i+2], a: data[i+3] };
  };

  const setPixel = (x: number, y: number, color: RGB | null) => {
    const i = (y * width + x) * 4;
    if (color === null) {
      data[i+3] = 0; // 透明
    } else {
      data[i] = color.r;
      data[i+1] = color.g;
      data[i+2] = color.b;
      data[i+3] = color.a;
    }
  };

  const startPixelColor = getPixel(startX, startY);

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const currentPixel = getPixel(x, y);
    if (colorDistance(currentPixel, startPixelColor) <= tolerance) {
      setPixel(x, y, fillColor);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
};

/**
 * K-means 全局颜色量化
 */
export const quantizeFrames = async (
  framesData: ImageData[],
  k: number
): Promise<ImageData[]> => {
  // 1. 收集所有非透明像素
  let pixels: RGB[] = [];
  framesData.forEach(img => {
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] > 128) { // 忽略透明像素
        pixels.push({ r: img.data[i], g: img.data[i+1], b: img.data[i+2], a: 255 });
      }
    }
  });

  if (pixels.length === 0) return framesData;

  // 2. 初始化质心 (随机采样)
  let centroids: RGB[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
  }

  // 3. 迭代 (简化版，3次迭代足以在像素画中产生不错的效果)
  for (let iter = 0; iter < 3; iter++) {
    const clusters: RGB[][] = Array.from({ length: k }, () => []);
    
    pixels.forEach(p => {
      let minDist = Infinity;
      let clusterIdx = 0;
      centroids.forEach((c, idx) => {
        const d = colorDistance(p, c);
        if (d < minDist) {
          minDist = d;
          clusterIdx = idx;
        }
      });
      clusters[clusterIdx].push(p);
    });

    centroids = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centroids[i];
      const sum = cluster.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b, a: 255 }), { r: 0, g: 0, b: 0, a: 255 });
      return {
        r: Math.round(sum.r / cluster.length),
        g: Math.round(sum.g / cluster.length),
        b: Math.round(sum.b / cluster.length),
        a: 255
      };
    });
  }

  // 4. 映射像素
  return framesData.map(img => {
    const newImg = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
    for (let i = 0; i < newImg.data.length; i += 4) {
      if (newImg.data[i + 3] > 128) {
        const p = { r: newImg.data[i], g: newImg.data[i+1], b: newImg.data[i+2], a: 255 };
        let minDist = Infinity;
        let closest = centroids[0];
        centroids.forEach(c => {
          const d = colorDistance(p, c);
          if (d < minDist) {
            minDist = d;
            closest = c;
          }
        });
        newImg.data[i] = closest.r;
        newImg.data[i+1] = closest.g;
        newImg.data[i+2] = closest.b;
      }
    }
    return newImg;
  });
};
