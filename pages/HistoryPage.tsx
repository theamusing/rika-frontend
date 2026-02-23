
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService.ts';
import { Job } from '../types.ts';
import { PixelButton, PixelCard, PixelImage } from '../components/PixelComponents.tsx';
import { Heart } from 'lucide-react';

interface HistoryPageProps {
  onJobSelected: (id: string) => void;
  onRegenerate: (params: any) => void;
  lang?: 'en' | 'zh';
}

const PAGE_SIZE = 8;
const LIKED_JOBS_KEY = 'rika_liked_jobs';

const HistoryPage: React.FC<HistoryPageProps> = ({ onJobSelected, onRegenerate, lang = 'en' }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [likedJobs, setLikedJobs] = useState<Set<string>>(new Set());
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  
  const lastRefreshTime = useRef<number>(0);
  const isMounted = useRef(true);
  const isFetching = useRef(false);

  // Load liked jobs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LIKED_JOBS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLikedJobs(new Set(parsed));
        }
      } catch (e) {
        console.error("Failed to parse liked jobs", e);
      }
    }
  }, []);

  const toggleLike = (e: React.MouseEvent, genId: string) => {
    e.stopPropagation();
    setLikedJobs(prev => {
      const next = new Set(prev);
      if (next.has(genId)) {
        next.delete(genId);
      } else {
        next.add(genId);
      }
      localStorage.setItem(LIKED_JOBS_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const fetchHistory = useCallback(async (isInitial = false, page: number = currentPage) => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      }
      const start = page * PAGE_SIZE;
      const res = await apiService.getHistory(start, PAGE_SIZE);
      if (isMounted.current) {
        setJobs(res.jobs || []);
        setError(null);
      }
    } catch (err: any) {
      if (isMounted.current && isInitial) setError(err.message || "Failed to load history");
    } finally {
      if (isMounted.current) {
        setLoading(false);
        isFetching.current = false;
      }
    }
  }, [currentPage]);

  useEffect(() => {
    isMounted.current = true;
    fetchHistory(true, currentPage);
    const pollInterval = setInterval(() => fetchHistory(false, currentPage), 5000); 
    return () => {
      isMounted.current = false;
      clearInterval(pollInterval);
    };
  }, [fetchHistory, currentPage]);

  const handleManualRefresh = () => {
    const now = Date.now();
    if (now - lastRefreshTime.current < 1000) return; 
    lastRefreshTime.current = now;
    fetchHistory(false, currentPage);
  };

  const handleNextPage = () => setCurrentPage(prev => prev + 1);
  const handlePrevPage = () => setCurrentPage(prev => Math.max(0, prev - 1));

  const isZh = lang === 'zh';
  
  // Helper to apply larger font only if text is Chinese
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  if (loading) return (
    <div className={`text-center p-20 animate-pulse uppercase text-white/50`} style={{ fontSize: zhScale(10) }}>
      {isZh ? '扫描数据库中...' : 'Scanning Database...'}
    </div>
  );

  if (error) return (
    <div className="text-center p-20 space-y-4">
      <p className={`text-red-500 uppercase`} style={{ fontSize: zhScale(10) }}>
        {isZh ? '加载失败: ' : 'Archive Error: '}{error}
      </p>
      <PixelButton onClick={() => fetchHistory(true, currentPage)} style={{ fontSize: zhScale(10) }}>
        {isZh ? '重试连接' : 'Retry Connection'}
      </PixelButton>
    </div>
  );

  const hasNextPage = jobs.length === PAGE_SIZE;

  return (
    <div className="space-y-8 text-white">
      <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className={`font-bold uppercase text-white/80 ${isZh ? 'text-[24px]' : 'text-xl'}`}>
              {isZh ? '历史记录' : 'GENERATION ARCHIVE'}
            </h2>
            <div className={`px-3 py-1 bg-[#5a2d9c]/40 pixel-border border-[#5a2d9c] text-white/60 text-[10px]`}>
              PAGE {String(currentPage + 1).padStart(2, '0')}
            </div>
            <button 
              onClick={() => {
                setShowLikedOnly(!showLikedOnly);
                setCurrentPage(0);
              }}
              className={`flex items-center gap-2 px-3 py-1 pixel-border transition-all ${showLikedOnly ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-[#5a2d9c]/20 border-[#5a2d9c] text-white/40 hover:text-white/60'}`}
              style={{ fontSize: zhScale(8) }}
            >
              <Heart size={12} className={showLikedOnly ? 'fill-red-500' : ''} />
              {isZh ? '仅显示收藏' : 'LIKED ONLY'}
            </button>
          </div>
          <PixelButton variant="secondary" onClick={handleManualRefresh} style={{ fontSize: zhScale(10) }}>
            {isZh ? '刷新' : 'Refresh'}
          </PixelButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(() => {
            const displayedJobs = showLikedOnly 
              ? jobs.filter(j => likedJobs.has(j.gen_id))
              : jobs;
            
            if (displayedJobs.length === 0) {
              return (
                <div className={`col-span-full text-center py-20 opacity-50 uppercase`} style={{ fontSize: zhScale(10) }}>
                  {isZh ? (showLikedOnly ? '暂无收藏记录' : '此页暂无记录') : (showLikedOnly ? 'No liked records found' : 'No records found on this page')}
                </div>
              );
            }

            return displayedJobs.map((job) => (
              <PixelCard key={job.gen_id} className="group hover:bg-[#5a2d9c]/20 transition-all cursor-pointer" onClick={() => setSelectedJob(job)}>
                  <div className="aspect-square bg-black/40 mb-4 overflow-hidden pixel-border border-2 border-[#5a2d9c] group-hover:border-white/40 relative">
                      <div 
                        className="absolute top-1 left-1 z-30 p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                        onClick={(e) => toggleLike(e, job.gen_id)}
                      >
                        <Heart 
                          size={16} 
                          className={`${likedJobs.has(job.gen_id) ? 'fill-red-500 text-red-500' : 'text-white/40 hover:text-white/70'}`} 
                          strokeWidth={likedJobs.has(job.gen_id) ? 0 : 2}
                        />
                      </div>
                      {job.input_params?.motion_type && (
                          <div className="absolute top-1 right-1 z-20 px-1.5 py-0.5 bg-[#f7d51d] text-[#2d1b4e] text-[8px] font-bold uppercase">
                              {job.input_params.motion_type}
                          </div>
                      )}
                      {job.input_images?.[0] && (
                          <PixelImage 
                            src={job.input_images[0].url} 
                            className="w-full h-full object-contain" 
                            style={{ imageRendering: 'pixelated' }} 
                            alt="Job preview" 
                          />
                      )}
                  </div>
                  <div className="space-y-2">
                      <div className="flex justify-between items-start">
                          <p className={`font-bold truncate pr-4 text-white/90`} style={{ fontSize: isZh && !job.input_params?.prompt ? '14px' : '10px' }}>
                            {job.input_params?.prompt || (isZh ? '未命名任务' : 'Untitled Job')}
                          </p>
                          <span className={`px-1 border text-[6px] ${
                            job.status === 'succeeded' ? 'border-green-500 text-green-500' : 
                            job.status === 'failed' ? 'border-red-500 text-red-500' : 
                            (job.status === 'running' || job.status === 'queued') ? 'border-yellow-500 text-yellow-500' : 
                            'border-white/30 text-white/60'
                          }`}>
                              {job.status.toUpperCase()}
                          </span>
                      </div>
                      <p className={`opacity-40 uppercase text-[6px]`}>
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                  </div>
              </PixelCard>
            ));
          })()}
      </div>

      <div className="flex justify-center items-center gap-8 py-4 border-t-4 border-[#5a2d9c]/30">
          <PixelButton variant="secondary" disabled={currentPage === 0} onClick={handlePrevPage} className="w-32" style={{ fontSize: zhScale(10) }}>
            {isZh ? '上一页' : '< PREV'}
          </PixelButton>
          <div className={`opacity-40`} style={{ fontSize: zhScale(10) }}>
            {isZh ? '显示' : 'SHOWING'}
          </div>
          <div className={`opacity-40`} style={{ fontSize: 10 }}>
            {currentPage * PAGE_SIZE + 1} - {currentPage * PAGE_SIZE + jobs.length}
          </div>
          <PixelButton variant="secondary" disabled={!hasNextPage} onClick={handleNextPage} className="w-32" style={{ fontSize: zhScale(10) }}>
            {isZh ? '下一页' : 'NEXT >'}
          </PixelButton>
      </div>

      {selectedJob && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
              <PixelCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" title={isZh ? '任务详情' : 'Task Specifications'}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div>
                              <p className={`opacity-50 uppercase mb-2`} style={{ fontSize: zhScale(8) }}>
                                {isZh ? '输入图像' : 'Input Reference'}
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                  {selectedJob.input_images?.map((img, i) => (
                                      <div key={i} className="aspect-square bg-black/40 pixel-border border-[#5a2d9c]">
                                          <PixelImage 
                                            src={img.url} 
                                            className="w-full h-full object-contain" 
                                            style={{ imageRendering: 'pixelated' }} 
                                            alt={`Input ${i}`} 
                                          />
                                      </div>
                                  ))}
                              </div>
                          </div>
                          {selectedJob.status === 'succeeded' && selectedJob.output_images && (
                              <div>
                                  <p className={`opacity-50 uppercase mb-2`} style={{ fontSize: zhScale(8) }}>
                                    {isZh ? '生成结果' : 'Generated Output'}
                                  </p>
                                  <div className="aspect-square bg-black/40 pixel-border border-[#5a2d9c] relative">
                                      <div 
                                        className="absolute top-2 left-2 z-30 p-2 cursor-pointer transition-transform hover:scale-110 active:scale-95 bg-black/20 rounded-full"
                                        onClick={(e) => toggleLike(e, selectedJob.gen_id)}
                                      >
                                        <Heart 
                                          size={24} 
                                          className={`${likedJobs.has(selectedJob.gen_id) ? 'fill-red-500 text-red-500' : 'text-white/40 hover:text-white/70'}`} 
                                          strokeWidth={likedJobs.has(selectedJob.gen_id) ? 0 : 2}
                                        />
                                      </div>
                                      <PixelImage 
                                        src={selectedJob.output_images[0].url} 
                                        className="w-full h-full object-contain" 
                                        style={{ imageRendering: 'pixelated' }} 
                                        alt="Output" 
                                      />
                                  </div>
                              </div>
                          )}
                      </div>
                      <div className="space-y-6">
                          <div className="space-y-4">
                              <div className="p-4 bg-[#0d0221] pixel-border border-[#5a2d9c]">
                                  <p className={`uppercase underline mb-2 text-white/60 text-[10px]`}>Parameters</p>
                                  <pre className={`leading-relaxed opacity-80 overflow-x-auto text-white/90 text-[8px]`}>
                                      {JSON.stringify(selectedJob.input_params, null, 2)}
                                  </pre>
                              </div>
                              {selectedJob.error && (
                                  <div className="p-4 bg-red-900/20 pixel-border border-red-500">
                                      <p className={`uppercase text-red-500 mb-1`} style={{ fontSize: zhScale(8) }}>
                                        {isZh ? '错误信息' : 'Error Trace'}
                                      </p>
                                      <p className={`opacity-80 text-white`} style={{ fontSize: 8 }}>
                                        {selectedJob.error}
                                      </p>
                                  </div>
                              )}
                          </div>
                          <div className="flex flex-col gap-3">
                              <PixelButton variant="primary" onClick={() => onJobSelected(selectedJob.gen_id)} disabled={selectedJob.status === 'failed'} style={{ fontSize: zhScale(10) }}>
                                {isZh ? '预览' : 'View In Player'}
                              </PixelButton>
                              <PixelButton variant="secondary" onClick={() => onRegenerate(selectedJob)} style={{ fontSize: zhScale(10) }}>
                                {isZh ? '重新生成' : 'Re-generate'}
                              </PixelButton>
                              <PixelButton variant="secondary" onClick={() => setSelectedJob(null)} style={{ fontSize: zhScale(10) }}>
                                {isZh ? '关闭' : 'Close Archive'}
                              </PixelButton>
                          </div>
                      </div>
                  </div>
              </PixelCard>
          </div>
      )}
    </div>
  );
};

export default HistoryPage;
