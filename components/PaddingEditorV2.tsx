import React, { useRef } from 'react';
import { PaddingOffsets, PixelDimensions } from '../types.ts';
import { paddedDimensions } from '../utils/animationV2.ts';

interface Props {
  size: PixelDimensions;
  padding: PaddingOffsets;
  image: string | null;
  onChange: (padding: PaddingOffsets) => void;
  lang: 'en' | 'zh';
  disabled?: boolean;
}

const PaddingEditorV2: React.FC<Props> = ({ size, padding, image, onChange, lang, disabled }) => {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ side: keyof PaddingOffsets; pointer: number; start: number; value: number; unit: number } | null>(null);
  const zh = lang === 'zh';
  const total = paddedDimensions(size, padding);
  const x = (256 - total.x) / 2 + padding.left;
  const y = (256 - total.y) / 2 + padding.top;
  const labels = { left: zh ? '左侧留白' : 'Left padding', right: zh ? '右侧留白' : 'Right padding',
    top: zh ? '上方留白' : 'Top padding', bottom: zh ? '下方留白' : 'Bottom padding' };
  const position = {
    left: { left: x - padding.left, top: 128 },
    right: { left: x + size.x + padding.right, top: 128 },
    top: { left: 128, top: y - padding.top },
    bottom: { left: 128, top: y + size.y + padding.bottom },
  };
  const limit = (side: keyof PaddingOffsets) => {
    const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const;
    return 256 - (side === 'left' || side === 'right' ? size.x : size.y) - padding[opposite[side]];
  };
  const update = (side: keyof PaddingOffsets, value: number) => {
    onChange({ ...padding, [side]: Math.max(0, Math.min(limit(side), Math.round(value / 32) * 32)) });
  };
  return (
    <div className="border-2 border-[#5a2d9c] bg-black/20 p-3 space-y-3" data-testid="v2-padding-editor">
      <div className="flex justify-between gap-2 text-white/70 font-mono text-xs">
        <span>{zh ? '拖动四边调整留白' : 'DRAG EDGES TO PAD'}</span>
        <span className="text-[#f7d51d]">{total.x}×{total.y}</span>
      </div>
      <div ref={stage} className="relative mx-auto w-[240px] max-w-full aspect-square select-none touch-none">
        <div className="absolute inset-0 border border-white/10" style={{
          backgroundImage: 'linear-gradient(to right, #ffffff0d 1px, transparent 1px), linear-gradient(to bottom, #ffffff0d 1px, transparent 1px)',
          backgroundSize: '12.5% 12.5%',
        }} />
        <div className="absolute border-2 border-dashed border-[#f7d51d] bg-[#5a2d9c]/30" style={{
          left: `${(x - padding.left) / 256 * 100}%`, top: `${(y - padding.top) / 256 * 100}%`,
          width: `${total.x / 256 * 100}%`, height: `${total.y / 256 * 100}%`,
        }} />
        <div className="absolute border border-white/40 bg-[#0d0221] flex items-center justify-center overflow-hidden" style={{
          left: `${x / 256 * 100}%`, top: `${y / 256 * 100}%`, width: `${size.x / 256 * 100}%`, height: `${size.y / 256 * 100}%`,
        }}>
          {image ? <img src={image} alt={zh ? '原图内容' : 'Image content'} className="w-full h-full" style={{ imageRendering: 'pixelated' }} draggable={false} />
            : <span className="font-mono text-xs text-white/50">{size.x}×{size.y}</span>}
        </div>
        {(Object.keys(padding) as (keyof PaddingOffsets)[]).map(side => (
          <button key={side} type="button" role="slider" aria-label={labels[side]}
            aria-valuemin={0} aria-valuemax={limit(side)} aria-valuenow={padding[side]}
            aria-orientation={side === 'left' || side === 'right' ? 'horizontal' : 'vertical'}
            title={`${labels[side]}: ${padding[side]}px`} disabled={disabled || limit(side) === 0}
            className="absolute z-10 w-7 h-7 -translate-x-1/2 -translate-y-1/2 bg-[#f7d51d] text-[#2d1b4e] border-2 border-[#0d0221] font-mono text-lg leading-none disabled:opacity-40 focus:outline-2 focus:outline-white"
            style={{ left: `${position[side].left / 256 * 100}%`, top: `${position[side].top / 256 * 100}%`,
              cursor: side === 'left' || side === 'right' ? 'ew-resize' : 'ns-resize', touchAction: 'none' }}
            onPointerDown={event => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { side, pointer: event.pointerId, value: padding[side],
                start: side === 'left' || side === 'right' ? event.clientX : event.clientY,
                unit: (stage.current?.getBoundingClientRect().width || 240) / 256 };
            }}
            onPointerMove={event => {
              const active = drag.current;
              if (!active || active.side !== side || active.pointer !== event.pointerId) return;
              const current = side === 'left' || side === 'right' ? event.clientX : event.clientY;
              const sign = side === 'left' || side === 'top' ? -1 : 1;
              // The canvas is centered, so extending one side moves its handle
              // by half the added padding. Match that movement to the pointer.
              update(side, active.value + sign * 2 * (current - active.start) / active.unit);
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            onLostPointerCapture={() => { drag.current = null; }}
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              if (event.key === 'Home') update(side, 0);
              else if (event.key === 'End') update(side, limit(side));
              else {
                const outward = side === 'left' ? 'ArrowLeft' : side === 'right' ? 'ArrowRight' : side === 'top' ? 'ArrowUp' : 'ArrowDown';
                const inward = side === 'left' ? 'ArrowRight' : side === 'right' ? 'ArrowLeft' : side === 'top' ? 'ArrowDown' : 'ArrowUp';
                if (event.key === outward || event.key === inward) update(side, padding[side] + (event.key === outward ? 32 : -32));
              }
            }}>
            {side === 'left' || side === 'right' ? '↔' : '↕'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs text-white/60">
        {(Object.keys(padding) as (keyof PaddingOffsets)[]).map(side => <span key={side}>
          {zh ? { left: '左', right: '右', top: '上', bottom: '下' }[side] : side.toUpperCase()}<br />{padding[side]}px
        </span>)}
      </div>
      <p className="text-white/40 font-sans text-xs leading-relaxed">
        {zh ? '每次调整 32 像素，含留白的宽高最多 256。也可选中拖柄使用方向键。' : '32px steps. Total width and height stay ≤256. Arrow keys also work.'}
      </p>
    </div>
  );
};

export default PaddingEditorV2;
