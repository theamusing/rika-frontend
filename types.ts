
export type MotionType = 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'hit' | 'defeated';
export type PixelSize = '32' | '64' | '128' | '256';
export type AnimationVersion = 'v1' | 'v2';
export interface PixelDimensions { x: number; y: number; }
export interface PaddingOffsets { left: number; right: number; top: number; bottom: number; }
export interface AnimationV2Params {
  prompt: string;
  pixel_size: PixelDimensions;
  padding: PaddingOffsets;
  ai_expand: boolean;
  seed: number;
  output_frames: number;
  color_count: number;
  use_mid_image: boolean;
  use_end_image: boolean;
}

export interface GenerationParams {
  prompt: string;
  motion_type: MotionType;
  pixel_size: PixelSize;
  noise_strength: number;
  seed: number;
  use_mid_image: boolean;
  use_end_image: boolean;
  scale_factor: number;
  fix_seed: boolean;
  length: number;
  use_padding: boolean;
  padding_position?: 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';
  use_quantization?: boolean;
  quantization_colors?: number;
  bg_color?: string;
  attack_type?: 'melee' | 'ranged' | 'other';
}

export interface Job {
  gen_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  job_type?: 'animation' | 'character' | 'item' | 'map';
  input_params: any;
  animation_version?: number;
  processing_stage?: 'prompt_optimization' | 'generation_starting' | 'generating';
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
