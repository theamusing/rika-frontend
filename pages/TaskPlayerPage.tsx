
import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { apiService } from '../services/apiService.ts';
import { Job } from '../types.ts';
import { PixelButton, PixelCard, PixelModal, PixelInput } from '../components/PixelComponents.tsx';
import { sliceSpriteSheet, reconstructSpriteSheet, processImage, fetchAsDataUrl, sliceCustomSpriteSheet, scaleToSize, processMapImage } from '../utils/imageUtils.ts';
import { floodFill, RGB, colorDistance, colorMatchRemoval } from '../utils/editorUtils.ts';
import { applyBackendCentroids } from '../utils/backendPalette.ts';
import { extractCentroidsAsync } from '../utils/paletteWorker.ts';
import { saveSpriteToCache, getSpriteFromCache, CachedSprite } from '../utils/dbUtils.ts';
import { ensureOriginalSpriteCache, animationSpec } from '../utils/originalSpriteCache.ts';
import { decodeImage } from '../utils/imageLoader.ts';
import { fitImageDimensions } from '../utils/animationDisplay.ts';
import { lassoSelection, PixelPoint, rectangleSelection, selectionOutlinePath } from '../utils/selectionUtils.ts';
import { Heart, ArrowLeft, Move, Pipette, HelpCircle, SquareDashedMousePointer, PaintBucket, Eye, EyeOff } from 'lucide-react';
import ColorPickerPopover from '../components/ColorPickerPopover.tsx';
// @ts-ignore
import gifshot from 'gifshot';

type Tool = 'brush' | 'eraser' | 'move' | 'wand' | 'selection' | 'bucket' | 'nudge' | 'picker';
type SelectionMode = 'select' | 'add' | 'remove';
type SelectionShape = 'rectangle' | 'lasso';
interface SelectionDrag { shape: SelectionShape; start: PixelPoint; current: PixelPoint; points: PixelPoint[]; }

interface TaskPlayerPageProps {
  selectedJobId: string | null;
  initialJob?: Job | null;
  onJobSelected: (id: string) => void;
  onRegenerate: (job: Job | { action: 'animate'; start_image: string; start_pixel_size: number; source_animation_version?: number; source_params?: any }) => void;
  onBack?: () => void;
  onRegisterSaveBeforeLeave?: (save: (() => Promise<void>) | null) => void;
  onJobFailed?: (message: string) => void;
  lang?: 'en' | 'zh';
  isLoggedIn?: boolean;
  onLoginRequest?: () => void;
}

const CDN_BASE = "https://cdn.rika-ai.com/assets/frontpage/";
const ICON_BASE = `${CDN_BASE}icons/`;
interface FrameData {
  id: string;
  url: string;
  isOriginal: boolean;
  isExcluded?: boolean;
}

