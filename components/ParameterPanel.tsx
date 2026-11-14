import React from 'react';
import { Job } from '../types.ts';

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') {
    const dimensions = value as { x?: number; y?: number };
    if (Number.isFinite(dimensions.x) && Number.isFinite(dimensions.y)) return `${dimensions.x} × ${dimensions.y}`;
    return JSON.stringify(value);
  }
  return String(value);
};

export const mapParameters = (params: Record<string, unknown>): Record<string, unknown> => ({
  style: params.style,
  prompt: params.prompt,
  bg_style: params.bg_style,
});

export const jobParameters = (job: Job): Record<string, unknown> => {
  const params = job.input_params || {};
  if (job.job_type === 'map') return mapParameters(params);
  if (job.job_type !== 'animation') return params;
  const v2 = Number(job.animation_version ?? params.animation_version) === 2;
  const length = v2 ? params.output_frames : Math.max(1, Math.floor((Number(params.length ?? 33) - 1) / 2));
  return {
    version: v2 ? 'V2' : 'V1',
    prompt: params.prompt,
    pixel_size: params.pixel_size,
    length,
    ...(!v2 ? { type: params.motion_type } : {}),
    seed: params.seed,
  };
};

interface Props {
  parameters: Record<string, unknown>;
  lang: 'en' | 'zh';
}

const ParameterPanel: React.FC<Props> = ({ parameters, lang }) => {
  const isZh = lang === 'zh';
  const labels: Record<string, string> = {
    version: isZh ? '版本' : 'VERSION',
    prompt: isZh ? '提示词' : 'PROMPT',
    pixel_size: isZh ? '像素尺寸' : 'PIXEL SIZE',
    length: isZh ? '帧数' : 'LENGTH',
    type: isZh ? '动作类型' : 'TYPE',
    seed: isZh ? '随机种子' : 'SEED',
    style: isZh ? '风格' : 'STYLE',
    bg_style: isZh ? '背景风格' : 'BG STYLE',
  };
  return <div className="font-sans p-4 bg-[#0d0221] pixel-border border-[#5a2d9c]">
    <h3 className="mb-4 text-white/70 uppercase" style={{ fontSize: isZh ? 13 : 11 }}>
      {isZh ? '参数' : 'PARAMETERS'}
    </h3>
    <dl className="space-y-3">
      {Object.entries(parameters).filter(([, value]) => value !== undefined).map(([key, value]) =>
        <div key={key} className="grid grid-cols-[minmax(90px,28%)_1fr] gap-3 border-t border-white/10 pt-2">
          <dt className="text-white/50 break-words" style={{ fontSize: isZh ? 12 : 10 }}>{labels[key] || key.replaceAll('_', ' ')}</dt>
          <dd className="text-white/90 break-words whitespace-pre-wrap leading-relaxed font-normal" style={{ fontSize: isZh ? 13 : 12 }}>{formatValue(value)}</dd>
        </div>,
      )}
    </dl>
  </div>;
};

export default ParameterPanel;
