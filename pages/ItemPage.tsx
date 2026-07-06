import React, { useState, useRef } from 'react';
import { PixelButton, PixelCard, PixelInput, PixelImage } from '../components/PixelComponents.tsx';
import { apiService } from '../services/apiService.ts';
import { processCharacterImage } from '../utils/imageUtils.ts';
import { Plus, Shuffle, Loader2, X, HelpCircle } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

interface ItemPageProps {
  onJobCreated: (id: string) => void;
  lang?: 'en' | 'zh';
  credits: number;
  onOpenPricing: () => void;
  isBackendDown?: boolean;
  initialParams?: any;
  onConsumed?: () => void;
  isLoggedIn?: boolean;
  onLoginRequest?: () => void;
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
  { en: "An ornate crimson spellbook with a glowing golden rune on its cover", zh: "一本封面上刻有金色闪光符文的华丽深红法术书" },
  { en: "A futuristic sci-fi laser pistol with cyan plasma chambers", zh: "一个带有青色等离子腔室的未来科幻激光手枪" },
  { en: "A glowing blue crystal key floating in the air", zh: "一把悬浮在空中、闪烁蓝光的晶体钥匙" },
  { en: "A legendary broadsword embedded with a radiant ruby at the hilt", zh: "一把剑柄上镶嵌着闪耀红宝石的传奇宽刃大剑" },
  { en: "A retro health potion bottle filled with bubbling red liquid", zh: "一个装满起泡红色药液的复古生命药水瓶" },
  { en: "A golden skull ornament with glowing emerald eyes", zh: "一个长着发光祖母绿眼睛的黄金骷髅摆件" },
  { en: "A medieval bronze shield reinforced with steel rivets", zh: "一个用钢铆钉加固的中世纪青铜盾牌" },
  { en: "A mysterious black key card with a glowing white circuit pattern", zh: "一张带有发光白色电路图案的神秘黑色钥匙卡" }
];

const EXAMPLES_BASE = "https://cdn.rika-ai.com/assets/frontpage/examples/";

const ITEM_EXAMPLES: Record<string, any[]> = {
  '64': [
    { id: 1, en: "A square metal safe with a circular handle", zh: "圆形把手方形金属保险柜", image: "https://cdn.rika-ai.com/assets/references/item_ref_64_2.png" }
  ],
  '128': [
    { id: 2, en: "An exquisite patterned metal safe", zh: "精致的带花纹的金属保险箱", image: "https://cdn.rika-ai.com/assets/references/item_ref_128_2.png" }
  ],
  '256': [
    { id: 3, en: "Simple upright wooden bookshelf with wood texture", zh: "木头质感，朴素的直立书架", image: "https://cdn.rika-ai.com/assets/references/item_ref_256_2.png" }
  ]
};

