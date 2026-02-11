
import React, { useState, useEffect, useRef } from 'react';
import { PixelButton, PixelCard, PixelInput, PixelModal } from '../components/PixelComponents.tsx';
import { processImage, unprocessImage } from '../utils/imageUtils.ts';
import { apiService } from '../services/apiService.ts';
import { MOTION_TYPES, PIXEL_SIZES } from '../constants.ts';
import { GenerationParams, MotionType, PixelSize } from '../types.ts';

interface GenerationPageProps {
  onJobCreated: (id: string) => void;
  initialParams?: any;
  onConsumed?: () => void;
  refreshCredits: () => void;
  credits: number;
  onOpenPricing?: () => void;
}

const CDN_BASE = "https://cdn.rika-ai.com/assets/frontpage/";
// const CDN_BASE = "/assets/";

const DEFAULT_PROMPTS: Record<MotionType, string> = {
  idle: 'side-view, 2D game character standing in place, breathing motion,body sways up-and-down slightly, chest and shoulders rising and falling, head bob synchronized with breathing.',
  attack: 'side-view, 2D game character raises weapon to perform a powerful strike forward.',
  walk: 'side-view, 2D game character walks forward.',
  hit: 'side-view, 2D game character getting hit and knocked backward.',
  defeated: 'side-view 2D game character getting hit, kneel down and fall to the ground, lying motionlessly'
};

