
import React, { useState, useRef } from 'react';
import { PixelButton, PixelCard, PixelInput, PixelImage } from '../components/PixelComponents.tsx';
import { apiService } from '../services/apiService.ts';
import { processCharacterImage } from '../utils/imageUtils.ts';
import { Plus, Shuffle, Loader2, X, HelpCircle } from 'lucide-react';
import ColorPickerPopover from '../components/ColorPickerPopover.tsx';
import AnimatedSpritePreview from '../components/AnimatedSpritePreview.tsx';
import { FOUR_DIRECTION_TURN_ORDER } from '../utils/fourDirectionPlayback.ts';

interface CharacterPageProps {
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

const BODY_TYPES = [
  { id: 'None', en: 'None', zh: '无' },
  { id: 'Humanoid', en: 'Humanoid', zh: '人形' },
  { id: 'Non-humanoid', en: 'Non-humanoid', zh: '非人形' },
];

const RANDOM_PROMPTS = [
  { en: "A giant battle robot covered in scrap steel plates with a single glowing red eye", zh: "身披废弃钢板、独眼闪烁红光的巨型战斗机器人" },
  { en: "An Mind Flayer lord floating in the air, wearing ornate purple robes with tentacle whiskers", zh: "穿着华丽紫色长袍、长着触手胡须，漂浮空中的灵吸怪领主" },
  { en: "A dragon covered in frost crystals", zh: "浑身覆盖冰霜晶体的龙" },
  { en: "A slow-moving ancient rock treant with bioluminescent mushrooms growing on its back", zh: "背部长满荧光蘑菇、行动迟缓的古老岩石树精" },
  { en: "An ordinary office worker wearing a suit, tie, and glasses", zh: "穿西装打领带戴眼镜的普通上班族" },
  { en: "A gaunt ancient skeleton soldier holding a rusty bronze spear with both hands", zh: "双手拿着生锈铜色长枪、枯瘦的古老骷髅士兵" },
  { en: "A brave knight in silver armor with a blue cape", zh: "身披银甲、披着蓝色斗篷的勇敢骑士" },
  { en: "A mysterious forest elf with green robes and a wooden staff", zh: "穿着绿色长袍、手持木杖的神秘森林精灵" },
  { en: "A knight in golden armor holding a long spear, riding a white horse", zh: "身披黄金盔甲，手持长枪的骑士，骑着白马" },
  { en: "An ornate dark purple mimic chest, slightly opening its mouth to reveal sharp teeth and a long tongue", zh: "一个暗紫色精致宝箱怪，微微张开嘴露出尖牙和长长的舌头" },
  { en: "A silver-white knight riding a white horse", zh: "骑着白马的银白骑士" },
  { en: "A steam robot with a giant gear on its back", zh: "背着巨大齿轮的蒸汽机器人" },
  { en: "Ronin samurai wearing a bamboo hat and a cloak, with a katana hanging at his waist", zh: "戴着斗笠，穿着披风的浪人武士，腰间挂着太刀" },
  { en: "Noble lady wearing an elegant red and gold long dress, blonde curly hair, wearing a small top hat and leather shoes", zh: "穿着优雅红金相间长裙的贵族千金，金色卷发，头戴小礼帽，脚上穿小皮鞋" },
  { en: "Cute little orange cat, tail held very high", zh: "可爱小橘猫，尾巴翘的很高" },
  { en: "A dark purple mimic chest, slightly opening its mouth to reveal sharp teeth and a long tongue", zh: "一个暗紫色宝箱怪，微微张开嘴露出尖牙和长长的舌头" }
];

const EXAMPLES_BASE = "https://cdn.rika-ai.com/assets/frontpage/examples/";

const CHARACTER_EXAMPLES: Record<string, any[]> = {
  '32': [
    { id: 11, en: "Ronin samurai wearing a bamboo hat and a cloak, with a katana hanging at his waist", zh: "戴着斗笠，穿着披风的浪人武士，腰间挂着太刀", image: `${EXAMPLES_BASE}character11.png` },
    { id: 12, en: "Noble lady wearing an elegant red and gold long dress, blonde curly hair, wearing a small top hat and leather shoes", zh: "穿着优雅红金相间长裙的贵族千金，金色卷发，头戴小礼帽，脚上穿小皮鞋", image: `${EXAMPLES_BASE}character12.png` },
    { id: 13, en: "Cute little orange cat, tail held very high", zh: "可爱小橘猫，尾巴翘的很高", image: `${EXAMPLES_BASE}character13.png` },
    { id: 14, en: "A dark purple mimic chest, slightly opening its mouth to reveal sharp teeth and a long tongue", zh: "一个暗紫色宝箱怪，微微张开嘴露出尖牙和长长的舌头", image: `${EXAMPLES_BASE}character14.png` }
  ],
  '64': [
    { id: 5, en: "A gaunt ancient skeleton soldier holding a rusty bronze spear with both hands", zh: "双手拿着生锈铜色长枪、枯瘦的古老骷髅士兵", image: `${EXAMPLES_BASE}character5.png` },
    { id: 6, en: "A Mind Flayer lord floating in the air, wearing ornate purple robes with tentacle whiskers", zh: "穿着华丽紫色长袍、长着触手胡须，漂浮空中的灵吸怪领主", image: `${EXAMPLES_BASE}character6.png` },
    { id: 8, en: "An ornate dark purple mimic chest, slightly opening its mouth to reveal sharp teeth and a long tongue", zh: "一个暗紫色精致宝箱怪，微微张开嘴露出尖牙和长长的舌头", image: `${EXAMPLES_BASE}character8.png` }
  ],
  '128': [
    { id: 7, en: "A knight in golden armor holding a long spear, riding a white horse", zh: "身披黄金盔甲，手持长枪的骑士，骑着白马", image: `${EXAMPLES_BASE}character7.png` }
  ]
};

const TEMPLATE_VALUES = {
  race: {
    en: ["Human", "Elf", "Orc", "Dragon", "Ghost", "Future Soldier", "Robot", "Monster"],
    zh: ["人类", "精灵", "兽人", "龙", "幽灵", "未来战士", "机器人", "怪兽"]
  },
  body: {
    en: ["Normal", "Giant", "Fat", "Thin", "Tall and thin"],
    zh: ["普通", "庞大", "肥硕", "瘦弱", "高瘦"]
  },
  clothing: {
    en: ["Cloak", "Metal Armor", "Mechanical Armor", "Robe", "Scrap Steel Plates", "Chest", "Bioluminescent Mushrooms", "Frost Crystals", "Fire", "Hell Lava"],
    zh: ["斗篷", "金属盔甲", "机械铠甲", "长袍", "废弃钢板", "宝箱", "荧光蘑菇", "冰霜结晶", "火焰", "地狱岩浆"]
  },
  weapon: {
    en: ["Unarmed", "Trap", "Wooden Staff", "Spear", "Giant Axe", "Bone Club", "Silver Sword", "Dragon Cannon", "Giant Shield", "Laser Gun", "Chainsaw", "Briefcase"],
    zh: ["空手", "圈套", "木制法杖", "长枪", "巨斧", "骨头大棒", "银色长剑", "龙头大炮", "巨大盾牌", "激光枪", "机械电锯", "公文包"]
  }
};

const CharacterPage: React.FC<CharacterPageProps> = ({ 
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
  const [characterMode, setCharacterMode] = useState<'side_view' | 'four_direction'>('side_view');
  const [cameraView, setCameraView] = useState<'level' | 'overhead'>('level');
  const [artStyle, setArtStyle] = useState('None');
  const [bodyType, setBodyType] = useState('None');
  const [useDomainColor, setUseDomainColor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [colorInputKey, setColorInputKey] = useState(0);
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);
  const colorSwatchRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [template, setTemplate] = useState({
    race: '',
    body: '',
    clothing: '',
    weapon: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => `${isZh ? enSize + 3 : enSize}px`;

  const currentExample = React.useMemo(() => {
    if (characterMode === 'four_direction') {
      const suffix = cameraView === 'overhead' ? '_overhead' : '';
      return {
        en: pixelSize === '64' ? 'A silver-haired medieval adventurer in gray armor, navy clothing and brown boots'
          : 'A bald humanoid character wearing a gray-white sleeveless top and shorts, barefoot',
        zh: pixelSize === '64' ? '银发中世纪冒险者，身穿灰色护甲、深蓝衣服和棕色靴子'
          : '光头人形角色，穿灰白色无袖上衣和短裤，赤脚',
        image: `https://cdn.rika-ai.com/assets/references/character_ref_${pixelSize}_2_rpg4${suffix}.png`,
      };
    }
    const lookupKey = pixelSize === '256' ? '128' : (pixelSize === '128' ? '64' : '32');
    const examples = CHARACTER_EXAMPLES[lookupKey] || CHARACTER_EXAMPLES['64'];
    const idx = exampleIndex >= examples.length ? 0 : exampleIndex;
    return examples[idx];
  }, [pixelSize, exampleIndex, characterMode, cameraView]);

  React.useEffect(() => {
    const lookupKey = pixelSize === '256' ? '128' : (pixelSize === '128' ? '64' : '32');
    const examples = CHARACTER_EXAMPLES[lookupKey] || CHARACTER_EXAMPLES['64'];
    setExampleIndex(Math.floor(Math.random() * examples.length));
  }, [pixelSize]);

  React.useEffect(() => {
    if (initialParams && initialParams.job_type === 'character' && !initialParams.action) {
      const { input_params, input_images } = initialParams;
      if (input_params) {
        setPrompt(input_params.prompt || '');
        const fourDirection = input_params.character_mode === 'four_direction';
        setCharacterMode(fourDirection ? 'four_direction' : 'side_view');
        const size = String(input_params.pixel_size || '128');
        setPixelSize(fourDirection && !['64', '128'].includes(size) ? '128' : size);
        setCameraView(input_params.camera_view === 'overhead' ? 'overhead' : 'level');
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
        style: artStyle,
        version: '2'
      };
      if (characterMode === 'four_direction') {
        params.character_mode = characterMode;
        params.camera_view = cameraView;
      }

      if (bodyType !== 'None') {
        params.body_type = bodyType;
        const bodyText = bodyType === 'Humanoid' ? "The character is humanoid" : "The character is non-humanoid";
        params.prompt = params.prompt ? `${params.prompt}. ${bodyText}` : bodyText;
      }
      
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
    <div className="ui-page max-w-6xl mx-auto py-6 md:py-8 px-1 md:px-4">
      <PixelCard title={isZh ? '角色模式' : 'CHARACTER MODE'} titleStyle={{ fontSize: zhScale(10) }} className="model-selection-card mb-6">
        <div className="animation-version-switch" role="group" aria-label={isZh ? '角色模式' : 'Character mode'}>
          <button type="button" disabled={loading} aria-pressed={characterMode === 'side_view'}
            className={characterMode === 'side_view' ? 'is-active' : ''}
            onClick={() => { setCharacterMode('side_view'); setError(null); }}>
            <span className="version-button-label">{isZh ? '横板' : 'SIDE VIEW'}</span>
          </button>
          <button type="button" disabled={loading} aria-pressed={characterMode === 'four_direction'}
            className={characterMode === 'four_direction' ? 'is-active' : ''}
            onClick={() => {
              setCharacterMode('four_direction');
              if (!['64', '128'].includes(pixelSize)) setPixelSize('128');
              setError(null);
            }}>
            <span className="version-button-label">{isZh ? '四方向' : 'FOUR DIRECTIONS'}</span>
          </button>
        </div>
      </PixelCard>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 flex">
              <PixelCard title={isZh ? '角色描述' : 'CHARACTER DESCRIPTION'} titleStyle={{ fontSize: zhScale(10) }} className="w-full flex flex-col">
                <div className="relative pt-2 flex-1 flex flex-col">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isZh ? "描述你的角色，比如衣着，身材，武器等" : "Describe your character, such as clothing, body type, weapons, etc."}
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
                    {characterMode === 'four_direction' ? <AnimatedSpritePreview
                      lang={lang} animationSrc={currentExample.image} frameCount={4} columns={2}
                      fps={4} playbackOrder={FOUR_DIRECTION_TURN_ORDER} alt="Four-direction character example"
                      className="h-full" maxHeight={512} /> : <PixelImage
                      src={currentExample.image} 
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'pixelated' }}
                      alt="Example"
                    />}
                  </div>
                  <p className="text-white/60 leading-relaxed text-[9px] uppercase">
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
                    {characterMode === 'side_view' && <option value="256">256</option>}
                  </select>
                </div>
              </div>

              {characterMode === 'four_direction' && <div className="space-y-2">
                <label htmlFor="character-camera-view" className="font-bold text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '视角' : 'CAMERA VIEW'}
                </label>
                <select id="character-camera-view" value={cameraView}
                  onChange={event => setCameraView(event.target.value as 'level' | 'overhead')}
                  className="w-full bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
                  style={{ fontSize: zhScale(10) }}>
                  <option value="level">{isZh ? '平视' : 'LEVEL'}</option>
                  <option value="overhead">{isZh ? '俯视' : 'OVERHEAD'}</option>
                </select>
              </div>}

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

              {/* Body Type */}
              <div className="space-y-2">
                <label className="font-bold text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '体型' : 'BODY TYPE'}
                </label>
                <div className="relative">
                  <select 
                    value={bodyType}
                    onChange={(e) => setBodyType(e.target.value)}
                    className="w-full bg-black/40 pixel-border border-[#5a2d9c] p-2 text-white outline-none appearance-none cursor-pointer"
                    style={{ fontSize: zhScale(10) }}
                  >
                    {BODY_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{isZh ? type.zh : type.en}</option>
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
                      <div key={i} ref={node => { colorSwatchRefs.current[i] = node; }} className="relative w-10 h-10 pixel-border border-2 border-[#5a2d9c] bg-black/40 overflow-hidden cursor-pointer" onClick={() => setActiveColorIndex(i)}>
                        <div className="absolute inset-0" style={{ backgroundColor: color }}></div>
                      </div>
                    ))}

                    {activeColorIndex !== null && (
                      <ColorPickerPopover anchor={colorSwatchRefs.current[activeColorIndex]} placement="below"
                        color={domainColors[activeColorIndex]} onChange={(color) => handleColorChange(activeColorIndex, color)}
                        onClose={() => setActiveColorIndex(null)} lang={lang} />
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
              style={{ fontSize: zhScale(14) }}
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

export default CharacterPage;
