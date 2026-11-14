import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '../services/apiService.ts';
import { PixelButton, PixelCard } from './PixelComponents.tsx';

interface Props {
  generationId: string;
  lang: 'en' | 'zh';
  compact?: boolean;
}

const GalleryVisibility: React.FC<Props> = ({ generationId, lang, compact = false }) => {
  const isZh = lang === 'zh';
  const [visible, setVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setVisible(false);
    setError('');
    apiService.getGalleryVisibility(generationId)
      .then(result => { if (active) setVisible(result.visible); })
      .catch(() => { if (active) setError(isZh ? '暂时无法读取作品状态' : 'Could not load visibility'); });
    return () => { active = false; };
  }, [generationId, isZh]);

  const changeVisibility = async (next: boolean) => {
    setSaving(true);
    setError('');
    try {
      const result = await apiService.setGalleryVisibility(generationId, next);
      setVisible(result.visible);
      setConfirming(false);
    } catch (cause) {
      console.error('Gallery visibility update failed', cause);
      setError(isZh ? '作品状态更新失败，请稍后重试。' : 'Could not update work visibility. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <div className={compact ? 'inline-flex shrink-0 items-center gap-2 whitespace-nowrap' : 'flex items-center justify-between gap-3'}>
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        <span className="text-white/60" style={{ fontSize: isZh ? 12 : 9 }}>
          {isZh ? '可见性' : 'VISIBILITY'}:
        </span>
        <span className={visible ? 'text-green-400' : 'text-white/70'} style={{ fontSize: isZh ? 12 : 9 }}>
          {visible ? (isZh ? '公开' : 'PUBLIC') : (isZh ? '私密' : 'PRIVATE')}
        </span>
      </div>
      <PixelButton variant="outline" className="min-h-8 shrink-0 px-2 py-1" disabled={saving}
        style={{ fontSize: isZh ? 11 : 8 }}
        onClick={() => visible ? void changeVisibility(false) : setConfirming(true)}>
        {saving ? (isZh ? '处理中' : 'SAVING') : visible ? (isZh ? '取消公开' : 'UNPUBLISH') : (isZh ? '发布' : 'PUBLISH')}
      </PixelButton>
    </div>
    {error && <span role="alert" className="block text-red-300" style={{ fontSize: isZh ? 11 : 8 }}>{error}</span>}
    {confirming && createPortal(
      <div className="fixed inset-0 z-[130] bg-black/90 flex items-center justify-center p-6" role="dialog" aria-modal="true">
        <PixelCard className="w-full max-w-md pt-7 space-y-5" title={isZh ? '公开作品' : 'MAKE WORK PUBLIC'}>
          <p className="text-white leading-relaxed" style={{ fontSize: isZh ? 15 : 12 }}>
            {isZh ? '确定要公开吗？公开后所有人都可以看到你的原始生成作品、输入图像和提示词。本地编辑不会一并公开。'
              : 'Publish this work? Everyone will be able to see the original result, input images, and prompt. Local edits will not be shared.'}
          </p>
          {error && <p role="alert" className="text-red-300" style={{ fontSize: isZh ? 12 : 9 }}>{error}</p>}
          <div className="flex gap-3 justify-end">
            <PixelButton variant="secondary" disabled={saving} onClick={() => setConfirming(false)}>{isZh ? '取消' : 'CANCEL'}</PixelButton>
            <PixelButton variant="primary" disabled={saving} onClick={() => void changeVisibility(true)}>{isZh ? '确定公开' : 'PUBLISH'}</PixelButton>
          </div>
        </PixelCard>
      </div>, document.body,
    )}
  </>;
};

export default GalleryVisibility;
