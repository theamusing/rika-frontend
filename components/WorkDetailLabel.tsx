import React from 'react';

export const workDetailLabelStyle = (lang: 'en' | 'zh'): React.CSSProperties => ({
  fontSize: lang === 'zh' ? 12 : 9,
  fontFamily: lang === 'zh'
    ? '"Fusion Pixel 12px Monospaced SC", "Microsoft YaHei", monospace'
    : '"Press Start 2P", "Fusion Pixel 12px Monospaced SC", monospace',
  fontWeight: 400,
});

const WorkDetailLabel: React.FC<{
  lang: 'en' | 'zh';
  children: React.ReactNode;
  className?: string;
}> = ({ lang, children, className = 'mb-2' }) => (
  <h3 className={`text-white/60 uppercase ${className}`} style={workDetailLabelStyle(lang)}>
    {children}
  </h3>
);

export default WorkDetailLabel;
