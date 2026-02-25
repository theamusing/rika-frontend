
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
 * Median Cut 算法实现
 */
const medianCut = (pixels: RGB[], maxColors: number): RGB[] => {
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
    const sum = box.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b, a: 255 }), { r: 0, g: 0, b: 0, a: 255 });
    return {
      r: Math.round(sum.r / box.length),
      g: Math.round(sum.g / box.length),
      b: Math.round(sum.b / box.length),
      a: 255
    };
  });
};

/**
 * 从 ImageData 中提取主导颜色 (质心)
 * 使用 Median Cut 算法，并始终保留图像中最深和最浅的两个颜色
 */
export const extractCentroids = (
  imageData: ImageData,
  k: number,
  excludeColor?: RGB
): RGB[] => {
  const { data } = imageData;
  const pixels: RGB[] = [];
  
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 128) continue;
    const p = { r: data[i], g: data[i+1], b: data[i+2], a: 255 };
    if (excludeColor && colorDistance(p, excludeColor) < 2) continue;
    pixels.push(p);
  }

  if (pixels.length === 0) return [];
  
  // 找到最深和最浅的颜色
  let darkest = pixels[0];
  let lightest = pixels[0];
  let minLum = Infinity;
  let maxLum = -Infinity;

  pixels.forEach(p => {
    const lum = 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
    if (lum < minLum) {
      minLum = lum;
      darkest = p;
    }
    if (lum > maxLum) {
      maxLum = lum;
      lightest = p;
    }
  });

  // 如果 k 很小，直接返回这两个
  if (k <= 2) {
    const result = [darkest];
    if (k === 2 && colorDistance(darkest, lightest) > 0) {
      result.push(lightest);
    }
    return result;
  }

  // 过滤掉最深和最浅的颜色，对剩下的进行 Median Cut
  const remainingPixels = pixels.filter(p => 
    colorDistance(p, darkest) > 0 && colorDistance(p, lightest) > 0
  );

  if (remainingPixels.length === 0) {
    return colorDistance(darkest, lightest) > 0 ? [darkest, lightest] : [darkest];
  }

  const palette = medianCut(remainingPixels, k - 2);
  
  // 合并结果
  const finalPalette = [darkest, lightest, ...palette];
  
  // 确保唯一性 (以防 medianCut 产生的颜色与 darkest/lightest 重合)
  const uniquePalette: RGB[] = [];
  const seen = new Set<string>();
  
  finalPalette.forEach(p => {
    const key = `${p.r},${p.g},${p.b}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePalette.push(p);
    }
  });

  return uniquePalette.slice(0, k);
};

/**
 * 将指定的质心应用到 ImageData
 */
export const applyCentroids = (
  imageData: ImageData,
  centroids: RGB[],
  excludeColor?: RGB
): void => {
  const { data } = imageData;
  if (centroids.length === 0) return;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 128) continue;
    const p = { r: data[i], g: data[i+1], b: data[i+2], a: 255 };
    if (excludeColor && colorDistance(p, excludeColor) < 1) continue;
    
    let minDist = Infinity;
    let closest = centroids[0];
    centroids.forEach(c => {
      const d = colorDistance(p, c);
      if (d < minDist) {
        minDist = d;
        closest = c;
      }
    });
    
    data[i] = closest.r;
    data[i+1] = closest.g;
    data[i+2] = closest.b;
  }
};

/**
 * 对单个 ImageData 进行颜色量化，可选择排除背景色
 */
export const quantizeImageData = (
  imageData: ImageData,
  k: number,
  excludeColor?: RGB
): ImageData => {
  const centroids = extractCentroids(imageData, k, excludeColor);
  applyCentroids(imageData, centroids, excludeColor);
  return imageData;
};
