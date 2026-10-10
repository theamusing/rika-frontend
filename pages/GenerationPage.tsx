
import React, { useState, useEffect, useRef } from 'react';
import { PixelButton, PixelCard, PixelInput, PixelModal, PixelImage } from '../components/PixelComponents.tsx';
import { processImage, unprocessImage, getPaletteSourceImageData } from '../utils/imageUtils.ts';
import { apiService } from '../services/apiService.ts';
import { MOTION_TYPES, PIXEL_SIZES } from '../constants.ts';
import { AnimationV2Params, AnimationVersion, GenerationParams, MotionType, PaddingOffsets, PixelDimensions, PixelSize } from '../types.ts';
import PaddingEditorV2 from '../components/PaddingEditorV2.tsx';
import { constrainPadding, EMPTY_PADDING, paddedDimensions, processImageV2, removePaddingV2, snapPixelSize } from '../utils/animationV2.ts';
import { extractCentroids, RGB } from '../utils/editorUtils.ts';
import { HelpCircle } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { getSpriteFromCache } from '../utils/dbUtils.ts';

interface GenerationPageProps {
  onJobCreated: (id: string) => void;
  initialVersion?: AnimationVersion;
  onGenerateImage?: () => void;
  initialParams?: any;
  onConsumed?: () => void;
  refreshCredits: () => void;
  credits: number;
  onOpenPricing?: () => void;
  lang?: 'en' | 'zh';
  isBackendDown?: boolean;
  isLoggedIn?: boolean;
  onLoginRequest?: () => void;
}

const CDN_BASE = "https://cdn.rika-ai.com/assets/frontpage/";

const DEFAULT_PROMPTS: Record<MotionType, string> = {
  idle: 'side-view, 2D game character idle animation, body slightly sways.',
  walk: 'side-view, 2D game character walks forward.',
  run: 'side-view, 2D game character runs forward.',
  jump: 'side-view, 2D game character jumps in place,takeoff then fall',
  attack: 'side-view, 2D game character raises weapon to perform a powerful strike forward.',
  hit: 'side-view, 2D game character getting hit and knocked backward.',
  defeated: 'side-view 2D game character getting hit, kneel down and fall to the ground, lying motionlessly'
};

const V2_FRAME_OPTIONS = [16, 20, 24, 32] as const;
const nearestV2FrameCount = (value: number) => V2_FRAME_OPTIONS.reduce((best, option) =>
  Math.abs(option - value) < Math.abs(best - value) ? option : best, 24);
const nearestPixelPreset = (value: number): PixelSize => (PIXEL_SIZES as PixelSize[]).reduce<PixelSize>((best, option) =>
  Math.abs(Number(option) - value) < Math.abs(Number(best) - value) ? option : best, '128');

