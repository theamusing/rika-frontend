import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PixelButton, PixelModal } from './PixelComponents.tsx';

interface Props {
  image: string;
  lang: 'en' | 'zh';
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
}

const AIImageEditModal: React.FC<Props> = ({ image, lang, onClose, onSubmit }) => {
  const isZh = lang === 'zh';
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    input.current?.focus();
    return () => { mounted.current = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || !prompt.trim()) return;
    busy.current = true;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(prompt.trim());
    } catch (cause) {
      console.error('Image edit submission failed', cause);
      if (mounted.current) setError(isZh
        ? '编辑任务未能提交，请检查积分和网络后重试。'
        : 'Could not start the edit. Please check your credits and connection, then try again.');
    } finally {
      busy.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  return createPortal(
    <PixelModal isOpen onClose={() => { if (!busy.current) onClose(); }}
      title="AI EDIT"
      titleStyle={{ fontSize: isZh ? 14 : 11 }}
      closeButtonStyle={{ fontSize: isZh ? 13 : 10 }}
      closeLabel={submitting ? (isZh ? '正在提交…' : 'SUBMITTING…') : (isZh ? '取消' : 'CANCEL')}>
      <form onSubmit={submit} className="space-y-4">
        <img src={image} alt={isZh ? '当前编辑图像' : 'Current edited image'}
          className="w-48 h-48 mx-auto object-contain border-2 border-[#5a2d9c] bg-black/20"
          style={{ imageRendering: 'pixelated' }} />
        <label htmlFor="ai-image-edit-prompt" className="block font-sans text-sm text-white/80">
          {isZh ? '描述你想如何修改这张图片' : 'Describe how you want to change this image'}
        </label>
        <textarea ref={input} id="ai-image-edit-prompt" value={prompt}
          onChange={event => setPrompt(event.target.value)} disabled={submitting}
          placeholder={isZh ? '例如：把角色改成跳舞姿势' : 'For example: change the character to a dancing pose'}
          rows={4} required maxLength={4000}
          className="w-full resize-y min-h-28 bg-[#0d0221] border-2 border-[#5a2d9c] p-3 text-white font-sans text-sm leading-relaxed outline-none focus:border-[#f7d51d] placeholder-white/40" />
        <p className="font-sans text-xs leading-relaxed text-white/60">
          {isZh ? '使用当前图片进行编辑，结果将保存为新作品。消耗 1 积分。'
            : 'Edits the current image and saves the result as a new work. Costs 1 credit.'}
        </p>
        {error && <p role="alert" className="font-sans text-sm text-red-300">{error}</p>}
        <PixelButton type="submit" variant="primary" className="w-full"
          disabled={submitting || !prompt.trim()} style={{ fontSize: isZh ? 13 : 10 }}>
          {submitting ? (isZh ? '正在提交…' : 'SUBMITTING…') : (isZh ? '开始编辑 · 1 积分' : 'EDIT · 1 CREDIT')}
        </PixelButton>
      </form>
    </PixelModal>, document.body,
  );
};

export default AIImageEditModal;
