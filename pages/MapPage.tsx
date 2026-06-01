import React, { useState, useRef, useEffect } from 'react';
import { PixelButton, PixelCard, PixelInput, PixelModal } from '../components/PixelComponents.tsx';
import { Plus, Shuffle, Loader2, X, Sparkles } from 'lucide-react';

interface MapPageProps {
  lang?: 'en' | 'zh';
  credits: number;
  onOpenPricing: () => void;
  isBackendDown?: boolean;
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

const PRESET_ART_STYLES = [
  { id: 'Retro16', en: 'Retro 16-Bit Platformer', zh: '复古16位平台游戏' },
  { id: 'Metro8', en: 'NES 8-Bit Retro Tile', zh: '红白机8位像素瓦片' },
  { id: 'ModernPixel', en: 'Modern High-Fidelity Pixel', zh: '现代高精度像素' },
  { id: 'Handdrawn', en: 'Hand-drawn Cartoon Pixel', zh: '手绘卡通风格像素' },
];

const PRESET_ALIGNMENTS = [
  { id: 'strict', en: 'Strict Conformity (完全贴合)', zh: '完全贴合' },
  { id: 'approximate', en: 'Approximate Conformity (大致贴合)', zh: '大致贴合' },
  { id: 'free', en: 'Creative Freedom (完全自由)', zh: '完全自由' },
];

const RANDOM_MAP_PROMPTS = [
  { 
    en: "A dark cyberpunk sewer level with neon signs, rusty metal pipes, and glowing green water", 
    zh: "一个带霓虹灯牌、生锈金属管道和发光绿色积水的阴暗赛博朋克下水道场景",
    bg: "Cyberpunk neon skyline mist / 赛博朋克霓虹迷雾天际线"
  },
  { 
    en: "A lush green woodland forest with wooden mossy platforms, hanging vines, and sparkling light shafts", 
    zh: "一个包含青苔木质平台、悬挂藤蔓和斑驳阳光洒下的茂密绿林场景",
    bg: "Serene pine trees misty mountains / 宁静落叶松和云雾缭绕的山峦"
  },
  { 
    en: "A molten lava volcanic cave with dark basalt stone blocks, hot bubbling lava river, and glowing heat haze", 
    zh: "一个具有黑色玄武岩石块、滚烫起泡岩浆河和高温热浪的熔岩火山洞穴场景",
    bg: "Subterranean magma glow cavern / 地底炽热岩浆岩洞"
  },
  { 
    en: "An ancient gothic castle hall with cracked stone brick walls, candlelight brass chandeliers, and iron grates", 
    zh: "一个拥有开裂石砖墙、黄铜烛台吊灯和铁栅栏的古老哥特城堡大厅场景",
    bg: "Spooky moonlit stained glass windows / 月光投影下的阴森彩绘玻璃窗"
  },
  { 
    en: "A futuristic alien space station deck with white metal armor tiles, holographic blue terminals, and stellar views", 
    zh: "一个采用白色金属护甲瓦片、蓝色全息终端和星空景观的未来科幻外星空间站甲板场景",
    bg: "Orbiting planet cosmic field / 轨道运行的星球与浩瀚星云"
  }
];

const MapPage: React.FC<MapPageProps> = ({
  lang = 'en',
  credits,
  onOpenPricing,
  isBackendDown,
  isLoggedIn = false,
  onLoginRequest,
}) => {
  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  // Form State
  const [prompt, setPrompt] = useState('');
  const [bgPrompt, setBgPrompt] = useState('');
  const [artStyle, setArtStyle] = useState('Retro16');
  const [alignment, setAlignment] = useState('approximate');
  const [includeBackground, setIncludeBackground] = useState('no'); // 'yes' | 'no'
  const [useDomainColor, setUseDomainColor] = useState(false);
  const [domainColors, setDomainColors] = useState<string[]>(['#FFD700', '#F7D51D', '#B8860B', '#453200']);
  const [refImage, setRefImage] = useState<File | string | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set first prompt initially on load
  useEffect(() => {
    const random = RANDOM_MAP_PROMPTS[0];
    setPrompt(isZh ? random.zh : random.en);
    setBgPrompt(isZh ? "无" : "None");
  }, [isZh]);

  const handleRandomPrompt = () => {
    const random = RANDOM_MAP_PROMPTS[Math.floor(Math.random() * RANDOM_MAP_PROMPTS.length)];
    setPrompt(isZh ? random.zh : random.en);
    setBgPrompt(isZh ? '无' : 'None');
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

  const handleGenerate = () => {
    if (!isLoggedIn) {
      onLoginRequest?.();
      return;
    }
    if (!prompt.trim()) {
      setError(isZh ? '请输入场景描述' : 'Please enter scene description');
      return;
    }
    if (credits < 2) {
      onOpenPricing();
      return;
    }
    setError(null);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Scene Structure Placeholder (16:9 aspect) */}
            <div className="flex">
              <PixelCard 
                title={isZh ? '场景结构' : 'SCENE STRUCTURE'} 
                titleStyle={{ fontSize: zhScale(10) }} 
                className="w-full flex flex-col"
              >
                <div className="pt-2 flex-1 flex flex-col justify-center">
                  {/* Aspect Video (16:9) Container block */}
                  <div className="aspect-video w-full bg-black/50 pixel-border border-[#5a2d9c] relative overflow-hidden flex items-center justify-center">
                    {/* Retro Grid Background Overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#5a2d9c_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'linear-gradient(to right, rgba(90,45,156,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(90,45,156,0.1) 1px, transparent 1px)',
                      backgroundSize: '24px 24px'
                    }}></div>
                    
                    {/* Visual schematic elements */}
                    <div className="border border-dashed border-[#5a2d9c] w-3/4 h-1/2 flex items-center justify-center bg-black/40 relative z-10">
                      <span className="text-[8px] font-bold text-[#f7d51d]/40 uppercase text-center select-none tracking-widest leading-normal">
                        {isZh ? '场景结构图占位\n[ 正在开发中 ]' : 'SCENE STRUCTURE PLACEHOLDER\n[ UNDER DEV ]'}
                      </span>
                    </div>
                  </div>
                </div>
              </PixelCard>
            </div>

            {/* Title / Description Settings */}
            <div className="lg:col-span-2 flex">
              <PixelCard 
                title={isZh ? '场景描述' : 'SCENE DESCRIPTION'} 
                titleStyle={{ fontSize: zhScale(10) }} 
                className="w-full flex flex-col"
              >
                <div className="relative pt-2 flex-1 flex flex-col gap-4">
                  {/* Main prompt input */}
                  <div className="relative flex-1 flex flex-col">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={isZh ? "描述你的场景，比如地面、天气、关卡元素等" : "Describe your scene, such as ground, weather, levels elements, etc."}
                      className="w-full h-44 bg-black/40 pixel-border border-[#5a2d9c] p-4 text-white outline-none focus:border-[#f7d51d] resize-none"
                      style={{ fontSize: zhScale(10) }}
                    />
                    <button
                      onClick={handleRandomPrompt}
                      className="absolute bottom-4 right-4 p-2 bg-[#5a2d9c]/50 hover:bg-[#f7d51d] hover:text-[#2d1b4e] transition-colors pixel-border border-white/20 z-10"
                      title={isZh ? "随机描述" : "Random Prompt"}
                    >
                      <Shuffle size={16} />
                    </button>
                  </div>

                  {/* Background description */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/60 uppercase">
                      {isZh ? '背景描述 (默认是无)' : 'BACKGROUND DESCRIPTION (OPTIONAL)'}
                    </label>
                    <PixelInput
                      value={bgPrompt}
                      onChange={(e) => setBgPrompt(e.target.value)}
                      placeholder={isZh ? "例如：远景群山，落日余晖 (默认是无)" : "Misty background hills, purple sunset... (default is None)"}
                      className="w-full h-10 px-3 bg-black/40"
                    />
                  </div>
                </div>
              </PixelCard>
            </div>
          </div>

          {/* Reference Image / Examples */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Reference Image Section */}
            <div className="flex">
              <PixelCard 
                title={isZh ? '参考图 (可选)' : 'REFERENCE IMAGE (OPTIONAL)'} 
                titleStyle={{ fontSize: zhScale(10) }} 
                className="w-full flex flex-col"
              >
                <div className="pt-2 flex-1 flex items-center">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 bg-black/40 pixel-border border-2 border-[#5a2d9c] border-dashed hover:border-[#f7d51d] cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group"
                  >
                    {refPreview ? (
                      <div className="w-full h-full relative group/preview">
                        <img 
                          src={refPreview} 
                          className="w-full h-full object-contain" 
                          style={{ imageRendering: 'pixelated' }} 
                          alt="Map Reference Preview" 
                        />
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
            </div>

            {/* Template Card */}
            <div className="flex">
              <PixelCard 
                title={isZh ? '模板 (可选)' : 'TEMPLATE (OPTIONAL)'} 
                titleStyle={{ fontSize: zhScale(10) }} 
                className="w-full flex flex-col relative"
              >
                <div className="pt-2 flex-1 flex items-center justify-center">
                  <p className="text-white/20 uppercase tracking-[0.2em] font-bold text-[12px] animate-pulse">
                    {isZh ? '敬请期待' : 'COMING SOON'}
                  </p>
                </div>
              </PixelCard>
            </div>
          </div>
        </div>

        {/* Right Column / Parameters Panel */}
        <div className="w-full md:w-80 space-y-6">
          <PixelCard 
            title={isZh ? '参数设置' : 'PARAMETERS'} 
            titleStyle={{ fontSize: zhScale(10) }}
          >
            <div className="space-y-6 pt-2">
              {/* Art Style */}
              <div className="space-y-2">
                <label className="font-bold text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '画风规格' : 'ART STYLE'}
                </label>
                <div className="relative">
                  <select 
                    value={artStyle}
                    onChange={(e) => setArtStyle(e.target.value)}
                    className="w-full bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
                    style={{ fontSize: zhScale(10) }}
                  >
                    {PRESET_ART_STYLES.map(style => (
                      <option key={style.id} value={style.id}>{isZh ? style.zh : style.en}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alignment / Conformity (完全贴合，大致贴合，完全自由) */}
              <div className="space-y-2">
                <label className="font-bold text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '结构图贴合程度' : 'STRUCTURE ALIGNMENT'}
                </label>
                <div className="relative">
                  <select 
                    value={alignment}
                    onChange={(e) => setAlignment(e.target.value)}
                    className="w-full bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
                    style={{ fontSize: zhScale(10) }}
                  >
                    {PRESET_ALIGNMENTS.map(align => (
                      <option key={align.id} value={align.id}>{align.zh}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Include Background Option (是否包含背景) */}
              <div className="space-y-2">
                <label className="font-bold text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '是否包含背景' : 'INCLUDE BACKGROUND'}
                </label>
                <div className="relative">
                  <select 
                    value={includeBackground}
                    onChange={(e) => setIncludeBackground(e.target.value)}
                    className="w-full bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
                    style={{ fontSize: zhScale(10) }}
                  >
                    <option value="no">{isZh ? '否 (仅生成主体/瓦片集透明图层)' : 'No (Transparent tilesets layer only)'}</option>
                    <option value="yes">{isZh ? '是 (附带渲染对应的背景插图)' : 'Yes (Render complete background illustration)'}</option>
                  </select>
                </div>
              </div>

              {/* Dominant Colors matching CharacterPage exactly */}
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
                      className="w-full bg-[#1b0b2e] bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
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

          {/* Error display */}
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/40 border border-red-500 text-red-200 uppercase text-center" style={{ fontSize: zhScale(10) }}>
                {error}
              </div>
            )}

            {/* Generate Action trigger matching Character UI Button */}
            <PixelButton
              variant="primary"
              className="w-full h-14"
              onClick={handleGenerate}
              disabled={isBackendDown}
              style={{ fontSize: 14 }}
            >
              {isZh ? '生成 (花费2点积分)' : 'GENERATE (2 CREDITS)'}
            </PixelButton>
          </div>

        </div>
      </div>

      {/* Beautiful Modal popup for the temporary placeholder state, avoiding raw window.alert */}
      <PixelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isZh ? "场景生成即将推出！" : "MAP GENERATOR COMING SOON!"}
        titleStyle={{ color: '#f7d51d' }}
      >
        <div className="space-y-4 text-center py-2 max-w-sm mx-auto">
          <div className="w-12 h-12 bg-[#5a2d9c]/30 rounded-full flex items-center justify-center mx-auto text-[#f7d51d] animate-pulse mb-3">
            <Sparkles size={24} />
          </div>
          <p className="text-white text-xs leading-relaxed">
            {isZh 
              ? "地图与平台场景生成功能正在进行最后的精细化模型微调！" 
              : "Our side-scrolling map & tileset generator is in final calibration and model optimization!"}
          </p>
          <div className="p-3 bg-black/40 pixel-border border-[#5a2d9c]/50 text-left text-[10px] text-white/60 space-y-2 leading-relaxed">
            <p><strong>{isZh ? "您的配置为：" : "Your Configuration:"}</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>{isZh ? "艺术风格：" : "Style: "} {PRESET_ART_STYLES.find(s => s.id === artStyle)?.[isZh ? 'zh' : 'en'] || artStyle}</li>
              <li>{isZh ? "场景地形：" : "Terrain prompt: "} &quot;{prompt.substring(0, 40)}...&quot;</li>
              <li>{isZh ? "场景贴合：" : "Conformity: "} {alignment}</li>
              <li>{isZh ? "渲染背景：" : "Render background: "} {includeBackground}</li>
              <li>{isZh ? "限制主导色：" : "Dominant Colors: "} {useDomainColor ? (isZh ? '已开启' : 'Enabled') + ` (${domainColors.join(', ')})` : (isZh ? '未开启' : 'Disabled')}</li>
            </ul>
          </div>
          <p className="text-[#f7d51d] text-[10px] font-bold uppercase tracking-wider mt-4">
            {isZh ? "上线后本次生成将花费 2 积分。敬请期待！" : "This feature will fully consume 2 credits on release. Stay tuned!"}
          </p>
        </div>
      </PixelModal>

    </div>
  );
};

export default MapPage;