const GenerationPage: React.FC<GenerationPageProps> = ({ 
  onJobCreated, 
  initialVersion = 'v1',
  onGenerateImage,
  initialParams, 
  onConsumed, 
  refreshCredits, 
  credits, 
  onOpenPricing,
  lang = 'en',
  isBackendDown = false,
  isLoggedIn = false,
  onLoginRequest
}) => {
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [sourceFiles, setSourceFiles] = useState<(File | string | null)[]>([null, null, null]);
  const [flipStates, setFlipStates] = useState<boolean[]>([false, false, false]);
  const [expandImages, setExpandImages] = useState(false);
  const [loopAnimation, setLoopAnimation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usePadding, setUsePadding] = useState(false);
  const [paddingPosition, setPaddingPosition] = useState<'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'>('mc');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [forcedScaleFactor, setForcedScaleFactor] = useState<number | null>(null);
  const [colorInputKey, setColorInputKey] = useState(0);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [generationVersion, setGenerationVersion] = useState<AnimationVersion>(initialVersion);
  const [v2PixelChoice, setV2PixelChoice] = useState<PixelSize>('128');
  const [v2Size, setV2Size] = useState<PixelDimensions>({ x: 128, y: 128 });
  const [v2Padding, setV2Padding] = useState<PaddingOffsets>({ ...EMPTY_PADDING });
  const [v2Length, setV2Length] = useState(24);
  const [aiExpand, setAiExpand] = useState(true);
  const [paddingPreviewImage, setPaddingPreviewImage] = useState<string | null>(null);
  const [imagesProcessing, setImagesProcessing] = useState(false);

  const [uiLength, setUiLength] = useState(12);
  const [paletteSource, setPaletteSource] = useState<ImageData | null>(null);
  const [centroids, setCentroids] = useState<RGB[]>([]);
  const [fullProcessedImages, setFullProcessedImages] = useState<(string | null)[]>([null, null, null]);

  const [params, setParams] = useState<GenerationParams>({
    prompt: DEFAULT_PROMPTS['idle'],
    motion_type: 'idle',
    pixel_size: '128',
    noise_strength: 0.6,
    seed: Math.floor(Math.random() * 1000000),
    use_mid_image: false,
    use_end_image: false,
    scale_factor: 4, 
    fix_seed: false,
    length: 25,
    use_padding: false,
    use_quantization: false,
    quantization_colors: 32,
    bg_color: '#004040',
    attack_type: 'melee'
  });

  const [localColorCount, setLocalColorCount] = useState(params.quantization_colors || 32);

  useEffect(() => {
    setLocalColorCount(params.quantization_colors || 32);
  }, [params.quantization_colors]);

  const userHasEditedPrompt = useRef(false);
  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => `${isZh ? enSize + 3 : enSize}px`;
  const isV2 = generationVersion === 'v2';
  const originalCreditsCost = isV2 ? 8 : 5;
  const creditsCost = isV2 ? 6 : 4;
  const actualPadding = usePadding ? constrainPadding(v2Size, v2Padding) : EMPTY_PADDING;
  const v2CanvasSize = paddedDimensions(v2Size, actualPadding);
  const paddingPositions = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'] as const;
  const paddingPositionLabels: Record<(typeof paddingPositions)[number], string> = {
    tl: isZh ? '左上' : 'TOP LEFT',
    tc: isZh ? '上方' : 'TOP',
    tr: isZh ? '右上' : 'TOP RIGHT',
    ml: isZh ? '左侧' : 'LEFT',
    mc: isZh ? '居中' : 'CENTER',
    mr: isZh ? '右侧' : 'RIGHT',
    bl: isZh ? '左下' : 'BOTTOM LEFT',
    bc: isZh ? '下方' : 'BOTTOM',
    br: isZh ? '右下' : 'BOTTOM RIGHT',
  };

  const changeV2Size = (size: PixelDimensions) => {
    setV2Size(size);
    setV2Padding(current => constrainPadding(size, current));
  };

  useEffect(() => {
    if (!initialParams && !isV2) {
      const isAttack = params.motion_type === 'attack';
      const isDefeated = params.motion_type === 'defeated';
      const isJump = params.motion_type === 'jump';
      
      const defaultUiLength = (isAttack || isDefeated) ? 16 : 12;
      setUiLength(defaultUiLength);

      setParams(prev => {
        const nextParams = { ...prev, length: 2 * defaultUiLength + 1 };
        
        const attackPrompts = [
          DEFAULT_PROMPTS['attack'],
          'side-view, 2D game character points his weapon forward and shoot a powerful bullet.',
          '[describe the attack]'
        ];
        
        const currentIsStandardDefault = Object.values(DEFAULT_PROMPTS).includes(prev.prompt) || attackPrompts.includes(prev.prompt);
        
        if (prev.prompt === '' || currentIsStandardDefault || !userHasEditedPrompt.current) {
          if (isAttack) {
            const aType = prev.attack_type || 'melee';
            if (aType === 'ranged') {
              nextParams.prompt = 'side-view, 2D game character points his weapon forward and shoot a powerful bullet.';
              nextParams.noise_strength = 0.3;
            } else if (aType === 'other') {
              nextParams.prompt = '[describe the attack]';
              nextParams.noise_strength = 0.3;
            } else {
              nextParams.prompt = DEFAULT_PROMPTS['attack'];
              nextParams.noise_strength = 0.6;
            }
          } else {
            nextParams.prompt = DEFAULT_PROMPTS[prev.motion_type];
            // Reset strengths to default if not attack
            nextParams.noise_strength = 0.6;
          }
        }
        return nextParams;
      });
    }
  }, [params.motion_type, params.attack_type, initialParams, isV2]);

  useEffect(() => {
    if (!isV2 && (loopAnimation || params.use_mid_image || params.use_end_image)) {
      setUiLength(16);
    }
  }, [loopAnimation, params.use_mid_image, params.use_end_image, isV2]);

  useEffect(() => {
    let cancelled = false;
    setImagesProcessing(true);
    const reprocessAll = async () => {
      let changed = false;
      let fullChanged = false;
      let processingError = '';
      const newImages = [...images];
      const newFullImages = [...fullProcessedImages];
      
      for (let i = 0; i < sourceFiles.length; i++) {
        const source = sourceFiles[i];
        if (source) {
          try {
            if (isV2) {
              const result = await processImageV2(source, v2Size,
                usePadding ? constrainPadding(v2Size, v2Padding) : EMPTY_PADDING,
                flipStates[i], params.bg_color || '#004040', params.use_quantization,
                params.quantization_colors, centroids);
              if (cancelled) return;
              newImages[i] = result.previewImage;
              newFullImages[i] = result.image;
              changed = fullChanged = true;
              if (i === 0) setPaddingPreviewImage(result.contentImage);
              continue;
            }
            // Process for display (downscaled)
            const displayB64 = await processImage(
              source, 
              usePadding, 
              flipStates[i], 
              params.pixel_size, 
              params.bg_color,
              params.use_quantization,
              params.quantization_colors,
              centroids,
              true,
              forcedScaleFactor || undefined,
              paddingPosition
            );
            
            // Process for backend (full size)
            const fullB64 = await processImage(
              source, 
              usePadding, 
              flipStates[i], 
              params.pixel_size, 
              params.bg_color,
              params.use_quantization,
              params.quantization_colors,
              centroids,
              false,
              forcedScaleFactor || undefined,
              paddingPosition
            );

            if (newImages[i] !== displayB64) {
              newImages[i] = displayB64;
              changed = true;
            }
            if (newFullImages[i] !== fullB64) {
              newFullImages[i] = fullB64;
              fullChanged = true;
            }
          } catch (err: any) {
            console.error(`[IMAGE PROCESSOR] Error at index ${i}:`, err);
            processingError = err.message || "Asset processing failed.";
            newImages[i] = newFullImages[i] = null;
            changed = fullChanged = true;
          }
        } else {
          if (newImages[i] !== null) {
            newImages[i] = null;
            changed = true;
          }
          if (newFullImages[i] !== null) {
            newFullImages[i] = null;
            fullChanged = true;
          }
        }
      }
      
      if (cancelled) return;
      if (!sourceFiles[0]) setPaddingPreviewImage(null);
      if (changed) setImages(newImages);
      if (fullChanged) setFullProcessedImages(newFullImages);
      if (processingError) {
        setError(processingError);
      } else if (error && (error.includes("Asset") || error.includes("CORS"))) {
        setError('');
      }
      setImagesProcessing(false);
    };
    reprocessAll();
    return () => { cancelled = true; };
  }, [usePadding, paddingPosition, sourceFiles, flipStates, params.pixel_size, params.bg_color, params.use_quantization, params.quantization_colors, centroids, forcedScaleFactor, isV2, v2Size, v2Padding]);

  // Update palette source when start image changes
  useEffect(() => {
    const updatePaletteSource = async () => {
      if (sourceFiles[0]) {
        try {
          const imgData = await getPaletteSourceImageData(sourceFiles[0]);
          setPaletteSource(imgData);
        } catch (err) {
          console.error("Failed to get palette source:", err);
        }
      } else {
        setPaletteSource(null);
      }
    };
    updatePaletteSource();
  }, [sourceFiles[0]]);

  // Update centroids when palette source or color count changes
  useEffect(() => {
    if (paletteSource && params.use_quantization) {
      const newCentroids = extractCentroids(paletteSource, params.quantization_colors || 32);
      setCentroids(newCentroids);
    } else {
      setCentroids([]);
    }
  }, [paletteSource, params.quantization_colors, params.use_quantization]);

  useEffect(() => {
    const loadInitial = async () => {
      if (!initialParams) return;
      
      // Handle 'animate' action from character/item job
      if (initialParams.action === 'animate' && (initialParams.job_type === 'character' || initialParams.job_type === 'item')) {
        setGenerationVersion('v1');
        const job = initialParams;
        const jobParams = job.input_params;
        const outputImgs = job.output_images || [];
        
        const sourcePixelSize = parseInt(jobParams.pixel_size || "128");
        const version = parseInt(jobParams.version || "1");
        let targetPixelSize: PixelSize = "128";
        if (version === 2) {
          targetPixelSize = String(sourcePixelSize) as PixelSize;
        } else {
          if (sourcePixelSize === 32) {
            targetPixelSize = "64";
          } else {
            targetPixelSize = "128";
          }
        }

        setParams({ 
          ...params, 
          pixel_size: targetPixelSize,
          use_quantization: false,
          quantization_colors: 32
        });
        
        let initialImageUrl = outputImgs.length > 0 ? outputImgs[0].url : null;
        try {
          const cached = await getSpriteFromCache(job.gen_id);
          if (cached && cached.spriteSheet) {
            initialImageUrl = cached.spriteSheet;
          }
        } catch (err) {
          console.error("Failed to fetch cached sprite for animation", err);
        }

        if (initialImageUrl) {
          setSourceFiles([initialImageUrl, null, null]);
          setFlipStates([false, false, false]);
        }
        onConsumed?.();
        return;
      }

      const job = initialParams;
      const jobParams = job.input_params;
      const inputImgs = job.input_images || [];
      if (job.animation_version === 2 || jobParams.animation_version === 2) {
        const canvas = jobParams.pixel_size;
        const storedPadding = { ...EMPTY_PADDING, ...jobParams.padding };
        const content = jobParams.content_pixel_size || {
          x: canvas.x - storedPadding.left - storedPadding.right,
          y: canvas.y - storedPadding.top - storedPadding.bottom,
        };
        const size = { x: snapPixelSize(content.x), y: snapPixelSize(content.y) };
        const padding = constrainPadding(size, storedPadding);
        setGenerationVersion('v2');
        const preset = nearestPixelPreset(Math.max(size.x, size.y));
        const presetSize = { x: Number(preset), y: Number(preset) };
        setV2Size(presetSize);
        setV2Padding(constrainPadding(presetSize, padding));
        setV2PixelChoice(preset);
        setV2Length(nearestV2FrameCount(jobParams.output_frames || 24));
        setAiExpand(jobParams.ai_expand !== false);
        setUsePadding(jobParams.use_padding === true || Object.values(padding).some(value => value > 0));
        setParams(prev => ({ ...prev, prompt: jobParams.prompt || '', seed: jobParams.seed ?? prev.seed,
          fix_seed: jobParams.fix_seed || false, bg_color: jobParams.bg_color || prev.bg_color,
          use_mid_image: jobParams.use_mid_image ?? inputImgs.length === 3,
          use_end_image: jobParams.use_end_image ?? inputImgs.length >= 2, use_quantization: false }));
        const files: (File | string | null)[] = [null, null, null];
        try {
          const urls = await Promise.all(inputImgs.map((entry: { url: string }) => (jobParams.use_padding === true || Object.values(padding).some(value => value > 0))
            ? removePaddingV2(entry.url, size, padding) : Promise.resolve(entry.url)));
          files[0] = urls[0] || null;
          if (urls.length === 3) { files[1] = urls[2]; files[2] = urls[1]; }
          else if (urls.length === 2) files[2] = urls[1];
          setSourceFiles(files);
          setFlipStates([false, false, false]);
          setExpandImages(urls.length > 1);
          setLoopAnimation(false);
        } catch (err: any) { setError(err.message || 'History Load Error'); }
        userHasEditedPrompt.current = true;
        onConsumed?.();
        return;
      }
      setGenerationVersion('v1');
      const apiLength = jobParams.length || 25;
      const calculatedUiLength = (apiLength - 1) / 2;
      setUiLength(calculatedUiLength);
      const wasPadded = jobParams.use_padding === true;
      setUsePadding(wasPadded);
      const loadedPaddingPos = jobParams.padding_position || 'mc';
      setPaddingPosition(loadedPaddingPos);
      const loadedPixelSize = String(parseInt(jobParams.pixel_size || "128")) as PixelSize;
      const loadedScaleFactor = jobParams.scale_factor;
      
      if (wasPadded && loadedPixelSize === "256") {
        setForcedScaleFactor(loadedScaleFactor);
      } else {
        setForcedScaleFactor(null);
      }

      setParams({ 
        ...params, 
        ...jobParams, 
        noise_strength: jobParams.noise_strength ?? jobParams.strength_high ?? jobParams.strength_low ?? params.noise_strength,
        pixel_size: loadedPixelSize,
        use_quantization: false,
        quantization_colors: 32
      });
      userHasEditedPrompt.current = true;
      const newFiles: (File | string | null)[] = [null, null, null];
      if (inputImgs.length > 0) {
        const processUrl = async (url: string) => wasPadded ? await unprocessImage(url, loadedPixelSize, loadedScaleFactor, jobParams.padding_position || 'mc') : url;
        try {
          newFiles[0] = await processUrl(inputImgs[0].url);
          let nextIdx = 1;
          if (jobParams.use_mid_image && inputImgs[nextIdx]) {
            newFiles[1] = await processUrl(inputImgs[nextIdx].url);
            nextIdx++;
            setExpandImages(true);
          }
          if (jobParams.use_end_image && inputImgs[nextIdx]) {
            newFiles[2] = await processUrl(inputImgs[nextIdx].url);
            setExpandImages(true);
          }
          if (newFiles[0] === newFiles[2] && jobParams.use_end_image) {
            setLoopAnimation(true);
          }
          setSourceFiles(newFiles);
          setFlipStates([false, false, false]);
        } catch (err: any) {
          console.error("Failed to unprocess historical images:", err);
          setError("History Load Error: " + (err.message || "CORS restriction"));
        }
      }
      onConsumed?.();
    };
    loadInitial();
  }, [initialParams, onConsumed]);

  const handleImageUpload = (index: number, file: File) => {
    const newFiles = [...sourceFiles];
    newFiles[index] = file;
    if (index === 0 && loopAnimation) newFiles[2] = file;
    setSourceFiles(newFiles);
    
    if (index === 1) {
      setParams(prev => ({ ...prev, use_mid_image: true, ...(isV2 ? { use_end_image: true } : {}) }));
    } else if (index === 2) {
      setParams(prev => ({ ...prev, use_end_image: true }));
    }
  };

  const handleFlipToggle = (index: number) => {
    const newFlips = [...flipStates];
    newFlips[index] = !newFlips[index];
    setFlipStates(newFlips);
  };

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      onLoginRequest?.();
      return;
    }
    if (!fullProcessedImages[0]) { setError("Start Image is required!"); return; }
    if (credits < creditsCost) { setShowCreditModal(true); setError(`INSUFFICIENT CREDITS: ${creditsCost} credits required.`); return; }
    if (imagesProcessing) return;
    setError('');
    setLoading(true);
    try {
      if (isV2) {
        if (!params.prompt.trim()) throw new Error(isZh ? '请输入动作提示词。' : 'Enter an action prompt.');
        const useMid = expandImages && params.use_mid_image;
        const useEnd = expandImages && params.use_end_image;
        if (useMid && (!useEnd || !fullProcessedImages[1] || !fullProcessedImages[2])) {
          throw new Error(isZh ? 'V2 中间参考图需要同时提供结尾图。' : 'V2 middle reference requires both middle and ending images.');
        }
        if (useEnd && !fullProcessedImages[2]) throw new Error(isZh ? '请上传结尾图。' : 'Upload the ending image.');
        // Wan V2 canonical order: first, last, middle.
        const payloadImages = [fullProcessedImages[0] as string];
        if (useEnd) payloadImages.push(fullProcessedImages[2] as string);
        if (useMid) payloadImages.push(fullProcessedImages[1] as string);
        const finalParams: AnimationV2Params = {
          prompt: params.prompt, pixel_size: v2CanvasSize,
          padding: { ...actualPadding },
          ai_expand: aiExpand,
          seed: params.fix_seed ? params.seed : Math.floor(Math.random() * 1000000),
          output_frames: v2Length,
          color_count: params.use_quantization ? params.quantization_colors || 32 : 64,
        };
        const res = await apiService.generateV2(payloadImages, finalParams);
        refreshCredits();
        onJobCreated(res.gen_id);
        return;
      }
      const payloadImages: string[] = [];
      const finalParams = { ...params };
      if (!finalParams.prompt.trim()) finalParams.prompt = DEFAULT_PROMPTS[params.motion_type];
      finalParams.length = 2 * uiLength + 1;
      finalParams.use_padding = usePadding;
      finalParams.padding_position = paddingPosition;
      const pixelInt = parseInt(params.pixel_size);
      if (usePadding) {
        if (forcedScaleFactor) {
          finalParams.scale_factor = forcedScaleFactor;
        } else if (pixelInt === 256) {
          finalParams.scale_factor = 2;
        } else if (pixelInt === 32) {
          finalParams.scale_factor = 12; // 32 * 12 = 384
        } else {
          finalParams.scale_factor = 384 / pixelInt;
        }
      } else {
        if (pixelInt === 32 || pixelInt === 64) {
          finalParams.scale_factor = 512 / pixelInt;
        } else {
          finalParams.scale_factor = 768 / pixelInt;
        }
      }
      if (!params.fix_seed) finalParams.seed = Math.floor(Math.random() * 1000000);
      payloadImages.push(fullProcessedImages[0] as string);
      if (expandImages) {
        if (params.use_mid_image && fullProcessedImages[1]) payloadImages.push(fullProcessedImages[1]);
        else finalParams.use_mid_image = false;
        if (params.use_end_image && fullProcessedImages[2]) payloadImages.push(fullProcessedImages[2]);
        else finalParams.use_end_image = false;
      } else {
        finalParams.use_mid_image = false;
        finalParams.use_end_image = false;
      }
      const res = await apiService.generate(payloadImages, finalParams);
      refreshCredits();
      onJobCreated(res.gen_id);
    } catch (err: any) {
      if (err.message && (err.message.includes("Insufficient credits") || err.message.includes("402"))) {
        setShowCreditModal(true);
        setError("INSUFFICIENT CREDITS");
      } else { setError(err.message || 'Generation failed'); }
    } finally { setLoading(false); }
  };

  const onPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    userHasEditedPrompt.current = true;
    setParams({ ...params, prompt: e.target.value });
  };

  return (
    <div className="ui-page grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      <PixelModal 
        isOpen={showCreditModal} 
        onClose={() => setShowCreditModal(false)} 
        title={isZh ? '系统提示：积分不足' : 'SYSTEM ALERT: LOW CREDITS'}
        closeLabel={isZh ? '关闭' : 'CLOSE'}
      >
        <div className="space-y-4 text-center">
          <p className="text-[12px] leading-relaxed text-white">
            {isZh ? '本次操作需要' : 'THIS OPERATION REQUIRES'} <br /> <span className="text-[#f7d51d] font-bold">{creditsCost} {isZh ? '积分' : 'CREDITS'}</span>
          </p>
          <div className="p-3 bg-black/40 pixel-border border-[#5a2d9c]">
            <p className="text-[10px] opacity-70 mb-1 uppercase text-white/60">{isZh ? '当前余额' : 'CURRENT BALANCE'}</p>
            <p className="text-xl font-bold text-[#f7d51d]">{credits}</p>
          </div>
          <p className="text-[8px] opacity-50 uppercase leading-tight text-white/40">
            {isZh ? '请充值账户以继续生成。' : 'PLEASE TOP UP YOUR ACCOUNT TO ACQUIRE MORE CREDITS.'}
          </p>
          <div className="pt-2">
            <PixelButton 
              variant="primary" 
              className="w-full h-12" 
              disabled={isBackendDown}
              onClick={() => {
                setShowCreditModal(false);
                onOpenPricing?.();
              }}
            >
              {isBackendDown ? (isZh ? '维护中' : 'MAINTENANCE') : (isZh ? '购买积分' : 'BUY CREDITS')}
            </PixelButton>
          </div>
        </div>
      </PixelModal>

      <div className="lg:col-span-2 space-y-6">
        <PixelCard title={isZh ? '模型选择' : 'MODEL SELECTION'} titleStyle={{ fontSize: zhScale(10) }} className="model-selection-card">
          <div className="animation-version-switch" role="group">
            <button type="button" disabled={loading} aria-pressed={generationVersion === 'v1'}
              className={generationVersion === 'v1' ? 'is-active' : ''}
              onClick={() => {
                if (generationVersion === 'v2') {
                  setParams(current => ({ ...current, pixel_size: v2PixelChoice }));
                }
                setGenerationVersion('v1');
                setError('');
              }}>
              <span className="version-button-label">V1</span>
            </button>
            <button type="button" disabled={loading} aria-pressed={generationVersion === 'v2'}
              className={generationVersion === 'v2' ? 'is-active' : ''}
              onClick={() => {
                if (generationVersion === 'v1') {
                  const inheritedSize = params.pixel_size;
                  setV2PixelChoice(inheritedSize);
                  changeV2Size({ x: Number(inheritedSize), y: Number(inheritedSize) });
                }
                setGenerationVersion('v2');
                setError('');
              }}>
              <span className="version-button-label">
                V2
                <span className="version-help-inline group">
                  <HelpCircle size={12} />
                  <span className="version-help-tooltip">
                    {isZh ? '新版动画模型，支持复杂动画和更长动画帧数。' : 'New animation model for complex actions and longer animations.'}
                  </span>
                </span>
              </span>
              <span className="version-new-badge">NEW</span>
            </button>
          </div>
        </PixelCard>
        <PixelCard title={isZh ? "参考图" : "REFERENCE IMAGES"} titleStyle={{ fontSize: zhScale(10) }}>
          <div className="flex flex-col gap-4">
            <div className={`grid gap-4 ${expandImages ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
              {[0, 1, 2].map((idx) => {
                if (!expandImages && idx > 0) return null;
                const label = idx === 0 ? (isZh ? "起始图" : "START") : idx === 1 ? (isZh ? "中间图" : "MID") : (isZh ? "结尾图" : "END");
                return (
                  <div key={idx} className="space-y-2">
                    <p className="text-[10px] text-center text-white/60 uppercase">{label}</p>
                    <div className={`relative aspect-square pixel-border border-[#5a2d9c] bg-black/20 flex items-center justify-center overflow-hidden ${!expandImages ? 'max-w-md mx-auto w-full' : ''}`}>
                      {/* Placeholder Background for Start Image when not expanded */}
                      {!expandImages && idx === 0 && (
                        <div className="absolute inset-0 pointer-events-none opacity-10 grayscale">
                          <PixelImage 
                            src={`${CDN_BASE}origin.png`} 
                            className="w-full h-full object-contain" 
                            style={{ imageRendering: 'pixelated' }}
                            alt=""
                          />
                        </div>
                      )}
                      
                      {images[idx] ? (
                        <img src={images[idx]!} className="w-full h-full object-contain relative z-10" style={{ imageRendering: 'pixelated' }} alt={label} />
                      ) : (
                        <div className="text-center p-2 uppercase text-white/80 relative z-10 drop-shadow-[2px_2px_0_rgba(0,0,0,0.9)]" style={{ fontSize: zhScale(9) }}>
                          {isZh ? "点击上传" : "Click to upload"}
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(idx, e.target.files[0])}
                      />
                      <button
                        type="button"
                        disabled={!sourceFiles[idx] || loading}
                        onClick={() => handleFlipToggle(idx)}
                        className={`absolute right-2 top-2 z-30 border-2 px-2 py-1 font-bold transition-colors ${
                          sourceFiles[idx]
                            ? flipStates[idx]
                              ? 'border-[#f7d51d] bg-[#f7d51d] text-[#0d0221]'
                              : 'border-white/70 bg-black/75 text-white hover:border-[#f7d51d]'
                            : 'border-white/15 bg-black/35 text-white/25 cursor-not-allowed'
                        }`}
                        style={{ fontSize: zhScale(7) }}
                        title={isZh ? '水平翻转图片' : 'Flip image horizontally'}
                        aria-pressed={flipStates[idx]}
                      >
                        {isZh ? '翻转' : 'FLIP'}
                      </button>
                    </div>
                    {idx === 0 && onGenerateImage && (
                      <div className={`flex flex-col items-center gap-2 ${!expandImages ? 'max-w-md mx-auto w-full' : ''}`}>
                        <p className="text-white/45 text-center" style={{ fontSize: zhScale(7) }}>
                          {isZh ? '没有像素图？' : 'NO PIXEL ART YET?'}
                        </p>
                        <PixelButton
                          type="button"
                          variant="outline"
                          onClick={onGenerateImage}
                          className="w-full sm:w-44"
                          style={{ fontSize: zhScale(8) }}
                        >
                          {isZh ? '生成图片' : 'GENERATE IMAGE'}
                        </PixelButton>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between gap-4 pt-2 border-t-2 border-[#5a2d9c]">
               <div className="flex gap-2">
                 <PixelButton variant="secondary" onClick={() => setExpandImages(!expandImages)} className="text-[9px]" style={{ fontSize: zhScale(9) }}>
                   {expandImages 
                    ? (isZh ? '收起' : 'COLLAPSE') 
                    : (isZh ? '展开控制帧' : 'EXPAND CONTROL FRAMES')}
                 </PixelButton>
                 {expandImages && (
                    <div className="flex items-center gap-2 px-3 bg-black/20 border-2 border-[#5a2d9c] text-[8px] text-white/60">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={params.use_mid_image} onChange={e => setParams({...params, use_mid_image: e.target.checked, ...(isV2 && e.target.checked ? { use_end_image: true } : {})})} />
                        {isZh ? '中间图' : 'MID'}
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={params.use_end_image} onChange={e => setParams({...params, use_end_image: e.target.checked, ...(isV2 && !e.target.checked ? { use_mid_image: false } : {})})} />
                        {isZh ? '结尾图' : 'END'}
                      </label>
                    </div>
                 )}
               </div>
               
               <div className="flex flex-col items-end gap-2 text-white/60">
                 <div className="flex items-center gap-2 select-none">
                    <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={usePadding} 
                        onChange={(e) => {
                          setUsePadding(e.target.checked);
                          if (isV2 && e.target.checked && Object.values(v2Padding).every(value => value === 0)) {
                            setV2Padding(constrainPadding(v2Size, { left: 32, right: 32, top: 32, bottom: 32 }));
                          }
                          setForcedScaleFactor(null); // Reset forced scale factor on manual change
                        }} 
                      />
                      {isZh ? '扩展图像' : 'PADDING'}
                    </label>

                    {/* Padding help */}
                    <div className="group relative inline-block flex items-center">
                      <HelpCircle size={12} className="text-white/40 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-white text-[10px] pixel-border border-[#5a2d9c] font-sans z-50 normal-case">
                        {isZh ? "在角色周围填充像素，防止角色和边缘太近" : "Fill pixels around the character to prevent it from being too close to the edges."}
                      </div>
                    </div>
                  </div>
                  
                  
                  <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                   <input type="checkbox" checked={loopAnimation} onChange={(e) => {
                       setLoopAnimation(e.target.checked);
                       if (e.target.checked && sourceFiles[0]) {
                          const newFiles = [...sourceFiles];
                          newFiles[2] = sourceFiles[0];
                          setSourceFiles(newFiles);
                          setParams({...params, use_end_image: true});
                          setExpandImages(true);
                       }
                     }} />
                   {isZh ? '循环动画' : 'LOOP'}
                   <div className="group relative inline-block">
                     <HelpCircle size={12} className="text-white/40 cursor-help" />
                     <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-white text-[10px] pixel-border border-[#5a2d9c] font-sans z-50 normal-case">
                       {isZh ? "创建循环动画，建议使用16帧动画" : "Create a looping animation. 16 frames are recommended."}
                     </div>
                   </div>
                 </label>
               </div>
            </div>
            {usePadding && (isV2 ? (
              <PaddingEditorV2 size={v2Size} padding={actualPadding} image={paddingPreviewImage}
                onChange={value => setV2Padding(constrainPadding(v2Size, value))} lang={lang} disabled={loading} />
            ) : (
              <div className="pixel-border border-[#5a2d9c] bg-black/20 p-3 space-y-3" data-testid="v1-padding-editor">
                <div className="flex items-center justify-between gap-3 text-white/70" style={{ fontSize: zhScale(9) }}>
                  <span>{isZh ? '选择原图对齐方向' : 'CHOOSE IMAGE ALIGNMENT'}</span>
                  <span className="text-[#f7d51d]">{paddingPositionLabels[paddingPosition]}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mx-auto w-full max-w-[360px] aspect-square bg-[#080116] p-2 pixel-border border-white/10">
                  {paddingPositions.map((position) => {
                    const selected = paddingPosition === position;
                    return (
                      <button
                        key={position}
                        type="button"
                        disabled={loading}
                        aria-label={paddingPositionLabels[position]}
                        aria-pressed={selected}
                        onClick={() => setPaddingPosition(position)}
                        className={`relative flex items-center justify-center border-2 font-bold transition-colors disabled:opacity-40 ${
                          selected
                            ? 'border-[#fff1a6] bg-[#f7d51d] text-[#160b2b] shadow-[3px_3px_0_#080116]'
                            : 'border-[#5a2d9c] bg-[#1b0a38] text-white/55 hover:border-[#a47cfd] hover:text-white'
                        }`}
                        style={{ fontSize: zhScale(8) }}
                      >
                        {paddingPositionLabels[position]}
                        {selected && <span className="absolute right-2 top-2 w-2 h-2 bg-[#5a2d9c]" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </PixelCard>

        <PixelCard title={isZh ? "生成日志" : "GENERATION LOG"} titleStyle={{ fontSize: zhScale(10) }}>
            <div className="h-24 overflow-y-auto text-[8px] font-mono leading-relaxed opacity-60 text-white/50">
                [SYSTEM] Status: Ready<br/>
                {images[0] && <>[ASSET] Reference image active<br/></>}
                {usePadding && <>[ASSET] Padding mode: active<br/></>}
                {error && <span className="text-red-500 font-bold uppercase">[ERROR] {error}</span>}
            </div>
        </PixelCard>
      </div>

      <div className="space-y-6">
        <PixelCard title={isZh ? "参数设置" : "CORE PARAMETERS"} titleStyle={{ fontSize: zhScale(10) }}>
          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-[10px] block text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                  {isZh ? "提示词" : "PROMPT"}
                </label>
                <textarea 
                  className="w-full bg-[#0d0221] pixel-border border-[#5a2d9c] p-2 text-white h-48 outline-none focus:border-[#f7d51d] placeholder:opacity-30"
                  placeholder="Enter custom prompt here..."
                  value={params.prompt}
                  onChange={onPromptChange}
                  style={{ fontSize: zhScale(10) }}
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                {!isV2 && <div className="space-y-2">
                    <label className="text-[10px] block text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                      {isZh ? "动作" : "MOTION"}
                    </label>
                    <select className="w-full bg-[#0d0221] p-2 text-[10px] outline-none border-2 border-[#5a2d9c] text-white" value={params.motion_type} onChange={(e) => setParams({...params, motion_type: e.target.value as MotionType})}>
                        {MOTION_TYPES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                </div>}
                {!isV2 && params.motion_type === 'attack' && (
                  <div className="space-y-2">
                      <label className="text-[10px] block text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                        {isZh ? "攻击类型" : "ATTACK TYPE"}
                      </label>
                      <select 
                        className="w-full bg-[#0d0221] p-2 text-[10px] outline-none border-2 border-[#5a2d9c] text-white" 
                        value={params.attack_type || 'melee'} 
                        onChange={(e) => setParams({...params, attack_type: e.target.value as any})}
                      >
                          <option value="melee">{isZh ? '近战' : 'MELEE'}</option>
                          <option value="ranged">{isZh ? '远程' : 'RANGED'}</option>
                          <option value="other">{isZh ? '其他' : 'OTHER'}</option>
                      </select>
                  </div>
                )}
                <div className="space-y-2">
                    <label className="text-[10px] block text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                      {isZh ? "像素尺寸" : "PIXELS"}
                    </label>
                    <select 
                      className="w-full bg-[#0d0221] p-2 text-[10px] outline-none border-2 border-[#5a2d9c] text-white" 
                      aria-label={isZh ? '像素尺寸' : 'Pixel size'}
                      value={isV2 ? v2PixelChoice : params.pixel_size}
                      onChange={(e) => {
                        if (isV2) {
                          const choice = e.target.value as PixelSize;
                          setV2PixelChoice(choice);
                          setParams(current => ({ ...current, pixel_size: choice }));
                          changeV2Size({ x: Number(choice), y: Number(choice) });
                          return;
                        }
                        const choice = e.target.value as PixelSize;
                        setParams({...params, pixel_size: choice});
                        setV2PixelChoice(choice);
                        changeV2Size({ x: Number(choice), y: Number(choice) });
                        setForcedScaleFactor(null); // Reset forced scale factor on manual change
                      }}
                    >
                        {PIXEL_SIZES.map(s => <option key={s} value={s}>{s}x{s}</option>)}
                    </select>
                </div>
                <div className="space-y-2 relative">
                    <label className="text-[10px] block text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                      {isZh ? "背景颜色" : "BG COLOR"}
                    </label>
                    <div className="flex gap-2">
                      <div 
                        className="w-full h-9 bg-[#0d0221] border-2 border-[#5a2d9c] cursor-pointer relative flex items-center px-3"
                        onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                      >
                        <div className="w-5 h-5 pixel-border border border-white/20" style={{ backgroundColor: params.bg_color || '#004000' }} />
                        <span className="ml-3 font-mono text-xs text-white/90 uppercase">{params.bg_color || '#004000'}</span>
                      </div>
                    </div>

                    {showBgColorPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowBgColorPicker(false)} />
                        <div className="absolute right-0 bottom-12 z-50 bg-[#1b0a38] border-2 border-[#5a2d9c] p-2 pixel-border flex flex-col gap-2 w-52 shadow-2xl">
                          <HexColorPicker color={params.bg_color || '#004000'} onChange={(color) => setParams({...params, bg_color: color})} />
                          <div className="flex justify-between items-center text-xs font-mono text-white/80">
                            <span>{(params.bg_color || '#004000').toUpperCase()}</span>
                            <button className="text-[#a47cfd] font-bold px-1 hover:text-white" onClick={() => setShowBgColorPicker(false)}>
                              {isZh ? '关闭' : 'CLOSE'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] block text-white/60 uppercase" style={{ fontSize: zhScale(10) }}>
                      {isZh ? "帧数" : "LENGTH"}
                    </label>
                    <select aria-label={isZh ? '帧数' : 'Frame count'} className="w-full bg-[#0d0221] p-2 text-[10px] outline-none border-2 border-[#5a2d9c] text-white"
                      value={isV2 ? v2Length : uiLength} onChange={(e) => isV2 ? setV2Length(parseInt(e.target.value)) : setUiLength(parseInt(e.target.value))}>
                      {(isV2 ? V2_FRAME_OPTIONS : [8, 10, 12, 14, 16]).map(l => <option key={l} value={l}>{l} FRAMES</option>)}
                    </select>
                </div>
             </div>

             <div className="space-y-2 border-t border-[#5a2d9c]/30 pt-4">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] block uppercase text-white/60" style={{ fontSize: zhScale(10) }}>
                      {isZh ? "颜色调色盘" : "COLOR PALETTE"}
                    </label>
                    <label className="text-[8px] flex items-center gap-1 cursor-pointer text-white/40 hover:text-white transition-colors">
                        <input 
                          type="checkbox" 
                          checked={params.use_quantization} 
                          onChange={e => setParams({...params, use_quantization: e.target.checked})} 
                        />
                        {isZh ? "启用" : "ENABLE"}
                    </label>
                </div>
                {params.use_quantization && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex justify-between text-[8px] text-white/40">
                      <span>{isZh ? "颜色数量" : "COLORS"}</span>
                      <span>{localColorCount}</span>
                    </div>
                    <input 
                      type="range" 
                      min="8" 
                      max="64" 
                      step="1" 
                      className="w-full accent-white" 
                      value={localColorCount} 
                      onChange={e => setLocalColorCount(parseInt(e.target.value))} 
                      onMouseUp={() => setParams({...params, quantization_colors: localColorCount})}
                      onKeyUp={() => setParams({...params, quantization_colors: localColorCount})}
                      onTouchEnd={() => setParams({...params, quantization_colors: localColorCount})}
                      onBlur={() => setParams({...params, quantization_colors: localColorCount})}
                    />
                    {centroids.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 max-h-16 overflow-y-auto p-1 bg-black/20 border border-[#5a2d9c]/30">
                        {centroids.map((c, i) => (
                          <div 
                            key={i} 
                            className="w-3 h-3 border border-white/10 flex-shrink-0" 
                            style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                            title={`RGB(${c.r},${c.g},${c.b})`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>

             <div className="pt-2">
                <PixelButton variant="secondary" className="w-full text-[9px]" onClick={() => setShowAdvanced(!showAdvanced)} style={{ fontSize: zhScale(9) }}>
                  {showAdvanced 
                    ? (isZh ? '高级选项' : 'HIDE ADVANCED') 
                    : (isZh ? '高级选项' : 'SHOW ADVANCED')}
                </PixelButton>
             </div>

             {showAdvanced && (
                <div className="space-y-4 border-t-2 border-[#5a2d9c] pt-4 animate-fade-in text-white/60">
                    {isV2 ? <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: zhScale(10) }}>
                        <input type="checkbox" checked={aiExpand} onChange={event => setAiExpand(event.target.checked)} />
                        {isZh ? 'AI 扩写' : 'AI PROMPT EXPANSION'}
                      </label>
                      <p className="font-sans text-xs text-white/40 leading-relaxed">
                        {isZh ? '结合参考图优化动作描述和动作时序，让动画更完整、连贯。不会修改你保存的原始提示词。' : 'Uses your reference images to improve the action description and motion timing. Your saved original prompt remains unchanged.'}
                      </p>
                    </div> : <>
                    <div className="space-y-2">
                        <label className="text-[10px] block flex justify-between" style={{ fontSize: zhScale(10) }}>
                          {isZh ? "噪声强度" : "NOISE STRENGTH"} <span>{params.noise_strength}</span>
                        </label>
                        <input type="range" min="0" max="2" step="0.1" className="w-full accent-white" value={params.noise_strength} onChange={e => setParams({...params, noise_strength: parseFloat(e.target.value)})} />
                    </div>
                    </>}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-[10px] block" style={{ fontSize: zhScale(10) }}>
                              {isZh ? "随机数种子" : "SEED"}
                            </label>
                            <label className="text-[8px] flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={params.fix_seed} onChange={e => setParams({...params, fix_seed: e.target.checked})} />
                                FIX
                            </label>
                        </div>
                        <PixelInput type="number" className="w-full" value={params.seed} onChange={e => setParams({...params, seed: parseInt(e.target.value)})} />
                    </div>
                </div>
             )}
          </div>
        </PixelCard>

        <PixelButton 
          className="w-full h-16 text-lg" 
          disabled={loading || imagesProcessing || !images[0]}
          onClick={handleGenerate} 
          style={{ fontSize: zhScale(14) }}
        >
          {loading 
            ? (isZh ? '生成中...' : 'PROCESSING...')
            : (
              <>
                <span>{isZh ? '开始生成' : 'GENERATE'}</span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="line-through opacity-50">
                    {originalCreditsCost} {isZh ? '积分' : 'CREDITS'}
                  </span>
                  <span>{creditsCost} {isZh ? '积分' : 'CREDITS'}</span>
                </span>
              </>
            )}
        </PixelButton>
      </div>
    </div>
  );
};

export default GenerationPage;
