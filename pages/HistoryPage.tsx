
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { Job } from '../types';
import { PixelButton, PixelCard } from '../components/PixelComponents';

interface HistoryPageProps {
  onJobSelected: (id: string) => void;
  onRegenerate: (params: any) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onJobSelected, onRegenerate }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const lastRefreshTime = useRef<number>(0);
  const isMounted = useRef(true);
  const isFetching = useRef(false);

  const fetchHistory = useCallback(async (isInitial = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      }
      const res = await apiService.getHistory(30);
      if (isMounted.current) {
        setJobs(res.jobs || []);
        setError(null);
      }
    } catch (err: any) {
      if (isMounted.current && isInitial) {
        setError(err.message || "Failed to load history");
      }
      console.error("History fetch failed:", err.message);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        isFetching.current = false;
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchHistory(true);

    const pollInterval = setInterval(() => {
      fetchHistory(false);
    }, 15000); 

    return () => {
      isMounted.current = false;
      clearInterval(pollInterval);
    };
  }, [fetchHistory]);

  const handleManualRefresh = () => {
    const now = Date.now();
    if (now - lastRefreshTime.current < 2000) return; 
    lastRefreshTime.current = now;
    fetchHistory(false);
  };

  if (loading) return <div className="text-center p-20 animate-pulse uppercase">Scanning Database...</div>;
  if (error) return (
    <div className="text-center p-20 space-y-4">
      <p className="text-red-500 uppercase">Archive Error: {error}</p>
      <PixelButton onClick={() => fetchHistory(true)}>Retry Connection</PixelButton>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase">Archive Terminal</h2>
          <PixelButton variant="secondary" onClick={handleManualRefresh}>Refresh</PixelButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {jobs.length === 0 ? (
            <div className="col-span-full text-center py-20 opacity-50 uppercase text-[10px]">No records found in database</div>
          ) : jobs.map((job) => (
              <PixelCard key={job.gen_id} className="group hover:bg-[#306230]/20 transition-all cursor-pointer" onClick={() => setSelectedJob(job)}>
                  <div className="aspect-square bg-black/40 mb-4 overflow-hidden pixel-border border-2 border-[#306230] group-hover:border-[#8bac0f]">
                      {job.input_images?.[0] && (
                          <img src={job.input_images[0].url} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} alt="Job preview" />
                      )}
                  </div>
                  <div className="space-y-2">
                      <div className="flex justify-between items-start">
                          <p className="text-[10px] font-bold truncate pr-4">{job.input_params?.prompt || 'Untitled Job'}</p>
                          <span className={`text-[6px] px-1 border ${job.status === 'succeeded' ? 'border-green-500 text-green-500' : job.status === 'failed' ? 'border-red-500 text-red-500' : 'border-yellow-500 text-yellow-500'}`}>
                              {job.status.toUpperCase()}
                          </span>
                      </div>
                      <p className="text-[6px] opacity-50 uppercase">{new Date(job.created_at).toLocaleString()}</p>
                  </div>
              </PixelCard>
          ))}
      </div>

      {selectedJob && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
              <PixelCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" title="Task Specifications">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div>
                              <p className="text-[8px] opacity-50 uppercase mb-2">Input Reference</p>
                              <div className="grid grid-cols-3 gap-2">
                                  {selectedJob.input_images?.map((img, i) => (
                                      <div key={i} className="aspect-square bg-black/40 pixel-border border-[#306230]">
                                          <img src={img.url} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} alt={`Input ${i}`} />
                                      </div>
                                  ))}
                              </div>
                          </div>
                          {selectedJob.status === 'succeeded' && selectedJob.output_images && (
                              <div>
                                  <p className="text-[8px] opacity-50 uppercase mb-2">Generated Output</p>
                                  <div className="aspect-square bg-black/40 pixel-border border-[#306230]">
                                      <img src={selectedJob.output_images[0].url} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} alt="Output" />
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="space-y-6">
                          <div className="space-y-4">
                              <div className="p-4 bg-[#0f171e] pixel-border border-[#306230]">
                                  <p className="text-[10px] uppercase underline mb-2">Config Dump</p>
                                  <pre className="text-[8px] leading-relaxed opacity-80 overflow-x-auto">
                                      {JSON.stringify(selectedJob.input_params, null, 2)}
                                  </pre>
                              </div>

                              {selectedJob.error && (
                                  <div className="p-4 bg-red-900/20 pixel-border border-red-500">
                                      <p className="text-[8px] uppercase text-red-500 mb-1">Error Trace</p>
                                      <p className="text-[8px] opacity-80">{selectedJob.error}</p>
                                  </div>
                              )}
                          </div>

                          <div className="flex flex-col gap-3">
                              <PixelButton variant="primary" onClick={() => onJobSelected(selectedJob.gen_id)} disabled={selectedJob.status === 'failed'}>
                                  View In Player
                              </PixelButton>
                              <PixelButton variant="secondary" onClick={() => onRegenerate(selectedJob)}>
                                  Re-generate (Load Params)
                              </PixelButton>
                              <PixelButton variant="secondary" onClick={() => setSelectedJob(null)}>
                                  Close Archive
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
