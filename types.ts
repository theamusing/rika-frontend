
export type MotionType = 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'hit' | 'defeated';
export type PixelSize = '32' | '64' | '128' | '256';

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
  use_quantization?: boolean;
  quantization_colors?: number;
  bg_color?: string;
  attack_type?: 'melee' | 'ranged' | 'other';
}

export interface Job {
  gen_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  job_type?: 'animation' | 'character';
  input_params: any;
  created_at: string;
  updated_at?: string;
  input_images?: { url: string; key: string }[];
  output_images?: { url: string; key: string; base64?: string }[];
  error?: string;
  liked?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface ApiKeyInfo {
  id: string;
  name?: string;
  key_prefix?: string;
  created_at?: string;
  last_used_at?: string;
  revoked_at?: string;
  is_active: boolean;
}

export interface ApiKeyCreateResp extends ApiKeyInfo {
  api_key: string;
  key_hash: string;
}

export interface ApiKeyListResp {
  api_keys: ApiKeyInfo[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