const TaskPlayerPage: React.FC<TaskPlayerPageProps> = ({
  selectedJobId,
  initialJob,
  onJobSelected,
  onRegenerate,
  onBack,
  onRegisterSaveBeforeLeave,
  onJobFailed,
  lang = 'en',
  isLoggedIn = false,
  onLoginRequest
}) => {
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [undoStack, setUndoStack] = useState<FrameData[][]>([]);
  const [redoStack, setRedoStack] = useState<FrameData[][]>([]);
  const [initialFrames, setInitialFrames] = useState<FrameData[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(12);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [isExporting4x, setIsExporting4x] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [customRows, setCustomRows] = useState(1);
  const [customCols, setCustomCols] = useState(1);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, index: number } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [activeTool, setActiveTool] = useState<Tool>('brush');
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number, y: number } | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selectionShape, setSelectionShape] = useState<SelectionShape>('rectangle');
  const [selectionDrag, setSelectionDrag] = useState<SelectionDrag | null>(null);
  const [isLightBg, setIsLightBg] = useState(false);
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isQPressed, setIsQPressed] = useState(false);

  const [brushSize, setBrushSize] = useState(1);
  const [eraserSize, setEraserSize] = useState(1);
  const [wandTolerance, setWandTolerance] = useState(30);
  const [bgRemovalTolerance, setBgRemovalTolerance] = useState(30);
  const [paletteColorCount, setPaletteColorCount] = useState(32);
  const [useGlobalColorMatch, setUseGlobalColorMatch] = useState(false);
  const [removalBgColor, setRemovalBgColor] = useState('#000000');
  const [isPickingRemovalColor, setIsPickingRemovalColor] = useState(false);
  const [colorInputKey, setColorInputKey] = useState(0);
  const [showBrushPicker, setShowBrushPicker] = useState(false);
  const [showRemovalPicker, setShowRemovalPicker] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('select');
  const [menuOpenFor, setMenuOpenFor] = useState<Tool | null>(null);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [frameDimensions, setFrameDimensions] = useState({ width: 128, height: 128 });
  const [viewportDimensions, setViewportDimensions] = useState({ width: 512, height: 512 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedJobId, setLoadedJobId] = useState<string | null>(null);
  const [retryLoad, setRetryLoad] = useState(0);
  const loadedJobRef = useRef<string | null>(null);
  const loadGenerationRef = useRef(0);
  const latestFramesRef = useRef(frames);
  latestFramesRef.current = frames;

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const selectionDragRef = useRef<SelectionDrag | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const brushColorAnchorRef = useRef<HTMLDivElement>(null);
  const removalColorAnchorRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<number | null>(null);
  const isMounted = useRef(true);
  const customModeRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const handledFailureJobId = useRef<string | null>(null);

  const isZh = lang === 'zh';
  const isJobRunning = currentJob?.status === 'running' || currentJob?.status === 'queued';
  const isEditorBlocked = isJobRunning || (!!selectedJobId && !isCustomMode && loadedJobId !== selectedJobId);
  const processingStage = currentJob?.processing_stage;
  const processingLabel = processingStage === 'prompt_optimization'
    ? (isZh ? '正在优化提示词' : 'OPTIMIZING PROMPT')
    : processingStage === 'generation_starting'
      ? (isZh ? '正在启动生成' : 'STARTING GENERATION')
      : (isZh ? '正在渲染' : 'RENDERING');
  const isSingleFrame = currentJob?.job_type === 'character' || currentJob?.job_type === 'item' || currentJob?.job_type === 'map';
  const dimensions = currentJob?.job_type === 'map' && frames.length > 0 ? frameDimensions
    : fitImageDimensions(frameDimensions, Math.min(512, viewportDimensions.width), Math.min(512, viewportDimensions.height));
  const thumbnailDimensions = fitImageDimensions(frameDimensions, 80, 80);
  const onionSkinFrame = onionSkinEnabled && !isEditorBlocked && !loading && !isSingleFrame && currentFrameIndex > 0
    ? frames[currentFrameIndex - 1] : undefined;
  const effectiveTool: Tool = isPickingRemovalColor ? 'picker' : (isCtrlPressed ? 'move' : isQPressed ? 'picker' : activeTool);

  const zhScale = (enSize: number) => `${isZh ? enSize + 3 : enSize}px`;

  useEffect(() => {
    if (!currentJob || isSingleFrame) return;
    setFps(12);
  }, [currentJob?.gen_id, isSingleFrame]);

  useEffect(() => {
    setOnionSkinEnabled(false);
  }, [selectedJobId]);

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const rect = contextMenuRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(contextMenu.x, window.innerWidth - rect.width - 8));
    const y = Math.max(8, Math.min(contextMenu.y, window.innerHeight - rect.height - 8));
    if (x !== contextMenu.x || y !== contextMenu.y) setContextMenu({ ...contextMenu, x, y });
  }, [contextMenu]);

  const hexToRgb = (hex: string): RGB => {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return { r, g, b, a: 255 };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const getAverageCornerColor = useCallback(async (frameUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        try {
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const corners = [
            { x: 0, y: 0 },
            { x: img.width - 1, y: 0 },
            { x: 0, y: img.height - 1 },
            { x: img.width - 1, y: img.height - 1 }
          ];
          let r = 0, g = 0, b = 0;
          corners.forEach(c => {
            const i = (c.y * img.width + c.x) * 4;
            r += data[i]; g += data[i+1]; b += data[i+2];
          });
          resolve(rgbToHex(Math.round(r/4), Math.round(g/4), Math.round(b/4)));
        } catch (e) {
          resolve('#000000');
        }
      };
      img.onerror = () => resolve('#000000');
      img.src = frameUrl;
    });
  }, []);

  const toggleLike = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      onLoginRequest?.();
      return;
    }
    const newLiked = !job.liked;

    // Optimistic update
    setCurrentJob(prev => prev && prev.gen_id === job.gen_id ? { ...prev, liked: newLiked } : prev);

    try {
      await apiService.setLiked(job.gen_id, newLiked);
    } catch (err) {
      console.error("Failed to set liked status", err);
      // Rollback on error
      setCurrentJob(prev => prev && prev.gen_id === job.gen_id ? { ...prev, liked: !newLiked } : prev);
    }
  };

  const pushToHistory = (newFrames: FrameData[]) => {
    setUndoStack(prev => [...prev.slice(-31), frames]);
    setRedoStack([]);
    setFrames([...newFrames]);
    setHasUnsavedEdits(true);
  };

  const nudgeFrame = useCallback((dx: number, dy: number) => {
    if (isEditorBlocked) return;
    setIsPlaying(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // 1. Capture current state
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(canvas, 0, 0);

    // 2. Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Draw with offset
    ctx.drawImage(tempCanvas, dx, dy);

    // 4. Fill the gap with the "previous color" (edge smear)
    if (dx > 0) {
      // Moved right, fill column 0 with original column 0
      ctx.drawImage(tempCanvas, 0, 0, 1, canvas.height, 0, 0, 1, canvas.height);
    } else if (dx < 0) {
      // Moved left, fill last column with original last column
      ctx.drawImage(tempCanvas, canvas.width - 1, 0, 1, canvas.height, canvas.width - 1, 0, 1, canvas.height);
    }

    if (dy > 0) {
      // Moved down, fill row 0 with original row 0
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, 1, 0, 0, canvas.width, 1);
    } else if (dy < 0) {
      // Moved up, fill last row with original last row
      ctx.drawImage(tempCanvas, 0, canvas.height - 1, canvas.width, 1, 0, canvas.height - 1, canvas.width, 1);
    }

    const newFrames = [...frames];
    newFrames[currentFrameIndex] = { ...newFrames[currentFrameIndex], url: canvas.toDataURL() };
    pushToHistory(newFrames);
  }, [frames, currentFrameIndex, isEditorBlocked]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || isEditorBlocked) return;
    setIsPlaying(false);
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(prevRedo => [...prevRedo, frames]);
    setUndoStack(prevUndo => prevUndo.slice(0, -1));
    setFrames([...prev]);
    setHasUnsavedEdits(true);
  }, [undoStack, frames, isEditorBlocked]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || isEditorBlocked) return;
    setIsPlaying(false);
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prevUndo => [...prevUndo, frames]);
    setRedoStack(prevRedo => prevRedo.slice(0, -1));
    setFrames([...next]);
    setHasUnsavedEdits(true);
  }, [redoStack, frames, isEditorBlocked]);

  const handleSaveToCache = useCallback(async () => {
    if (!selectedJobId || frames.length === 0 || isJobRunning || isCustomMode || loadedJobRef.current !== selectedJobId) return;
    const generation = loadGenerationRef.current;
    const savingFrames = frames;
    try {
      const spriteSheet = await reconstructSpriteSheet(savingFrames.map(frame => frame.url));
      if (generation !== loadGenerationRef.current || loadedJobRef.current !== selectedJobId || latestFramesRef.current !== savingFrames) return;
      const cacheData: CachedSprite = {
        gen_id: selectedJobId, spriteSheet, updatedAt: Date.now(),
        customData: {
          cacheVersion: 3, source: 'edited', columns: Math.min(4, savingFrames.length),
          frameMetadata: savingFrames.map(frame => ({ id: frame.id, isOriginal: frame.isOriginal, isExcluded: frame.isExcluded })),
        },
      };
      await saveSpriteToCache(cacheData);
      if (generation === loadGenerationRef.current && latestFramesRef.current === savingFrames) setHasUnsavedEdits(false);
    } catch (error) { console.error('Edits could not be saved locally.', error); }
  }, [selectedJobId, frames, isJobRunning, isCustomMode]);

  useEffect(() => {
    onRegisterSaveBeforeLeave?.(async () => {
      if (hasUnsavedEdits && !isJobRunning && !isCustomMode) await handleSaveToCache();
    });
    return () => onRegisterSaveBeforeLeave?.(null);
  }, [handleSaveToCache, hasUnsavedEdits, isCustomMode, isJobRunning, onRegisterSaveBeforeLeave]);

  const deleteSelection = useCallback(() => {
    if (selection.size === 0 || isEditorBlocked) return;
    setIsPlaying(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    selection.forEach(key => {
      const [sx, sy] = key.split(',').map(Number);
      ctx.clearRect(sx, sy, 1, 1);
    });
    const newFrames = [...frames];
    newFrames[currentFrameIndex] = { ...newFrames[currentFrameIndex], url: canvas.toDataURL() };
    pushToHistory(newFrames);
    setSelection(new Set());
  }, [selection, frames, currentFrameIndex, isEditorBlocked]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      if (e.key === 'Control' || e.key === 'Meta') setIsCtrlPressed(true);
      if (key === 'q') setIsQPressed(true);
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z') { e.preventDefault(); handleUndo(); }
        else if (key === 'y') { e.preventDefault(); handleRedo(); }
        else if (key === 's') { e.preventDefault(); handleSaveToCache(); }
        else if (key === 'd' && selection.size > 0) {
          e.preventDefault();
          selectionDragRef.current = null;
          setSelectionDrag(null);
          setSelection(new Set());
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); }
      else if (e.key === 'Escape') {
        if (selectionDragRef.current) {
          selectionDragRef.current = null;
          setSelectionDrag(null);
        } else setSelection(new Set());
        setIsPickingRemovalColor(false);
      }
      else if (activeTool === 'nudge') {
        if (e.key === 'ArrowUp') { e.preventDefault(); nudgeFrame(0, -1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); nudgeFrame(0, 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeFrame(-1, 0); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); nudgeFrame(1, 0); }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setIsCtrlPressed(false);
      if (e.key.toLowerCase() === 'q') setIsQPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [deleteSelection, handleUndo, handleRedo, handleSaveToCache, activeTool, selection.size]);

  useEffect(() => {
    const interval = setInterval(() => { if (hasUnsavedEdits && !isJobRunning && loadedJobRef.current === selectedJobId) void handleSaveToCache(); }, 10000);
    return () => clearInterval(interval);
  }, [handleSaveToCache, isJobRunning, hasUnsavedEdits, selectedJobId]);

  useEffect(() => {
    if (frames.length > 0 && removalBgColor === '#000000') {
      getAverageCornerColor(frames[0].url).then(setRemovalBgColor);
    }
  }, [frames.length, getAverageCornerColor, removalBgColor]);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const nextZoom = Math.min(Math.max(zoom * delta, 0.1), 8);
      if (nextZoom === zoom) return;
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const shift = 1 - nextZoom / zoom;
      setPan({
        x: pan.x + (e.clientX - centerX) * shift,
        y: pan.y + (e.clientY - centerY) * shift,
      });
      setZoom(nextZoom);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [zoom, pan]);

  const updateFramesFromJob = useCallback(async (job: Job, isCurrent: () => boolean): Promise<boolean> => {
    if (!isCurrent()) return false;
    const single = ['character', 'item', 'map'].includes(job.job_type || 'animation');
    setLoadError(null);
    loadedJobRef.current = null;
    setLoadedJobId(null);
    if (job.status !== 'succeeded') {
      if ((job.status === 'running' || job.status === 'queued') && job.input_images?.[0]?.url) {
        const url = job.input_images[0].url;
        const preview = await fetchAsDataUrl(url).catch(() => url);
        if (isCurrent()) {
          setFrames([{ id: `waiting-${job.gen_id}`, url: preview, isOriginal: true }]);
          setCurrentFrameIndex(0);
        }
      }
      return false;
    }
    setLoading(true);
    setFrames([]);
    setSelection(new Set());
    try {
      let mapped: FrameData[];
      if (!single) {
        const cached = await ensureOriginalSpriteCache(job);
        if (!isCurrent()) return false;
        const metadata = cached.customData?.frameMetadata;
        const count = Array.isArray(metadata) ? metadata.length : animationSpec(job).frameCount;
        const sliced = await sliceSpriteSheet(cached.spriteSheet, count, Number(job.input_params?.length ?? 33), cached.customData?.columns);
        mapped = sliced.map((url, index) => ({
          id: metadata?.[index]?.id || `original-${job.gen_id}-${index}`, url,
          isOriginal: metadata?.[index]?.isOriginal ?? true,
          isExcluded: metadata?.[index]?.isExcluded ?? false,
        }));
      } else {
        const cached = await getSpriteFromCache(job.gen_id).catch(() => null);
        let processed: string | undefined;
        if (cached?.spriteSheet) {
          try { await decodeImage(cached.spriteSheet); processed = cached.spriteSheet; }
          catch (error) { console.warn('Stored image could not be opened.', error); }
        }
        if (!processed) {
          const outputUrl = job.output_images?.[0]?.url;
          if (!outputUrl) throw new Error('Generated image is unavailable');
          if (job.job_type === 'map') processed = await processMapImage(outputUrl);
          else {
            const size = parseInt(job.input_params?.pixel_size || '128');
            const version = parseInt(job.input_params?.version || '1');
            processed = await scaleToSize(outputUrl, version === 2 ? size : (size === 32 ? 64 : 128));
          }
        }
        mapped = [{ id: `original-${job.gen_id}-0`, url: processed, isOriginal: true }];
      }
      if (!isCurrent()) return false;
      if (!mapped.length) throw new Error('The animation has no readable frames');
      setFrames(mapped); setInitialFrames(mapped); setCurrentFrameIndex(0);
      setUndoStack([]); setRedoStack([]); setPan({ x: 0, y: 0 });
      setHasUnsavedEdits(false); setLoadError(null);
      loadedJobRef.current = job.gen_id;
      setLoadedJobId(job.gen_id);
      return true;
    } catch (error) {
      if (isCurrent()) {
        console.error('Generated result could not be loaded.', { jobId: job.gen_id, error });
        setFrames([]);
        setLoadError(error instanceof Error ? error.message : String(error));
      }
      return false;
    } finally { if (isCurrent()) setLoading(false); }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    let active = true;
    const generation = ++loadGenerationRef.current;
    const isCurrent = () => active && generation === loadGenerationRef.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    loadedJobRef.current = null;
    setLoadedJobId(null);
    setLoadError(null);
    if (selectedJobId) {
      setLoading(true); setFrames([]); setHasUnsavedEdits(false);
      setSelection(new Set()); setUndoStack([]); setRedoStack([]);
      customModeRef.current = false;
      setIsCustomMode(false);
      let firstAttempt = true;
      let failedInitial: Job | null = null;
      const fetchJob = async () => {
        try {
          if (firstAttempt && initialJob?.gen_id === selectedJobId && initialJob.status === 'succeeded') {
            firstAttempt = false;
            setCurrentJob(initialJob);
            if (await updateFramesFromJob(initialJob, isCurrent)) {
              if (isCurrent()) setLoading(false);
              return;
            }
            failedInitial = initialJob;
          }
          firstAttempt = false;
          const job = await apiService.getJobInfo(selectedJobId);
          if (!isCurrent()) return;
          setCurrentJob(job);
          if (failedInitial && job.status === 'succeeded') {
            const imageIdentity = (value: Job) => JSON.stringify([
              value.output_images?.[0]?.url, value.animation_version,
              value.input_params?.animation_version, value.input_params?.output_frames,
              value.input_params?.length, value.input_params?.pixel_size,
            ]);
            if (imageIdentity(job) === imageIdentity(failedInitial)) {
              setLoading(false); return;
            }
          }
          await updateFramesFromJob(job, isCurrent);
          if (!isCurrent()) return;
          setLoading(false);
          const newlySubmitted = !initialJob || initialJob.gen_id !== selectedJobId;
          if (newlySubmitted && job.status === 'failed' && Number(job.animation_version ?? job.input_params?.animation_version) === 2) {
            if (handledFailureJobId.current !== job.gen_id) {
              handledFailureJobId.current = job.gen_id;
              onJobFailed?.(job.error || 'Animation generation failed. Your credits have been refunded.');
            }
            return;
          }
          if (job.status === 'running' || job.status === 'queued') timer = setTimeout(fetchJob, 3000);
        } catch (error) {
          if (!isCurrent()) return;
          console.warn('Job status could not be refreshed.', error);
          setLoading(false);
          setLoadError('Could not refresh the task. Retrying…');
          timer = setTimeout(fetchJob, 5000);
        }
      };
      void fetchJob();
    } else if (!customModeRef.current) {
      const blank = document.createElement('canvas');
      blank.width = 128; blank.height = 128;
      const frame: FrameData = { id: `f-${Date.now()}-0`, url: blank.toDataURL(), isOriginal: true, isExcluded: false };
      setFrames([frame]); setInitialFrames([frame]); setCurrentFrameIndex(0);
      setCurrentJob(null); setIsCustomMode(false); setLoading(false);
      setUndoStack([]); setRedoStack([]); setHasUnsavedEdits(false);
    }
    return () => {
      active = false; isMounted.current = false;
      if (timer) clearTimeout(timer);
      loadedJobRef.current = null;
    };
  }, [selectedJobId, initialJob, updateFramesFromJob, onJobFailed, retryLoad]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') return;
    const updateViewport = () => {
      if (viewport.clientWidth > 0 && viewport.clientHeight > 0) {
        setViewportDimensions(previous => previous.width === viewport.clientWidth && previous.height === viewport.clientHeight
          ? previous : { width: viewport.clientWidth, height: viewport.clientHeight });
      }
    };
    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    if (frames[currentFrameIndex]) {
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        canvas.width = img.width; canvas.height = img.height;
        ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setFrameDimensions(previous => previous.width === img.width && previous.height === img.height
          ? previous : { width: img.width, height: img.height });
      };
      img.src = frames[currentFrameIndex].url;
    } else {
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, 128, 128);
      setFrameDimensions(previous => previous.width === 128 && previous.height === 128
        ? previous : { width: 128, height: 128 });
    }
    return () => { cancelled = true; };
  }, [frames, currentFrameIndex, currentJob]);

  const selectionOutline = useMemo(
    () => selectionOutlinePath(selection, frameDimensions.width, frameDimensions.height),
    [selection, frameDimensions.width, frameDimensions.height],
  );
  const selectionFill = useMemo(() => {
    const fill = document.createElement('canvas');
    fill.width = frameDimensions.width;
    fill.height = frameDimensions.height;
    const context = fill.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(255, 102, 0, 0.18)';
      selection.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        if (x >= 0 && y >= 0 && x < fill.width && y < fill.height) context.fillRect(x, y, 1, 1);
      });
    }
    return fill;
  }, [selection, frameDimensions.width, frameDimensions.height]);
  const dragOutline = useMemo(() => {
    if (!selectionDrag) return '';
    if (selectionDrag.shape === 'rectangle') {
      const minX = Math.min(selectionDrag.start.x, selectionDrag.current.x);
      const minY = Math.min(selectionDrag.start.y, selectionDrag.current.y);
      const maxX = Math.max(selectionDrag.start.x, selectionDrag.current.x) + 1;
      const maxY = Math.max(selectionDrag.start.y, selectionDrag.current.y) + 1;
      return `M${minX} ${minY}H${maxX}V${maxY}H${minX}Z`;
    }
    return selectionDrag.points.map((point, index) =>
      `${index ? 'L' : 'M'}${point.x + 0.5} ${point.y + 0.5}`).join('') +
      (selectionDrag.points.length > 2 ? 'Z' : '');
  }, [selectionDrag]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (selection.size) ctx.drawImage(selectionFill, 0, 0);
    if (hoverPixel && !isJobRunning && effectiveTool !== 'selection') {
      const defaultColor = isLightBg ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.4)';
      ctx.fillStyle = (isQPressed || effectiveTool === 'picker') ? 'rgba(0, 255, 255, 0.4)' : defaultColor;
      const size = (isQPressed || effectiveTool === 'picker') ? 1 : (effectiveTool === 'brush' ? brushSize : effectiveTool === 'eraser' ? eraserSize : 1);
      const offset = Math.floor((size - 1) / 2);
      ctx.fillRect(hoverPixel.x - offset, hoverPixel.y - offset, size, size);
    }
  }, [selectionFill, selection.size, hoverPixel, brushSize, eraserSize,
    effectiveTool, isJobRunning, isQPressed, isLightBg, frameDimensions]);

  const getEventCoords = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: Math.floor((clientX - rect.left) / (rect.width / canvas.width)), y: Math.floor((clientY - rect.top) / (rect.height / canvas.height)) };
  };

  const applyToolAtCoords = (x: number, y: number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!; const size = effectiveTool === 'brush' ? brushSize : eraserSize;
    const offset = Math.floor((size - 1) / 2);
    if (effectiveTool === 'brush') { ctx.fillStyle = brushColor; ctx.fillRect(x - offset, y - offset, size, size); }
    else if (effectiveTool === 'eraser') { ctx.clearRect(x - offset, y - offset, size, size); }
  };

  const handleCanvasInteraction = (e: React.MouseEvent) => {
    const { x, y } = getEventCoords(e);
    if (effectiveTool === 'selection') return;
    setHoverPixel({ x, y });
    if (isEditorBlocked) return;
    const canvas = canvasRef.current;
    if (!canvas || isPlaying) return;

    if (effectiveTool === 'move') {
      if (isPanning) {
        const dx = e.clientX - lastMousePos.current.x; const dy = e.clientY - lastMousePos.current.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy })); lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }
    if (isDrawing) {
      if (effectiveTool === 'picker') {
        const canvas = canvasRef.current; if (canvas) {
          const ctx = canvas.getContext('2d')!; const pixelData = ctx.getImageData(x, y, 1, 1).data;
          if (pixelData[3] > 0) {
            const hex = "#" + ((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2]).toString(16).slice(1);
            if (isPickingRemovalColor) {
              setRemovalBgColor(hex);
            } else {
              setBrushColor(hex);
            }
          }
        }
      } else {
        applyToolAtCoords(x, y);
      }
    }
  };

  const applySelectionPoints = (points: Set<string>) => {
    if (selectionMode === 'select') setSelection(points);
    else if (selectionMode === 'add') setSelection(previous => new Set([...previous, ...points]));
    else setSelection(previous => {
      const next = new Set(previous);
      points.forEach(point => next.delete(point));
      return next;
    });
  };

  const getWandRegion = (imgData: ImageData, startX: number, startY: number): Set<string> => {
    const { width, height, data } = imgData;
    if (startX < 0 || startY < 0 || startX >= width || startY >= height) return new Set();
    const getPixel = (px: number, py: number): RGB => { const i = (py * width + px) * 4; return { r: data[i], g: data[i+1], b: data[i+2], a: data[i+3] }; };
    const startColor = getPixel(startX, startY); const visited = new Uint8Array(width * height);
    const stack: [number, number][] = [[startX, startY]]; const newPoints = new Set<string>();
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!; if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
      const idx = cy * width + cx; if (visited[idx]) continue; visited[idx] = 1;
      const currColor = getPixel(cx, cy);
      if (colorDistance(currColor, startColor) <= wandTolerance) { newPoints.add(`${cx},${cy}`); stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); }
    }
    return newPoints;
  };

  const handleWandSelection = (startX: number, startY: number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    applySelectionPoints(getWandRegion(ctx.getImageData(0, 0, canvas.width, canvas.height), startX, startY));
  };

  const handleBucketFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !frames[currentFrameIndex]) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const points = selection.size > 0 ? selection : getWandRegion(imageData, startX, startY);
    const color = hexToRgb(brushColor);
    let changed = false;
    points.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
      const index = (y * canvas.width + x) * 4;
      const pixels = imageData.data;
      if (pixels[index] === color.r && pixels[index + 1] === color.g && pixels[index + 2] === color.b && pixels[index + 3] === 255) return;
      pixels[index] = color.r;
      pixels[index + 1] = color.g;
      pixels[index + 2] = color.b;
      pixels[index + 3] = 255;
      changed = true;
    });
    if (!changed) return;
    ctx.putImageData(imageData, 0, 0);
    const newFrames = [...frames];
    newFrames[currentFrameIndex] = { ...newFrames[currentFrameIndex], url: canvas.toDataURL() };
    pushToHistory(newFrames);
  };

  const getSelectionPoint = (event: React.PointerEvent): PixelPoint => {
    const canvas = canvasRef.current!;
    const { x, y } = getEventCoords(event);
    return { x: Math.max(0, Math.min(canvas.width - 1, x)), y: Math.max(0, Math.min(canvas.height - 1, y)) };
  };

  const handleSelectionPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (effectiveTool !== 'selection' || isJobRunning || event.button !== 0 || !canvasRef.current) return;
    event.preventDefault();
    setIsPlaying(false);
    const point = getSelectionPoint(event);
    const drag: SelectionDrag = { shape: selectionShape, start: point, current: point, points: [point] };
    selectionDragRef.current = drag;
    setSelectionDrag(drag);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSelectionPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = selectionDragRef.current;
    if (!drag || !canvasRef.current) return;
    const point = getSelectionPoint(event);
    if (point.x === drag.current.x && point.y === drag.current.y) return;
    const next: SelectionDrag = {
      ...drag,
      current: point,
      points: drag.shape === 'lasso' ? [...drag.points, point] : drag.points,
    };
    selectionDragRef.current = next;
    setSelectionDrag(next);
  };

  const handleSelectionPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = selectionDragRef.current;
    if (!drag || !canvasRef.current) return;
    const point = getSelectionPoint(event);
    const canvas = canvasRef.current;
    const points = drag.shape === 'rectangle'
      ? rectangleSelection(drag.start, point, canvas.width, canvas.height)
      : lassoSelection([...drag.points, point], canvas.width, canvas.height);
    applySelectionPoints(points);
    selectionDragRef.current = null;
    setSelectionDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleSelectionPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectionDragRef.current) return;
    selectionDragRef.current = null;
    setSelectionDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (effectiveTool === 'selection') return;
    if (isEditorBlocked) return; setIsPlaying(false); lastMousePos.current = { x: e.clientX, y: e.clientY };
    const { x, y } = getEventCoords(e);
    if (isQPressed || effectiveTool === 'picker') {
      const canvas = canvasRef.current; if (canvas) {
        const ctx = canvas.getContext('2d')!; const pixelData = ctx.getImageData(x, y, 1, 1).data;
        if (pixelData[3] > 0) {
          const hex = "#" + ((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2]).toString(16).slice(1);
          if (isPickingRemovalColor) {
            setRemovalBgColor(hex);
            setIsPickingRemovalColor(false);
          } else {
            setBrushColor(hex);
          }
        }
      }
      if (effectiveTool === 'picker') setIsDrawing(true);
      return;
    }
    if (effectiveTool === 'move') setIsPanning(true);
    else if (effectiveTool === 'wand') handleWandSelection(x, y);
    else if (effectiveTool === 'bucket') handleBucketFill(x, y);
    else { setIsDrawing(true); applyToolAtCoords(x, y); }
  };

  const handleMouseUp = () => {
    if (isEditorBlocked) return;
    if (isPickingRemovalColor) {
      setIsPickingRemovalColor(false);
    }
    if (isDrawing) {
      const canvas = canvasRef.current; if (canvas && effectiveTool !== 'picker') {
        const newFrames = [...frames];
        newFrames[currentFrameIndex] = { ...newFrames[currentFrameIndex], url: canvas.toDataURL() };
        pushToHistory(newFrames);
      }
    }
    setIsDrawing(false); setIsPanning(false);
  };

  const handleCopyFrame = (index: number) => {
    if (frames.length >= 64) return;
    const newFrames = [...frames];
    const source = frames[index];
    const copy: FrameData = {
      id: `f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: source.url,
      isOriginal: false
    };
    newFrames.splice(index + 1, 0, copy);
    pushToHistory(newFrames);
    setContextMenu(null);
  };

  const handleDeleteFrame = (index: number) => {
    if (frames[index].isOriginal) return;
    const newFrames = frames.filter((_, i) => i !== index);
    if (currentFrameIndex >= newFrames.length) {
      setCurrentFrameIndex(Math.max(0, newFrames.length - 1));
    }
    pushToHistory(newFrames);
    setContextMenu(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent ghost image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFrames = [...frames];
    const item = newFrames.splice(draggedIndex, 1)[0];
    newFrames.splice(index, 0, item);

    setFrames(newFrames);
    setDraggedIndex(index);
    if (currentFrameIndex === draggedIndex) setCurrentFrameIndex(index);
    else if (currentFrameIndex === index) setCurrentFrameIndex(draggedIndex);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      pushToHistory(frames);
    }
    setDraggedIndex(null);
  };

  const removeBackground = async () => {
    if (isEditorBlocked) return;
    setIsPlaying(false);
    setLoading(true);
    const bgRGB = hexToRgb(removalBgColor);
    const newFrames = await Promise.all(frames.map(async (f) => {
      const canvas = document.createElement('canvas');
      const img = await new Promise<HTMLImageElement>(res => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => res(i);
        i.src = f.url;
      });
      canvas.width = img.width; canvas.height = img.height; const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (useGlobalColorMatch) {
        colorMatchRemoval(data, bgRGB, bgRemovalTolerance);
      } else {
        floodFill(data, 0, 0, {r:0,g:0,b:0,a:0}, bgRemovalTolerance, null);
        floodFill(data, canvas.width-1, 0, {r:0,g:0,b:0,a:0}, bgRemovalTolerance, null);
        floodFill(data, 0, canvas.height-1, {r:0,g:0,b:0,a:0}, bgRemovalTolerance, null);
        floodFill(data, canvas.width-1, canvas.height-1, {r:0,g:0,b:0,a:0}, bgRemovalTolerance, null);
      }

      ctx.putImageData(data, 0, 0); return { ...f, url: canvas.toDataURL() };
    }));
    pushToHistory(newFrames); setLoading(false);
  };

  const handleDeNoise = async () => {
    if (isEditorBlocked || frames.length === 0) return;
    setIsPlaying(false);
    setLoading(true);

    try {
      const sources = await Promise.all(frames.map(async (frame) => {
        const canvas = document.createElement('canvas');
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('Failed to load a frame for palette reduction'));
          image.src = frame.url;
        });
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas is unavailable');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return { frame, canvas, ctx, data };
      }));
      const totalBytes = sources.reduce((sum, source) => sum + source.data.data.length, 0);
      const allPixels = new Uint8ClampedArray(totalBytes);
      let offset = 0;
      for (const source of sources) {
        allPixels.set(source.data.data, offset);
        offset += source.data.data.length;
      }
      const palette = await extractCentroidsAsync(allPixels, paletteColorCount);
      const newFrames = sources.map(({ frame, canvas, ctx, data }) => {
        applyBackendCentroids(data, palette);
        ctx.putImageData(data, 0, 0);
        return { ...frame, url: canvas.toDataURL() };
      });
      pushToHistory(newFrames);
    } catch (err) {
      console.error('Palette reduction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const restoreFrames = async () => {
    if (isEditorBlocked || !currentJob) return;
    const outputUrl = currentJob.output_images?.[0]?.url;
    if (!outputUrl) return;

    setLoading(true);
    try {
      const isSingleFrameJob = currentJob.job_type === 'character' || currentJob.job_type === 'item' || currentJob.job_type === 'map';
      if (isSingleFrameJob) {
        let processed = outputUrl;
        if (currentJob.job_type === 'character' || currentJob.job_type === 'item') {
          const pixelSize = parseInt(currentJob.input_params?.pixel_size || '128');
          const version = parseInt(currentJob.input_params?.version || '1');
          const targetSize = version === 2 ? pixelSize : (pixelSize === 32 ? 64 : 128);
          processed = await scaleToSize(outputUrl, targetSize);
        } else if (currentJob.job_type === 'map') {
          processed = await processMapImage(outputUrl);
        } else {
          processed = await fetchAsDataUrl(outputUrl);
        }
        const frame: FrameData = { id: `f-${Date.now()}-0`, url: processed, isOriginal: true };
        setIsPlaying(false);
        pushToHistory([frame]);
      } else {
        const apiLength = currentJob.input_params?.length || 33;
        const isV2 = currentJob.animation_version === 2 || currentJob.input_params?.animation_version === 2;
        const original = await fetchAsDataUrl(outputUrl, { refresh: true });
        const sliced = await sliceSpriteSheet(original, isV2 ? currentJob.input_params.output_frames : undefined,
          apiLength, isV2 ? Math.min(6, currentJob.input_params.output_frames) : undefined);
        const mappedFrames: FrameData[] = sliced.map((url, i) => ({
          id: `f-${Date.now()}-${i}`,
          url,
          isOriginal: true
        }));
        setIsPlaying(false);
        pushToHistory(mappedFrames);
      }
    } catch (err) {
      console.error("Failed to restore original", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFrameExclusion = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
    const newFrames = [...frames];
    newFrames[index] = { ...newFrames[index], isExcluded: !newFrames[index].isExcluded };
    pushToHistory(newFrames);
  };

  const handleGenerateAnimation = async (index: number) => {
    const frame = frames[index];
    if (!frame || isEditorBlocked || loading) return;
    setContextMenu(null);
    setIsPlaying(false);
    try {
      const image = await decodeImage(frame.url);
      onRegenerate({
        action: 'animate',
        start_image: frame.url,
        start_pixel_size: Math.max(image.naturalWidth, image.naturalHeight),
        source_animation_version: currentJob?.job_type === 'animation' ? Number(currentJob.animation_version ?? currentJob.input_params?.animation_version ?? 1) : undefined,
        source_params: currentJob?.input_params,
      });
    } catch (error) {
      console.error('Frame could not be opened for animation.', error);
    }
  };

  const handleDownload = async () => {
    if (frames.length === 0 || isEditorBlocked) return; setIsExporting(true);
    try {
      const activeFrames = frames.filter(f => !f.isExcluded); if (activeFrames.length === 0) return;
      const spriteSheetData = await reconstructSpriteSheet(activeFrames.map(f => f.url)); const link = document.createElement('a'); link.href = spriteSheetData; link.download = `rika_${selectedJobId?.slice(0,8) || 'work'}.png`; link.click();
    } catch (err) {} finally { setIsExporting(false); }
  };

  const handleExportFrame = async (index: number, scale: 1 | 4) => {
    const frame = frames[index];
    if (!frame || isEditorBlocked || loading || isExporting || isExporting4x) return;
    setContextMenu(null);
    const setExporting = scale === 4 ? setIsExporting4x : setIsExporting;
    setExporting(true);
    try {
      const image = await decodeImage(frame.url);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth * scale;
      canvas.height = image.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Export canvas unavailable');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      const frameSuffix = isSingleFrame ? '' : `_frame_${index + 1}`;
      link.download = `rika_${selectedJobId?.slice(0,8) || 'work'}${frameSuffix}${scale === 4 ? '_4x' : ''}.png`;
      link.click();
    } catch (error) {
      console.error('Frame export failed.', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload4x = () => {
    const index = frames.findIndex(frame => !frame.isExcluded);
    if (index >= 0) void handleExportFrame(index, 4);
  };

  const handleExportGif = async () => {
    if (frames.length === 0 || isEditorBlocked) return;
    const activeFrames = frames.filter(f => !f.isExcluded); if (activeFrames.length === 0) return;
    setIsExportingGif(true); const bgColor = isLightBg ? '#f5f5dc' : '#121212';
    try {
      const loadedFrames = await Promise.all(activeFrames.map(frame => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('GIF frame could not be loaded'));
          img.src = frame.url;
        });
      }));
      const fitted = fitImageDimensions({ width: loadedFrames[0].width, height: loadedFrames[0].height });
      const gifWidth = Math.max(1, Math.round(fitted.width));
      const gifHeight = Math.max(1, Math.round(fitted.height));
      const processedFrames = loadedFrames.map(img => {
        const canvas = document.createElement('canvas');
        canvas.width = gifWidth; canvas.height = gifHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = bgColor; ctx.fillRect(0, 0, gifWidth, gifHeight);
        ctx.imageSmoothingEnabled = false;
        const size = fitImageDimensions({ width: img.width, height: img.height }, gifWidth, gifHeight);
        ctx.drawImage(img, (gifWidth - size.width) / 2, (gifHeight - size.height) / 2, size.width, size.height);
        return canvas.toDataURL('image/png');
      });
      gifshot.createGIF({
        images: processedFrames,
        gifWidth,
        gifHeight,
        interval: 1 / fps,
        numFrames: processedFrames.length,
        sampleInterval: 1,
        numWorkers: 4
      }, (obj: any) => {
        if (!obj.error) { const link = document.createElement('a'); link.href = obj.image; link.download = `rika_${selectedJobId?.slice(0,8) || 'work'}.gif`; link.click(); }
        setIsExportingGif(false);
      });
    } catch (err) { setIsExportingGif(false); }
  };

  useEffect(() => {
    if (currentJob?.job_type === 'map') {
      if (isPlaying) setIsPlaying(false);
      return;
    }
    if (isPlaying && frames.length > 1 && !isJobRunning) {
      playbackRef.current = window.setInterval(() => {
        setCurrentFrameIndex(prev => {
          let next = (prev + 1) % frames.length; let count = 0;
          while (frames[next].isExcluded && count < frames.length) { next = (next + 1) % frames.length; count++; }
          return next;
        });
      }, 1000 / fps);
    } else if (playbackRef.current) clearInterval(playbackRef.current);
    return () => { if (playbackRef.current) clearInterval(playbackRef.current); };
  }, [isPlaying, frames.length, fps, isJobRunning, currentJob]);

  const renderToolButton = (id: Tool, content: React.ReactNode, hasParams?: boolean) => {
    const isActive = effectiveTool === id;
    const getToolTitle = () => {
      if (!isZh) return id.toUpperCase();
      switch(id) {
        case 'brush': return '笔刷';
        case 'eraser': return '橡皮';
        case 'wand': return '魔棒';
        case 'selection': return '选区';
        case 'bucket': return '油漆桶';
        case 'nudge': return '微移';
        case 'move': return '移动';
        case 'picker': return '吸色';
        default: return id;
      }
    };

    return (
      <div key={id} className="relative flex items-center justify-center w-full group">
        <button
          onClick={() => { setActiveTool(id); setIsPlaying(false); }}
          className={`w-10 h-10 flex items-center justify-center pixel-border border-2 transition-all shrink-0 ${isActive ? 'bg-[#f7d51d] text-[#2d1b4e] border-white' : 'bg-black/40 text-white border-[#5a2d9c] hover:border-white/50'}`}
          title={getToolTitle()}
        >
          {typeof content === 'string' ? (
             <span className="text-lg leading-none">{content}</span>
          ) : (
            <div className={`w-6 h-6 flex items-center justify-center shrink-0 ${(!isActive && (id === 'brush' || id === 'eraser' || id === 'wand' || id === 'move')) ? 'invert' : ''} ${isActive ? 'text-[#2d1b4e]' : 'text-white'}`}>
              {content}
            </div>
          )}
        </button>
        {hasParams && (
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === id ? null : id); setIsPlaying(false); }}
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-6 flex items-center justify-center text-[8px] bg-[#5a2d9c] text-white pixel-border border-[1px] hover:bg-white hover:text-black z-10"
          > ▶ </button>
        )}
        {menuOpenFor === id && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute left-14 top-0 z-[100] bg-[#1b0a38] pixel-border p-4 w-48 shadow-2xl animate-fade-in border-[#5a2d9c]"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-white/80 uppercase" style={{ fontSize: zhScale(10) }}>
                {getToolTitle()}
              </span>
              <button onClick={() => setMenuOpenFor(null)} className="text-[10px] text-white hover:text-red-400">×</button>
            </div>
            {id === 'brush' && (
              <div className="space-y-2">
                <div className="flex justify-between text-white/60">
                   <span style={{ fontSize: zhScale(8) }}>{isZh ? '大小' : 'SIZE'}:</span>
                   <span style={{ fontSize: '8px' }}>{brushSize}px</span>
                </div>
                <input type="range" min="1" max="8" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-full accent-white" />
              </div>
            )}
            {id === 'eraser' && (
              <div className="space-y-2">
                <div className="flex justify-between text-white/60">
                   <span style={{ fontSize: zhScale(8) }}>{isZh ? '大小' : 'SIZE'}:</span>
                   <span style={{ fontSize: '8px' }}>{eraserSize}px</span>
                </div>
                <input type="range" min="1" max="8" value={eraserSize} onChange={e => setEraserSize(parseInt(e.target.value))} className="w-full accent-white" />
              </div>
            )}
            {(id === 'wand' || id === 'bucket') && (
              <div className="space-y-2">
                <div className="flex justify-between text-white/60">
                  <span style={{ fontSize: zhScale(8) }}>{isZh ? '容差' : 'TOLERANCE'}:</span>
                  <span style={{ fontSize: '8px' }}>{wandTolerance}</span>
                </div>
                <input type="range" min="1" max="100" value={wandTolerance} onChange={e => setWandTolerance(parseInt(e.target.value))} className="w-full accent-white" />
              </div>
            )}
            {id === 'selection' && (
              <div className="space-y-2 mb-4">
                <p className="opacity-60 uppercase text-white/60" style={{ fontSize: zhScale(8) }}>{isZh ? '形状' : 'SHAPE'}</p>
                <div className="grid grid-cols-1 gap-1">
                  {(['rectangle', 'lasso'] as SelectionShape[]).map(shape => (
                    <button key={shape} onClick={() => setSelectionShape(shape)}
                      className={`py-1 border ${selectionShape === shape ? 'bg-white text-black border-white' : 'bg-black/20 text-white/60 border-[#5a2d9c]'}`}
                      style={{ fontSize: zhScale(8) }}>
                      {isZh ? (shape === 'rectangle' ? '矩形框选' : '自由套索') : (shape === 'rectangle' ? 'RECTANGLE' : 'FREE LASSO')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(id === 'wand' || id === 'selection') && (
              <div className="space-y-2 mt-4">
                <p className="opacity-60 uppercase text-white/60" style={{ fontSize: zhScale(8) }}>{isZh ? '模式' : 'MODE'}</p>
                <div className="grid grid-cols-1 gap-1">
                  {(['select', 'add', 'remove'] as SelectionMode[]).map(mode => (
                    <button key={mode} onClick={() => setSelectionMode(mode)}
                      className={`py-1 border ${selectionMode === mode ? 'bg-white text-black border-white' : 'bg-black/20 text-white/60 border-[#5a2d9c]'}`}
                      style={{ fontSize: zhScale(8) }}>
                      {isZh ? (mode === 'select' ? '选择' : mode === 'add' ? '添加' : '移除') : mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleCustomUpload = async () => {
    if (!customFile) return;
    setLoading(true);
    setShowUploadModal(false);
    try {
      const url = URL.createObjectURL(customFile);
      const sliced = await sliceCustomSpriteSheet(url, customRows, customCols);
      if (isMounted.current) {
        const mappedFrames: FrameData[] = sliced.map((fUrl, i) => ({
          id: `custom-${Date.now()}-${i}`,
          url: fUrl,
          isOriginal: true,
          isExcluded: false
        }));
        customModeRef.current = true;
        setFrames(mappedFrames);
        setInitialFrames(mappedFrames);
        setCurrentFrameIndex(0);
        setIsPlaying(mappedFrames.length > 1);
        setIsCustomMode(true);
        setCurrentJob(null);
        setUndoStack([]);
        setRedoStack([]);
        setPan({ x: 0, y: 0 });
        setSelection(new Set());
        setHasUnsavedEdits(false);
        // If there was a selected job, clear it in parent
        if (selectedJobId) {
          onJobSelected(""); // Passing empty string to indicate clearing
        }
      }
    } catch (err) {
      console.error("Custom upload failed", err);
    } finally {
      setLoading(false);
      setCustomFile(null);
      setUploadPreview(null);
    }
  };

  const darkChecker = `linear-gradient(45deg, #1e1e1e 25%, transparent 25%), linear-gradient(-45deg, #1e1e1e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e1e1e 75%), linear-gradient(-45deg, transparent 75%, #1e1e1e 75%)`;
  const lightChecker = `linear-gradient(45deg, #e1e1bc 25%, transparent 25%), linear-gradient(-45deg, #e1e1bc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e1e1bc 75%), linear-gradient(-45deg, transparent 75%, #e1e1bc 75%)`;

  return (
    <div className="ui-page flex flex-col gap-6 w-full overflow-hidden text-white select-none">
      <PixelModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={isZh ? "上传序列帧" : "UPLOAD SPRITE SHEET"}
        titleStyle={{ fontSize: zhScale(10) }}
        closeButtonStyle={{ fontSize: zhScale(12) }}
        closeLabel={isZh ? '关闭' : 'CLOSE'}
      >
        <div className="space-y-4">
          <div className="relative aspect-video pixel-border border-[#5a2d9c] bg-black/20 flex items-center justify-center overflow-hidden">
            {uploadPreview ? (
              <img src={uploadPreview} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} alt="Preview" />
            ) : (
              <div className="opacity-40 uppercase" style={{ fontSize: zhScale(10) }}>{isZh ? "点击上传图片" : "Click to upload image"}</div>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setCustomFile(file);
                  setUploadPreview(URL.createObjectURL(file));
                }
              }}
            />
          </div>
          <div className="flex gap-8">
            <div className="space-y-1">
              <label className="opacity-60 uppercase" style={{ fontSize: zhScale(10) }}>{isZh ? "行数" : "ROWS"}</label>
              <PixelInput type="number" min="1" value={customRows} onChange={e => setCustomRows(parseInt(e.target.value) || 1)} className="w-20" style={{ fontSize: zhScale(10) }} />
            </div>
            <div className="space-y-1">
              <label className="opacity-60 uppercase" style={{ fontSize: zhScale(10) }}>{isZh ? "列数" : "COLS"}</label>
              <PixelInput type="number" min="1" value={customCols} onChange={e => setCustomCols(parseInt(e.target.value) || 1)} className="w-20" style={{ fontSize: zhScale(10) }} />
            </div>
          </div>
          <PixelButton variant="secondary" className="w-full h-12" onClick={handleCustomUpload} disabled={!customFile} style={{ fontSize: zhScale(12) }}>
            {isZh ? "上传" : "UPLOAD"}
          </PixelButton>
        </div>
      </PixelModal>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 bg-[#1b0a38]/90 p-3 pixel-border border-[#5a2d9c] w-full">
        <div className="flex min-w-0 items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-white/10 pixel-border border-[#5a2d9c] transition-colors group"
              title={isZh ? "返回" : "BACK"}
            >
              <ArrowLeft size={16} className="text-white/60 group-hover:text-white" />
            </button>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] text-white/60 uppercase">
            <span>JOB: <span className="text-white">{isCustomMode ? 'NONE' : (selectedJobId?.slice(0,8) || 'NONE')}</span></span>
            <span>MODE: <span className="text-white">{isCustomMode ? 'CUSTOM' : (currentJob?.input_params?.motion_type || 'MANUAL')}</span></span>
            <span>STATUS: <span className={
              currentJob?.status === 'succeeded' ? 'text-green-500' :
              (currentJob?.status === 'running' || currentJob?.status === 'queued') ? 'text-yellow-500' :
              'text-white/40'
            }>{currentJob?.status || 'READY'}</span></span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 text-[9px] uppercase text-white/60">
          <PixelButton
            variant="secondary"
            className="h-8 px-3 text-[8px]"
            onClick={() => setShowUploadModal(true)}
          >
            {isZh ? "上传" : "UPLOAD"}
          </PixelButton>
          <div
            className={`flex items-center gap-2 select-none ${hasUnsavedEdits && !isJobRunning ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={() => { if (hasUnsavedEdits && !isJobRunning) handleSaveToCache(); }}
            title={hasUnsavedEdits && !isJobRunning ? (isZh ? "点击保存当前编辑" : "Click to save edits") : ""}
          >
            <div className={`w-3 h-3 rounded-full ${
              isJobRunning ? 'bg-yellow-500 animate-pulse' :
              hasUnsavedEdits ? 'bg-red-500 animate-pulse' : 'bg-green-500'
            }`} />
            <span className={
              isJobRunning ? 'text-yellow-500' :
              hasUnsavedEdits ? 'text-red-500' : 'text-green-500'
            }>
              {isJobRunning ? processingLabel : isEditorBlocked ? (isZh ? '结果尚未加载' : 'RESULT NOT LOADED') :
               hasUnsavedEdits ? (isZh ? '未保存的编辑' : 'UNSAVED EDITS') :
               (isZh ? '已保存' : 'SAVED')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 w-full items-start">
        <div className={`mx-auto lg:mx-0 flex flex-col items-center gap-4 p-2 bg-[#1b0a38]/80 pixel-border border-[#5a2d9c] w-14 shrink-0 ${isEditorBlocked ? 'opacity-30 pointer-events-none' : ''}`}>
           {renderToolButton("brush", <img src={`${ICON_BASE}brush.png`} style={{ imageRendering: 'auto' }} className="w-full h-full object-contain" alt="Brush" />, true)}
           {renderToolButton("wand", <img src={`${ICON_BASE}wand.png`} style={{ imageRendering: 'auto' }} className="w-full h-full object-contain" alt="Wand" />, true)}
           {renderToolButton("selection", <SquareDashedMousePointer size={20} />, true)}
           {renderToolButton("bucket", <PaintBucket size={20} />, true)}
           {renderToolButton("eraser", <img src={`${ICON_BASE}eraser.png`} style={{ imageRendering: 'auto' }} className="w-full h-full object-contain" alt="Eraser" />, true)}
           {renderToolButton("nudge", <Move size={20} />)}
           {renderToolButton("move", <img src={`${ICON_BASE}drag.png`} style={{ imageRendering: 'auto' }} className="w-full h-full object-contain" alt="Drag" />)}
           {renderToolButton("picker", <Pipette size={20} />)}
           <div className="mt-4 border-t-2 border-[#5a2d9c] pt-4 flex flex-col items-center gap-4 w-full">
              <div ref={brushColorAnchorRef}
                className="relative w-10 h-10 pixel-border border-2 border-[#5a2d9c] bg-black/40 overflow-hidden shrink-0 cursor-pointer"
                title={isZh ? "选择颜色" : "Choose Color"}
                onClick={() => { setShowBrushPicker(!showBrushPicker); setIsPlaying(false); }}
              >
                <div className="absolute inset-0" style={{ backgroundColor: brushColor }}></div>
              </div>

              {showBrushPicker && (
                <ColorPickerPopover anchor={brushColorAnchorRef.current} placement="right" color={brushColor}
                  onChange={(color) => { setBrushColor(color); setIsPlaying(false); }}
                  onClose={() => setShowBrushPicker(false)} lang={lang} />
              )}
              <button
                title={isZh ? (isLightBg ? '切换为暗色背景' : '切换为亮色背景') : (isLightBg ? 'Switch to dark background' : 'Switch to light background')}
                aria-label={isZh ? (isLightBg ? '切换为暗色背景' : '切换为亮色背景') : (isLightBg ? 'Switch to dark background' : 'Switch to light background')}
                onClick={() => { setIsLightBg(!isLightBg); setIsPlaying(false); }}
                className={`w-10 h-10 flex items-center justify-center pixel-border border-2 transition-all shrink-0 ${isLightBg ? 'bg-[#f5f5dc] border-black' : 'bg-black text-white border-white'}`}
              >
                <img src={`${ICON_BASE}switch.png`} style={{ imageRendering: 'auto' }} className={`w-6 h-6 object-contain shrink-0 ${!isLightBg ? 'invert' : ''}`} alt="Switch" />
              </button>
              <button
                type="button"
                title={isZh ? (onionSkinEnabled ? '关闭洋葱皮' : '开启洋葱皮：半透明显示前一帧') : (onionSkinEnabled ? 'Turn off onion skin' : 'Onion skin: overlay the previous frame')}
                aria-label={isZh ? '洋葱皮' : 'Onion skin'}
                aria-pressed={onionSkinEnabled}
                disabled={isEditorBlocked || loading || isSingleFrame || frames.length < 2}
                onClick={() => setOnionSkinEnabled(enabled => !enabled)}
                className={`w-10 h-10 flex items-center justify-center pixel-border border-2 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${onionSkinEnabled ? 'bg-[#f7d51d] text-[#2d1b4e] border-white' : 'bg-black/40 text-white border-[#5a2d9c] hover:border-white/50'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 8V3m0 3L8 3m4 2 4-3" />
                  <path d="M12 8c-1.5 2-7 3-7 7a7 6 0 0 0 14 0c0-4-5.5-5-7-7Z" />
                  <path d="M12 8c-3 5-4 9 0 13 4-4 3-8 0-13Z" />
                </svg>
              </button>
           </div>
        </div>

        <div className="flex flex-col gap-4 min-w-0 w-full overflow-hidden">
          <PixelCard className={`editor-canvas-shell p-0 overflow-hidden ${isLightBg ? 'is-light' : 'is-dark'}`}>
            <div ref={viewportRef} className="relative w-full h-[512px] flex items-center justify-center overflow-hidden">
            {loadError && (
              <div className="absolute z-20 max-w-[90%] p-4 text-center bg-[#1b0a38] pixel-border border-red-500 text-white break-all"
                style={{ fontSize: zhScale(9) }}>
                {isZh ? '动画加载失败：' : 'Animation load failed: '}{loadError}
                <button type="button" className="block mx-auto mt-3 text-[#f7d51d] underline"
                  onClick={() => setRetryLoad(value => value + 1)}>{isZh ? '重新加载' : 'Retry loading'}</button>
              </div>
            )}
            {selection.size > 0 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3 py-2 bg-[#1b0a38]/95 pixel-border border-[#f7d51d] text-[#f7d51d] whitespace-nowrap pointer-events-none"
                style={{ fontSize: zhScale(9) }}>
                {isZh ? 'Ctrl+D 取消选择' : 'CTRL+D DESELECT'}
              </div>
            )}
            {currentJob && (
              <div
                className="absolute top-4 left-4 z-30 p-2 cursor-pointer transition-transform hover:scale-110 active:scale-95 bg-black/20 rounded-full"
                onClick={(e) => toggleLike(e, currentJob)}
              >
                <Heart
                  size={24}
                  className={`${currentJob.liked ? 'fill-red-500 text-red-500' : 'text-white/40 hover:text-white/70'}`}
                  strokeWidth={currentJob.liked ? 0 : 2}
                />
              </div>
            )}
            <div ref={editorContainerRef} className="relative origin-center shrink-0" style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px`, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, imageRendering: 'pixelated', backgroundImage: isLightBg ? lightChecker : darkChecker, backgroundSize: `16px 16px`, cursor: isPickingRemovalColor ? 'cell' : effectiveTool === 'selection' ? 'crosshair' : 'default', touchAction: effectiveTool === 'selection' ? 'none' : undefined }} onMouseDown={handleMouseDown} onMouseMove={handleCanvasInteraction} onMouseUp={handleMouseUp} onPointerDown={handleSelectionPointerDown} onPointerMove={handleSelectionPointerMove} onPointerUp={handleSelectionPointerUp} onPointerCancel={handleSelectionPointerCancel}>
              {(loading || isJobRunning) && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
                  {/* Black semi-transparent mask */}
                  <div className="absolute inset-0 bg-black/80" />

                  {/* Pixel Grid Animation - Displayed in front of the mask */}
                  <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-40 pointer-events-none z-10">
                    {[...Array(64)].map((_, i) => {
                      const x = i % 8;
                      const y = Math.floor(i / 8);
                      const delay = (x + y) * 0.15;
                      return (
                        <div
                          key={i}
                          className="w-full h-full border border-white/10"
                          style={{
                            animation: `pixelFade 2s ease-in-out infinite`,
                            animationDelay: `${delay}s`
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="relative z-20 flex flex-col items-center gap-2">
                    <div className="flex flex-col items-center">
                      <div className="font-bold tracking-[0.2em] text-white uppercase animate-pulse" style={{ fontSize: zhScale(8) }}>
                        {isJobRunning ? (isZh ? '正在渲染' : 'RENDERING') : (isZh ? '正在同步' : 'SYNCING')}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <div className="w-1 h-1 bg-white animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1 h-1 bg-white animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1 h-1 bg-white animate-bounce" />
                      </div>
                    </div>

                    {isJobRunning && (
                      <div className="text-center">
                        <p className="text-white/60 tracking-tight" style={{ fontSize: zhScale(8) }}>
                          {isZh ? '可以到dashboard中查看已经生成的结果' : 'You can check the Dashboard for generated results'}
                        </p>
                      </div>
                    )}
                  </div>

                  <style>{`
                    @keyframes pixelFade {
                      0%, 100% { background-color: transparent; }
                      50% { background-color: rgba(168, 85, 247, 0.6); }
                    }
                  `}</style>
                </div>
              )}
              <canvas ref={canvasRef} className="w-full h-full block" />
              {onionSkinFrame && (
                <img key={onionSkinFrame.id} src={onionSkinFrame.url}
                  alt="" aria-hidden="true" draggable={false} data-onion-skin="true"
                  className="absolute inset-0 w-full h-full pointer-events-none block"
                  style={{ opacity: 0.3, imageRendering: 'pixelated' }} />
              )}
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none block" />
              {(selectionOutline || dragOutline) && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none block"
                  viewBox={`0 0 ${frameDimensions.width} ${frameDimensions.height}`}
                  preserveAspectRatio="none" aria-hidden="true">
                  <style>{`@keyframes selectionMarch { to { stroke-dashoffset: -8; } }`}</style>
                  <path d={`${selectionOutline}${dragOutline}`} fill="none" stroke="rgba(0, 0, 0, 0.95)"
                    strokeWidth="1.25" vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
                  <path d={`${selectionOutline}${dragOutline}`} fill="none" stroke="rgba(255, 255, 255, 0.98)"
                    strokeWidth="1.25" vectorEffect="non-scaling-stroke" strokeLinejoin="miter"
                    strokeDasharray="4 4" style={{ animation: 'selectionMarch 0.8s steps(16, end) infinite' }} />
                </svg>
              )}

              {activeTool === 'nudge' && !isJobRunning && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top Arrow */}
                  <button
                    onClick={(e) => { e.stopPropagation(); nudgeFrame(0, -1); }}
                    className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-auto w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] border-b-[#f7d51d] hover:border-b-white transition-colors drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
                  />
                  {/* Bottom Arrow */}
                  <button
                    onClick={(e) => { e.stopPropagation(); nudgeFrame(0, 1); }}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-[#f7d51d] hover:border-t-white transition-colors drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
                  />
                  {/* Left Arrow */}
                  <button
                    onClick={(e) => { e.stopPropagation(); nudgeFrame(-1, 0); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-auto w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[15px] border-r-[#f7d51d] hover:border-r-white transition-colors drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
                  />
                  {/* Right Arrow */}
                  <button
                    onClick={(e) => { e.stopPropagation(); nudgeFrame(1, 0); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[15px] border-l-[#f7d51d] hover:border-l-white transition-colors drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
                  />
                </div>
              )}
            </div>
            <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 border border-[#5a2d9c] text-[8px] text-white/40 uppercase">
              {frameDimensions.width}×{frameDimensions.height} | FRAME {currentFrameIndex + 1}/{frames.length} | ZOOM {Math.round(zoom*100)}%
            </div>
            </div>
          </PixelCard>
          <div
            className={`bg-[#1b0a38]/80 p-4 pixel-border border-[#5a2d9c] w-full overflow-x-auto ${isEditorBlocked ? 'opacity-30 pointer-events-none' : ''}`}
            onClick={() => setContextMenu(null)}
          >
             <div className="flex items-center gap-3 min-w-max min-h-[80px] pb-2">
                {frames.map((f, i) => (
                  <div
                    key={f.id}
                    onClick={() => { setCurrentFrameIndex(i); setIsPlaying(false); }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (isEditorBlocked || loading) return;
                      setIsPlaying(false);
                      setContextMenu({ x: e.clientX, y: e.clientY, index: i });
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                    style={{ width: thumbnailDimensions.width, height: thumbnailDimensions.height }}
                    className={`relative pixel-border border-2 cursor-pointer flex-shrink-0 transition-all ${
                      currentFrameIndex === i ? 'border-[#f7d51d] scale-110 z-10' :
                      f.isOriginal ? 'border-[#5a2d9c] opacity-60 hover:opacity-100' : 'border-gray-500 opacity-60 hover:opacity-100'
                    } ${draggedIndex === i ? 'opacity-20 scale-90' : ''}`}
                  >
                    <img src={f.url} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} alt={`F${i+1}`} />
                    {f.isExcluded && <div className="absolute inset-0 bg-red-900/60 z-10 flex items-center justify-center"><div className="w-full h-0.5 bg-red-400 rotate-45 absolute" /></div>}
                    <button
                      type="button"
                      className={`absolute top-0 left-0 w-5 h-5 flex items-center justify-center border-0 bg-transparent z-20 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] ${f.isExcluded ? 'text-white/60' : 'text-white'} hover:text-[#f7d51d]`}
                      aria-label={isZh ? `${f.isExcluded ? '显示' : '隐藏'}第 ${i + 1} 帧` : `${f.isExcluded ? 'Show' : 'Hide'} frame ${i + 1}`}
                      title={isZh ? `${f.isExcluded ? '参与' : '排除'}播放和导出` : `${f.isExcluded ? 'Include in' : 'Exclude from'} playback and export`}
                      disabled={isEditorBlocked}
                      onClick={(e) => toggleFrameExclusion(i, e)}
                    >
                      {f.isExcluded ? <EyeOff size={13} strokeWidth={2} /> : <Eye size={13} strokeWidth={2} />}
                    </button>
                    <span className="absolute bottom-0 right-0 z-20 min-w-4 h-4 px-1 flex items-center justify-center bg-[#0d0221]/90 text-white leading-none tabular-nums pointer-events-none"
                      style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: '11px', fontWeight: 400, letterSpacing: 'normal' }}>
                      {i + 1}
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {contextMenu && frames[contextMenu.index] && (
          <div
            ref={contextMenuRef}
            role="menu"
            className="fixed z-[1000] bg-[#1b0a38] pixel-border border-[#5a2d9c] shadow-2xl py-1 w-48 max-w-[calc(100vw-16px)] overflow-y-auto"
            style={{ left: contextMenu.x, top: contextMenu.y, maxHeight: 'calc(100vh - 16px)' }}
            onMouseLeave={() => setContextMenu(null)}
          >
            {!isSingleFrame && (
              <button role="menuitem" style={{ fontSize: zhScale(10) }}
                className="w-full px-4 py-2 text-left uppercase hover:bg-[#f7d51d] hover:text-[#2d1b4e] disabled:opacity-30"
                disabled={isEditorBlocked || loading}
                onClick={() => handleGenerateAnimation(contextMenu.index)}>
                {isZh ? '生成动画' : 'ANIMATE'}
              </button>
            )}
            {!isSingleFrame && <div role="separator" className="my-1 border-t-2 border-[#5a2d9c]" />}
            <button
              role="menuitem"
              style={{ fontSize: zhScale(10) }}
              className="w-full px-4 py-2 text-left text-[10px] uppercase hover:bg-[#f7d51d] hover:text-[#2d1b4e] disabled:opacity-30"
              disabled={frames.length >= 64}
              onClick={() => handleCopyFrame(contextMenu.index)}
            >
              {isZh ? '复制' : 'COPY'}
            </button>
            {!frames[contextMenu.index].isOriginal && (
              <button
                role="menuitem"
                style={{ fontSize: zhScale(10) }}
                className="w-full px-4 py-2 text-left text-[10px] uppercase hover:bg-red-600 hover:text-white"
                onClick={() => handleDeleteFrame(contextMenu.index)}
              >
                {isZh ? '删除' : 'DELETE'}
              </button>
            )}
            {!isSingleFrame && <>
              <div className="my-1 border-t-2 border-[#5a2d9c]" />
              <button role="menuitem" style={{ fontSize: zhScale(10) }}
                className="w-full px-4 py-2 text-left uppercase hover:bg-[#f7d51d] hover:text-[#2d1b4e] disabled:opacity-30"
                disabled={isEditorBlocked || loading || isExporting || isExporting4x}
                onClick={() => handleExportFrame(contextMenu.index, 1)}>
                {isZh ? '导出帧' : 'DOWNLOAD PNG'}
              </button>
              <button role="menuitem" style={{ fontSize: zhScale(10) }}
                className="w-full px-4 py-2 text-left uppercase hover:bg-[#f7d51d] hover:text-[#2d1b4e] disabled:opacity-30"
                disabled={isEditorBlocked || loading || isExporting || isExporting4x}
                onClick={() => handleExportFrame(contextMenu.index, 4)}>
                {isZh ? '导出大图' : 'DOWNLOAD PNG 4X'}
              </button>
            </>}
          </div>
        )}

        <div className="flex flex-col gap-6 w-full lg:w-64 shrink-0">
           <PixelCard title={isZh ? '智能工具' : 'SMART ACTIONS'}>
              <div className={`space-y-4 pt-2 ${isEditorBlocked ? 'opacity-30 pointer-events-none' : ''}`}>
                 <div className="space-y-3">
                   <PixelButton variant="secondary" className="w-full" onClick={removeBackground} style={{ fontSize: zhScale(9) }}>
                      {isZh ? '背景去除' : 'BG REMOVE'}
                   </PixelButton>
                   <div className="flex items-center justify-between gap-2">
                       <div className="flex items-center gap-2">
                         <input
                           type="checkbox"
                           id="useGlobalColorMatch"
                           checked={useGlobalColorMatch}
                           onChange={e => setUseGlobalColorMatch(e.target.checked)}
                           className="accent-white"
                         />
                         <label htmlFor="useGlobalColorMatch" className="text-[9px] text-white/60 uppercase cursor-pointer">
                           {isZh ? '全局匹配' : 'Global match'}
                         </label>
                       </div>
                       <div className="group relative inline-flex items-center">
                         <HelpCircle size={12} className="text-white/40 cursor-help" />
                         <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-56 p-2 bg-black/90 text-white text-[10px] pixel-border border-[#5a2d9c] font-sans z-50 normal-case leading-relaxed">
                           {isZh
                             ? '开启后，会移除所有帧中与所选背景色接近的全部像素，包括不与画面边缘相连的区域；关闭时只移除从四角连通的背景。'
                             : 'When enabled, removes every pixel close to the selected background color across all frames, including areas not connected to an edge. When disabled, only background connected to the four corners is removed.'}
                         </div>
                       </div>
                   </div>

                   {useGlobalColorMatch && (
                     <div className="flex items-center gap-2 p-1 bg-black/40 border border-white/10 relative">
                       <span className="text-[9px] text-white/40 uppercase">BG:</span>
                       <div ref={removalColorAnchorRef}
                         className="flex-1 h-5 relative pixel-border border border-white/20 cursor-pointer"
                         style={{ backgroundColor: removalBgColor }}
                         onClick={() => setShowRemovalPicker(!showRemovalPicker)}
                       />
                       <span className="text-[8px] font-mono text-white/60 uppercase">{removalBgColor}</span>
                       <button
                         type="button"
                         className={`p-1 border flex items-center justify-center hover:opacity-80 active:opacity-60 transition-all ${isPickingRemovalColor ? 'bg-white text-black border-white' : 'bg-black/20 text-white/60 border-[#5a2d9c]'}`}
                         onClick={() => {
                           setIsPickingRemovalColor(!isPickingRemovalColor);
                           setShowRemovalPicker(false);
                         }}
                         title={isZh ? '从画布提取背景颜色' : 'Pick background color from canvas'}
                         style={{ imageRendering: 'pixelated' }}
                       >
                         <Pipette size={11} />
                       </button>

                       {showRemovalPicker && (
                         <ColorPickerPopover anchor={removalColorAnchorRef.current} placement="above" align="end"
                           color={removalBgColor} onChange={setRemovalBgColor}
                           onClose={() => setShowRemovalPicker(false)} lang={lang}>
                           <button type="button"
                             className="flex items-center justify-center gap-2 py-1.5 px-3 bg-[#5a2d9c]/20 hover:bg-[#5a2d9c]/40 active:bg-[#5a2d9c]/60 border border-[#5a2d9c]/50 text-white font-mono text-[9px] w-full pixel-border transition-all animate-none"
                             onClick={() => { setIsPickingRemovalColor(true); setShowRemovalPicker(false); }}>
                             <Pipette size={12} />
                             <span>{isZh ? '吸取画布颜色' : 'PICK CANVAS COLOR'}</span>
                           </button>
                         </ColorPickerPopover>
                       )}
                     </div>
                   )}
                 </div>

                 <div className="space-y-1">
                    <div className="flex justify-between text-white/60">
                      <span style={{ fontSize: zhScale(8) }}>{isZh ? '容差' : 'TOLERANCE'}:</span>
                      <span style={{ fontSize: '8px' }}>{bgRemovalTolerance}</span>
                    </div>
                    <input type="range" min="1" max="50" value={bgRemovalTolerance} onChange={e => setBgRemovalTolerance(parseInt(e.target.value))} className="w-full accent-white" />
                 </div>

                 <div className="border-t border-white/5 pt-3 space-y-3">
                   <PixelButton variant="secondary" className="w-full" onClick={handleDeNoise} style={{ fontSize: zhScale(9) }}>
                     {isZh ? '去杂色' : 'DE-NOISE'}
                   </PixelButton>
                   <div className="space-y-1">
                     <div className="flex justify-between text-white/60">
                       <span style={{ fontSize: zhScale(8) }}>{isZh ? '颜色数量' : 'COLORS'}:</span>
                       <span style={{ fontSize: '8px' }}>{paletteColorCount}</span>
                     </div>
                     <input type="range" min="16" max="64" step="1" value={paletteColorCount} onChange={e => setPaletteColorCount(parseInt(e.target.value))} className="w-full accent-white" />
                   </div>
                 </div>

                 <PixelButton variant="secondary" className="w-full" onClick={restoreFrames} style={{ fontSize: zhScale(9) }}>
                    {isZh ? '还原初始' : 'RESTORE ORIGINAL'}
                 </PixelButton>
              </div>
           </PixelCard>
           <PixelCard title={isZh ? '历史记录' : 'HISTORY'}>
              <div className={`grid grid-cols-2 gap-2 pt-2 ${isEditorBlocked ? 'opacity-30 pointer-events-none' : ''}`}>
                <PixelButton variant="secondary" onClick={handleUndo} disabled={undoStack.length === 0} style={{ fontSize: zhScale(9) }}>
                  {isZh ? '撤销' : 'UNDO'}
                </PixelButton>
                <PixelButton variant="secondary" onClick={handleRedo} disabled={redoStack.length === 0} style={{ fontSize: zhScale(9) }}>
                  {isZh ? '重做' : 'REDO'}
                </PixelButton>
              </div>
           </PixelCard>
           {!isSingleFrame && <PixelCard title={isZh ? '控制工具' : 'CONTROLS'}>
              <div className="space-y-4 pt-2">
                 <PixelButton variant={isPlaying ? 'secondary' : 'primary'} className="w-full" onClick={() => setIsPlaying(!isPlaying)} disabled={isEditorBlocked || frames.length <= 1} style={{ fontSize: zhScale(10) }}>
                   {isPlaying ? (isZh ? '暂停' : 'PAUSE') : (isZh ? '播放' : 'PLAY')}
                 </PixelButton>
                 <div className="space-y-2">
                   <p className="text-[8px] opacity-40 uppercase">FPS: {fps}</p>
                   <input type="range" min="1" max="24" value={fps} onChange={e => setFps(parseInt(e.target.value))} className="w-full accent-white" disabled={isEditorBlocked} />
                 </div>
              </div>
           </PixelCard>}
           <div className="flex flex-col gap-3">
              <PixelButton variant="secondary" className="h-12" onClick={() => onRegenerate(currentJob!)} disabled={isEditorBlocked || !currentJob} style={{ fontSize: zhScale(10) }}>
                {isZh ? '重新生成' : 'RE-GENERATE'}
              </PixelButton>
              {isSingleFrame ? (
                <>
                  <PixelButton variant="primary" className="h-12" disabled={isExporting || isEditorBlocked} onClick={handleDownload} style={{ fontSize: zhScale(10) }}>
                    {isExporting ? (isZh ? '导出中...' : 'EXPORTING...') : (isZh ? '导出图片' : 'DOWNLOAD PNG')}
                  </PixelButton>
                  <PixelButton variant="secondary" className="h-12" disabled={isExporting4x || isEditorBlocked} onClick={handleDownload4x} style={{ fontSize: zhScale(10) }}>
                    {isExporting4x ? (isZh ? '导出中...' : 'EXPORTING...') : (isZh ? '导出大图' : 'DOWNLOAD PNG (4x)')}
                  </PixelButton>
                  <PixelButton variant="secondary" className="h-12" disabled={loading || isEditorBlocked || !frames[currentFrameIndex]} onClick={() => handleGenerateAnimation(currentFrameIndex)} style={{ fontSize: zhScale(10) }}>
                    {isZh ? '生成动画' : 'GENERATE ANIMATION'}
                  </PixelButton>
                </>
              ) : (
                <>
                  <PixelButton variant="primary" className={`h-12 ${currentJob?.job_type === 'map' ? 'hidden' : ''}`} disabled={isExportingGif || isEditorBlocked} onClick={handleExportGif} style={{ fontSize: zhScale(10) }}>
                    {isExportingGif ? (isZh ? '打包中...' : 'PACKING...') : (isZh ? '导出动图' : 'EXPORT GIF')}
                  </PixelButton>
                  <PixelButton variant="secondary" className="h-12" disabled={isExporting || isEditorBlocked} onClick={handleDownload} style={{ fontSize: zhScale(10) }}>
                    {isExporting ? (isZh ? '导出中...' : 'EXPORTING...') : (isZh ? '导出序列帧' : 'DOWNLOAD PNG')}
                  </PixelButton>
                </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default TaskPlayerPage;