const GenerationPage: React.FC<GenerationPageProps> = ({ onJobCreated, initialParams, onConsumed, refreshCredits, credits, onOpenPricing }) => {
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [sourceFiles, setSourceFiles] = useState<(File | string | null)[]>([null, null, null]);
  const [flipStates, setFlipStates] = useState<boolean[]>([false, false, false]);
  const [expandImages, setExpandImages] = useState(false);
  const [loopAnimation, setLoopAnimation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usePadding, setUsePadding] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const [uiLength, setUiLength] = useState(12);

  const [params, setParams] = useState<GenerationParams>({
    prompt: DEFAULT_PROMPTS['idle'],
    motion_type: 'idle',
    pixel_size: '128',
    strength_low: 0.8,
    strength_high: 0.8,
    seed: 42,
    use_mid_image: false,
    use_end_image: false,
    scale_factor: 4, 
    fix_seed: false,
    length: 25,
    use_padding: false
  });

  const userHasEditedPrompt = useRef(false);

  useEffect(() => {
    if (!initialParams) {
      const isAttack = params.motion_type === 'attack';
      const isDefeated = params.motion_type === 'defeated';
      
      const defaultUiLength = (isAttack || isDefeated) ? 16 : 12;
      setUiLength(defaultUiLength);

      setParams(prev => {
        const nextParams = { ...prev, length: 2 * defaultUiLength + 1 };
        const currentIsStandardDefault = Object.values(DEFAULT_PROMPTS).includes(prev.prompt);
        if (prev.prompt === '' || currentIsStandardDefault || !userHasEditedPrompt.current) {
          nextParams.prompt = DEFAULT_PROMPTS[prev.motion_type];
        }
        return nextParams;
      });
    }
  }, [params.motion_type, initialParams]);

  useEffect(() => {
    const reprocessAll = async () => {
      let changed = false;
      let processingError = '';
      const newImages = [...images];
      
      for (let i = 0; i < sourceFiles.length; i++) {
        const source = sourceFiles[i];
        if (source) {
          try {
            const b64 = await processImage(source, usePadding, flipStates[i], params.pixel_size);
            if (newImages[i] !== b64) {
              newImages[i] = b64;
              changed = true;
            }
          } catch (err: any) {
            console.error(`[IMAGE PROCESSOR] Error at index ${i}:`, err);
            processingError = err.message || "Asset processing failed.";
          }
        } else {
          if (newImages[i] !== null) {
            newImages[i] = null;
            changed = true;
          }
        }
      }
      
      if (changed) setImages(newImages);
      if (processingError) {
        setError(processingError);
      } else if (error && (error.includes("Asset") || error.includes("CORS"))) {
        setError('');
      }
    };
    reprocessAll();
  }, [usePadding, sourceFiles, flipStates, params.pixel_size]);

  useEffect(() => {
    const loadInitial = async () => {
      if (!initialParams) return;
      const job = initialParams;
      const jobParams = job.input_params;
      const inputImgs = job.input_images || [];
      const apiLength = jobParams.length || 25;
      const calculatedUiLength = (apiLength - 1) / 2;
      setUiLength(calculatedUiLength);
      const wasPadded = jobParams.use_padding === true;
      setUsePadding(wasPadded);
      const loadedPixelSize = String(parseInt(jobParams.pixel_size || "128")) as PixelSize;
      setParams({ ...params, ...jobParams, pixel_size: loadedPixelSize });
      userHasEditedPrompt.current = true;
      const newFiles: (File | string | null)[] = [null, null, null];
      if (inputImgs.length > 0) {
        const processUrl = async (url: string) => wasPadded ? await unprocessImage(url, loadedPixelSize) : url;
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
  };

  const handleFlipToggle = (index: number) => {
    const newFlips = [...flipStates];
    newFlips[index] = !newFlips[index];
    setFlipStates(newFlips);
  };

  const handleGenerate = async () => {
    if (!images[0]) { setError("Start Image is required!"); return; }
    if (credits < 5) { setShowCreditModal(true); setError("INSUFFICIENT CREDITS: 5 credits required."); return; }
    setError('');
    setLoading(true);
    try {
      const payloadImages: string[] = [];
      const finalParams = { ...params };
      if (!finalParams.prompt.trim()) finalParams.prompt = DEFAULT_PROMPTS[params.motion_type];
      finalParams.length = 2 * uiLength + 1;
      finalParams.use_padding = usePadding;
      const pixelInt = parseInt(params.pixel_size);
      if (usePadding) finalParams.scale_factor = 384 / pixelInt;
      else finalParams.scale_factor = 512 / pixelInt;
      if (!params.fix_seed) finalParams.seed = Math.floor(Math.random() * 1000000);
      payloadImages.push(images[0] as string);
      if (expandImages) {
        if (params.use_mid_image && images[1]) payloadImages.push(images[1]);
        else finalParams.use_mid_image = false;
        if (params.use_end_image && images[2]) payloadImages.push(images[2]);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <PixelModal 
        isOpen={showCreditModal} 
        onClose={() => setShowCreditModal(false)} 
        title="SYSTEM ALERT: LOW CREDITS"
      >
        <div className="space-y-4 text-center">
          <p className="text-[12px] leading-relaxed text-white">
            THIS OPERATION REQUIRES <br /> <span className="text-[#f7d51d] font-bold">5 CREDITS</span>.
          </p>
          <div className="p-3 bg-black/40 pixel-border border-[#5a2d9c]">
            <p className="text-[10px] opacity-70 mb-1 uppercase text-white/60">CURRENT BALANCE</p>
            <p className="text-xl font-bold text-[#f7d51d]">{credits}</p>
          </div>
          <p className="text-[8px] opacity-50 uppercase leading-tight text-white/40">
            PLEASE TOP UP YOUR ACCOUNT TO ACQUIRE MORE CREDITS.
          </p>
          <div className="pt-2">
            <PixelButton 
              variant="primary" 
              className="w-full h-12" 
              onClick={() => {
                setShowCreditModal(false);
                onOpenPricing?.();
              }}
            >
              BUY CREDITS
            </PixelButton>
          </div>
        </div>
      </PixelModal>

      <div className="lg:col-span-2 space-y-6">
        <PixelCard title="REFERENCE IMAGES">
          <div className="flex flex-col gap-4">
            <div className={`grid gap-4 ${expandImages ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {[0, 1, 2].map((idx) => {
                if (!expandImages && idx > 0) return null;
                const label = idx === 0 ? "START" : idx === 1 ? "MID" : "END";
                return (
                  <div key={idx} className="space-y-2">
                    <p className="text-[10px] text-center text-white/60 uppercase">{label}</p>
                    <div className={`relative aspect-square pixel-border border-[#5a2d9c] bg-black/20 flex items-center justify-center overflow-hidden ${!expandImages ? 'max-w-md mx-auto w-full' : ''}`}>
                      {/* Placeholder Background for Start Image when not expanded */}
                      {!expandImages && idx === 0 && (
                        <div className="absolute inset-0 pointer-events-none opacity-10 grayscale">
                          <img 
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
                        <div className="text-[8px] opacity-40 text-center p-2 uppercase text-white/30 relative z-10">Click to upload</div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(idx, e.target.files[0])}
                      />
                    </div>
                    {sourceFiles[idx] && (
                      <div className="flex justify-center">
                        <label className="flex items-center gap-1 text-[8px] cursor-pointer text-white/40 hover:text-white transition-colors">
                          <input type="checkbox" checked={flipStates[idx]} onChange={() => handleFlipToggle(idx)} />
                          FLIP H
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between gap-4 pt-2 border-t-2 border-[#5a2d9c]">
               <div className="flex gap-2">
                 <PixelButton variant="secondary" onClick={() => setExpandImages(!expandImages)} className="text-[9px]">
                   {expandImages ? 'COLLAPSE' : 'EXPAND TO 3 FRAMES'}
                 </PixelButton>
                 {expandImages && (
                    <div className="flex items-center gap-2 px-3 bg-black/20 border-2 border-[#5a2d9c] text-[8px] text-white/60">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={params.use_mid_image} onChange={e => setParams({...params, use_mid_image: e.target.checked})} />
                        MID
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={params.use_end_image} onChange={e => setParams({...params, use_end_image: e.target.checked})} />
                        END
                      </label>
                    </div>
                 )}
               </div>
               
               <div className="flex flex-col items-end gap-2 text-white/60">
                 <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                   <input type="checkbox" checked={usePadding} onChange={(e) => setUsePadding(e.target.checked)} />
                   PADDING
                 </label>
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
                   LOOP
                 </label>
               </div>
            </div>
          </div>
        </PixelCard>

        <PixelCard title="GENERATION LOG">
            <div className="h-24 overflow-y-auto text-[8px] font-mono leading-relaxed opacity-60 text-white/50">
                [SYSTEM] Status: Ready<br/>
                {images[0] && <>[ASSET] Reference image active<br/></>}
                {usePadding && <>[ASSET] Padding mode: active<br/></>}
                {error && <span className="text-red-500 font-bold uppercase">[ERROR] {error}</span>}
            </div>
        </PixelCard>
      </div>

      <div className="space-y-6">
        <PixelCard title="CORE PARAMETERS">
          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-[10px] block text-white/60 uppercase">PROMPT</label>
                <textarea 
                  className="w-full bg-[#0d0221] pixel-border border-[#5a2d9c] p-2 text-white text-[10px] h-48 outline-none focus:border-[#f7d51d] placeholder:opacity-30"
                  placeholder="Enter custom prompt here..."
                  value={params.prompt}
                  onChange={onPromptChange}
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] block text-white/60 uppercase">MOTION</label>
                    <select className="w-full bg-[#0d0221] p-2 text-[10px] outline-none border-2 border-[#5a2d9c] text-white" value={params.motion_type} onChange={(e) => setParams({...params, motion_type: e.target.value as MotionType})}>
                        {MOTION_TYPES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] block text-white/60 uppercase">PIXELS</label>
                    <select className="w-full bg-[#0d0221] p-2 text-[10px] outline-none border-2 border-[#5a2d9c] text-white" value={params.pixel_size} onChange={(e) => setParams({...params, pixel_size: e.target.value as PixelSize})}>
                        {PIXEL_SIZES.map(s => <option key={s} value={s}>{s}x{s}</option>)}
                    </select>
                </div>
             </div>

             <div className="pt-2">
                <PixelButton variant="secondary" className="w-full text-[9px]" onClick={() => setShowAdvanced(!showAdvanced)}>
                  {showAdvanced ? 'HIDE ADVANCED' : 'SHOW ADVANCED'}
                </PixelButton>
             </div>

             {showAdvanced && (
                <div className="space-y-4 border-t-2 border-[#5a2d9c] pt-4 animate-fade-in text-white/60">
                    <div className="space-y-2">
                        <label className="text-[10px] block flex justify-between">STRENGTH LOW <span>{params.strength_low}</span></label>
                        <input type="range" min="0" max="2" step="0.1" className="w-full accent-white" value={params.strength_low} onChange={e => setParams({...params, strength_low: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] block flex justify-between">STRENGTH HIGH <span>{params.strength_high}</span></label>
                        <input type="range" min="0" max="2" step="0.1" className="w-full accent-white" value={params.strength_high} onChange={e => setParams({...params, strength_high: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] block flex justify-between uppercase">LENGTH <span>{uiLength}</span></label>
                        <select className="w-full bg-[#0d0221] p-2 text-[10px] outline-none border-2 border-[#5a2d9c] text-white" value={uiLength} onChange={(e) => setUiLength(parseInt(e.target.value))}>
                          {[8, 10, 12, 14, 16].map(l => <option key={l} value={l}>{l} FRAMES</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-[10px] block">SEED</label>
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

        <PixelButton className="w-full h-16 text-lg" disabled={loading || !images[0]} onClick={handleGenerate}>
          {loading ? 'PROCESSING...' : `GENERATE (5¢)`}
        </PixelButton>
      </div>
    </div>
  );
};

export default GenerationPage;
