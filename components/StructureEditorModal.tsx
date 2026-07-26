import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PixelButton, PixelCard } from './PixelComponents.tsx';
import { X, Eraser, Trash2, Check, AlertTriangle } from 'lucide-react';

export interface StructureData {
  cols: number;
  rows: number;
  gridData: number[][];
  dataUrl: string;
}

interface StructureEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StructureData) => void;
  initialCols?: number;
  initialRows?: number;
  initialGridData?: number[][] | null;
  lang?: 'en' | 'zh';
}

export const TILE_TYPES = {
  EMPTY: 0,
  SOLID: 1,
  WALL: 2,
  LADDER: 3,
  TRAP: 4,
  PLATFORM: 5,
} as const;

export const TILE_CONFIGS = [
  {
    id: TILE_TYPES.SOLID,
    nameZh: '实心地块',
    nameEn: 'Solid Ground',
    descZh: '深灰色固态障碍物',
    descEn: 'Dark gray solid block',
    previewBg: '#222222',
  },
  {
    id: TILE_TYPES.WALL,
    nameZh: '背景墙',
    nameEn: 'Background Wall',
    descZh: '浅灰色背景填充墙',
    descEn: 'Light gray background wall',
    previewBg: '#cccccc',
  },
  {
    id: TILE_TYPES.LADDER,
    nameZh: '梯子',
    nameEn: 'Ladder',
    descZh: '攀爬通道',
    descEn: 'Climbable ladder',
    previewBg: '#ffffff',
  },
  {
    id: TILE_TYPES.TRAP,
    nameZh: '陷阱',
    nameEn: 'Trap',
    descZh: '底部尖刺陷阱',
    descEn: 'Bottom sharp spikes',
    previewBg: '#ffffff',
  },
  {
    id: TILE_TYPES.PLATFORM,
    nameZh: '平台',
    nameEn: 'Platform',
    descZh: '顶部1/4薄平台',
    descEn: 'Top 1/4 thin platform',
    previewBg: '#ffffff',
  },
  {
    id: TILE_TYPES.EMPTY,
    nameZh: '橡皮擦',
    nameEn: 'Eraser',
    descZh: '擦除单元格(空白)',
    descEn: 'Erase cell to empty',
    previewBg: '#ffffff',
    isEraser: true,
  },
];

export function renderTileCell(
  ctx: CanvasRenderingContext2D,
  type: number,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // 0: Empty (White)
  if (type === TILE_TYPES.EMPTY) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    return;
  }

  // 1: Solid Ground (实心地块)
  if (type === TILE_TYPES.SOLID) {
    ctx.fillStyle = '#222222';
    ctx.fillRect(x, y, w, h);
    return;
  }

  // 2: Background Wall (背景墙)
  if (type === TILE_TYPES.WALL) {
    ctx.fillStyle = '#CCCCCC';
    ctx.fillRect(x, y, w, h);
    return;
  }

  // 3: Ladder (梯子)
  if (type === TILE_TYPES.LADDER) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#333333';
    const railW = Math.max(2, Math.round(w * 0.12));
    const leftRailX = x + Math.round(w * 0.22);
    const rightRailX = x + Math.round(w * 0.78) - railW;

    ctx.fillRect(leftRailX, y, railW, h);
    ctx.fillRect(rightRailX, y, railW, h);

    const rungH = Math.max(2, Math.round(h * 0.1));
    const rungYs = [
      y + Math.round(h * 0.25) - Math.floor(rungH / 2),
      y + Math.round(h * 0.50) - Math.floor(rungH / 2),
      y + Math.round(h * 0.75) - Math.floor(rungH / 2),
    ];
    for (const ry of rungYs) {
      ctx.fillRect(leftRailX, ry, Math.max(1, rightRailX + railW - leftRailX), rungH);
    }
    return;
  }

  // 4: Trap / Spikes (陷阱)
  if (type === TILE_TYPES.TRAP) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#222222';
    const numSpikes = 3;
    const spikeW = w / numSpikes;
    const spikeH = h * 0.45;
    const bottomY = y + h;

    ctx.beginPath();
    for (let i = 0; i < numSpikes; i++) {
      const startX = x + i * spikeW;
      const midX = startX + spikeW / 2;
      const endX = startX + spikeW;
      const topY = bottomY - spikeH;

      ctx.moveTo(startX, bottomY);
      ctx.lineTo(midX, topY);
      ctx.lineTo(endX, bottomY);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }

  // 5: Platform (平台)
  if (type === TILE_TYPES.PLATFORM) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#222222';
    ctx.fillRect(x, y, w, Math.max(1, Math.round(h * 0.25)));
    return;
  }
}

