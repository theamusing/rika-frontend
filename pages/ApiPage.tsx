
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService.ts';
import { ApiKeyInfo, ApiKeyCreateResp } from '../types.ts';
import { PixelButton, PixelCard } from '../components/PixelComponents.tsx';
import { Trash2, Plus, AlertTriangle, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface ApiPageProps {
  lang?: 'en' | 'zh';
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
    description: { en: 'Generate pixel art animation', zh: '生成像素动画' },
    request: `{
  "image_base64": ["data:image/png;base64,..."],
  "params": {
    "prompt": "side-view, 2D game character walking",
    "motion_type": "walk",
    "pixel_size": "128",
    "seed": 123456,
    "strength_low": 0.8,
    "strength_high": 0.8,
    "length": 25,
    "use_mid_image": false,
    "use_end_image": false
  }
}`,
    requestParams: [
      { name: 'image_base64', optional: false, type: 'string[]', description: { en: 'List of base64 images (Start, [Mid], [End]). Only png supported.', zh: '图片 Base64 列表 (起始帧, 中间帧[可选], 结尾帧[可选])。目前只支持png的编码。建议使用纯色背景。' } },
      { name: 'prompt', optional: false, type: 'string', description: { en: 'Animation description', zh: '动画文本描述' } },
      { name: 'motion_type', optional: true, type: 'string', values: 'idle | walk | run | jump | attack | hit | defeated', description: { en: 'Motion type (Default: idle)', zh: '动作类型 (默认: idle)' } },
      { name: 'pixel_size', optional: true, type: 'string', values: '32 | 64 | 128 | 256', description: { en: 'Pixel size (Default: 128)', zh: '像素尺寸 (默认: 128)' } },
      { name: 'seed', optional: true, type: 'number', description: { en: 'Random seed', zh: '随机种子' } },
      { name: 'strength_low', optional: true, type: 'number', values: '0.0 - 1.0', description: { en: 'Noise strength for low level (Default: 0.8)', zh: '低级噪声强度 (默认: 0.8)' } },
      { name: 'strength_high', optional: true, type: 'number', values: '0.0 - 1.0', description: { en: 'Noise strength for high level (Default: 0.8)', zh: '高级噪声强度 (默认: 0.8)' } },
      { name: 'length', optional: true, type: 'number', values: '17 | 21 | 25 | 29 | 33', description: { en: 'Frames calculation: 2*frames+1', zh: '帧数计算参数: 2*frames+1' } },
      { name: 'use_mid_image', optional: true, type: 'boolean', description: { en: 'Use middle reference image', zh: '是否使用中间参考图' } },
      { name: 'use_end_image', optional: true, type: 'boolean', description: { en: 'Use end reference image', zh: '是否使用结尾参考图' } }
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
    path: '/generate-character',
    description: { en: 'Generate pixel art character', zh: '生成像素角色' },
    request: `{
  "image_base64": ["data:image/png;base64,..."],
  "params": {
    "prompt": "a cyberpunk hero with a neon sword",
    "pixel_size": "128",
    "style": "anime",
    "domain_color": ["#ff0000", "#00ff00"]
  }
}`,
    requestParams: [
      { name: 'image_base64', optional: true, type: 'string[]', description: { en: 'Character reference images', zh: '角色参考图列表' } },
      { name: 'prompt', optional: false, type: 'string', description: { en: 'Character description', zh: '角色描述' } },
      { name: 'pixel_size', optional: true, type: 'string', values: '32 | 64 | 128 | 256', description: { en: 'Pixel size (Default: 128)', zh: '像素尺寸 (默认: 128)' } },
      { name: 'style', optional: true, type: 'string', values: 'Retro | Anime', description: { en: 'Character style', zh: '角色风格' } },
      { name: 'domain_color', optional: true, type: 'string[]', values: 'List of Hex codes', description: { en: 'Main color themes', zh: '主色调列表' } }
    ],
    response: `{
  "gen_id": "550e8400-e29b-41d4-a716-446655440000"
}`,
    responseParams: [
      { name: 'gen_id', optional: false, type: 'string', description: { en: 'Unique job ID', zh: '唯一的任务 ID' } }
    ]
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
  "input_params": {},
  "output_params": {},
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:05Z",
  "input_images": [],
  "output_images": [
    { "url": "https://cdn.rika-ai.com/...", "key": "..." }
  ],
  "persist_images": true,
  "liked": false,
  "error": null
}`,
    responseParams: [
      { name: 'gen_id', optional: false, type: 'string', description: { en: 'Job ID', zh: '任务 ID' } },
      { name: 'job_type', optional: false, type: 'string', description: { en: 'Type of job', zh: '任务类型' } },
      { name: 'status', optional: false, type: 'string', values: 'queued|running|succeeded|failed', description: { en: 'Current status', zh: '当前状态' } },
      { name: 'input_params', optional: false, type: 'object', description: { en: 'Original input parameters', zh: '原始输入参数' } },
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

const ApiPage: React.FC<ApiPageProps> = ({ lang = 'en' }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
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
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  const fetchApiKeys = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
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
    <div className="space-y-8 text-white max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className={`font-bold uppercase text-white/80 ${isZh ? 'text-[24px]' : 'text-xl'}`}>
          {isZh ? 'API 密钥' : 'API KEYS'}
        </h2>
        <PixelButton variant="secondary" onClick={fetchApiKeys} style={{ fontSize: zhScale(10) }}>
          {isZh ? '刷新' : 'Refresh'}
        </PixelButton>
      </div>

      <PixelCard className="relative">
        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {loading ? (
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
                className={`p-4 bg-black/20 pixel-border border-[#5a2d9c] flex items-center justify-between group transition-all ${key.is_active ? 'hover:bg-white/5 cursor-pointer' : 'opacity-50'}`}
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
                
                <div className="flex items-center gap-6">
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
      </PixelCard>

      <div className="pt-8 space-y-4">
        <h2 className="font-bold uppercase text-white/80" style={{ fontSize: zhScale(20) }}>
          {isZh ? 'API 文档' : 'API REFERENCE'}
        </h2>
        <PixelCard>
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-black/20 border-l-4 border-[#f7d51d]">
              <p className="font-bold uppercase mb-1 text-white/80" style={{ fontSize: zhScale(10) }}>
                {isZh ? '基础地址' : 'Base URL'}
              </p>
              <p className="text-white/60 font-mono" style={{ fontSize: zhScale(10) }}>
                https://api.rika-ai.com/v1/api
              </p>
            </div>
            
            <div className="p-4 bg-black/20 border-l-4 border-[#f7d51d]">
              <p className="font-bold uppercase mb-1 text-white/80" style={{ fontSize: zhScale(10) }}>
                {isZh ? '请求头' : 'Required Headers'}
              </p>
              <pre className="text-white/60 font-mono" style={{ fontSize: zhScale(10) }}>
{`Content-Type: application/json
X-API-Key: <YOUR_API_KEY>`}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            {apiDocs.map((doc, idx) => (
              <div key={idx} className="pixel-border border-[#5a2d9c] overflow-hidden">
                <button 
                  onClick={() => setExpandedDoc(expandedDoc === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 bg-black/20 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 text-[8px] font-bold ${doc.method === 'GET' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                      {doc.method}
                    </span>
                    <span className="font-mono text-xs font-bold text-white/90">{doc.path}</span>
                    <span className="text-[10px] text-white/40 hidden md:inline ml-2">{doc.description[lang]}</span>
                  </div>
                  {expandedDoc === idx ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                </button>

                  {expandedDoc === idx && (
                    <div className="p-4 bg-black/40 border-t-2 border-[#5a2d9c] space-y-4 animate-fade-in font-sans">
                      <p className="text-sm text-white/60 md:hidden">{doc.description[lang]}</p>
                      
                      {doc.request && (
                        <div className="space-y-1">
                          <p className="uppercase font-mono text-white/40" style={{ fontSize: zhScale(8) }}>Request Body</p>
                          <pre className="p-3 bg-black/60 text-[10px] font-mono text-green-400 overflow-x-auto custom-scrollbar">
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
                                      <td className="py-2 italic">{p.description[lang]}</td>
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
                        <pre className="p-3 bg-black/60 text-[10px] font-mono text-blue-400 overflow-x-auto custom-scrollbar">
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
                                    <td className="py-2 italic">{p.description[lang]}</td>
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
        "prompt": "pixel character walking animation",
        "pixel_size": "128",
        "motion_type": "walk",
        "length": 25,
        "use_end_image": True
    }
}

print("Creating generation job...")
req = urllib.request.Request(
    f"{BASE_URL}/generate",
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
        "prompt": "pixel character walking animation",
        "pixel_size": "128",
        "motion_type": "walk",
        "use_end_image": True
    }
}

print("Creating generation job...")
req = urllib.request.Request(
    f"{BASE_URL}/generate",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
    method="POST"
)

with urllib.request.urlopen(req) as res:
    gen_id = json.loads(res.read().decode())["gen_id"]
    print(f"Job created! gen_id: {gen_id}")

# 2. Polling for results...
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
