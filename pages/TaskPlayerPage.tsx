
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { Job } from '../types';
import { PixelButton, PixelCard } from '../components/PixelComponents';
import { sliceSpriteSheet, reconstructSpriteSheet, processImage } from '../utils/imageUtils';
import { floodFill, RGB, colorDistance } from '../utils/editorUtils';

type Tool = 'brush' | 'eraser' | 'move' | 'wand';
type WandMode = 'select' | 'add' | 'remove';

interface TaskPlayerPageProps {
  selectedJobId: string | null;
  onJobSelected: (id: string) => void;
  onRegenerate: (job: Job) => void;
}

const TaskPlayerPage: React.FC<TaskPlayerPageProps> = ({ selectedJobId, onJobSelected, onRegenerate }) => {
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<string[][]>([]);
  const [redoStack, setRedoStack] = useState<string[][]>([]);
  const [initialFrames, setInitialFrames] = useState<string[]>([]);

  const [excludedFrames, setExcludedFrames] = useState<Set<number>>(new Set());
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(12);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Editor States
  const [activeTool, setActiveTool] = useState<Tool>('brush');
  const [brushColor, setBrushColor] = useState('#8bac0f');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number, y: number } | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [isLightBg, setIsLightBg] = useState(false);
  
  // Tool Parameters
  const [brushSize, setBrushSize] = useState(1);
  const [eraserSize, setEraserSize] = useState(1);
  const [wandTolerance, setWandTolerance] = useState(30);
  const [bgRemovalTolerance, setBgRemovalTolerance] = useState(30);
  const [wandMode, setWandMode] = useState<WandMode>('select');
  const [menuOpenFor, setMenuOpenFor] = useState<Tool | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const playbackRef = useRef<number | null>(null);
  const isMounted = useRef(true);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const isJobRunning = currentJob?.status === 'running' || currentJob?.status === 'queued';

  const pushToHistory = (newFrames: string[]) => {
    setUndoStack(prev => [...prev.slice(-31), frames]);
    setRedoStack([]);
    setFrames([...newFrames]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isJobRunning) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(prevRedo => [...prevRedo, frames]);
    setUndoStack(prevUndo => prevUndo.slice(0, -1));
    setFrames([...prev]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || isJobRunning) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prevUndo => [...prevUndo, frames]);
    setRedoStack(prevRedo => prevRedo.slice(0, -1));
    setFrames([...next]);
  };

  const deleteSelection = useCallback(() => {
    if (selection.size === 0 || isJobRunning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    
    selection.forEach(key => {
      const [sx, sy] = key.split(',').map(Number);
      ctx.clearRect(sx, sy, 1, 1);
    });

    const newFrames = [...frames];
    newFrames[currentFrameIndex] = canvas.toDataURL();
    pushToHistory(newFrames);
    // Automatically clear selection after deletion
    setSelection(new Set());
  }, [selection, frames, currentFrameIndex, isJobRunning]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteSelection();
        }
      } else if (e.key === 'Escape') {
        setSelection(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection]);

  const updateFramesFromJob = useCallback(async (job: Job) => {
    const apiLength = job.input_params?.length || 33;
    const outputUrl = job.output_images?.[0]?.url;

    if (job.status === 'succeeded' && outputUrl) {
      try {
        const sliced = await sliceSpriteSheet(outputUrl, apiLength);
        if (isMounted.current) {
          setFrames([...sliced]);
          setInitialFrames([...sliced]);
          setUndoStack([]);
          setRedoStack([]);
          setExcludedFrames(new Set());
          setPan({ x: 0, y: 0 });
          setSelection(new Set());
        }
      } catch (err) {
        console.error("Failed to slice output:", err);
      }
    } else if (job.status === 'running' || job.status === 'queued') {
      if (job.input_images?.[0]?.url) {
        try {
          const firstFrame = await processImage(job.input_images[0].url, job.input_params?.use_padding, false, job.input_params?.pixel_size);
          if (isMounted.current) {
            setFrames([firstFrame]);
            setInitialFrames([firstFrame]);
            setExcludedFrames(new Set());
            setCurrentFrameIndex(0);
          }
        } catch (e) {
          console.error("Failed to process preview frame", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (selectedJobId) {
      setLoading(true);
      const fetchJob = async () => {
        try {
          const job = await apiService.getJobInfo(selectedJobId);
          if (isMounted.current) {
            setCurrentJob(job);
            await updateFramesFromJob(job);
            setLoading(false);
            if (job.status === 'running' || job.status === 'queued') {
              setTimeout(fetchJob, 3000);
            }
          }
        } catch (e) {
          console.error(e);
          setLoading(false);
        }
      };
      fetchJob();
    }
    return () => { isMounted.current = false; };
  }, [selectedJobId, updateFramesFromJob]);

  // Main Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frames[currentFrameIndex]) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = frames[currentFrameIndex];
  }, [frames, currentFrameIndex]);

  // Overlay Canvas Rendering (Selection & Hover)
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    overlay.width = canvas.width;
    overlay.height = canvas.height;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.imageSmoothingEnabled = false;

    // Draw Selection - Bright Orange
    if (selection.size > 0) {
      ctx.fillStyle = 'rgba(255, 102, 0, 0.4)';
      selection.forEach(key => {
        const [sx, sy] = key.split(',').map(Number);
        ctx.fillRect(sx, sy, 1, 1);
      });
      ctx.strokeStyle = 'rgba(255, 153, 0, 0.9)';
      ctx.lineWidth = 0.1;
      selection.forEach(key => {
        const [sx, sy] = key.split(',').map(Number);
        ctx.strokeRect(sx, sy, 1, 1);
      });
    }

    // Draw Hover Highlight
    if (hoverPixel && !isJobRunning) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      const size = activeTool === 'brush' ? brushSize : activeTool === 'eraser' ? eraserSize : 1;
      const offset = Math.floor((size - 1) / 2);
      ctx.fillRect(hoverPixel.x - offset, hoverPixel.y - offset, size, size);
    }
  }, [selection, hoverPixel, brushSize, eraserSize, activeTool, isJobRunning, frames]);

  const getEventCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    return {
      x: Math.floor((clientX - rect.left) / (rect.width / canvas.width)),
      y: Math.floor((clientY - rect.top) / (rect.height / canvas.height))
    };
  };

  const applyToolAtCoords = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const size = activeTool === 'brush' ? brushSize : eraserSize;
    const offset = Math.floor((size - 1) / 2);

    if (activeTool === 'brush') {
      ctx.fillStyle = brushColor;
      ctx.fillRect(x - offset, y - offset, size, size);
    } else if (activeTool === 'eraser') {
      ctx.clearRect(x - offset, y - offset, size, size);
    }
  };

  const handleCanvasInteraction = (e: React.MouseEvent) => {
    if (isJobRunning) return;
    const canvas = canvasRef.current;
    if (!canvas || isPlaying) return;

    const { x, y } = getEventCoords(e);
    setHoverPixel({ x, y });

    if (activeTool === 'move') {
      if (isPanning) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }

    if (isDrawing) {
      applyToolAtCoords(x, y);
    }
  };

  const handleWandSelection = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { width, height, data } = imgData;

    const getPixel = (px: number, py: number): RGB => {
      const i = (py * width + px) * 4;
      return { r: data[i], g: data[i+1], b: data[i+2], a: data[i+3] };
    };

    const startColor = getPixel(startX, startY);
    const visited = new Uint8Array(width * height);
    const stack: [number, number][] = [[startX, startY]];
    const newPoints = new Set<string>();

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
      const idx = cy * width + cx;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const currColor = getPixel(cx, cy);
      if (colorDistance(currColor, startColor) <= wandTolerance) {
        newPoints.add(`${cx},${cy}`);
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    }

    if (wandMode === 'select') {
      setSelection(newPoints);
    } else if (wandMode === 'add') {
      setSelection(prev => new Set([...prev, ...newPoints]));
    } else if (wandMode === 'remove') {
      setSelection(prev => {
        const next = new Set(prev);
        newPoints.forEach(p => next.delete(p));
        return next;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isJobRunning) return;
    setIsPlaying(false);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    const { x, y } = getEventCoords(e);
    
    if (activeTool === 'move') {
      setIsPanning(true);
    } else if (activeTool === 'wand') {
      handleWandSelection(x, y);
    } else {
      setIsDrawing(true);
      applyToolAtCoords(x, y);
    }
  };

  const handleMouseUp = () => {
    if (isJobRunning) return;
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        const newFrames = [...frames];
        newFrames[currentFrameIndex] = canvas.toDataURL();
        pushToHistory(newFrames);
      }
    }
    setIsDrawing(false);
    setIsPanning(false);
  };

  const removeBackground = async () => {
    if (isJobRunning) return;
    setLoading(true);
    const newFrames = await Promise.all(frames.map(async (f) => {
      const canvas = document.createElement('canvas');
      const img = await new Promise<HTMLImageElement>(res => {
        const i = new Image(); i.onload = () => res(i); i.src = f;
      });
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      floodFill(data, 0, 0, {r:0,g:0,b:0,a:0}, bgRemovalTolerance, null);
      floodFill(data, canvas.width-1, 0, {r:0,g:0,b:0,a:0}, bgRemovalTolerance, null);
      floodFill(data, 0, canvas.height-1, {r:0,g:0,b:0,a:0}, bgRemovalTolerance, null);
      floodFill(data, canvas.width-1, canvas.height-1, {r:0,g:0,b:0,a:0}, bgRemovalTolerance, null);
      ctx.putImageData(data, 0, 0);
      return canvas.toDataURL();
    }));
    pushToHistory(newFrames);
    setLoading(false);
  };

  const toggleFrameExclusion = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExcludedFrames(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDownload = async () => {
    if (frames.length === 0 || isJobRunning) return;
    setIsExporting(true);
    try {
      const activeFrames = frames.filter((_, idx) => !excludedFrames.has(idx));
      if (activeFrames.length === 0) {
        alert("Cannot export empty animation.");
        return;
      }
      const spriteSheetData = await reconstructSpriteSheet(activeFrames);
      const link = document.createElement('a');
      link.href = spriteSheetData;
      link.download = `rika_pixel_${selectedJobId?.slice(0,8)}.png`;
      link.click();
    } catch (err) { console.error(err); } finally { setIsExporting(false); }
  };

  useEffect(() => {
    if (isPlaying && frames.length > 1 && !isJobRunning) {
      playbackRef.current = window.setInterval(() => {
        setCurrentFrameIndex(prev => {
          let next = (prev + 1) % frames.length;
          let count = 0;
          while (excludedFrames.has(next) && count < frames.length) {
            next = (next + 1) % frames.length;
            count++;
          }
          return next;
        });
      }, 1000 / fps);
    } else {
      if (playbackRef.current) clearInterval(playbackRef.current);
    }
    return () => { if (playbackRef.current) clearInterval(playbackRef.current); };
  }, [isPlaying, frames.length, fps, excludedFrames, isJobRunning]);

  const ToolButton = ({ id, label, hasParams }: { id: Tool, label: string, hasParams?: boolean }) => (
    <div className="relative flex items-center group">
      <button 
        onClick={() => { setActiveTool(id); setIsPlaying(false); }}
        className={`w-10 h-10 flex items-center justify-center text-lg pixel-border border-2 transition-all ${activeTool === id ? 'bg-[#8bac0f] text-[#0f380f] border-white' : 'bg-black/40 text-[#8bac0f] border-[#306230] hover:border-[#8bac0f]'}`}
        title={id.toUpperCase()}
      >
        {label}
      </button>
      {hasParams && (
        <button 
          onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === id ? null : id); }}
          className={`absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-6 flex items-center justify-center text-[8px] bg-[#306230] text-[#8bac0f] pixel-border border-[1px] hover:bg-[#8bac0f] hover:text-[#0f380f] z-10`}
        >
          ▶
        </button>
      )}
      
      {menuOpenFor === id && (
        <div className="absolute left-14 top-0 z-[100] bg-[#0f380f] pixel-border p-4 w-48 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] uppercase font-bold text-[#8bac0f]">{id} Params</span>
            <button onClick={() => setMenuOpenFor(null)} className="text-[10px] text-white hover:text-red-400">×</button>
          </div>
          {id === 'brush' && (
            <div className="space-y-2">
              <div className="flex justify-between text-[8px] opacity-60"><span>SIZE: {brushSize}px</span></div>
              <input type="range" min="1" max="8" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-full accent-[#8bac0f]" />
            </div>
          )}
          {id === 'eraser' && (
            <div className="space-y-2">
              <div className="flex justify-between text-[8px] opacity-60"><span>SIZE: {eraserSize}px</span></div>
              <input type="range" min="1" max="8" value={eraserSize} onChange={e => setEraserSize(parseInt(e.target.value))} className="w-full accent-[#8bac0f]" />
            </div>
          )}
          {id === 'wand' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] opacity-60"><span>TOLERANCE: {wandTolerance}</span></div>
                <input type="range" min="0" max="255" value={wandTolerance} onChange={e => setWandTolerance(parseInt(e.target.value))} className="w-full accent-[#8bac0f]" />
              </div>
              <div className="space-y-2">
                <p className="text-[8px] opacity-60 uppercase">MODE</p>
                <div className="grid grid-cols-1 gap-1">
                  {(['select', 'add', 'remove'] as WandMode[]).map(mode => (
                    <button 
                      key={mode}
                      onClick={() => setWandMode(mode)}
                      className={`text-[8px] py-1 border ${wandMode === mode ? 'bg-[#8bac0f] text-[#0f380f] border-white' : 'bg-black/20 text-[#8bac0f] border-[#306230]'}`}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const darkChecker = `linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)`;
  const lightChecker = `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`;

  return (
    <div className="flex flex-col gap-6 w-full overflow-hidden">
      <div className="flex justify-between items-center bg-black/40 p-3 pixel-border border-[#306230] w-full">
        <div className="flex gap-4 text-[10px]">
          <span className="text-white/50">JOB: <span className="text-[#8bac0f]">{selectedJobId?.slice(0,8)}</span></span>
          <span className="text-white/50">MODE: <span className="text-[#8bac0f] uppercase">{currentJob?.input_params?.motion_type}</span></span>
          <span className="text-white/50 uppercase">STATUS: <span className={`${currentJob?.status === 'succeeded' ? 'text-[#8bac0f]' : 'text-yellow-500'}`}>{currentJob?.status}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isJobRunning ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-[10px]">{isJobRunning ? 'SYNC: GENERATING ASSETS' : 'REC: EDITOR ACTIVE'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 w-full items-start">
        <div className={`flex flex-col gap-4 p-2 bg-[#0f380f]/30 pixel-border border-[#306230] w-14 shrink-0 ${isJobRunning ? 'opacity-30 pointer-events-none' : ''}`}>
           <ToolButton id="brush" label="✎" hasParams />
           <ToolButton id="eraser" label="⌫" hasParams />
           <ToolButton id="wand" label="🪄" hasParams />
           <ToolButton id="move" label="🖐️" />
           
           <div className="mt-4 border-t-2 border-[#306230] pt-4 flex flex-col items-center gap-2">
              <input 
                type="color" 
                value={brushColor} 
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-10 h-10 cursor-pointer bg-transparent border-none p-0"
              />
              <button 
                onClick={() => setIsLightBg(!isLightBg)}
                className={`w-10 h-10 flex items-center justify-center text-[10px] pixel-border border-2 transition-all ${isLightBg ? 'bg-white text-black border-black' : 'bg-black text-white border-white'}`}
                title="TOGGLE BACKGROUND"
              >
                {isLightBg ? '☀️' : '🌙'}
              </button>
           </div>
        </div>

        <div className="flex flex-col gap-4 min-w-0 w-full overflow-hidden">
          <PixelCard className={`relative p-0 overflow-hidden h-[512px] flex items-center justify-center transition-colors duration-300 ${isLightBg ? 'bg-[#eee]' : 'bg-[#050a05]'}`}>
            <div 
              className="relative origin-center pointer-events-auto"
              style={{
                width: '512px',
                height: '512px',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                imageRendering: 'pixelated',
                backgroundImage: isLightBg ? lightChecker : darkChecker,
                backgroundSize: `16px 16px`,
                backgroundPosition: `0 0, 0 8px, 8px -8px, -8px 0px`
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleCanvasInteraction}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { setHoverPixel(null); handleMouseUp(); }}
            >
              {(loading || isJobRunning) && (
                <div className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center text-[10px] animate-pulse">
                   <div className="w-full h-1 bg-[#8bac0f]/20 relative overflow-hidden mb-2">
                      <div className="absolute inset-0 bg-[#8bac0f] loading-shimmer" />
                   </div>
                   <span className="uppercase tracking-widest text-white">{isJobRunning ? 'AI Rendering frames...' : 'Syncing...'}</span>
                </div>
              )}
              
              <canvas ref={canvasRef} className="w-full h-full block" style={{ imageRendering: 'pixelated' }} />
              <canvas 
                ref={overlayRef} 
                className={`absolute inset-0 w-full h-full pointer-events-none block ${isJobRunning ? '' : activeTool === 'move' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}
                style={{ imageRendering: 'pixelated' }} 
              />
            </div>

            <div className={`absolute bottom-4 right-4 bg-black/80 px-2 py-1 border border-[#306230] text-[8px] opacity-60 pointer-events-none text-[#8bac0f]`}>
              FRAME: {currentFrameIndex + 1}/{frames.length} | ZOOM: {Math.round(zoom*100)}% | PAN: {Math.round(pan.x)},{Math.round(pan.y)}
            </div>
          </PixelCard>

          <div className={`bg-[#0f380f]/20 p-4 pixel-border border-[#306230] w-full overflow-x-auto ${isJobRunning ? 'opacity-30 pointer-events-none' : ''}`}>
             <div className="flex gap-3 min-w-max pb-2">
                {frames.map((f, i) => (
                  <div 
                    key={i} 
                    onClick={() => { setCurrentFrameIndex(i); setIsPlaying(false); }}
                    className={`relative w-16 h-16 pixel-border border-2 cursor-pointer transition-all flex-shrink-0 ${currentFrameIndex === i ? 'border-[#8bac0f] scale-110 z-10' : 'border-[#306230] opacity-60 hover:opacity-100'}`}
                  >
                    <img src={f} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} alt={`Frame ${i+1}`} />
                    <button 
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-[10px] flex items-center justify-center rounded-sm z-20 border border-white hover:bg-red-500"
                      onClick={(e) => toggleFrameExclusion(i, e)}
                    > × </button>
                    {excludedFrames.has(i) && (
                      <div className="absolute inset-0 bg-red-900/60 z-10 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-400 rotate-45 absolute" />
                        <div className="w-full h-0.5 bg-red-400 -rotate-45 absolute" />
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 bg-black/80 text-[6px] px-1 text-[#8bac0f]">{i+1}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-64 shrink-0">
           <PixelCard title="SMART ACTIONS">
              <div className={`space-y-4 pt-2 ${isJobRunning ? 'opacity-30 pointer-events-none' : ''}`}>
                 <PixelButton variant="secondary" className="w-full text-[10px]" onClick={removeBackground}>SMART BG REMOVE</PixelButton>
                 <div className="space-y-1">
                    <div className="flex justify-between text-[8px] opacity-60 uppercase"><span>BG TOLERANCE: {bgRemovalTolerance}</span></div>
                    <input 
                      type="range" 
                      min="0" 
                      max="255" 
                      value={bgRemovalTolerance} 
                      onChange={e => setBgRemovalTolerance(parseInt(e.target.value))} 
                      className="w-full accent-[#8bac0f]" 
                    />
                 </div>
                 <p className="text-[7px] text-center opacity-40 uppercase">Press ESC to Clear Selection</p>
              </div>
           </PixelCard>

           <PixelCard title="HISTORY">
              <div className={`grid grid-cols-2 gap-2 pt-2 ${isJobRunning ? 'opacity-30 pointer-events-none' : ''}`}>
                <PixelButton variant="secondary" onClick={handleUndo} disabled={undoStack.length === 0} className="text-[10px]">UNDO</PixelButton>
                <PixelButton variant="secondary" onClick={handleRedo} disabled={redoStack.length === 0} className="text-[10px]">REDO</PixelButton>
              </div>
           </PixelCard>

           <PixelCard title="CONTROLS">
              <div className="space-y-4 pt-2">
                 <PixelButton variant={isPlaying ? 'secondary' : 'primary'} className="w-full" onClick={() => setIsPlaying(!isPlaying)} disabled={isJobRunning || frames.length <= 1}>
                   {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
                 </PixelButton>
                 <div className="space-y-2">
                   <div className="flex justify-between text-[8px] opacity-60"><span>FPS: {fps}</span></div>
                   <input type="range" min="1" max="60" value={fps} onChange={e => setFps(parseInt(e.target.value))} className="w-full accent-[#8bac0f]" disabled={isJobRunning} />
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-[8px] opacity-60"><span>VIEW ZOOM</span></div>
                   <input type="range" min="0.1" max="8" step="0.1" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-full accent-[#8bac0f]" />
                 </div>
              </div>
           </PixelCard>

           <div className="flex flex-col gap-3">
              <PixelButton variant="secondary" className="text-xs h-12" onClick={() => onRegenerate(currentJob!)} disabled={isJobRunning}>RE-GENERATE</PixelButton>
              <PixelButton variant="primary" className="text-xs h-12" disabled={isExporting || isJobRunning || frames.length <= 1} onClick={handleDownload}>
                {isExporting ? 'EXPORTING...' : 'DOWNLOAD SPRITES'}
              </PixelButton>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TaskPlayerPage;
