
import React, { useState, useRef } from 'react';
import { PixelButton, PixelCard, PixelInput } from '../components/PixelComponents.tsx';
import { apiService } from '../services/apiService.ts';
import { processCharacterImage } from '../utils/imageUtils.ts';
import { Plus, Shuffle, Loader2, X, HelpCircle } from 'lucide-react';

interface CharacterPageProps {
  onJobCreated: (id: string) => void;
  lang?: 'en' | 'zh';
  credits: number;
  onOpenPricing: () => void;
  isBackendDown?: boolean;
  initialParams?: any;
  onConsumed?: () => void;
}

const PRESET_PALETTES = [
  { name: 'Gold', colors: ['#FFD700', '#F7D51D', '#B8860B', '#453200'] },
  { name: 'Silver', colors: ['#E0E0E0', '#A0A0A0', '#707070', '#303030'] },
  { name: 'Blue-Pink', colors: ['#00D2FF', '#FF007F', '#3A7BD5', '#8A2BE2'] },
  { name: 'Fire', colors: ['#FF0000', '#FF4500', '#FF8C00', '#FFFF00'] },
  { name: 'Ice', colors: ['#00FFFF', '#ADD8E6', '#87CEEB', '#FFFFFF'] },
  { name: 'Forest', colors: ['#228B22', '#006400', '#32CD32', '#8B4513'] },
  { name: 'Void', colors: ['#4B0082', '#8A2BE2', '#000000', '#483D8B'] },
];

const ART_STYLES = [
  { id: 'None', en: 'None', zh: '无' },
  { id: 'Anime', en: 'Anime/Cartoon Pixel', zh: '动画卡通像素' },
  { id: 'Retro', en: 'Retro Game Pixel', zh: '复古游戏像素' },
];

const RANDOM_PROMPTS = [
  { en: "A giant battle robot covered in scrap steel plates with a single glowing red eye", zh: "身披废弃钢板、独眼闪烁红光的巨型战斗机器人" },
  { en: "An Mind Flayer lord floating in the air, wearing ornate purple robes with tentacle whiskers", zh: "穿着华丽紫色长袍、长着触手胡须，漂浮空中的灵吸怪领主" },
  { en: "A dragon covered in frost crystals", zh: "浑身覆盖冰霜晶体的龙" },
  { en: "A slow-moving ancient rock treant with bioluminescent mushrooms growing on its back", zh: "背部长满荧光蘑菇、行动迟缓的古老岩石树精" },
  { en: "An ordinary office worker wearing a suit, tie, and glasses", zh: "穿西装打领带戴眼镜的普通上班族" },
  { en: "A gaunt ancient skeleton soldier holding a rusty bronze spear with both hands", zh: "双手拿着生锈铜色长枪、枯瘦的古老骷髅士兵" },
  { en: "A brave knight in silver armor with a blue cape", zh: "身披银甲、披着蓝色斗篷的勇敢骑士" },
  { en: "A mysterious forest elf with green robes and a wooden staff", zh: "穿着绿色长袍、手持木杖的神秘森林精灵" }
];

