
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService.ts';
import { ApiKeyInfo, ApiKeyCreateResp } from '../types.ts';
import { PixelButton, PixelCard } from '../components/PixelComponents.tsx';
import { Trash2, Plus, AlertTriangle, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface ApiPageProps {
  lang?: 'en' | 'zh';
  isLoggedIn?: boolean;
  onLoginRequest?: () => void;
}

interface ApiParam {
  name: string;
  optional: boolean;
  type: string;
  values?: string;
  description: { en: string; zh: string };
}

interface ApiDocEntry {
  method: string;
  path: string;
  description: { en: string; zh: string };
  request: string | null;
  requestParams: ApiParam[];
  response: string;
  responseParams: ApiParam[];
}

const apiDocs: ApiDocEntry[] = [
  {
    method: 'GET',
    path: '/credits',
    description: { en: 'Get current credit balance', zh: '获取当前积分余额' },
    request: null,
    requestParams: [],
    response: `{
  "credits": 100
}`,
    responseParams: [
      { name: 'credits', optional: false, type: 'number', description: { en: 'Current credit balance', zh: '当前积分余额' } }
    ]
  },
  {
    method: 'POST',
    path: '/generate',
    description: { en: 'Generate a V1 pixel animation (5 credits)', zh: '生成 V1 像素动画（5 积分）' },
    request: `{
  "image_base64": ["data:image/png;base64,..."],
  "params": {
    "prompt": "side-view, 2D game character walking",
    "motion_type": "walk",
    "pixel_size": "128",
    "seed": 123456,
    "noise_strength": 0.6,
    "length": 25,
    "use_mid_image": false,
    "use_end_image": false
  }
}`,
    requestParams: [
      { name: 'image_base64', optional: false, type: 'string[]', values: '1–3 PNG images', description: { en: 'Base64 PNG images in start, optional middle, optional end order. Flags must match the supplied references.', zh: 'Base64 PNG 图片，顺序为起始图、可选中间图、可选结尾图；引用开关应与实际图片一致。' } },
      { name: 'prompt', optional: false, type: 'string', description: { en: 'Animation description', zh: '动画文本描述' } },
      { name: 'motion_type', optional: true, type: 'string', values: 'idle | walk | run | jump | attack | hit | defeated', description: { en: 'Motion type (Default: idle)', zh: '动作类型 (默认: idle)' } },
      { name: 'pixel_size', optional: true, type: 'string', values: '32 | 64 | 128 | 256', description: { en: 'Pixel size (Default: 128)', zh: '像素尺寸 (默认: 128)' } },
      { name: 'seed', optional: true, type: 'number', description: { en: 'Random seed', zh: '随机种子' } },
      { name: 'attack_type', optional: true, type: 'string', values: 'melee | ranged | other', description: { en: 'Attack subtype when motion_type is attack', zh: 'motion_type 为 attack 时的攻击子类型' } },
      { name: 'noise_strength', optional: true, type: 'number', values: '0.0–2.0, server default: 0.8', description: { en: 'Single public model/noise strength applied to both model levels. The web app starts at 0.6.', zh: '同时应用于两个模型层级的统一噪声强度；服务器默认 0.8，网页默认 0.6。' } },
      { name: 'length', optional: true, type: 'integer', values: '17 | 21 | 25 | 29 | 33', description: { en: 'Raw length parameter: 2 × desired output frames + 1, corresponding to 8/10/12/14/16-frame web presets', zh: '原始长度参数：2 × 目标输出帧数 + 1，对应网页的 8/10/12/14/16 帧预设' } },
      { name: 'use_mid_image', optional: true, type: 'boolean', description: { en: 'Use middle reference image', zh: '是否使用中间参考图' } },
      { name: 'use_end_image', optional: true, type: 'boolean', description: { en: 'Use end reference image', zh: '是否使用结尾参考图' } },
      { name: 'use_padding', optional: true, type: 'boolean', description: { en: 'Whether the submitted image includes the V1 padded canvas', zh: '提交图片是否包含 V1 扩展画布' } },
      { name: 'padding_position', optional: true, type: 'string', values: 'tl | tc | tr | ml | mc | mr | bl | bc | br', description: { en: 'Content position inside the padded canvas', zh: '内容在扩展画布中的位置' } },
      { name: 'scale_factor', optional: true, type: 'number', description: { en: 'Integer-style pixel scale used to prepare the model input', zh: '用于准备模型输入的像素放大倍率' } }
    ],
    response: `{
  "gen_id": "550e8400-e29b-41d4-a716-446655440000"
}`,
    responseParams: [
      { name: 'gen_id', optional: false, type: 'string', description: { en: 'Unique job ID', zh: '唯一的任务 ID' } }
    ]
  },
  {
    method: 'POST',
    path: '/generate-v2',
    description: {
      en: 'Generate a V2 Wan2.2 pixel-animation sprite sheet (8 credits)',
      zh: '生成 V2 Wan2.2 像素动画序列帧（8 积分）',
    },
    request: `{
  "image_base64": [
    "data:image/png;base64,FIRST...",
    "data:image/png;base64,LAST...",
    "data:image/png;base64,MIDDLE..."
  ],
  "params": {
    "prompt": "fixed side view, the knight thrusts the spear and returns to the starting pose",
    "pixel_size": { "x": 256, "y": 128 },
    "padding": { "left": 0, "right": 128, "top": 0, "bottom": 0 },
    "ai_expand": true,
    "seed": 123456,
    "output_frames": 24,
    "color_count": 64
  }
}`,
    requestParams: [
      {
        name: 'image_base64', optional: false, type: 'string[]', values: '1–3 PNG images',
        description: {
          en: 'Already-padded images matching pixel_size. Order: first; first,last; or first,last,middle.',
          zh: '与 pixel_size 一致、已完成 padding 的 PNG。顺序：首帧；首尾帧；或首帧、尾帧、中间帧。',
        },
      },
      { name: 'prompt', optional: false, type: 'string', description: { en: 'Animation action description', zh: '动画动作描述' } },
      {
        name: 'pixel_size', optional: false, type: '{ x: number; y: number }', values: '32–256, multiples of 32',
        description: {
          en: 'Final logical frame size after frontend/client padding. Both axes must be multiples of 32.',
          zh: '客户端完成 padding 后的最终单帧像素尺寸；两个轴都必须是 32 的倍数。',
        },
      },
      {
        name: 'padding', optional: true, type: '{ left; right; top; bottom }', values: 'Non-negative multiples of 32',
        description: {
          en: 'Metadata describing padding already present in the images. Defaults to zero on every side.',
          zh: '描述图片中已经存在的 padding，仅用于元数据；默认四边均为 0。',
        },
      },
      { name: 'ai_expand', optional: true, type: 'boolean', values: 'default: true', description: { en: 'Use the reference images and original action text to build an image-aware timed prompt and choose the motion profile. The original prompt remains the public/history value.', zh: '结合参考图与原始动作描述生成分时段提示词并自动选择动作配置；历史与公开参数仍保留原始提示词。' } },
      { name: 'seed', optional: true, type: 'integer', values: '0–2^63-1', description: { en: 'Random seed; generated server-side when omitted', zh: '随机种子；省略时由服务器生成' } },
      { name: 'output_frames', optional: true, type: 'integer', values: 'API: 1–256, default: 24; web: 16 | 20 | 24 | 32', description: { en: 'Number of frames in the final sprite sheet. The web UI offers the four tested presets.', zh: '最终序列帧数量；网页界面提供四个经过测试的预设。' } },
      { name: 'color_count', optional: true, type: 'integer', values: '2–256, default: 64', description: { en: 'Maximum postprocessing palette size', zh: '后处理调色盘的最大颜色数量' } },
    ],
    response: `{
  "gen_id": "550e8400-e29b-41d4-a716-446655440000"
}`,
    responseParams: [
      { name: 'gen_id', optional: false, type: 'string', description: { en: 'Poll /jobs/{gen_id}; the successful job contains one temporary PNG spritesheet URL', zh: '使用 /jobs/{gen_id} 轮询；成功后返回一个临时 PNG spritesheet 地址' } },
    ],
  },
  {
    method: 'POST',
    path: '/generate-character',
    description: { en: 'Generate a pixel-art character (1 credit)', zh: '生成像素角色（1 积分）' },
    request: `{
  "image_base64": ["data:image/png;base64,..."],
  "params": {
    "prompt": "a cyberpunk hero with a neon sword",
    "pixel_size": "128",
    "style": "Anime",
    "domain_color": ["#ff0000", "#00ff00"]
  }
}`,
    requestParams: [
      { name: 'image_base64', optional: true, type: 'string[]', values: '0–1 PNG image', description: { en: 'Optional visual reference. Provide either a prompt or a reference image.', zh: '可选形象参考图；提示词和参考图至少提供一个。' } },
      { name: 'prompt', optional: true, type: 'string', description: { en: 'Character description. May be empty when a reference image is supplied.', zh: '角色描述；已提供参考图时可为空。' } },
      { name: 'pixel_size', optional: true, type: 'string', values: '64 | 128 | 256', description: { en: 'Pixel size (Default: 128)', zh: '像素尺寸 (默认: 128)' } },
      { name: 'style', optional: true, type: 'string', values: 'None | Retro | Anime', description: { en: 'Character style', zh: '角色画风' } },
      { name: 'domain_color', optional: true, type: 'string | string[]', values: 'Hex colors', description: { en: 'Dominant character colors', zh: '角色主导色' } }
    ],
    response: `{
  "gen_id": "550e8400-e29b-41d4-a716-446655440000"
}`,
    responseParams: [
      { name: 'gen_id', optional: false, type: 'string', description: { en: 'Unique job ID', zh: '唯一的任务 ID' } }
    ]
  },
  {
    method: 'POST',
    path: '/generate-item',
    description: { en: 'Generate a pixel-art item (1 credit)', zh: '生成像素道具（1 积分）' },
    request: `{
  "image_base64": ["data:image/png;base64,..."],
  "params": {
    "prompt": "an ornate brass mechanical compass",
    "pixel_size": "128",
    "style": "Retro",
    "domain_color": ["#d9a441", "#543019"]
  }
}`,
    requestParams: [
      { name: 'image_base64', optional: true, type: 'string[]', values: '0–1 PNG image', description: { en: 'Optional item reference. Provide either a prompt or a reference image.', zh: '可选道具参考图；提示词和参考图至少提供一个。' } },
      { name: 'prompt', optional: true, type: 'string', description: { en: 'Item appearance and material description', zh: '道具外观与材质描述' } },
      { name: 'pixel_size', optional: true, type: 'string', values: '64 | 128 | 256', description: { en: 'Pixel size (Default: 128)', zh: '像素尺寸（默认：128）' } },
      { name: 'style', optional: true, type: 'string', values: 'None | Retro | Anime', description: { en: 'Item art style', zh: '道具画风' } },
      { name: 'domain_color', optional: true, type: 'string | string[]', values: 'Hex colors', description: { en: 'Dominant item colors', zh: '道具主导色' } },
    ],
    response: `{
  "gen_id": "550e8400-e29b-41d4-a716-446655440000"
}`,
    responseParams: [
      { name: 'gen_id', optional: false, type: 'string', description: { en: 'Unique job ID', zh: '唯一任务 ID' } },
    ],
  },
  {
    method: 'POST',
    path: '/generate-map',
    description: { en: 'Generate a side-scrolling pixel-art map (2 credits)', zh: '生成横板像素地图（2 积分）' },
    request: `{
  "image_base64": [
    "data:image/png;base64,STRUCTURE...",
    "data:image/png;base64,STYLE_REFERENCE..."
  ],
  "params": {
    "prompt": "a misty forest ruin with mossy stone platforms",
    "style": "Retro",
    "bg_style": "Parallax",
    "domain_color": ["#315c3b", "#91b66e"]
  }
}`,
    requestParams: [
      { name: 'image_base64', optional: false, type: 'string[]', values: '1–2 PNG images', description: { en: 'First image: required level structure. Second image: optional visual style reference.', zh: '第一张为必需的关卡结构图，第二张为可选的画风参考图。' } },
      { name: 'prompt', optional: false, type: 'string', description: { en: 'Map environment and visual description', zh: '地图环境与视觉描述' } },
      { name: 'style', optional: true, type: 'string', values: 'Retro | Anime', description: { en: 'Map pixel-art style', zh: '地图像素画风' } },
      { name: 'bg_style', optional: true, type: 'string', values: 'Parallax | Flat | None', description: { en: 'Background treatment', zh: '背景类型' } },
      { name: 'domain_color', optional: true, type: 'string | string[]', values: 'Hex colors', description: { en: 'Dominant map colors', zh: '地图主导色' } },
    ],
    response: `{
  "gen_id": "550e8400-e29b-41d4-a716-446655440000"
}`,
    responseParams: [
      { name: 'gen_id', optional: false, type: 'string', description: { en: 'Unique job ID', zh: '唯一任务 ID' } },
    ],
  },
  {
    method: 'GET',
    path: '/jobs/{gen_id}',
    description: { en: 'Get job status and results', zh: '获取任务状态和结果' },
    request: null,
    requestParams: [],
    response: `{
  "gen_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_type": "animation",
  "status": "succeeded",
  "animation_version": 2,
  "processing_stage": "generating",
  "input_params": {},
  "output_params": {},
  "created_at": "2026-10-10T12:00:00Z",
  "updated_at": "2026-10-10T12:02:00Z",
  "input_images": [],
  "output_images": [
    { "url": "https://cdn.rika-ai.com/...", "key": "..." }
  ],
  "persist_images": false,
  "liked": false,
  "error": null
}`,
    responseParams: [
      { name: 'gen_id', optional: false, type: 'string', description: { en: 'Job ID', zh: '任务 ID' } },
      { name: 'job_type', optional: false, type: 'string', description: { en: 'Type of job', zh: '任务类型' } },
      { name: 'status', optional: false, type: 'string', values: 'queued|running|succeeded|failed', description: { en: 'Current status', zh: '当前状态' } },
      { name: 'animation_version', optional: true, type: 'number', values: '1 | 2', description: { en: 'Animation pipeline version', zh: '动画管线版本' } },
      { name: 'processing_stage', optional: true, type: 'string | null', values: 'prompt_optimization | generation_starting | generating', description: { en: 'Current or last reported V2 processing stage', zh: 'V2 当前或最后记录的处理阶段' } },
      { name: 'input_params', optional: false, type: 'object', description: { en: 'Public user controls; internal runtime metadata is omitted', zh: '用户可见的输入参数；内部运行元数据不会返回' } },
      { name: 'output_params', optional: true, type: 'object', description: { en: 'Results metadata', zh: '结果元数据' } },
      { name: 'created_at', optional: false, type: 'string', description: { en: 'Creation timestamp', zh: '创建时间戳' } },
      { name: 'updated_at', optional: true, type: 'string', description: { en: 'Last update timestamp', zh: '最后更新时间戳' } },
      { name: 'input_images', optional: true, type: 'object[]', description: { en: 'List of input images', zh: '输入图片列表' } },
      { name: 'output_images', optional: true, type: 'object[]', description: { en: 'List of generated assets', zh: '生成资源列表' } },
      { name: 'persist_images', optional: true, type: 'boolean', description: { en: 'Whether images are stored', zh: '图片是否持久化存储' } },
      { name: 'liked', optional: true, type: 'boolean', description: { en: 'Whether user liked the result', zh: '用户是否点赞' } },
      { name: 'error', optional: true, type: 'string', description: { en: 'Error message if failed', zh: '失败时的错误信息' } }
    ]
  }
];

const ApiPage: React.FC<ApiPageProps> = ({ lang = 'en', isLoggedIn = false, onLoginRequest }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResp | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);

  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => `${isZh ? enSize + 3 : enSize}px`;

  const fetchApiKeys = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      setLoading(true);
      const res = await apiService.listApiKeys();
      setApiKeys(res.api_keys || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchApiKeys();
    }
  }, [fetchApiKeys, isLoggedIn]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !isLoggedIn) return;
    setIsCreating(true);
    try {
      const res = await apiService.createApiKey(newKeyName);
      setCreatedKey(res);
      setShowCreateModal(false);
      setNewKeyName('');
      fetchApiKeys();
    } catch (err: any) {
      alert(isZh ? `创建失败: ${err.message}` : `Creation failed: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!isLoggedIn) return;
    setIsDeleting(true);
    try {
      await apiService.deleteApiKey(id);
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k));
      setShowDeleteConfirm(null);
    } catch (err: any) {
      alert(isZh ? `删除失败: ${err.message}` : `Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ui-page space-y-8 text-white max-w-4xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="ui-page-title font-bold uppercase">
          {isZh ? 'API 密钥' : 'API KEYS'}
        </h2>
        {isLoggedIn && (
          <PixelButton variant="secondary" onClick={fetchApiKeys} style={{ fontSize: zhScale(10) }}>
            {isZh ? '刷新' : 'Refresh'}
          </PixelButton>
        )}
      </div>

      <PixelCard className="relative">
        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {!isLoggedIn ? (
            <div className="text-center py-16 space-y-6 flex flex-col items-center">
              <p className="text-white/60 uppercase" style={{ fontSize: zhScale(12) }}>
                {isZh ? '请登录以查看您的 API 密钥' : 'Please login to view your API keys'}
              </p>
              <PixelButton variant="primary" onClick={onLoginRequest} style={{ fontSize: zhScale(10) }}>
                {isZh ? '登录' : 'LOGIN'}
              </PixelButton>
            </div>
          ) : loading ? (
            <div className="text-center py-10 animate-pulse uppercase text-white/50" style={{ fontSize: zhScale(10) }}>
              {isZh ? '正在获取密钥...' : 'Fetching keys...'}
            </div>
          ) : error ? (
            <div className="text-center py-10 space-y-4">
              <p className="text-red-500 uppercase" style={{ fontSize: zhScale(10) }}>{error}</p>
              <PixelButton onClick={fetchApiKeys} style={{ fontSize: zhScale(10) }}>
                {isZh ? '重试' : 'Retry'}
              </PixelButton>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-10 opacity-50 uppercase" style={{ fontSize: zhScale(10) }}>
              {isZh ? '暂无 API 密钥' : 'No API keys found'}
            </div>
          ) : (
            apiKeys.map((key) => (
              <div 
                key={key.id} 
                onClick={() => key.is_active && setShowDeleteConfirm(key.id)}
                className={`p-4 bg-black/20 pixel-border border-[#5a2d9c] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all ${key.is_active ? 'hover:bg-white/5 cursor-pointer' : 'opacity-50'}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white/90" style={{ fontSize: 14 }}>{key.name || 'Unnamed Key'}</span>
                    <span className={`text-[8px] px-1 border ${key.is_active ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                      {key.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-white/40 text-[10px]">
                    <span>{key.key_prefix}******</span>
                  </div>
                </div>
                
                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-6">
                  <div className="text-right">
                    <p className="text-[8px] text-white/40 uppercase">{isZh ? '创建时间' : 'Created At'}</p>
                    <p className="text-[10px] text-white/60">{key.created_at ? new Date(key.created_at).toLocaleDateString() : '-'}</p>
                  </div>
                  
                  {key.is_active && (
                    <div className="p-2 text-red-500/40 group-hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {isLoggedIn && (
          <div className="mt-6 flex justify-center">
            <PixelButton 
              variant="primary" 
              className="flex items-center gap-2" 
              onClick={() => setShowCreateModal(true)}
              style={{ fontSize: zhScale(10) }}
            >
              <Plus size={16} />
              {isZh ? '创建新密钥' : 'CREATE NEW KEY'}
            </PixelButton>
          </div>
        )}
      </PixelCard>

      <div className="pt-8 space-y-4">
        <h2 className="ui-page-title font-bold uppercase">
          {isZh ? 'API 文档' : 'API REFERENCE'}
        </h2>
        <PixelCard>
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-black/20 border-2 border-white/10">
              <p className="font-medium uppercase mb-1 text-white/80" style={{ fontSize: zhScale(10) }}>
                {isZh ? '基础地址' : 'Base URL'}
              </p>
              <p className="text-white/60 font-mono" style={{ fontSize: zhScale(10) }}>
                https://api.rika-ai.com/v1/api
              </p>
            </div>
            
            <div className="p-4 bg-black/20 border-2 border-white/10">
              <p className="font-medium uppercase mb-1 text-white/80" style={{ fontSize: zhScale(10) }}>
                {isZh ? '请求头' : 'Required Headers'}
              </p>
              <pre className="text-white/60 font-mono" style={{ fontSize: zhScale(10) }}>
{`Content-Type: application/json
X-API-Key: <YOUR_API_KEY>`}
              </pre>
            </div>

            <div className="p-4 bg-black/20 border-2 border-white/10">
              <p className="font-medium uppercase mb-2 text-white/80" style={{ fontSize: zhScale(10) }}>
                {isZh ? '异步任务流程' : 'ASYNC JOB FLOW'}
              </p>
              <p className="text-white/70 leading-relaxed" style={{ fontSize: zhScale(10) }}>
                {isZh
                  ? '生成接口会立即返回 gen_id。请使用 GET /jobs/{gen_id} 轮询，直到 status 变为 succeeded 或 failed。成功后从 output_images 下载结果。'
                  : 'Generation endpoints return a gen_id immediately. Poll GET /jobs/{gen_id} until status becomes succeeded or failed, then download successful assets from output_images.'}
              </p>
            </div>

            <div className="p-4 bg-black/20 border-2 border-white/10">
              <p className="font-medium uppercase mb-2 text-white/80" style={{ fontSize: zhScale(10) }}>
                {isZh ? '积分费用' : 'CREDIT COSTS'}
              </p>
              <p className="text-white/70 leading-relaxed" style={{ fontSize: zhScale(10) }}>
                {isZh
                  ? 'V1 动画 5 积分；V2 动画 8 积分；角色和道具各 1 积分；地图 2 积分。失败或超时的生成任务会自动返还积分。'
                  : 'V1 animation: 5 credits; V2 animation: 8; character and item: 1 each; map: 2. Failed or timed-out generation jobs are refunded automatically.'}
              </p>
            </div>

            <div className="p-4 bg-black/20 border-2 border-white/20">
              <p className="font-medium uppercase mb-1 text-white/80 flex items-center gap-2" style={{ fontSize: zhScale(10) }}>
                <AlertTriangle size={14} />
                {isZh ? '存储说明' : 'STORAGE POLICY'}
              </p>
              <p className="text-white/70 leading-relaxed" style={{ fontSize: zhScale(10) }}>
                {isZh 
                  ? '使用 API 方式调用得到的结果不会长期存储，请在轮询得到结果后及时下载保存。' 
                  : 'Results generated via API are not stored permanently. Please download your results immediately after polling.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {apiDocs.map((doc, idx) => (
              <div key={idx} className="border-2 border-white/15 overflow-hidden">
                <button 
                  onClick={() => setExpandedDoc(expandedDoc === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 bg-black/20 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 text-[8px] font-medium border border-white/25 text-white/70">
                      {doc.method}
                    </span>
                    <span className="font-mono text-xs font-medium text-white/90">{doc.path}</span>
                    <span className="text-[10px] text-white/40 hidden md:inline ml-2">{doc.description[lang]}</span>
                  </div>
                  {expandedDoc === idx ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                </button>

                  {expandedDoc === idx && (
                    <div className="p-4 bg-black/40 border-t-2 border-white/15 space-y-4 animate-fade-in font-sans">
                      <p className="text-sm text-white/60 md:hidden">{doc.description[lang]}</p>
                      
                      {doc.request && (
                        <div className="space-y-1">
                          <p className="uppercase font-mono text-white/40" style={{ fontSize: zhScale(8) }}>Request Body</p>
                          <pre className="p-3 bg-black/60 text-[10px] font-mono text-white/75 overflow-x-auto custom-scrollbar border border-white/10">
                            {doc.request}
                          </pre>
                          
                          {doc.requestParams && doc.requestParams.length > 0 && (
                            <div className="mt-4 overflow-x-auto">
                              <table className="w-full text-left border-collapse font-sans">
                                <thead>
                                  <tr className="border-b border-white/10 uppercase text-white/40" style={{ fontSize: zhScale(8) }}>
                                    <th className="py-2 pr-4">{isZh ? '字段名' : 'Name'}</th>
                                    <th className="py-2 pr-4">{isZh ? '必填' : 'Required'}</th>
                                    <th className="py-2 pr-4">{isZh ? '类型' : 'Type'}</th>
                                    <th className="py-2 pr-4">{isZh ? '特定值' : 'Values'}</th>
                                    <th className="py-2">{isZh ? '描述' : 'Description'}</th>
                                  </tr>
                                </thead>
                                <tbody className="text-xs text-white/60">
                                  {doc.requestParams.map((p, pidx) => (
                                    <tr key={pidx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                      <td className="py-2 pr-4 font-mono text-white/80">{p.name}</td>
                                      <td className="py-2 pr-4">{p.optional ? (isZh ? '否' : 'No') : (isZh ? '是' : 'Yes')}</td>
                                      <td className="py-2 pr-4">{p.type}</td>
                                      <td className="py-2 pr-4 text-white/40">{p.values || '-'}</td>
                                      <td className="py-2">{p.description[lang]}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="uppercase font-mono text-white/40" style={{ fontSize: zhScale(8) }}>Response Body</p>
                        <pre className="p-3 bg-black/60 text-[10px] font-mono text-white/75 overflow-x-auto custom-scrollbar border border-white/10">
                          {doc.response}
                        </pre>

                        {doc.responseParams && doc.responseParams.length > 0 && (
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left border-collapse font-sans">
                              <thead>
                                <tr className="border-b border-white/10 uppercase text-white/40" style={{ fontSize: zhScale(8) }}>
                                    <th className="py-2 pr-4">{isZh ? '字段名' : 'Name'}</th>
                                    <th className="py-2 pr-4">{isZh ? '必填' : 'Required'}</th>
                                    <th className="py-2 pr-4">{isZh ? '类型' : 'Type'}</th>
                                    <th className="py-2 pr-4">{isZh ? '特定值' : 'Values'}</th>
                                    <th className="py-2">{isZh ? '描述' : 'Description'}</th>
                                </tr>
                              </thead>
                              <tbody className="text-xs text-white/60">
                                {doc.responseParams.map((p, pidx) => (
                                  <tr key={pidx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                    <td className="py-2 pr-4 font-mono text-white/80">{p.name}</td>
                                    <td className="py-2 pr-4">{p.optional ? (isZh ? '否' : 'No') : (isZh ? '是' : 'Yes')}</td>
                                    <td className="py-2 pr-4">{p.type}</td>
                                    <td className="py-2 pr-4 text-white/40">{p.values || '-'}</td>
                                    <td className="py-2">{p.description[lang]}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>

        </PixelCard>
      </div>

      <div className="pt-8 space-y-4">
        <h2 className="font-bold uppercase text-white/80" style={{ fontSize: zhScale(20) }}>
          {isZh ? '示例代码' : 'CODE EXAMPLE'}
        </h2>
        <PixelCard className="bg-black">
          <div className="space-y-4">
            <div className="flex justify-between items-center px-4 pt-2">
              <span className="text-[8px] text-white/40 uppercase font-mono">example.py (Python)</span>
              <button 
                onClick={() => copyToClipboard(`import urllib.request, json, time, base64

# Helper function to encode image
def encode_image(path):
    with open(path, "rb") as f:
        return f"data:image/png;base64,{base64.b64encode(f.read()).decode()}"

# Your API Key
API_KEY = "your_api_key_here"
BASE_URL = "https://api.rika-ai.com/v1/api"

# 1. Prepare images (Assume you have start.png and end.png in the same folder.)
start_img = encode_image("start.png")
end_img = encode_image("end.png")

payload = {
    "image_base64": [start_img, end_img],
    "params": {
        "prompt": "fixed side view, the knight thrusts the spear and returns to the starting pose",
        "pixel_size": {"x": 128, "y": 128},
        "padding": {"left": 0, "right": 0, "top": 0, "bottom": 0},
        "ai_expand": True,
        "output_frames": 24,
        "color_count": 64
    }
}

print("Creating generation job...")
req = urllib.request.Request(
    f"{BASE_URL}/generate-v2",
    data=json.dumps(payload).encode(),
    headers={
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    },
    method="POST"
)

with urllib.request.urlopen(req) as res:
    data = json.loads(res.read().decode())
    gen_id = data["gen_id"]
    print(f"Job created! gen_id: {gen_id}")

# 2. Polling for results every 20s
# Note: API results are not stored permanently. Download them immediately.
print("Polling for results...")
while True:
    job_req = urllib.request.Request(
        f"{BASE_URL}/jobs/{gen_id}",
        headers={"X-API-Key": API_KEY},
        method="GET"
    )
    
    with urllib.request.urlopen(job_req) as res:
        job_info = json.loads(res.read().decode())
        status = job_info["status"]
        
        if status == "succeeded":
            print("Generation complete!")
            for img in job_info.get("output_images", []):
                print(f"Result URL: {img['url']}")
            break
        elif status == "failed":
            print(f"Job failed: {job_info.get('error')}")
            break
        else:
            print(f"Status: {status}... waiting 20s")
            time.sleep(20)`)}
                className="flex items-center gap-1 text-[8px] text-[#f7d51d] hover:text-white transition-colors"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {isZh ? '复制' : 'COPY'}
              </button>
            </div>
            <pre className="p-4 bg-black text-[10px] font-mono text-white/70 overflow-x-auto custom-scrollbar leading-relaxed">
{`import urllib.request, json, time, base64

def encode_image(path):
    with open(path, "rb") as f:
        return f"data:image/png;base64,{base64.b64encode(f.read()).decode()}"

API_KEY = "your_api_key_here"
BASE_URL = "https://api.rika-ai.com/v1/api"

# 1. Prepare images (start.png and end.png)
payload = {
    "image_base64": [encode_image("start.png"), encode_image("end.png")],
    "params": {
        "prompt": "fixed side view, the knight thrusts the spear and returns to the starting pose",
        "pixel_size": {"x": 128, "y": 128},
        "padding": {"left": 0, "right": 0, "top": 0, "bottom": 0},
        "ai_expand": True,
        "output_frames": 24,
        "color_count": 64
    }
}

print("Creating generation job...")
req = urllib.request.Request(
    f"{BASE_URL}/generate-v2",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
    method="POST"
)

with urllib.request.urlopen(req) as res:
    gen_id = json.loads(res.read().decode())["gen_id"]
    print(f"Job created! gen_id: {gen_id}")

# 2. Polling for results...
# API results are transient. Download them promptly.
while True:
    job_req = urllib.request.Request(f"{BASE_URL}/jobs/{gen_id}",
                                   headers={"X-API-Key": API_KEY})
    with urllib.request.urlopen(job_req) as res:
        job = json.loads(res.read().decode())
        if job["status"] == "succeeded":
            print("Success! URLs:", [i['url'] for i in job['output_images']])
            break
        elif job["status"] == "failed":
            print("Failed:", job.get("error"))
            break
        time.sleep(20)`}
            </pre>
          </div>
        </PixelCard>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <PixelCard className="max-w-md w-full p-6 space-y-6" title={isZh ? '创建 API 密钥' : 'CREATE API KEY'}>
            <div className="space-y-4">
              <p className="text-white/60" style={{ fontSize: zhScale(10) }}>
                {isZh ? '请输入密钥名称以便识别：' : 'Give your key a name to identify it:'}
              </p>
              <input 
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={isZh ? '例如：开发环境' : 'e.g. Development'}
                className="w-full bg-black/40 border-2 border-[#5a2d9c] p-3 text-white outline-none focus:border-[#f7d51d] transition-colors font-bold"
                autoFocus
              />
            </div>
            <div className="flex gap-4">
              <PixelButton 
                variant="primary" 
                className="flex-1" 
                onClick={handleCreateKey}
                disabled={isCreating || !newKeyName.trim()}
                style={{ fontSize: zhScale(10) }}
              >
                {isCreating ? (isZh ? '创建中...' : 'CREATING...') : (isZh ? '确认创建' : 'CREATE')}
              </PixelButton>
              <PixelButton 
                variant="secondary" 
                className="flex-1" 
                onClick={() => { setShowCreateModal(false); setNewKeyName(''); }}
                style={{ fontSize: zhScale(10) }}
              >
                {isZh ? '取消' : 'CANCEL'}
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}

      {/* Show Secret Modal */}
      {createdKey && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
          <PixelCard className="max-w-lg w-full p-8 space-y-6 border-[#f7d51d]" title={isZh ? '密钥已创建' : 'KEY CREATED'}>
            <div className="bg-yellow-500/10 border-2 border-yellow-500/30 p-4 flex gap-4 items-start">
              <AlertTriangle className="text-yellow-500 shrink-0" size={24} />
              <div className="space-y-2">
                <p className="font-bold text-yellow-500" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '请立即复制并保存此密钥！' : 'COPY AND SAVE THIS KEY NOW!'}
                </p>
                <p className="text-white/60 text-[10px]">
                  {isZh ? '出于安全考虑，此密钥只会显示一次。如果您丢失了它，您将需要创建一个新密钥。' : 'For security reasons, this key will only be shown once. If you lose it, you will need to create a new one.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-white/40 uppercase text-[8px]">{isZh ? 'API 密钥' : 'API KEY'}</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-black/60 p-4 font-mono text-[#f7d51d] break-all border-2 border-[#5a2d9c]">
                  {createdKey.api_key}
                </div>
                <button 
                  onClick={() => copyToClipboard(createdKey.api_key)}
                  className="px-4 bg-[#5a2d9c] hover:bg-[#7b3fd3] text-white transition-all pixel-border border-[#5a2d9c] flex items-center justify-center"
                >
                  {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <PixelButton 
                variant="primary" 
                onClick={() => setCreatedKey(null)}
                className="w-full"
                style={{ fontSize: zhScale(10) }}
              >
                {isZh ? '我已保存，关闭' : 'I HAVE SAVED IT, CLOSE'}
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <PixelCard className="max-w-sm w-full p-6 text-center space-y-6" title={isZh ? '确认删除' : 'CONFIRM DELETE'}>
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={24} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-white" style={{ fontSize: zhScale(12) }}>
                {isZh ? '确定要删除此密钥吗？' : 'Delete this API key?'}
              </p>
              <p className="text-white/60" style={{ fontSize: zhScale(9) }}>
                {isZh ? '该密钥将立即失效且无法再次使用。' : 'This key will be immediately deactivated and cannot be used again.'}
              </p>
            </div>
            <div className="flex gap-4">
              <PixelButton 
                variant="danger" 
                className="flex-1" 
                onClick={() => handleDeleteKey(showDeleteConfirm)} 
                disabled={isDeleting}
                style={{ fontSize: zhScale(10) }}
              >
                {isDeleting ? (isZh ? '删除中...' : 'DELETING...') : (isZh ? '确认删除' : 'CONFIRM')}
              </PixelButton>
              <PixelButton 
                variant="secondary" 
                className="flex-1" 
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
                style={{ fontSize: zhScale(10) }}
              >
                {isZh ? '取消' : 'CANCEL'}
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
};

export default ApiPage;
