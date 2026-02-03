
export type MotionType = 'idle' | 'attack' | 'walk' | 'hit' | 'defeated';
export type PixelSize = '64' | '128' | '256';

export interface GenerationParams {
  prompt: string;
  motion_type: MotionType;
  pixel_size: PixelSize;
  strength_low: number;
  strength_high: number;
  seed: number;
  use_mid_image: boolean;
  use_end_image: boolean;
  scale_factor: number;
  fix_seed: boolean;
  length: number;
  use_padding: boolean;
}

export interface Job {
  gen_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  input_params: any;
  created_at: string;
  updated_at?: string;
  input_images?: { url: string; key: string }[];
  output_images?: { url: string; key: string; base64?: string }[];
  error?: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