const CharacterPage: React.FC<CharacterPageProps> = ({ onJobCreated, lang = 'en', credits, onOpenPricing, isBackendDown, initialParams, onConsumed }) => {
  const [prompt, setPrompt] = useState('');
  const [refImage, setRefImage] = useState<File | string | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [domainColors, setDomainColors] = useState<string[]>(['#FFD700', '#F7D51D', '#B8860B', '#453200']);
  const [pixelSize, setPixelSize] = useState('64');
  const [artStyle, setArtStyle] = useState('None');
  const [useDomainColor, setUseDomainColor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  React.useEffect(() => {
    if (initialParams && initialParams.job_type === 'character' && !initialParams.action) {
      const { input_params, input_images } = initialParams;
      if (input_params) {
        setPrompt(input_params.prompt || '');
        setPixelSize(input_params.pixel_size || '128');
        if (input_params.domain_color) {
          try {
            const colors = JSON.parse(input_params.domain_color.replace(/'/g, '"'));
            if (Array.isArray(colors)) {
              setDomainColors(colors);
              setUseDomainColor(true);
            }
          } catch (e) {
            console.error("Failed to parse domain colors", e);
          }
        }
      }
      if (input_images && input_images.length > 0) {
        setRefImage(input_images[0].url);
        setRefPreview(input_images[0].url);
      }
      onConsumed?.();
    }
  }, [initialParams, onConsumed]);

  const handleRandomPrompt = () => {
    const random = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(isZh ? random.zh : random.en);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRefImage(file);
      setRefPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveRefImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefImage(null);
    setRefPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...domainColors];
    newColors[index] = color;
    setDomainColors(newColors);
  };

  const applyPalette = (colors: string[]) => {
    setDomainColors([...colors]);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !refImage) {
      setError(isZh ? '请输入角色描述或上传参考图' : 'Please enter character description or upload a reference image');
      return;
    }
    if (credits <= 0) {
      onOpenPricing();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let imageBase64: string[] | null = null;
      if (refImage) {
        const processed = await processCharacterImage(refImage);
        imageBase64 = [processed];
      }

      const params: any = {
        prompt: prompt.trim(),
        pixel_size: pixelSize,
        style: artStyle
      };
      
      if (useDomainColor) {
        params.domain_color = `[${domainColors.join(',')}]`;
      }

      const res = await apiService.generateCharacter(imageBase64, params);
      onJobCreated(res.gen_id);
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          <PixelCard title={isZh ? '角色描述' : 'CHARACTER DESCRIPTION'}>
            <div className="relative pt-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={isZh ? "描述你的角色，比如衣着，身材，武器等" : "Describe your character, such as clothing, body type, weapons, etc."}
                  className="w-full h-64 bg-black/40 pixel-border border-[#5a2d9c] p-4 text-white outline-none focus:border-[#f7d51d] resize-none"
                  style={{ fontSize: zhScale(10) }}
                />
              <button
                onClick={handleRandomPrompt}
                className="absolute bottom-4 right-4 p-2 bg-[#5a2d9c] hover:bg-[#f7d51d] hover:text-[#2d1b4e] transition-colors pixel-border border-white/20"
                title={isZh ? "随机描述" : "Random Prompt"}
              >
                <Shuffle size={16} />
              </button>
            </div>
          </PixelCard>

          <PixelCard title={isZh ? '参考图 (可选)' : 'REFERENCE IMAGE (OPTIONAL)'}>
            <div className="pt-2">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 bg-black/40 pixel-border border-2 border-[#5a2d9c] border-dashed hover:border-[#f7d51d] cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group"
              >
                {refPreview ? (
                  <div className="w-full h-full relative group/preview">
                    <img src={refPreview} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} alt="Preview" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity">
                      <Plus size={20} className="text-white" />
                    </div>
                    <button
                      onClick={handleRemoveRefImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white flex items-center justify-center pixel-border border-white z-20 hover:bg-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <Plus size={24} className="text-white/20 group-hover:text-white/40" />
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden" 
                />
              </div>
            </div>
          </PixelCard>
        </div>

        {/* Right Column */}
        <div className="w-full md:w-80 space-y-6">
          <PixelCard title={isZh ? '参数设置' : 'PARAMETERS'}>
            <div className="space-y-6 pt-2">
              {/* Pixel Size */}
              <div className="space-y-2">
                <label className="font-bold text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '像素尺寸' : 'PIXEL SIZE'}
                </label>
                <div className="relative">
                  <select 
                    value={pixelSize}
                    onChange={(e) => setPixelSize(e.target.value)}
                    className="w-full bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
                    style={{ fontSize: zhScale(10) }}
                  >
                    <option value="64">64x64</option>
                    <option value="128">128x128</option>
                  </select>
                </div>
              </div>

              {/* Art Style */}
              <div className="space-y-2">
                <label className="font-bold text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '画风' : 'ART STYLE'}
                </label>
                <div className="relative">
                  <select 
                    value={artStyle}
                    onChange={(e) => setArtStyle(e.target.value)}
                    className="w-full bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
                    style={{ fontSize: zhScale(10) }}
                  >
                    {ART_STYLES.map(style => (
                      <option key={style.id} value={style.id}>{isZh ? style.zh : style.en}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dominant Colors */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="useDomainColor"
                    checked={useDomainColor}
                    onChange={(e) => setUseDomainColor(e.target.checked)}
                    className="w-3 h-3 accent-[#f7d51d]"
                  />
                  <label htmlFor="useDomainColor" className="font-bold text-white/60 uppercase cursor-pointer" style={{ fontSize: zhScale(10) }}>
                    {isZh ? '主导颜色' : 'DOMINANT COLORS'}
                  </label>
                </div>
                
                <div className={`space-y-4 transition-opacity ${useDomainColor ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <div className="flex gap-2">
                    {domainColors.map((color, i) => (
                      <div key={i} className="relative w-10 h-10 pixel-border border-2 border-[#5a2d9c] bg-black/40 overflow-hidden">
                        <div className="absolute inset-0" style={{ backgroundColor: color }}></div>
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => handleColorChange(i, e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="relative">
                    <select 
                      className="w-full bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
                      style={{ fontSize: zhScale(10) }}
                      onChange={(e) => {
                        const p = PRESET_PALETTES.find(x => x.name === e.target.value);
                        if (p) applyPalette(p.colors);
                      }}
                    >
                      <option value="">{isZh ? '选择预设色卡' : 'SELECT PRESET'}</option>
                      {PRESET_PALETTES.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </PixelCard>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/40 border border-red-500 text-red-200 uppercase text-center" style={{ fontSize: zhScale(10) }}>
                {error}
              </div>
            )}

            <PixelButton
              variant="primary"
              className="w-full h-14"
              onClick={handleGenerate}
              disabled={loading || isBackendDown}
              style={{ fontSize: zhScale(10) }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  {isZh ? '生成中...' : 'GENERATING...'}
                </div>
              ) : (
                isZh ? '生成' : 'GENERATE'
              )}
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterPage;
