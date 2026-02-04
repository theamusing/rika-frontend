
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { Job } from '../types';
import { PixelButton, PixelCard } from '../components/PixelComponents';
import { sliceSpriteSheet, reconstructSpriteSheet } from '../utils/imageUtils';

interface TaskPlayerPageProps {
  selectedJobId: string | null;
  onJobSelected: (id: string) => void;
  onRegenerate: (job: Job) => void;
}

const TaskPlayerPage: React.FC<TaskPlayerPageProps> = ({ selectedJobId, onJobSelected, onRegenerate }) => {
  const [history, setHistory] = useState<Job[]>([]);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [excludedFrames, setExcludedFrames] = useState<Set<number>>(new Set());
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(12);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const playbackRef = useRef<number | null>(null);
  const isMounted = useRef(true);
  const lastSlicedUrl = useRef<string | null>(null);
  const currentJobRef = useRef<Job | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await apiService.getHistory(20);
      if (isMounted.current) setHistory(res.jobs || []);
    } catch (err) {
      console.error("Failed to fetch history");
    }
  }, []);

  const updateFramesFromJob = useCallback(async (job: Job) => {
    const apiLength = job.input_params?.length || 33;
    const uiLength = (apiLength - 1) / 2;
    
    const outputUrl = job.output_images?.[0]?.url;
    if (job.status === 'succeeded' && outputUrl && lastSlicedUrl.current === outputUrl) {
      return;
    }

    const initialFrames = new Array(uiLength).fill('');
    // Adjusted: Mid frame is now one frame later to better align with generation keyframes
    const midIdx = Math.floor(uiLength / 2);
    const endIdx = uiLength - 1;

    if (job.input_images && job.input_images.length > 0) {
      initialFrames[0] = job.input_images[0].url;
      
      if (job.input_params?.use_mid_image && job.input_images[1]) {
        initialFrames[midIdx] = job.input_images[1].url;
      }
      
      if (job.input_params?.use_end_image) {
        const inputEndIdx = job.input_params.use_mid_image ? 2 : 1;
        if (job.input_images[inputEndIdx]) {
          initialFrames[endIdx] = job.input_images[inputEndIdx].url;
        }
      }
    }

    if (isMounted.current && !outputUrl) {
        setFrames(initialFrames);
        setExcludedFrames(new Set());
    }

    if (job.status === 'succeeded' && outputUrl) {
      try {
        const sliced = await sliceSpriteSheet(outputUrl, apiLength);
        if (isMounted.current) {
          setFrames(sliced);
          setExcludedFrames(new Set());
          lastSlicedUrl.current = outputUrl;
        }
      } catch (err) {
        console.error("Failed to slice output:", err);
      }
    } else if (job.status === 'failed' || job.status === 'succeeded') {
      lastSlicedUrl.current = 'processed';
    }
  }, []);

  const fetchJobDetails = useCallback(async (id: string, force: boolean = false) => {
    try {
      if (!isMounted.current) return;
      
      const cJob = currentJobRef.current;
      if (!force && cJob?.gen_id === id && (cJob.status === 'succeeded' || cJob.status === 'failed')) {
        return;
      }

      const job = await apiService.getJobInfo(id);
      if (!isMounted.current) return;
      
      currentJobRef.current = job;
      setCurrentJob(job);
      await updateFramesFromJob(job);
    } catch (err) {
      console.error("Failed to fetch job details:", err);
    }
  }, [updateFramesFromJob]);

  useEffect(() => {
    isMounted.current = true;
    fetchHistory();
    const pollInterval = setInterval(fetchHistory, 5000);
    return () => {
      isMounted.current = false;
      clearInterval(pollInterval);
    };
  }, [fetchHistory]);

  useEffect(() => {
    if (selectedJobId) {
      setCurrentFrameIndex(0);
      setLoading(true);
      setFrames([]);
      setExcludedFrames(new Set());
      lastSlicedUrl.current = null;
      
      fetchJobDetails(selectedJobId, true).finally(() => {
        if (isMounted.current) setLoading(false);
      });
    }
  }, [selectedJobId, fetchJobDetails]);

  useEffect(() => {
    let timer: number;
    const pollJob = async () => {
      if (currentJob?.status === 'running' || currentJob?.status === 'queued') {
        await fetchJobDetails(currentJob.gen_id);
        if (isMounted.current) {
          timer = window.setTimeout(pollJob, 5000);
        }
      }
    };
    pollJob();
    return () => clearTimeout(timer);
  }, [currentJob?.status, currentJob?.gen_id, fetchJobDetails]);

  const toggleFrameExclusion = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newSet = new Set(excludedFrames);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
      // If we exclude the currently showing frame, jump immediately to the next
      if (currentFrameIndex === index) {
        jumpToNextFrame(newSet);
      }
    }
    setExcludedFrames(newSet);
  };

  const jumpToNextFrame = (excludedSet: Set<number>) => {
    if (frames.length === 0 || excludedSet.size >= frames.length) return;
    
    setCurrentFrameIndex((prev) => {
      let next = (prev + 1) % frames.length;
      let count = 0;
      while (excludedSet.has(next) && count < frames.length) {
        next = (next + 1) % frames.length;
        count++;
      }
      return next;
    });
  };

  useEffect(() => {
    if (isPlaying && frames.length > 0 && frames.some(f => f !== '') && excludedFrames.size < frames.length) {
      playbackRef.current = window.setInterval(() => {
        jumpToNextFrame(excludedFrames);
      }, 1000 / fps);
    } else {
      if (playbackRef.current) clearInterval(playbackRef.current);
    }
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, [isPlaying, frames, fps, excludedFrames]);

  const handleDownload = async () => {
    if (frames.length === 0) return;
    setIsExporting(true);

    try {
      const activeFrames = frames.filter((_, idx) => !excludedFrames.has(idx));
      
      if (activeFrames.length === 0) {
        alert("Cannot export empty animation. Please include at least one frame.");
        return;
      }

      const reconstructedB64 = await reconstructSpriteSheet(activeFrames);
      
      const link = document.createElement('a');
      link.href = reconstructedB64;
      link.download = `rika_custom_${currentJob?.gen_id || 'anim'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to reconstruct spritesheet. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalFrames = frames.length;
  // Adjusted: Marker for 'MID' frame shifted one frame later
  const midIdx = Math.floor(totalFrames / 2);
  const endIdx = totalFrames - 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 order-2 lg:order-2">
         <PixelCard title="MISSION LOG" className="h-[calc(100vh-12rem)] flex flex-col">
            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                {history.map((job) => (
                    <div 
                      key={job.gen_id}
                      onClick={() => onJobSelected(job.gen_id)}
                      className={`p-2 flex items-center gap-3 cursor-pointer pixel-border border-2 transition-all ${selectedJobId === job.gen_id ? 'bg-[#306230] border-[#8bac0f]' : 'border-[#306230] bg-black/20 hover:border-[#8bac0f]/50'}`}
                    >
                      <div className="w-8 h-8 bg-black/40 flex-shrink-0 pixel-border border border-[#306230]">
                        {job.input_images?.[0] && <img src={job.input_images[0].url} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} alt="Asset" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-bold truncate uppercase">{job.input_params?.prompt || 'Unit-X'}</p>
                        <p className={`text-[6px] ${job.status === 'succeeded' ? 'text-green-500' : job.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}>
                          {job.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                ))}
            </div>
         </PixelCard>
      </div>

      <div className="lg:col-span-3 order-1 lg:order-1 space-y-6">
        <PixelCard title="NEURAL PLAYER V.1">
           <div className="flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-lg bg-black/80 pixel-border border-4 border-[#306230] overflow-hidden flex items-center justify-center">
                {loading && (
                  <div className="absolute inset-0 z-30 bg-[#0f171e]/90 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 loading-shimmer mb-4" />
                    <span className="text-[10px] animate-pulse">STREAMING DATA...</span>
                  </div>
                )}
                
                {frames.length > 0 && frames[currentFrameIndex] ? (
                  <img 
                    src={frames[currentFrameIndex]} 
                    className="w-full h-full object-contain" 
                    style={{ imageRendering: 'pixelated' }} 
                    alt="Active Frame"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-[#8bac0f] opacity-40">
                    <div className="w-16 h-16 loading-shimmer" />
                    <span className="text-[8px] animate-pulse uppercase">
                      {currentJob?.status === 'running' ? 'Rendering animation...' : 'Preparing stream...'}
                    </span>
                  </div>
                )}

                {totalFrames > 0 && (
                  <div className="absolute top-4 right-4 bg-black/80 px-2 py-1 border border-[#306230] text-[8px] z-10">
                    FPS: {fps} | POS: {currentFrameIndex + 1}/{totalFrames}
                  </div>
                )}
                
                {currentJob?.status !== 'succeeded' && currentJob?.status && (
                  <div className="absolute top-4 left-4 bg-yellow-900/80 px-2 py-1 border border-yellow-500 text-yellow-500 text-[8px] animate-pulse z-10">
                    COMPUTING: {currentJob.status.toUpperCase()}
                  </div>
                )}
              </div>

              {totalFrames > 0 && (
                <div className="w-full mt-8 overflow-x-auto bg-[#0f380f]/20 p-4 pixel-border border-[#306230]">
                  <div className="flex gap-3 min-w-max pb-2">
                    {frames.map((src, idx) => {
                      const isStart = idx === 0;
                      const isMid = idx === midIdx;
                      const isEnd = idx === endIdx;
                      const isControl = isStart || isMid || isEnd;
                      const isCurrent = currentFrameIndex === idx;
                      const isExcluded = excludedFrames.has(idx);
                      
                      return (
                        <div 
                          key={idx}
                          onClick={() => { setCurrentFrameIndex(idx); setIsPlaying(false); }}
                          className={`relative w-14 h-14 pixel-border border-2 flex-shrink-0 cursor-pointer overflow-hidden transition-all duration-75
                            ${isCurrent ? 'border-[#8bac0f] scale-110 z-20 shadow-[0_0_10px_rgba(139,172,15,0.5)]' : 'border-[#306230] opacity-80 hover:opacity-100'}
                          `}
                        >
                          {src ? (
                            <img src={src} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40">
                               <div className="w-full h-1/2 loading-shimmer opacity-20" />
                               <span className="text-[6px] opacity-30 mt-1">GEN...</span>
                            </div>
                          )}
                          
                          {/* Excluded Frame Overlay */}
                          {isExcluded && (
                            <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center z-10">
                               <div className="text-[20px] font-bold text-white drop-shadow-md">X</div>
                            </div>
                          )}

                          {/* Top Right "X" Button */}
                          <button 
                            onClick={(e) => toggleFrameExclusion(e, idx)}
                            className={`absolute top-0 right-0 w-4 h-4 bg-red-900 border-b border-l border-red-500 flex items-center justify-center z-20 hover:bg-red-700 active:scale-90 transition-all ${isExcluded ? 'bg-green-900 border-green-500' : ''}`}
                          >
                            <span className="text-[6px] font-bold text-white">{isExcluded ? '+' : '×'}</span>
                          </button>
                          
                          {isControl && (
                            <div className={`absolute top-0 left-0 text-[5px] text-white px-1 font-bold ${isStart ? 'bg-blue-600' : isMid ? 'bg-purple-600' : 'bg-red-600'}`}>
                              {isStart ? 'START' : isMid ? 'MID' : 'END'}
                            </div>
                          )}
                          
                          <div className="absolute bottom-0 right-0 bg-black/80 text-[5px] px-1 text-[#8bac0f] font-mono border-tl border-[#306230]">
                            {idx + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="w-full max-w-xl mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <PixelButton variant="secondary" onClick={() => setIsPlaying(!isPlaying)} className="flex-1 sm:flex-none w-32 h-12">
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </PixelButton>
                  
                  <div className="flex-1 flex items-center gap-4 px-4 bg-[#0f171e] pixel-border border-[#306230] h-12">
                    <span className="text-[8px] whitespace-nowrap">TIMING: {fps} FPS</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="60" 
                      value={fps} 
                      onChange={(e) => setFps(parseInt(e.target.value))}
                      className="flex-1 accent-[#8bac0f]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[8px] uppercase">
                   <div className="p-3 bg-black/40 border-l-2 border-[#306230]">
                      <p className="opacity-40 mb-1">Status</p>
                      <p className={`font-bold ${currentJob?.status === 'succeeded' ? 'text-green-500' : 'text-yellow-500'}`}>
                        {currentJob?.status || 'OFFLINE'}
                      </p>
                   </div>
                   <div className="p-3 bg-black/40 border-l-2 border-[#306230]">
                      <p className="opacity-40 mb-1">Motion</p>
                      <p className="font-bold truncate">{currentJob?.input_params?.motion_type || '-'}</p>
                   </div>
                   <div className="p-3 bg-black/40 border-l-2 border-[#306230]">
                      <p className="opacity-40 mb-1">Frames</p>
                      <p className="font-bold">{totalFrames - excludedFrames.size} / {totalFrames}</p>
                   </div>
                   <div className="p-3 bg-black/40 border-l-2 border-[#306230]">
                      <p className="opacity-40 mb-1">Seed</p>
                      <p className="font-bold truncate">{currentJob?.input_params?.seed || '-'}</p>
                   </div>
                </div>

                {currentJob && (
                  <div className="flex flex-col gap-3 pt-2">
                    {currentJob.status === 'succeeded' && (
                      <PixelButton className="w-full h-14" onClick={handleDownload} disabled={isExporting || frames.length === 0 || excludedFrames.size === frames.length}>
                        {isExporting ? 'RECONSTRUCTING...' : 'EXTRACT SPRITESHEET (4-COL GRID)'}
                      </PixelButton>
                    )}
                    <PixelButton 
                      variant="secondary" 
                      className="w-full h-14" 
                      onClick={() => onRegenerate(currentJob)}
                    >
                      RE-GENERATE (LOAD PARAMS)
                    </PixelButton>
                  </div>
                )}
              </div>
           </div>
        </PixelCard>
      </div>
    </div>
  );
};

export default TaskPlayerPage;
