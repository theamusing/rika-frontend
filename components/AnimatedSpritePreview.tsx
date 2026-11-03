import React, { useEffect, useRef, useState } from 'react';
import { PixelImage } from './PixelComponents.tsx';
import AspectRatioPreview from './AspectRatioPreview.tsx';
import { drawSpriteSheetFrame, getSpriteSheetLayout, SpriteSheetLayout } from '../utils/imageUtils.ts';
import { loadReadableImage } from '../utils/imageLoader.ts';

const EMPTY_EXCLUDED: number[] = [];

interface Props {
  src?: string;
  animationSrc?: string;
  frameCount?: number;
  columns?: number;
  excludedIndices?: number[];
  alt: string;
  className?: string;
  fallbackRatio?: number;
  maxHeight?: number;
  children?: React.ReactNode;
  play?: boolean;
  lang?: 'en' | 'zh';
}

const AnimatedSpritePreview: React.FC<Props> = ({
  src, animationSrc, frameCount = 0, columns = 4, excludedIndices = EMPTY_EXCLUDED, alt,
  className = '', fallbackRatio = 1, maxHeight = 420, children, play = true, lang = 'en',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLImageElement | null>(null);
  const layoutRef = useRef<SpriteSheetLayout | null>(null);
  const frameOrderRef = useRef<number[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [frameRatio, setFrameRatio] = useState(fallbackRatio);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const canAnimate = Boolean(animationSrc) && frameCount > 0;

  useEffect(() => {
    if (!canAnimate || !containerRef.current) return;
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: '120px',
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canAnimate]);

  useEffect(() => {
    sheetRef.current = null;
    layoutRef.current = null;
    frameOrderRef.current = [];
    setReady(false);
    setError(false);
    if (!canAnimate || !isVisible || !animationSrc) return;
    let active = true;
    void loadReadableImage(animationSrc, { refresh: retry > 0 }).then(image => {
      if (!active) return;
      try {
        // Player's slicer uses these exact shared crop coordinates.
        const layout = getSpriteSheetLayout(image.naturalWidth, image.naturalHeight, frameCount, 33, columns);
        const excluded = new Set(excludedIndices);
        const order = Array.from({ length: layout.frameCount }, (_, index) => index)
          .filter(index => !excluded.has(index));
        sheetRef.current = image;
        layoutRef.current = layout;
        frameOrderRef.current = order.length ? order : [0];
        setFrameRatio(layout.frameWidth / layout.frameHeight);
        setReady(true);
      } catch (error) {
        console.warn('Animation preview layout failed.', error);
        setReady(false); setError(true);
      }
    }).catch(error => {
      if (active) { console.warn('Animation preview could not be loaded.', error); setReady(false); setError(true); }
    });
    return () => {
      active = false;
      sheetRef.current = null;
      layoutRef.current = null;
      frameOrderRef.current = [];
    };
  }, [animationSrc, canAnimate, columns, excludedIndices, frameCount, isVisible, retry]);

  useEffect(() => {
    if (!ready || !isVisible || !canvasRef.current || !sheetRef.current || !layoutRef.current) return;
    const sheet = sheetRef.current;
    const layout = layoutRef.current;
    const order = frameOrderRef.current;
    const canvas = canvasRef.current;
    canvas.width = layout.frameWidth;
    canvas.height = layout.frameHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.imageSmoothingEnabled = false;
    let index = 0;
    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawSpriteSheetFrame(context, sheet, layout, order[index]);
      index = (index + 1) % order.length;
    };
    draw();
    if (!play || order.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(draw, 1000 / 12);
    return () => window.clearInterval(timer);
  }, [isVisible, play, ready]);

  if (!canAnimate) {
    return <AspectRatioPreview src={src} alt={alt} className={className}
      fallbackRatio={fallbackRatio} maxHeight={maxHeight}>{children}</AspectRatioPreview>;
  }

  return (
    <div ref={containerRef} className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: ready ? frameRatio : fallbackRatio, maxHeight }}>
      {src && <PixelImage src={src} alt={alt} aria-hidden={ready}
        className={`absolute inset-0 h-full w-full object-contain ${ready ? 'invisible' : ''}`}
        style={{ imageRendering: 'pixelated' }} />}
      <canvas ref={canvasRef} role="img" aria-label={alt} aria-hidden={!ready}
        className={`absolute inset-0 h-full w-full object-contain ${ready ? '' : 'invisible'}`}
        style={{ imageRendering: 'pixelated' }} />
      {!ready && isVisible && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#1b0a38]/95 p-2 text-center text-white" style={{ fontSize: lang === 'zh' ? 13 : 10 }}>
          {error ? <button type="button" className="underline text-[#f7d51d]" onClick={event => {
            event.stopPropagation(); setRetry(value => value + 1);
          }}>{lang === 'zh' ? '动画预览加载失败 · 重试' : 'Animation preview failed · Retry'}</button>
            : (lang === 'zh' ? '正在加载动画…' : 'Loading animation…')}
        </div>
      )}
      {children}
    </div>
  );
};

export default AnimatedSpritePreview;
