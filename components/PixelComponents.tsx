
import React, { useState, useEffect } from 'react';
import { fetchAsDataUrl, isUserImage } from '../utils/imageUtils.ts';

export const PixelButton: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  className?: string;
  disabled?: boolean;
  title?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
}> = ({ onClick, children, variant = 'primary', className = '', disabled, title, style, type }) => {
  const variantStyles = {
    primary: 'bg-[#f7d51d] text-[#160b2b] border-[#fff1a6]',
    secondary: 'bg-[#5a2d9c] text-[#fff9e8] border-[#a47cfd]',
    outline: 'bg-[#0d0221] text-[#f7d51d] border-[#f7d51d]',
    danger: 'bg-[#8f2639] text-white border-[#ff8792]'
  };

  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      title={title}
      className={`pixel-btn px-4 py-2 font-bold uppercase flex items-center justify-center gap-2 text-[10px] ${variantStyles[variant]} ${className}`}
      style={style}
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
  titleStyle?: React.CSSProperties;
}> = ({ children, className = '', title, onClick, titleStyle }) => (
  <div 
    className={`pixel-card pixel-border border-[#5a2d9c] p-4 relative ${className}`}
    onClick={onClick}
  >
    {title && (
      <div 
        className="pixel-card-title absolute left-4 text-[10px] uppercase z-10"
        style={titleStyle}
      >
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
  [key: string]: any;
}> = ({ value, onChange, placeholder, type = 'text', className = '', ...rest }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`pixel-input bg-[#0d0221] border-2 border-[#5a2d9c] p-2 text-white text-[10px] outline-none placeholder-[#79649a] ${className}`}
    {...rest}
  />
);

export const PixelModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  titleStyle?: React.CSSProperties;
  closeButtonStyle?: React.CSSProperties;
  closeLabel?: string;
}> = ({ isOpen, onClose, title, children, titleStyle, closeButtonStyle, closeLabel = 'CLOSE' }) => {
  if (!isOpen) return null;

  return (
    <div className="pixel-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#080116]/90 animate-fade-in">
      <div className="max-w-md w-full relative">
        <PixelCard title={title} titleStyle={titleStyle} className="bg-[#0d0221] shadow-2xl">
          <div className="pt-2">
            {children}
            <div className="mt-6 flex justify-center">
              <PixelButton onClick={onClose} variant="primary" className="w-full" style={closeButtonStyle}>
                {closeLabel}
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
 * of user images, while standard caching for static assets.
 */
export const PixelImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  const { src, ...rest } = props;
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(undefined);

  const isCachable = typeof src === 'string' && isUserImage(src);

  useEffect(() => {
    let active = true;
    
    // Optimization: If the image is not meant to be cached (like static assets),
    // don't perform the asynchronous fetchAsDataUrl dance.
    if (!isCachable || typeof src !== 'string') {
      if (active) setDisplaySrc(undefined);
      return;
    }

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
  }, [src, isCachable]);

  // A blank transparent pixel to prevent broken image icons while loading for cachable items
  const placeholder = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  return (
    <img 
      src={isCachable ? (displaySrc || placeholder) : (typeof src === 'string' ? src : undefined)} 
      crossOrigin="anonymous" 
      {...rest} 
    />
  );
};
