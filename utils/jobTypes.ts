import { Job } from '../types.ts';

export const isFourDirectionCharacter = (job: Job | null | undefined): boolean =>
  job?.job_type === 'character' && job.input_params?.character_mode === 'four_direction';

export const isSingleImageJob = (job: Job | null | undefined): boolean =>
  !!job && !isFourDirectionCharacter(job) && ['character', 'item', 'map', 'edit'].includes(job.job_type || '');

export const canAIEditImage = (job: Job | null | undefined): boolean =>
  !!job && job.status === 'succeeded' && (job.job_type === 'character' || job.job_type === 'item');

export const isAIImageEdit = (job: Job | null | undefined): boolean =>
  !!job && (job.input_params?.image_operation === 'edit' || String(job.job_type) === 'edit');
