import React, { useState, useRef, useEffect } from 'react';
import { PixelButton, PixelCard, PixelInput } from '../components/PixelComponents.tsx';
import { Plus, Shuffle, Loader2, X, Sparkles, Grid, Edit3 } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { apiService } from '../services/apiService.ts';
import { fetchAsDataUrl } from '../utils/imageUtils.ts';
import { StructureEditorModal, StructureData, exportStructureCanvasToDataUrl } from '../components/StructureEditorModal.tsx';

interface MapPageProps {
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

const PRESET_ART_STYLES = [
  { id: 'Retro', en: 'Retro Game Pixel', zh: '复古游戏像素' },
  { id: 'Anime', en: 'Anime/Cartoon Pixel', zh: '动画卡通像素' },
];

const PRESET_BG_STYLES = [
  { id: 'Parallax', en: 'Parallax', zh: '视差滚动' },
  { id: 'Flat', en: 'Flat', zh: '扁平静态' },
  { id: 'None', en: 'None', zh: '无背景' },
];

const RANDOM_MAP_PROMPTS = [
  { 
    en: "A dark cyberpunk sewer level with neon signs, rusty metal pipes, and glowing green water", 
    zh: "一个带霓虹灯牌、生锈金属管道和发光绿色积水的阴暗赛博朋克下水道场景"
  },
  { 
    en: "A lush green woodland forest with wooden mossy platforms, hanging vines, and sparkling light shafts", 
    zh: "一个包含青苔木质平台、悬挂藤蔓和斑驳阳光洒下的茂密绿林场景"
  },
  { 
    en: "A molten lava volcanic cave with dark basalt stone blocks, hot bubbling lava river, and glowing heat haze", 
    zh: "一个具有黑色玄武岩石块、滚烫起泡岩浆河 and 高温热浪的熔岩火山洞穴场景"
  },
  { 
    en: "An ancient gothic castle hall with cracked stone brick walls, candlelight brass chandeliers, and iron grates", 
    zh: "一个拥有开裂石砖墙、黄铜烛台吊灯和铁栅栏的古老哥特城堡大厅场景"
  },
  { 
    en: "A futuristic alien space station deck with white metal armor tiles, holographic blue terminals, and stellar views", 
    zh: "一个采用白色金属护甲瓦片、蓝色全息终端和星空景观的未来科幻外星空间站甲板场景"
  }
];

const MapPage: React.FC<MapPageProps> = ({
  onJobCreated,
  lang = 'en',
  credits,
  onOpenPricing,
  isBackendDown,
  initialParams,
  onConsumed,
  isLoggedIn = false,
  onLoginRequest,
}) => {
  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  // Form State
  const [prompt, setPrompt] = useState('');
  const [artStyle, setArtStyle] = useState('Retro');
  const [bgStyle, setBgStyle] = useState('Flat');
  const [useDomainColor, setUseDomainColor] = useState(false);
  const [domainColors, setDomainColors] = useState<string[]>(['#FFD700', '#F7D51D', '#B8860B', '#453200']);
  const [refImage, setRefImage] = useState<File | string | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [styleRefImage, setStyleRefImage] = useState<File | string | null>(null);
  const [styleRefPreview, setStyleRefPreview] = useState<string | null>(null);

  // Structure Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [gridCols, setGridCols] = useState<number>(32);
  const [gridRows, setGridRows] = useState<number>(18);
  const [gridData, setGridData] = useState<number[][] | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorInputKey, setColorInputKey] = useState(0);
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedInitialParams = useRef(false);

  // Set first prompt initially on load
  useEffect(() => {
    if (initialParams && initialParams.job_type === 'map') {
      hasLoadedInitialParams.current = true;
      return;
    }
    if (hasLoadedInitialParams.current) return;
    const random = RANDOM_MAP_PROMPTS[0];
    setPrompt(isZh ? random.zh : random.en);
  }, [isZh, initialParams]);