export function exportStructureCanvasToDataUrl(
  cols: number,
  rows: number,
  gridData: number[][]
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 1280, 720);

  const cellW = 1280 / cols;
  const cellH = 720 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = gridData[r]?.[c] || 0;
      const x = c * cellW;
      const y = r * cellH;
      renderTileCell(ctx, type, x, y, cellW, cellH);
    }
  }

  return canvas.toDataURL('image/png');
}

export const StructureEditorModal: React.FC<StructureEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCols = 32,
  initialRows = 18,
  initialGridData = null,
  lang = 'zh',
}) => {
  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => (isZh ? `${enSize + 2}px` : `${enSize}px`);

  const [cols, setCols] = useState<number>(initialCols);
  const [rows, setRows] = useState<number>(initialRows);
  const [selectedType, setSelectedType] = useState<number>(TILE_TYPES.SOLID);
  const [grid, setGrid] = useState<number[][]>(() => {
    if (initialGridData && initialGridData.length === initialRows && initialGridData[0]?.length === initialCols) {
      return initialGridData.map(row => [...row]);
    }
    return Array.from({ length: initialRows }, () => Array(initialCols).fill(0));
  });

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ r: number; c: number } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingSizeSwitch, setPendingSizeSwitch] = useState<{ cols: number; rows: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize/Reset grid state when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      const c = initialCols || 32;
      const r = initialRows || 18;
      setCols(c);
      setRows(r);
      if (initialGridData && initialGridData.length === r && initialGridData[0]?.length === c) {
        setGrid(initialGridData.map(row => [...row]));
      } else {
        setGrid(Array.from({ length: r }, () => Array(c).fill(0)));
      }
      setSelectedType(TILE_TYPES.SOLID);
    }
  }, [isOpen, initialCols, initialRows, initialGridData]);

  // Check if grid has any painted cells
  const isGridNonEmpty = useCallback(() => {
    return grid.some(row => row.some(cell => cell !== 0));
  }, [grid]);

  // Handle grid size switch
  const handleSizeChange = (newCols: number, newRows: number) => {
    if (newCols === cols && newRows === rows) return;
    if (isGridNonEmpty()) {
      setPendingSizeSwitch({ cols: newCols, rows: newRows });
    } else {
      setCols(newCols);
      setRows(newRows);
      setGrid(Array.from({ length: newRows }, () => Array(newCols).fill(0)));
    }
  };

  const confirmPendingSizeSwitch = () => {
    if (pendingSizeSwitch) {
      const { cols: c, rows: r } = pendingSizeSwitch;
      setCols(c);
      setRows(r);
      setGrid(Array.from({ length: r }, () => Array(c).fill(0)));
      setPendingSizeSwitch(null);
    }
  };

  const handleClear = () => {
    setGrid(Array.from({ length: rows }, () => Array(cols).fill(0)));
    setShowClearConfirm(false);
  };

  // Draw on Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayW = canvas.width;
    const displayH = canvas.height;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, displayW, displayH);

    const cellW = displayW / cols;
    const cellH = displayH / rows;

    // Render cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = grid[r]?.[c] || 0;
        const x = c * cellW;
        const y = r * cellH;
        renderTileCell(ctx, type, x, y, cellW, cellH);
      }
    }

    // Grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, displayH);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(displayW, r * cellH);
      ctx.stroke();
    }

    // Highlight hovered cell
    if (hoverPos) {
      const { r, c } = hoverPos;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        ctx.strokeStyle = '#f7d51d';
        ctx.lineWidth = 2;
        ctx.strokeRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
      }
    }
  }, [cols, rows, grid, hoverPos]);

  useEffect(() => {
    if (isOpen) {
      drawCanvas();
    }
  }, [isOpen, drawCanvas]);

  // Cell Click / Paint handler
  const paintCell = (r: number, c: number, toolType: number = selectedType) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    setGrid(prev => {
      if (prev[r]?.[c] === toolType) return prev;
      const next = prev.map((row, ri) =>
        ri === r ? row.map((cell, ci) => (ci === c ? toolType : cell)) : row
      );
      return next;
    });
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const cellW = rect.width / cols;
    const cellH = rect.height / rows;

    const c = Math.floor(x / cellW);
    const r = Math.floor(y / cellH);

    return { r, c };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      // Right click -> Erase
      e.preventDefault();
      setIsMouseDown(true);
      const coords = getCanvasCoords(e);
      if (coords) paintCell(coords.r, coords.c, TILE_TYPES.EMPTY);
      return;
    }
    setIsMouseDown(true);
    const coords = getCanvasCoords(e);
    if (coords) paintCell(coords.r, coords.c, selectedType);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setHoverPos(coords);
    if (isMouseDown && coords) {
      const tool = e.buttons === 2 ? TILE_TYPES.EMPTY : selectedType;
      paintCell(coords.r, coords.c, tool);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
    setHoverPos(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true);
    const coords = getCanvasCoords(e);
    if (coords) paintCell(coords.r, coords.c, selectedType);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setHoverPos(coords);
    if (isMouseDown && coords) {
      paintCell(coords.r, coords.c, selectedType);
    }
  };

  const handleConfirmSave = () => {
    const dataUrl = exportStructureCanvasToDataUrl(cols, rows, grid);
    onSave({
      cols,
      rows,
      gridData: grid,
      dataUrl,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="max-w-5xl w-full bg-[#0d0221] pixel-border border-2 border-[#5a2d9c] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#1b0a38] px-4 py-3 pixel-border-b border-[#5a2d9c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#f7d51d] pixel-border border-black"></div>
            <h2 className="text-white font-bold text-sm md:text-base uppercase tracking-wider" style={{ fontSize: zhScale(12) }}>
              {isZh ? '地图结构编辑器' : 'MAP STRUCTURE EDITOR'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-red-900/80 hover:bg-red-600 text-white flex items-center justify-center pixel-border border-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 flex-1 flex flex-col lg:flex-row gap-4 overflow-y-auto">
          {/* Left: Interactive Canvas Workspace */}
          <div className="flex-1 flex flex-col items-center justify-center bg-black/60 p-3 pixel-border border-[#5a2d9c]">
            <div className="w-full max-w-[760px] aspect-[16/9] relative flex items-center justify-center bg-white pixel-border border-2 border-white/40 shadow-inner overflow-hidden">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                onContextMenu={e => e.preventDefault()}
                className="w-full h-full object-contain cursor-crosshair touch-none select-none"
              />
            </div>
            <div className="mt-2 text-[10px] text-white/60 flex items-center gap-4">
              <span>{isZh ? `画布尺寸: ${cols} × ${rows}` : `Canvas Grid: ${cols} × ${rows}`}</span>
              <span>{isZh ? '提示: 按住鼠标左键可连续绘制，右键涂擦' : 'Tip: Left click & drag to draw, right click to erase'}</span>
            </div>
          </div>

          {/* Right: Tools & Settings Palette */}
          <div className="w-full lg:w-72 flex flex-col gap-3 justify-between">
            <div className="space-y-4">
              {/* Grid Size Selection */}
              <div className="bg-[#1b0a38] p-3 pixel-border border-[#5a2d9c] space-y-2">
                <label className="text-[10px] font-bold text-[#f7d51d] uppercase tracking-wider block">
                  {isZh ? '网格比例尺寸' : 'GRID SIZE'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSizeChange(32, 18)}
                    className={`px-3 py-2 text-xs font-bold pixel-border border transition-all ${
                      cols === 32
                        ? 'bg-[#f7d51d] text-[#2d1b4e] border-white'
                        : 'bg-black/40 text-white/70 border-[#5a2d9c] hover:border-white/50'
                    }`}
                  >
                    32 × 18
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSizeChange(64, 36)}
                    className={`px-3 py-2 text-xs font-bold pixel-border border transition-all ${
                      cols === 64
                        ? 'bg-[#f7d51d] text-[#2d1b4e] border-white'
                        : 'bg-black/40 text-white/70 border-[#5a2d9c] hover:border-white/50'
                    }`}
                  >
                    64 × 36
                  </button>
                </div>
              </div>

              {/* Tile Palette */}
              <div className="bg-[#1b0a38] p-3 pixel-border border-[#5a2d9c] space-y-2">
                <label className="text-[10px] font-bold text-[#f7d51d] uppercase tracking-wider block">
                  {isZh ? '地图地块选择' : 'TILE SELECTOR'}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {TILE_CONFIGS.map(tile => {
                    const isSelected = selectedType === tile.id;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => setSelectedType(tile.id)}
                        className={`p-2 pixel-border border flex items-center justify-between text-left transition-all ${
                          isSelected
                            ? 'bg-[#5a2d9c] border-[#f7d51d] text-white shadow-lg'
                            : 'bg-black/40 border-[#5a2d9c]/60 text-white/80 hover:bg-black/60 hover:border-white/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Preview icon/tile box */}
                          <div className="w-7 h-7 pixel-border border border-white/40 flex items-center justify-center bg-white overflow-hidden relative">
                            {tile.isEraser ? (
                              <Eraser size={16} className="text-[#2d1b4e]" />
                            ) : (
                              <TilePreviewBox type={tile.id} />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-tight">
                              {isZh ? tile.nameZh : tile.nameEn}
                            </div>
                            <div className="text-[9px] opacity-60 leading-tight">
                              {isZh ? tile.descZh : tile.descEn}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={16} className="text-[#f7d51d]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-2 border-t border-[#5a2d9c]">
              <PixelButton
                variant="danger"
                onClick={() => setShowClearConfirm(true)}
                className="w-full h-9 text-xs"
              >
                <Trash2 size={14} />
                {isZh ? '清空画布' : 'CLEAR CANVAS'}
              </PixelButton>

              <div className="grid grid-cols-2 gap-2">
                <PixelButton
                  variant="secondary"
                  onClick={onClose}
                  className="w-full h-10 text-xs"
                >
                  {isZh ? '取消' : 'CANCEL'}
                </PixelButton>
                <PixelButton
                  variant="primary"
                  onClick={handleConfirmSave}
                  className="w-full h-10 text-xs font-bold"
                >
                  {isZh ? '应用结构' : 'APPLY STRUCTURE'}
                </PixelButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Canvas */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-xs w-full bg-[#0d0221] pixel-border border-2 border-red-500 p-4 space-y-4 text-center">
            <div className="flex justify-center text-red-500">
              <AlertTriangle size={32} />
            </div>
            <div className="text-white text-xs font-bold leading-relaxed">
              {isZh ? '确定要清空当前的结构画布吗？此操作无法撤销。' : 'Are you sure you want to clear the canvas? This cannot be undone.'}
            </div>
            <div className="flex gap-2 justify-center">
              <PixelButton variant="secondary" onClick={() => setShowClearConfirm(false)} className="px-3 py-1 text-xs">
                {isZh ? '取消' : 'Cancel'}
              </PixelButton>
              <PixelButton variant="danger" onClick={handleClear} className="px-3 py-1 text-xs">
                {isZh ? '确认清空' : 'Clear'}
              </PixelButton>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Size Switch */}
      {pendingSizeSwitch && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-xs w-full bg-[#0d0221] pixel-border border-2 border-[#f7d51d] p-4 space-y-4 text-center">
            <div className="flex justify-center text-[#f7d51d]">
              <AlertTriangle size={32} />
            </div>
            <div className="text-white text-xs font-bold leading-relaxed">
              {isZh
                ? `切换网格为 ${pendingSizeSwitch.cols} × ${pendingSizeSwitch.rows} 将清空当前已绘制内容，确定要切换吗？`
                : `Switching to ${pendingSizeSwitch.cols} × ${pendingSizeSwitch.rows} will clear your current canvas. Continue?`}
            </div>
            <div className="flex gap-2 justify-center">
              <PixelButton variant="secondary" onClick={() => setPendingSizeSwitch(null)} className="px-3 py-1 text-xs">
                {isZh ? '取消' : 'Cancel'}
              </PixelButton>
              <PixelButton variant="primary" onClick={confirmPendingSizeSwitch} className="px-3 py-1 text-xs">
                {isZh ? '确定切换' : 'Switch'}
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for Palette Button Mini Preview
const TilePreviewBox: React.FC<{ type: number }> = ({ type }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 28, 28);
    renderTileCell(ctx, type, 0, 0, 28, 28);
  }, [type]);

  return <canvas ref={canvasRef} width={28} height={28} className="w-full h-full object-contain" />;
};
