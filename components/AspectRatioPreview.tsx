import React, { useState } from 'react';
import { PixelImage } from './PixelComponents.tsx';

interface Props {
  src?: string;
  alt: string;
  className?: string;
  fallbackRatio?: number;
  maxHeight?: number;
  children?: React.ReactNode;
}

// The fallback describes one reference frame. After loading, use the actual
// asset ratio instead (a spritesheet can have a completely different shape).
const AspectRatioPreview: React.FC<Props> = ({ src, alt, className = '', fallbackRatio = 1, maxHeight = 420, children }) => {
  const [loaded, setLoaded] = useState<{ src?: string; ratio: number } | null>(null);
  const ratio = loaded && loaded.src === src ? loaded.ratio : fallbackRatio;
  return (
    <div className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: ratio, maxHeight }}>
      {src && <PixelImage src={src} alt={alt} className="w-full h-full object-contain"
        style={{ imageRendering: 'pixelated' }} onLoad={event => {
          const image = event.currentTarget;
          // PixelImage briefly uses a transparent 1x1 placeholder while caching.
          if (image.naturalWidth > 1 && image.naturalHeight > 1) {
            setLoaded({ src, ratio: image.naturalWidth / image.naturalHeight });
          }
        }} />}
      {children}
    </div>
  );
};

export default AspectRatioPreview;
