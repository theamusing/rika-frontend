
import React, { useState, useEffect, useRef } from 'react';
import { PixelButton, PixelCard, PixelInput } from '../components/PixelComponents';
import { processImage } from '../utils/imageUtils';
import { apiService } from '../services/apiService';
import { MOTION_TYPES, PIXEL_SIZES } from '../constants';
import { GenerationParams, MotionType, PixelSize } from '../types';

interface GenerationPageProps {
  onJobCreated: (id: string) => void;
  initialParams?: any;
  onConsumed?: () => void;
  refreshCredits: () => void;
}

const GenerationPage: React.FC<GenerationPageProps> = ({ onJobCreated, initialParams, onConsumed, refreshCredits }) => {
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [sourceFiles, setSourceFiles] = useState<(File | string | null)[]>([null, null, null]);
  const [expandImages, setExpandImages] = useState(false);
  const [loopAnimation, setLoopAnimation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usePadding, setUsePadding] = useState(false);

  const [uiLength, setUiLength] = useState(12);

  const [params, setParams] = useState<GenerationParams>({
    prompt: '',
    motion_type: 'idle',
    pixel_size: '128',
    strength_low: 0.8,
    strength_high: 0.8,
    seed: 42,
    use_mid_image: false,
    use_end_image: false,
    scale_factor: 4, 
    fix_seed: false,
    length: 25 
  });

  // Handle defaults based on animation type
  useEffect(() => {
    if (!initialParams) {
      const isAttack = params.motion_type === 'attack';
      const isDefeated = params.motion_type === 'defeated';
      
      const defaultUiLength = (isAttack || isDefeated) ? 16 : 12;
      setUiLength(defaultUiLength);
      setParams(prev => ({ ...prev, length: 2 * defaultUiLength + 1 }));
      
      // Toggle padding: Attack defaults to true, others false
      setUsePadding(isAttack);
    }
  }, [params.motion_type, initialParams]);

  useEffect(() => {
    const reprocessAll = async () => {
      let changed = false;
      let hasError = false;
      const newImages = [...images];
      
      for (let i = 0; i < sourceFiles.length; i++) {
        const source = sourceFiles[i];
        if (source) {
          try {
            const b64 = await processImage(source, usePadding);
            if (newImages[i] !== b64) {
              newImages[i] = b64;
              changed = true;
            }
          } catch (err) {
            console.error(`Failed to process source at index ${i}:`, err);
            hasError = true;
          }
        } else {
          if (newImages[i] !== null) {
            newImages[i] = null;
            changed = true;
          }
        }
      }
      
      if (changed) setImages(newImages);
      if (hasError) setError("Image processing failed. Check CORS or file format.");
      else if (error === "Image processing failed. Check CORS or file format.") setError('');
    };

    reprocessAll();
  }, [usePadding, sourceFiles]);

  useEffect(() => {
    if (initialParams) {
      const job = initialParams;
      const jobParams = job.input_params;
      const inputImgs = job.input_images || [];
      
      const apiLength = jobParams.length || 25;
      const calculatedUiLength = (apiLength - 1) / 2;
      setUiLength(calculatedUiLength);

      // Try to restore padding state from job context
      const currentScale = jobParams.scale_factor || 4;
      const pixelVal = parseInt(jobParams.pixel_size || "128");
      // If scale * pixel_size is closer to 384 than 512, it was probably padded
      const wasPadded = Math.abs(currentScale * pixelVal - 384) < Math.abs(currentScale * pixelVal - 512);
      setUsePadding(wasPadded);

      setParams({
        ...params,
        ...jobParams,
        pixel_size: String(pixelVal) as PixelSize
      });

      const newFiles: (File | string | null)[] = [null, null, null];
      if (inputImgs.length > 0) {
        newFiles[0] = inputImgs[0].url;
        
        let nextIdx = 1;
        if (jobParams.use_mid_image && inputImgs[nextIdx]) {
          newFiles[1] = inputImgs[nextIdx].url;
          nextIdx++;
          setExpandImages(true);
        }
        if (jobParams.use_end_image && inputImgs[nextIdx]) {
          newFiles[2] = inputImgs[nextIdx].url;
          setExpandImages(true);
        }
        
        if (newFiles[0] === newFiles[2] && jobParams.use_end_image) {
          setLoopAnimation(true);
        }
      }

      setSourceFiles(newFiles);
      onConsumed?.();
    }
  }, [initialParams, onConsumed]);

  const handleImageUpload = (index: number, file: File) => {
    const newFiles = [...sourceFiles];
    newFiles[index] = file;

    if (index === 0 && loopAnimation) {
      newFiles[2] = file;
    }
    
    setSourceFiles(newFiles);
  };

  const handleGenerate = async () => {
    if (!images[0]) {
        setError("Start Image is required!");
        return;
    }
    setError('');
    setLoading(true);

    try {
      const payloadImages: string[] = [];
      const finalParams = { ...params };
      finalParams.length = 2 * uiLength + 1;
      
      // Padding scale logic: 384px if padded, 512px if standard
      finalParams.scale_factor = (usePadding ? 384 : 512) / parseInt(params.pixel_size);
      
      if (!params.fix_seed) {
        finalParams.seed = Math.floor(Math.random() * 1000000);
      }

      payloadImages.push(images[0] as string);
      
      if (expandImages) {
        if (params.use_mid_image && images[1]) {
            payloadImages.push(images[1]);
        } else {
            finalParams.use_mid_image = false;
        }
        
        if (params.use_end_image && images[2]) {
            payloadImages.push(images[2]);
        } else {
            finalParams.use_end_image = false;
        }
      } else {
        finalParams.use_mid_image = false;
        finalParams.use_end_image = false;
      }

      const res = await apiService.generate(payloadImages, finalParams);
      refreshCredits();
      onJobCreated(res.gen_id);
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <PixelCard title="REFERENCE IMAGES">
          <div className="flex flex-col gap-4">
            <div className={`grid gap-4 ${expandImages ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {[0, 1, 2].map((idx) => {
                if (!expandImages && idx > 0) return null;
                const label = idx === 0 ? "START" : idx === 1 ? "MID" : "END";
                return (
                  <div key={idx} className="space-y-2">
                    <p className="text-[10px] text-center">{label}</p>
                    <div className="relative aspect-square pixel-border border-[#306230] bg-black/20 flex items-center justify-center overflow-hidden">
                      {images[idx] ? (
                        <img src={images[idx]!} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} alt={label} />
                      ) : (
                        <div className="text-[8px] opacity-40 text-center p-2 uppercase">Click to upload</div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(idx, e.target.files[0])}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between gap-4">
               <div className="flex gap-2">
                 <PixelButton variant="secondary" onClick={() => setExpandImages(!expandImages)}>
                   {expandImages ? 'COLLAPSE' : 'EXPAND TO 3 FRAMES'}
                 </PixelButton>
                 {expandImages && (
                    <div className="flex items-center gap-2 px-3 bg-black/20 border-2 border-[#306230] text-[8px]">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={params.use_mid_image} onChange={e => setParams({...params, use_mid_image: e.target.checked})} />
                        USE MID
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={params.use_end_image} onChange={e => setParams({...params, use_end_image: e.target.checked})} />
                        USE END
                      </label>
                    </div>
                 )}
               </div>
               
               <div className="flex flex-col items-end gap-2">
                 <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                   <input 
                     type="checkbox" 
                     checked={usePadding} 
                     onChange={(e) => setUsePadding(e.target.checked)} 
                   />
                   PADDING (768x768)
                 </label>
                 <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                   <input 
                     type="checkbox" 
                     checked={loopAnimation} 
                     onChange={(e) => {
                       setLoopAnimation(e.target.checked);
                       if (e.target.checked && sourceFiles[0]) {
                          const newFiles = [...sourceFiles];
                          newFiles[2] = sourceFiles[0];
                          setSourceFiles(newFiles);
                          setParams({...params, use_end_image: true});
                          setExpandImages(true);
                       }
                     }} 
                   />
                   LOOP ANIMATION
                 </label>
               </div>
            </div>
          </div>
        </PixelCard>

        <PixelCard title="GENERATION LOG">
            <div className="h-24 overflow-y-auto text-[8px] font-mono leading-relaxed opacity-60">
                [SYSTEM] Status: Ready<br/>
                {images[0] && <>[ASSET] Reference image active<br/></>}
                {usePadding && <>[ASSET] Padding mode: active (768x768 | 384px content)<br/></>}
                {params.use_mid_image && images[1] && <>[ASSET] Mid frame active<br/></>}
                {params.use_end_image && images[2] && <>[ASSET] End frame active<br/></>}
                {error && <span className="text-red-500">[ERROR] {error}</span>}
            </div>
        </PixelCard>
      </div>

      <div className="space-y-6">
        <PixelCard title="CORE PARAMETERS">
          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-[10px] block">PROMPT</label>
                <textarea 
                  className="w-full bg-[#0f171e] pixel-border border-[#306230] p-2 text-[#8bac0f] text-[10px] h-24 outline-none focus:border-[#8bac0f]"
                  placeholder="A pixelated hero..."
                  value={params.prompt}
                  onChange={(e) => setParams({...params, prompt: e.target.value})}
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] block">MOTION</label>
                    <select 
                      className="w-full bg-[#0f171e] p-2 text-[10px] outline-none border-2 border-[#306230] text-[#8bac0f]"
                      value={params.motion_type}
                      onChange={(e) => setParams({...params, motion_type: e.target.value as MotionType})}
                    >
                        {MOTION_TYPES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] block">PIXELS</label>
                    <select 
                      className="w-full bg-[#0f171e] p-2 text-[10px] outline-none border-2 border-[#306230] text-[#8bac0f]"
                      value={params.pixel_size}
                      onChange={(e) => setParams({...params, pixel_size: e.target.value as PixelSize})}
                    >
                        {PIXEL_SIZES.map(s => <option key={s} value={s}>{s}x{s}</option>)}
                    </select>
                </div>
             </div>

             <div className="pt-2">
                <PixelButton variant="secondary" className="w-full text-[10px]" onClick={() => setShowAdvanced(!showAdvanced)}>
                  {showAdvanced ? 'HIDE ADVANCED' : 'SHOW ADVANCED'}
                </PixelButton>
             </div>

             {showAdvanced && (
                <div className="space-y-4 border-t-2 border-[#306230] pt-4 animate-fade-in">
                    <div className="space-y-2">
                        <label className="text-[10px] block flex justify-between">
                            STRENGTH LOW <span>{params.strength_low}</span>
                        </label>
                        <input type="range" min="0" max="2" step="0.1" className="w-full accent-[#8bac0f]" value={params.strength_low} onChange={e => setParams({...params, strength_low: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] block flex justify-between">
                            STRENGTH HIGH <span>{params.strength_high}</span>
                        </label>
                        <input type="range" min="0" max="2" step="0.1" className="w-full accent-[#8bac0f]" value={params.strength_high} onChange={e => setParams({...params, strength_high: parseFloat(e.target.value)})} />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] block flex justify-between">
                            ANIMATION LENGTH <span>{uiLength}</span>
                        </label>
                        <select 
                          className="w-full bg-[#0f171e] p-2 text-[10px] outline-none border-2 border-[#306230] text-[#8bac0f]"
                          value={uiLength}
                          onChange={(e) => setUiLength(parseInt(e.target.value))}
                        >
                          {[8, 10, 12, 14, 16].map(l => (
                            <option key={l} value={l}>{l} FRAMES</option>
                          ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-[10px] block">SEED</label>
                            <label className="text-[8px] flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={params.fix_seed} onChange={e => setParams({...params, fix_seed: e.target.checked})} />
                                FIX SEED
                            </label>
                        </div>
                        <PixelInput 
                            type="number" 
                            className="w-full" 
                            value={params.seed} 
                            onChange={e => setParams({...params, seed: parseInt(e.target.value)})} 
                        />
                    </div>
                </div>
             )}
          </div>
        </PixelCard>

        <PixelButton 
          className="w-full h-16 text-lg" 
          disabled={loading || !images[0]} 
          onClick={handleGenerate}
        >
          {loading ? 'PROCESSING...' : 'GENERATE (5¢)'}
        </PixelButton>
      </div>
    </div>
  );
};

export default GenerationPage;