  useEffect(() => {
    if (initialParams && initialParams.job_type === 'map') {
      const { input_params, input_images } = initialParams;
      if (input_params) {
        setPrompt(input_params.prompt || '');
        setArtStyle(input_params.style || 'Retro');
        setBgStyle(input_params.bg_style || 'Flat');

        // Restore structure grid if present
        if (input_params.grid_width && input_params.grid_data) {
          try {
            const cols = Number(input_params.grid_width) || 32;
            const rows = Number(input_params.grid_height) || 18;
            let data: number[][] = [];
            if (typeof input_params.grid_data === 'string') {
              data = JSON.parse(input_params.grid_data);
            } else if (Array.isArray(input_params.grid_data)) {
              data = input_params.grid_data;
            }
            if (data && data.length > 0) {
              setGridCols(cols);
              setGridRows(rows);
              setGridData(data);
              const exportedUrl = exportStructureCanvasToDataUrl(cols, rows, data);
              setRefImage(exportedUrl);
              setRefPreview(exportedUrl);
            }
          } catch (e) {
            console.error("Failed to parse grid_data", e);
          }
        }

        if (input_params.domain_color) {
          try {
            const raw = input_params.domain_color;
            let colors: string[] = [];
            if (raw.includes("'") || raw.includes('"')) {
              colors = JSON.parse(raw.replace(/'/g, '"'));
            } else {
              colors = raw.replace(/[\[\]']/g, '').split(',').map((c: string) => c.trim()).filter(Boolean);
            }
            if (Array.isArray(colors) && colors.length > 0) {
              setDomainColors(colors);
              setUseDomainColor(true);
            }
          } catch (e) {
            console.error("Failed to parse domain colors", e);
            try {
              const raw = input_params.domain_color;
              const cleanColors = raw.replace(/[\[\]'"]/g, '').split(',').map((c: string) => c.trim()).filter(Boolean);
              if (cleanColors.length > 0) {
                setDomainColors(cleanColors);
                setUseDomainColor(true);
              }
            } catch (e2) {
              console.error("Fallback parsing failed", e2);
            }
          }
        } else {
          setUseDomainColor(false);
        }
      }
      if (input_images && input_images.length > 0) {
        // If gridData was not set from input_params, fallback to first image
        if (!input_params?.grid_data) {
          setRefImage(input_images[0].url);
          setRefPreview(input_images[0].url);
        }
        if (input_images.length > 1) {
          setStyleRefImage(input_images[1].url);
          setStyleRefPreview(input_images[1].url);
        } else {
          setStyleRefImage(null);
          setStyleRefPreview(null);
        }
      }
      onConsumed?.();
    }
  }, [initialParams, onConsumed]);

  const handleRandomPrompt = () => {
    const random = RANDOM_MAP_PROMPTS[Math.floor(Math.random() * RANDOM_MAP_PROMPTS.length)];
    setPrompt(isZh ? random.zh : random.en);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRefImage(file);
      setRefPreview(URL.createObjectURL(file));
      setGridData(null);
    }
  };

  const handleRemoveRefImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefImage(null);
    setRefPreview(null);
    setGridData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStyleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStyleRefImage(file);
      setStyleRefPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveStyleRefImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStyleRefImage(null);
    setStyleRefPreview(null);
    if (styleFileInputRef.current) {
      styleFileInputRef.current.value = '';
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      onLoginRequest?.();
      return;
    }
    if (!refImage) {
      setError(isZh ? '请上传场景结构参考图' : 'Please upload a scene structure reference image');
      return;
    }
    if (!prompt.trim()) {
      setError(isZh ? '请输入场景描述' : 'Please enter scene description');
      return;
    }
    if (credits < 2) {
      onOpenPricing?.();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const images: string[] = [];

      let base64Str1: string;
      if (typeof refImage === 'string') {
        base64Str1 = await fetchAsDataUrl(refImage);
      } else {
        base64Str1 = await fileToBase64(refImage);
      }
      images.push(base64Str1);

      if (styleRefImage) {
        let base64Str2: string;
        if (typeof styleRefImage === 'string') {
          base64Str2 = await fetchAsDataUrl(styleRefImage);
        } else {
          base64Str2 = await fileToBase64(styleRefImage);
        }
        images.push(base64Str2);
      }
      
      const params: any = {
        prompt: prompt.trim(),
        style: artStyle,
        bg_style: bgStyle,
        bg_prompt: 'None',
      };

      if (gridData && gridData.length > 0) {
        params.grid_width = gridCols;
        params.grid_height = gridRows;
        params.grid_data = JSON.stringify(gridData);
      }

      if (useDomainColor) {
        params.domain_color = `[${domainColors.join(',')}]`;
      }

      const res = await apiService.generateMap(images, params);
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
          {/* Top Row: Map Description (Top Left) & Style Reference (Top Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Top Left: Map Description */}
            <div className="lg:col-span-2 flex">
              <PixelCard 
                title={isZh ? '地图描述' : 'MAP DESCRIPTION'} 
                titleStyle={{ fontSize: zhScale(10) }} 
                className="w-full flex flex-col"
              >
                <div className="relative pt-2 flex-1 flex flex-col">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isZh ? "描述你的场景，比如地面、天气、关卡元素等" : "Describe your scene, such as ground, weather, levels elements, etc."}
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

            {/* Top Right: Style Reference Image (Optional) */}
            <div className="flex">
              <PixelCard 
                title={isZh ? '风格参考图 (可选)' : 'STYLE REFERENCE (OPTIONAL)'} 
                titleStyle={{ fontSize: zhScale(10) }} 
                className="w-full flex flex-col"
              >
                <div className="pt-2 flex-1 flex flex-col justify-center">
                  <div 
                    onClick={() => styleFileInputRef.current?.click()}
                    className="w-full h-full min-h-[180px] bg-black/40 pixel-border border-2 border-[#5a2d9c] border-dashed hover:border-[#f7d51d] cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group"
                  >
                    {/* Retro Grid Background Overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#5a2d9c_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    
                    {styleRefPreview ? (
                      <div className="w-full h-full relative group/preview z-10 flex items-center justify-center bg-black/80 p-2">
                        <img 
                          src={styleRefPreview} 
                          className="w-full h-full object-contain" 
                          style={{ imageRendering: 'pixelated' }} 
                          alt="Style Reference Preview" 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity">
                          <Plus size={20} className="text-white" />
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveStyleRefImage}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white flex items-center justify-center pixel-border border-white z-[60] hover:bg-red-500 transition-colors shadow-lg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center z-10 space-y-2 select-none">
                        <Plus size={24} className="text-[#f7d51d]" />
                        <span className="font-bold text-white/60 uppercase tracking-wider leading-tight whitespace-pre-line" style={{ fontSize: zhScale(9) }}>
                          {isZh ? '上传风格参考图\n(点击或拖拽)' : 'UPLOAD STYLE REFERENCE\n(CLICK OR DRAG)'}
                        </span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={styleFileInputRef}
                      onChange={handleStyleFileChange}
                      accept="image/*"
                      className="hidden" 
                    />
                  </div>
                </div>
              </PixelCard>
            </div>
          </div>

          {/* Bottom Row: Structure Reference */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Bottom Left: Structure Reference (spans 2 columns, matching Map Description above) */}
            <div className="lg:col-span-2 flex">
              <PixelCard 
                title={isZh ? '结构参考图' : 'STRUCTURE REFERENCE'} 
                titleStyle={{ fontSize: zhScale(10) }} 
                className="w-full flex flex-col"
              >
                <div className="pt-2 flex-1 flex flex-col justify-center">
                  <div 
                    onClick={() => setIsEditorOpen(true)}
                    className="aspect-video w-full bg-black/40 pixel-border border-2 border-[#5a2d9c] border-dashed hover:border-[#f7d51d] cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group"
                  >
                    {/* Retro Grid Background Overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#5a2d9c_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'linear-gradient(to right, rgba(90,45,156,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(90,45,156,0.1) 1px, transparent 1px)',
                      backgroundSize: '24px 24px'
                    }}></div>
                    
                    {refPreview ? (
                      <div className="w-full h-full relative group/preview z-10 flex items-center justify-center bg-black/80 p-2">
                        <img 
                          src={refPreview} 
                          className="w-full h-full object-contain" 
                          style={{ imageRendering: 'pixelated' }} 
                          alt="Structure Reference Preview" 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
                          <Edit3 size={24} className="text-[#f7d51d]" />
                          <span className="font-bold text-white uppercase tracking-wider" style={{ fontSize: zhScale(10) }}>
                            {isZh ? '网格编辑器' : 'GRID EDITOR'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveRefImage}
                          className="absolute -top-3 -right-3 w-7 h-7 bg-red-600 text-white flex items-center justify-center pixel-border border-white z-[60] hover:bg-red-500 transition-colors shadow-lg"
                          title={isZh ? '清除结构' : 'Clear Structure'}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center z-10 space-y-2 select-none">
                        <Grid size={28} className="text-[#f7d51d]" />
                        <span className="font-bold text-white/80 uppercase tracking-wider" style={{ fontSize: zhScale(10) }}>
                          {isZh ? '网格编辑器' : 'GRID EDITOR'}
                        </span>
                      </div>
                    )}
                  </div>
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

              {/* Background Style */}
              <div className="space-y-2">
                <label className="font-bold text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '背景风格' : 'BACKGROUND STYLE'}
                </label>
                <div className="relative">
                  <select 
                    value={bgStyle}
                    onChange={(e) => setBgStyle(e.target.value)}
                    className="w-full bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
                    style={{ fontSize: zhScale(10) }}
                  >
                    {PRESET_BG_STYLES.map(bg => (
                      <option key={bg.id} value={bg.id}>{isZh ? bg.zh : bg.en}</option>
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
              <div className="p-3 bg-red-900/40 border border-red-500 text-red-200 uppercase text-center font-mono" style={{ fontSize: zhScale(9) }}>
                {error}
              </div>
            )}

            <PixelButton
              variant="primary"
              className="w-full h-14"
              onClick={handleGenerate}
              disabled={isBackendDown || loading}
              style={{ fontSize: 14 }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  <span>{isZh ? '正在生成中...' : 'GENERATING...'}</span>
                </div>
              ) : (
                'GENERATE (2 CREDITS)'
              )}
            </PixelButton>
          </div>

        </div>
      </div>

      {/* Structure Editor Modal */}
      <StructureEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={(data: StructureData) => {
          setGridCols(data.cols);
          setGridRows(data.rows);
          setGridData(data.gridData);
          setRefImage(data.dataUrl);
          setRefPreview(data.dataUrl);
        }}
        initialCols={gridCols}
        initialRows={gridRows}
        initialGridData={gridData}
        lang={lang}
      />
    </div>
  );
};

export default MapPage;
