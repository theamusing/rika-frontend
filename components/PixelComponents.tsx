
import React, { useState, useEffect } from 'react';
import { fetchAsDataUrl, isUserImage } from '../utils/imageUtils.ts';

export const PixelButton: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  className?: string;
  disabled?: boolean;
  title?: string;
}> = ({ onClick, children, variant = 'primary', className = '', disabled, title }) => {
  const variantStyles = {
    primary: 'bg-[#f7d51d] text-[#2d1b4e] border-[#f7d51d]',
    secondary: 'bg-[#5a2d9c] text-white border-[#5a2d9c]',
    outline: 'bg-transparent text-[#f7d51d] border-[#f7d51d]',
    danger: 'bg-red-900 text-white border-red-500'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`pixel-btn px-4 py-2 pixel-border font-bold uppercase transition-all flex items-center justify-center gap-2 ${variantStyles[variant]} ${disabled ? 'opacity-50 grayscale' : ''} ${className}`}
      style={{ fontSize: '12px' }}
    >
      {children}
    </button>
  );
};

export const PixelCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}> = ({ children, className = '', title, onClick }) => (
  <div 
    className={`pixel-border bg-[#2d1b4e]/50 p-4 relative ${className}`}
    onClick={onClick}
  >
    {title && (
      <div className="absolute -top-4 left-4 bg-[#0d0221] px-2 text-[10px] text-white/70 uppercase">
        {title}
      </div>
    )}
    {children}
  </div>
);

export const PixelInput: React.FC<{
  value: string | number;
  onChange: (e: any) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}> = ({ value, onChange, placeholder, type = 'text', className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`bg-[#0d0221] pixel-border border-[#5a2d9c] p-2 text-white text-[10px] outline-none focus:border-[#f7d51d] placeholder-[#5a2d9c] ${className}`}
  />
);

export const PixelModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-md w-full relative">
        <PixelCard title={title} className="bg-[#0d0221] shadow-2xl">
          <div className="pt-2">
            {children}
            <div className="mt-6 flex justify-center">
              <PixelButton onClick={onClose} variant="primary" className="w-full">
                CLOSE
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      </div>
    </div>
  );
};

/**
 * Intelligent image component that utilizes IndexedDB for persistent caching
 * of user images, while standard caching (or none) for static assets.
 */
export const PixelImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  const { src, ...rest } = props;
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(undefined);

  const isCachable = typeof src === 'string' && isUserImage(src);

  useEffect(() => {
    let active = true;
    if (typeof src !== 'string') return;

    // We only manage caching for user generated content.
    const load = async () => {
      try {
        const url = await fetchAsDataUrl(src);
        if (active) setDisplaySrc(url);
      } catch (e) {
        if (active) setDisplaySrc(src); // Fallback on error
      }
    };

    load();
    return () => { active = false; };
  }, [src]);

  // A blank transparent pixel to prevent broken image icons while loading
  const placeholder = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  return (
    <img 
      src={displaySrc || (isCachable ? placeholder : (typeof src === 'string' ? src : undefined))} 
      crossOrigin="anonymous" 
      {...rest} 
    />
  );
};
