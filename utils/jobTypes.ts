import { Job } from '../types.ts';

export const isJobGenerating = (job: Job | null | undefined): boolean =>
  job?.status === 'queued' || job?.status === 'running';

export const generationActivityLabel = (job: Job, lang: 'en' | 'zh'): string => {
  const isZh = lang === 'zh';
  switch (job.processing_stage) {
    case 'prompt_optimization': return isZh ? '正在优化提示词' : 'Optimizing prompt';
    case 'generation_starting': return isZh ? '正在启动生成' : 'Starting generation';
    case 'generating': return isZh ? '正在生成' : 'Generating';
  }
  if (job.status === 'queued') return isZh ? '排队中' : 'Queued';
  return isZh ? '正在生成' : 'Generating';
};

export const isFourDirectionCharacter = (job: Job | null | undefined): boolean =>
  job?.job_type === 'character' && job.input_params?.character_mode === 'four_direction';

export const isSingleImageJob = (job: Job | null | undefined): boolean =>
  !!job && !isFourDirectionCharacter(job) && ['character', 'item', 'map', 'edit'].includes(job.job_type || '');

export const canAIEditImage = (job: Job | null | undefined): boolean =>
  !!job && job.status === 'succeeded' && (job.job_type === 'character' || job.job_type === 'item');

export const isAIImageEdit = (job: Job | null | undefined): boolean =>
  !!job && (job.input_params?.image_operation === 'edit' || String(job.job_type) === 'edit');
