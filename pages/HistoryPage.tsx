
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService.ts';
import { Job } from '../types.ts';
import { PixelButton, PixelCard, PixelImage } from '../components/PixelComponents.tsx';
import { Heart, Trash2, AlertTriangle } from 'lucide-react';

interface HistoryPageProps {
  onJobSelected: (job: Job, page?: number) => void;
  onRegenerate: (params: any) => void;
  initialPage?: number;
  lang?: 'en' | 'zh';
  isLoggedIn?: boolean;
  onLoginRequest?: () => void;
}

const PAGE_SIZE = 20;
const SHOW_LIKED_ONLY_KEY = 'rika_show_liked_only';
const JOB_TYPE_KEY = 'rika_history_job_type';

const HistoryPage: React.FC<HistoryPageProps> = ({ 
  onJobSelected, 
  onRegenerate, 
  initialPage, 
  lang = 'en',
  isLoggedIn = false,
  onLoginRequest
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage || 0);
  const [totalJobs, setTotalJobs] = useState(0);
  const [showLikedOnly, setShowLikedOnly] = useState(() => {
    return localStorage.getItem(SHOW_LIKED_ONLY_KEY) === 'true';
  });
  const [jobType, setJobType] = useState<string | undefined>(() => {
    return localStorage.getItem(JOB_TYPE_KEY) || undefined;
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const lastRefreshTime = useRef<number>(0);
  const isMounted = useRef(true);
  const isFetching = useRef(false);

  const toggleLike = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    const newLiked = !job.liked;
    
    // Optimistic update
    setJobs(prev => prev.map(j => j.gen_id === job.gen_id ? { ...j, liked: newLiked } : j));
    if (selectedJob?.gen_id === job.gen_id) {
      setSelectedJob(prev => prev ? { ...prev, liked: newLiked } : null);
    }

    try {
      await apiService.setLiked(job.gen_id, newLiked);
    } catch (err) {
      console.error("Failed to set liked status", err);
      // Rollback on error
      setJobs(prev => prev.map(j => j.gen_id === job.gen_id ? { ...j, liked: !newLiked } : j));
      if (selectedJob?.gen_id === job.gen_id) {
        setSelectedJob(prev => prev ? { ...prev, liked: !newLiked } : null);
      }
    }
  };

  const fetchHistory = useCallback(async (isInitial = false, page: number = currentPage, likedOnly: boolean = showLikedOnly, type: string | undefined = jobType) => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      }
      
      // Fetch total count with liked filter
      const numRes = await apiService.getHistoryNum(likedOnly, type);
      if (isMounted.current) {
        setTotalJobs(numRes.total);
      }
      
      const start = page * PAGE_SIZE;
      const res = await apiService.getHistory(start, PAGE_SIZE, likedOnly, type);
      
      if (isMounted.current) {
        setJobs(res.jobs || []);
        setError(null);
        lastRefreshTime.current = Date.now();
      }
    } catch (err: any) {
      if (isMounted.current && isInitial) setError(err.message || "Failed to load history");
    } finally {
      if (isMounted.current) {
        setLoading(false);
        isFetching.current = false;
      }
    }
  }, [currentPage, showLikedOnly, jobType]);

  useEffect(() => {
    isMounted.current = true;
    fetchHistory(true, currentPage, showLikedOnly, jobType);
    
    // Auto-refresh logic: every 10s check if 30s passed since last fetch
    const autoRefreshInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastRefreshTime.current >= 30000 && !isFetching.current) {
        fetchHistory(false, currentPage, showLikedOnly, jobType);
      }
    }, 10000);

    return () => {
      isMounted.current = false;
      clearInterval(autoRefreshInterval);
    };
  }, [fetchHistory, currentPage, showLikedOnly, jobType]);

  const handleManualRefresh = () => {
    const now = Date.now();
    if (now - lastRefreshTime.current < 1000) return; 
    lastRefreshTime.current = now;
    fetchHistory(false, currentPage, showLikedOnly, jobType);
  };

  const handleDeleteJob = async () => {
    if (!selectedJob) return;
    setIsDeleting(true);
    try {
      await apiService.deleteHistory(selectedJob.gen_id);
      setJobs(prev => prev.filter(j => j.gen_id !== selectedJob.gen_id));
      setTotalJobs(prev => prev - 1);
      setSelectedJob(null);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      alert(isZh ? `删除失败: ${err.message}` : `Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickDelete = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setSelectedJob(job);
    setShowDeleteConfirm(true);
  };

  const totalPages = Math.ceil(totalJobs / PAGE_SIZE);

  const handleNextPage = () => setCurrentPage(prev => prev + 1);
  const handlePrevPage = () => setCurrentPage(prev => Math.max(0, prev - 1));

  const isZh = lang === 'zh';
  
  // Helper to apply larger font only if text is Chinese
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  if (!isLoggedIn) {
    return (
      <div className="space-y-8 text-white">
        <div className="flex justify-between items-center">
            <h2 className={`font-bold uppercase text-white/80 ${isZh ? 'text-[24px]' : 'text-xl'}`}>
              {isZh ? '历史记录' : 'GENERATION ARCHIVE'}
            </h2>
        </div>
        
        <PixelCard className="relative">
          <div className="text-center py-16 space-y-6 flex flex-col items-center">
            <p className="text-white/60 uppercase" style={{ fontSize: zhScale(12) }}>
              {isZh ? '请登录以查看您的生成记录' : 'Please login to view your generations'}
            </p>
            <PixelButton variant="primary" onClick={onLoginRequest} style={{ fontSize: zhScale(10) }}>
              {isZh ? '登录' : 'LOGIN'}
            </PixelButton>
          </div>
        </PixelCard>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white">
      <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className={`font-bold uppercase text-white/80 ${isZh ? 'text-[24px]' : 'text-xl'}`}>
              {isZh ? '历史记录' : 'GENERATION ARCHIVE'}
            </h2>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 bg-[#5a2d9c]/40 pixel-border border-[#5a2d9c] text-white/60 text-[10px]`}>
                PAGE {String(currentPage + 1).padStart(2, '0')} / {String(totalPages || 1).padStart(2, '0')}
              </div>
              <select 
                value={jobType || ''} 
                onChange={(e) => {
                  const val = e.target.value || undefined;
                  setJobType(val);
                  if (val) {
                    localStorage.setItem(JOB_TYPE_KEY, val);
                  } else {
                    localStorage.removeItem(JOB_TYPE_KEY);
                  }
                  setCurrentPage(0);
                }}
                className="bg-[#5a2d9c]/20 pixel-border border-[#5a2d9c] text-white/60 text-[10px] px-2 py-1 outline-none cursor-pointer hover:text-white"
                style={{ fontSize: zhScale(8) }}
              >
                <option value="">{isZh ? '全部' : 'ALL'}</option>
                <option value="character">{isZh ? '角色' : 'CHARACTER'}</option>
                <option value="animation">{isZh ? '动画' : 'ANIMATION'}</option>
              </select>
            </div>
            <button 
              onClick={() => {
                const newValue = !showLikedOnly;
                setShowLikedOnly(newValue);
                localStorage.setItem(SHOW_LIKED_ONLY_KEY, String(newValue));
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

      {loading ? (
        <div className={`text-center p-20 animate-pulse uppercase text-white/50`} style={{ fontSize: zhScale(10) }}>
          {isZh ? '扫描数据库中...' : 'Scanning Database...'}
        </div>
      ) : error ? (
        <div className="text-center p-20 space-y-4">
          <p className={`text-red-500 uppercase`} style={{ fontSize: zhScale(10) }}>
            {isZh ? '加载失败: ' : 'Archive Error: '}{error}
          </p>
          <PixelButton onClick={() => fetchHistory(true, currentPage)} style={{ fontSize: zhScale(10) }}>
            {isZh ? '重试连接' : 'Retry Connection'}
          </PixelButton>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(() => {
            if (jobs.length === 0) {
              return (
                <div className={`col-span-full text-center py-20 opacity-50 uppercase`} style={{ fontSize: zhScale(10) }}>
                  {isZh ? (showLikedOnly ? '暂无收藏记录' : '此页暂无记录') : (showLikedOnly ? 'No liked records found' : 'No records found on this page')}
                </div>
              );
            }

            return jobs.map((job) => (
              <PixelCard key={job.gen_id} className="group hover:bg-[#5a2d9c]/20 transition-all cursor-pointer" onClick={() => setSelectedJob(job)}>
                  <div className="aspect-square bg-black/40 mb-4 overflow-hidden pixel-border border-2 border-[#5a2d9c] group-hover:border-white/40 relative">
                      <div 
                        className="absolute top-1 left-1 z-30 p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                        onClick={(e) => toggleLike(e, job)}
                      >
                        <Heart 
                          size={16} 
                          className={`${job.liked ? 'fill-red-500 text-red-500' : 'text-white/40 hover:text-white/70'}`} 
                          strokeWidth={job.liked ? 0 : 2}
                        />
                      </div>
                      {(job.job_type === 'character' || job.input_params?.motion_type) && (
                          <div className="absolute top-1 right-1 z-20 px-1.5 py-0.5 bg-[#f7d51d] text-[#2d1b4e] text-[8px] font-bold uppercase">
                              {job.job_type === 'character' ? 'CHARACTER' : job.input_params.motion_type}
                          </div>
                      )}
                      {(job.input_images?.[0] || job.output_images?.[0]) && (
                          <PixelImage 
                            src={job.job_type === 'character' 
                              ? (job.output_images?.[0]?.url || job.input_images?.[0]?.url)
                              : (job.input_images?.[0]?.url || job.output_images?.[0]?.url)
                            } 
                            className="w-full h-full object-cover" 
                            style={{ imageRendering: 'pixelated' }} 
                            alt="Job preview" 
                          />
                      )}
                      {job.status === 'failed' && (
                        <button 
                          onClick={(e) => handleQuickDelete(e, job)}
                          className="absolute bottom-2 right-2 z-30 p-1.5 bg-red-600/80 hover:bg-red-600 text-white pixel-border border-red-400 transition-colors"
                          title={isZh ? '删除' : 'DELETE'}
                        >
                          <Trash2 size={14} />
                        </button>
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

          <div className="flex flex-col md:flex-row justify-center items-center gap-6 py-6 border-t-4 border-[#5a2d9c]/30">
              <div className="flex items-center gap-4">
                <PixelButton variant="secondary" disabled={currentPage === 0} onClick={handlePrevPage} className="w-24" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '上一页' : '< PREV'}
                </PixelButton>
                
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-[10px] uppercase">{isZh ? '第' : 'PAGE'}</span>
                  <span className="text-white/60 text-[10px]">{currentPage + 1}</span>
                  <span className="text-white/40 text-[10px] uppercase"> / {totalPages || 1} {isZh ? '页' : ''}</span>
                </div>

                <PixelButton 
                  variant="secondary" 
                  disabled={currentPage >= totalPages - 1} 
                  onClick={handleNextPage} 
                  className="w-24" 
                  style={{ fontSize: zhScale(10) }}
                >
                  {isZh ? '下一页' : 'NEXT >'}
                </PixelButton>
              </div>

              <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase">
                <span>{isZh ? (showLikedOnly ? '显示收藏' : '显示') : (showLikedOnly ? 'SHOWING LIKED' : 'SHOWING')}</span>
                <span className="text-white/60">
                  {totalJobs > 0 ? currentPage * PAGE_SIZE + 1 : 0} - {Math.min((currentPage + 1) * PAGE_SIZE, totalJobs)}
                </span>
                <span>/</span>
                <span className="text-white/60">{totalJobs}</span>
              </div>
          </div>
        </>
      )}

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
                                        onClick={(e) => toggleLike(e, selectedJob)}
                                      >
                                        <Heart 
                                          size={24} 
                                          className={`${selectedJob.liked ? 'fill-red-500 text-red-500' : 'text-white/40 hover:text-white/70'}`} 
                                          strokeWidth={selectedJob.liked ? 0 : 2}
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
                              <PixelButton variant="primary" onClick={() => onJobSelected(selectedJob, currentPage)} disabled={selectedJob.status === 'failed'} style={{ fontSize: zhScale(10) }}>
                                {isZh ? '预览' : 'View In Player'}
                              </PixelButton>
                              {selectedJob.job_type === 'character' && selectedJob.status === 'succeeded' && (
                                <PixelButton 
                                  variant="primary" 
                                  onClick={() => onRegenerate({ ...selectedJob, action: 'animate' })} 
                                  style={{ fontSize: zhScale(10), backgroundColor: '#f7d51d', color: '#2d1b4e' }}
                                >
                                  {isZh ? '制作动画' : 'ANIMATE'}
                                </PixelButton>
                              )}
                              <PixelButton variant="secondary" onClick={() => onRegenerate(selectedJob)} style={{ fontSize: zhScale(10) }}>
                                {isZh ? '重新生成' : 'Re-generate'}
                              </PixelButton>
                              <PixelButton variant="secondary" onClick={() => setSelectedJob(null)} style={{ fontSize: zhScale(10) }}>
                                {isZh ? '关闭' : 'Close Archive'}
                              </PixelButton>
                              
                              {(selectedJob.status === 'succeeded' || selectedJob.status === 'failed') && (
                                <div className="flex justify-end pt-4">
                                  <button 
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2 bg-red-900/40 hover:bg-red-600 text-red-500 hover:text-white transition-all pixel-border border-red-500"
                                    title={isZh ? '删除任务' : 'Delete Job'}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                          </div>
                      </div>
                  </div>
              </PixelCard>
          </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <PixelCard className="max-w-sm w-full p-6 text-center space-y-6" title={isZh ? '确认删除' : 'CONFIRM DELETE'}>
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={24} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-white" style={{ fontSize: zhScale(12) }}>
                {isZh ? '确定要删除吗？' : 'Are you sure?'}
              </p>
              <p className="text-white/60" style={{ fontSize: zhScale(9) }}>
                {isZh ? '此操作不可逆，任务数据将被永久移除。' : 'This action is irreversible. Task data will be permanently removed.'}
              </p>
            </div>
            <div className="flex gap-4">
              <PixelButton 
                variant="danger" 
                className="flex-1" 
                onClick={handleDeleteJob} 
                disabled={isDeleting}
                style={{ fontSize: zhScale(10) }}
              >
                {isDeleting ? (isZh ? '删除中...' : 'DELETING...') : (isZh ? '确认删除' : 'CONFIRM')}
              </PixelButton>
              <PixelButton 
                variant="secondary" 
                className="flex-1" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{ fontSize: zhScale(10) }}
              >
                {isZh ? '取消' : 'CANCEL'}
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
