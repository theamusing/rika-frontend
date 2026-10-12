import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';

type Placement = 'right' | 'above' | 'below';

interface ColorPickerPopoverProps {
  anchor: HTMLElement | null;
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
  placement?: Placement;
  align?: 'start' | 'end';
  lang?: 'en' | 'zh';
  children?: React.ReactNode;
}

const GAP = 8;

/** Position a color picker beside its swatch without inheriting clipped or transformed page containers. */
const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  anchor, color, onChange, onClose, placement = 'below', align = 'start', lang = 'en', children,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: GAP, top: GAP });

  useLayoutEffect(() => {
    if (!anchor) return;

    const updatePosition = () => {
      const popover = popoverRef.current;
      if (!popover) return;
      const rect = anchor.getBoundingClientRect();
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      const maxLeft = Math.max(GAP, window.innerWidth - width - GAP);
      const maxTop = Math.max(GAP, window.innerHeight - height - GAP);
      let left = align === 'end' ? rect.right - width : rect.left;
      let top = rect.bottom + GAP;

      if (placement === 'right') {
        left = rect.right + GAP;
        if (left + width > window.innerWidth - GAP) left = rect.left - width - GAP;
        top = rect.top;
      } else if (placement === 'above') {
        top = rect.top - height - GAP;
        if (top < GAP) top = rect.bottom + GAP;
      } else if (top + height > window.innerHeight - GAP) {
        top = rect.top - height - GAP;
      }

      setPosition({
        left: Math.min(Math.max(left, GAP), maxLeft),
        top: Math.min(Math.max(top, GAP), maxTop),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchor, placement, align, children]);

  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!anchor) return null;
  return createPortal(
    <>
      <button type="button" aria-label={lang === 'zh' ? '关闭取色器' : 'Close color picker'}
        className="fixed inset-0 cursor-default" style={{ zIndex: 1000 }} onClick={onClose} />
      <div ref={popoverRef} role="dialog" aria-label={lang === 'zh' ? '取色器' : 'Color picker'}
        className="fixed bg-[#1b0a38] border-2 border-[#5a2d9c] p-2 pixel-border flex flex-col gap-2 shadow-2xl overflow-y-auto"
        style={{ left: position.left, top: position.top, width: 'min(224px, calc(100vw - 16px))', maxHeight: 'calc(100vh - 16px)', zIndex: 1001 }}>
        <HexColorPicker color={color} onChange={onChange} style={{ width: '100%' }} />
        {children}
        <div className="flex justify-between items-center text-xs font-mono text-white/80">
          <span>{color.toUpperCase()}</span>
          <button type="button" className="text-[#a47cfd] font-bold px-1 hover:text-white" onClick={onClose}>
            {lang === 'zh' ? '关闭' : 'CLOSE'}
          </button>
        </div>
      </div>
    </>, document.body,
  );
};

export default ColorPickerPopover;
