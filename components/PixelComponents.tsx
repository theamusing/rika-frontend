
import React from 'react';

export const PixelButton: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
}> = ({ onClick, children, variant = 'primary', className = '', disabled }) => {
  const variantStyles = {
    primary: 'bg-[#8bac0f] text-[#0f380f]',
    secondary: 'bg-[#306230] text-[#8bac0f]',
    danger: 'bg-red-900 text-white border-red-500'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pixel-btn px-4 py-2 pixel-border font-bold uppercase transition-all flex items-center justify-center gap-2 ${variantStyles[variant]} ${disabled ? 'opacity-50 grayscale' : ''} ${className}`}
      style={{ fontSize: '12px' }}
    >
      {children}
    </button>
  );
};

// Added onClick prop to PixelCard to allow components like HistoryPage to handle click events on cards
export const PixelCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}> = ({ children, className = '', title, onClick }) => (
  <div 
    className={`pixel-border bg-[#0f380f]/50 p-4 relative ${className}`}
    onClick={onClick}
  >
    {title && (
      <div className="absolute -top-4 left-4 bg-[#0f171e] px-2 text-[10px] text-[#8bac0f] uppercase">
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
    className={`bg-[#0f171e] pixel-border border-[#306230] p-2 text-[#8bac0f] text-[10px] outline-none focus:border-[#8bac0f] placeholder-[#306230] ${className}`}
  />
);