const ItemPage: React.FC<ItemPageProps> = ({ 
  onJobCreated, 
  lang = 'en', 
  credits, 
  onOpenPricing, 
  isBackendDown, 
  initialParams, 
  onConsumed,
  isLoggedIn = false,
  onLoginRequest
}) => {
  const [prompt, setPrompt] = useState('');
  const [refImage, setRefImage] = useState<File | string | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [domainColors, setDomainColors] = useState<string[]>(['#FFD700', '#F7D51D', '#B8860B', '#453200']);
  const [pixelSize, setPixelSize] = useState('128');
  const [artStyle, setArtStyle] = useState('None');
  const [useDomainColor, setUseDomainColor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [colorInputKey, setColorInputKey] = useState(0);
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  const currentExample = React.useMemo(() => {
    const examples = ITEM_EXAMPLES[pixelSize] || ITEM_EXAMPLES['128'];
    const idx = exampleIndex >= examples.length ? 0 : exampleIndex;
    return examples[idx];
  }, [pixelSize, exampleIndex]);

  React.useEffect(() => {
    const examples = ITEM_EXAMPLES[pixelSize] || ITEM_EXAMPLES['128'];
    setExampleIndex(Math.floor(Math.random() * examples.length));
  }, [pixelSize]);

  React.useEffect(() => {
    if (initialParams && initialParams.job_type === 'item' && !initialParams.action) {
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
    setColorInputKey(prev => prev + 1);
  };

  const applyPalette = (colors: string[]) => {
    setDomainColors([...colors]);
  };

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      onLoginRequest?.();
      return;
    }
    if (!prompt.trim() && !refImage) {
      setError(isZh ? '请输入道具描述或上传参考图' : 'Please enter item description or upload a reference image');
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
        style: artStyle,
        version: '2'
      };
      
      if (useDomainColor) {
        params.domain_color = `[${domainColors.join(',')}]`;
      }

      const res = await apiService.generateItem(imageBase64, params);
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 flex">
              <PixelCard title={isZh ? '道具描述' : 'ITEM DESCRIPTION'} titleStyle={{ fontSize: zhScale(10) }} className="w-full flex flex-col">
                <div className="relative pt-2 flex-1 flex flex-col">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isZh ? "描述你的道具，比如外观，材质，发光特效等" : "Describe your item, such as appearance, material, glowing effects, etc."}
                    className="w-full h-64 bg-black/40 pixel-border border-[#5a2d9c] p-4 text-white outline-none focus:border-[#f7d51d] resize-none"
                    style={{ fontSize: zhScale(10) }}
                  />
                  <button
                    onClick={handleRandomPrompt}
                    className="absolute bottom-4 right-4 p-2 bg-[#5a2d9c] hover:bg-[#f7d51d] hover:text-[#2d1b4e] transition-colors pixel-border border-white/20 z-10"
                    title={isZh ? "随机描述" : "Random Prompt"}
                  >
                    <Shuffle size={16} />
                  </button>
                </div>
              </PixelCard>
            </div>
            <div className="flex">
              <PixelCard title="EXAMPLE" titleStyle={{ fontSize: zhScale(10) }} className="w-full flex flex-col cursor-pointer hover:bg-[#2d1b4e]/70 transition-colors" onClick={() => setPrompt(isZh ? currentExample.zh : currentExample.en)}>
                <div className="pt-2 flex-1 flex flex-col gap-3">
                  <div className="aspect-square w-full bg-black/20 pixel-border border-[#5a2d9c]/30 flex items-center justify-center overflow-hidden">
                    <PixelImage 
                      src={currentExample.image} 
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'pixelated' }}
                      alt="Example"
                    />
                  </div>
                  <p className={`text-white/60 leading-tight ${isZh ? 'text-[10px]' : 'text-[8px] uppercase'}`}>
                    {isZh ? currentExample.zh : currentExample.en}
                  </p>
                </div>
              </PixelCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <PixelCard title={isZh ? '参考图 (可选)' : 'REFERENCE IMAGE (OPTIONAL)'} titleStyle={{ fontSize: zhScale(10) }} className="flex flex-col">
              <div className="pt-2 flex-1 flex items-center">
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
                        className="absolute -top-3 -right-3 w-7 h-7 bg-red-600 text-white flex items-center justify-center pixel-border border-white z-[60] hover:bg-red-500 transition-colors shadow-lg"
                      >
                        <X size={16} />
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

            <PixelCard title={isZh ? '模板 (可选)' : 'TEMPLATE (OPTIONAL)'} titleStyle={{ fontSize: zhScale(10) }} className="flex flex-col relative">
              <div className="pt-2 flex-1 flex items-center justify-center">
                <p className="text-white/20 uppercase tracking-[0.2em] font-bold text-[12px] animate-pulse">
                  {isZh ? '敬请期待' : 'COMING SOON'}
                </p>
              </div>
            </PixelCard>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full md:w-80 space-y-6">
          <PixelCard title={isZh ? '参数设置' : 'PARAMETERS'} titleStyle={{ fontSize: zhScale(10) }}>
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
                    <option value="64">64</option>
                    <option value="128">128</option>
                    <option value="256">256</option>
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
                  <div className="group relative inline-block flex items-center">
                    <HelpCircle size={12} className="text-white/40 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-white text-[10px] pixel-border border-[#5a2d9c] font-sans z-50 normal-case text-center">
                      {isZh ? "生成的图像会以这些颜色作为主导" : "The generated image will be dominated by these colors."}
                    </div>
                  </div>
                </div>
                
                <div className={`space-y-4 transition-opacity ${useDomainColor ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <div className="flex gap-2 relative">
                    {domainColors.map((color, i) => (
                      <div key={i} className="relative w-10 h-10 pixel-border border-2 border-[#5a2d9c] bg-black/40 overflow-hidden cursor-pointer" onClick={() => setActiveColorIndex(i)}>
                        <div className="absolute inset-0" style={{ backgroundColor: color }}></div>
                      </div>
                    ))}

                    {activeColorIndex !== null && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveColorIndex(null)} />
                        <div className="absolute left-0 top-12 z-50 bg-[#1e1e1e] border-2 border-[#5a2d9c] p-2 pixel-border flex flex-col gap-2 w-52 shadow-2xl">
                          <HexColorPicker color={domainColors[activeColorIndex]} onChange={(color) => handleColorChange(activeColorIndex, color)} />
                          <div className="flex justify-between items-center text-xs font-mono text-white/80">
                            <span>{domainColors[activeColorIndex].toUpperCase()}</span>
                            <button className="text-[#a47cfd] font-bold px-1 hover:text-white" onClick={() => setActiveColorIndex(null)}>
                              {isZh ? '关闭' : 'CLOSE'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
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
              style={{ fontSize: 14 }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  {isZh ? 'GENERATING...' : 'GENERATING...'}
                </div>
              ) : (
                'GENERATE (1 CREDIT)'
              )}
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemPage;
