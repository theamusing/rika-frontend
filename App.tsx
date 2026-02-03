
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';
import { apiService } from './services/apiService';
import { AuthUser, Job } from './types';
import LoginPage from './pages/LoginPage';
import GenerationPage from './pages/GenerationPage';
import TaskPlayerPage from './pages/TaskPlayerPage';
import HistoryPage from './pages/HistoryPage';
import { PixelButton } from './components/PixelComponents';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'generate' | 'player' | 'history'>('generate');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [initialParams, setInitialParams] = useState<any>(null);
  
  const lastFetchTime = useRef<number>(0);

  const fetchCredits = useCallback(async () => {
    // Prevent fetching more than once per second at the component level
    if (Date.now() - lastFetchTime.current < 1000) return;
    
    try {
      const res = await apiService.getCredits();
      setCredits(res.credits);
      lastFetchTime.current = Date.now();
    } catch (err) {
      console.error("Failed to fetch credits", err);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        apiService.setToken(session.access_token);
        // Only trigger fetch if we are actually signed in or session refreshed
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          fetchCredits();
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleJobSelected = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveTab('player');
  };

  const handleRegenerate = (params: any) => {
    setInitialParams(params);
    setActiveTab('generate');
  };

  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f171e]">
      <header className="sticky top-0 z-50 bg-[#0f380f] border-b-4 border-[#306230] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tighter text-[#8bac0f] hidden md:block">RIKA AI</h1>
          <nav className="flex gap-2">
            <PixelButton 
              variant={activeTab === 'generate' ? 'primary' : 'secondary'} 
              onClick={() => setActiveTab('generate')}
            >
              CREATE
            </PixelButton>
            <PixelButton 
              variant={activeTab === 'player' ? 'primary' : 'secondary'} 
              onClick={() => setActiveTab('player')}
            >
              PLAYER
            </PixelButton>
            <PixelButton 
              variant={activeTab === 'history' ? 'primary' : 'secondary'} 
              onClick={() => setActiveTab('history')}
            >
              DASHBOARD
            </PixelButton>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] opacity-70">CREDITS</span>
            <span className="text-lg font-bold">{credits}</span>
          </div>
          <PixelButton variant="secondary" onClick={handleLogout} className="text-[10px] h-8">LOGOUT</PixelButton>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 max-w-7xl">
        {activeTab === 'generate' && (
          <GenerationPage 
            onJobCreated={(id) => { setSelectedJobId(id); setActiveTab('player'); }} 
            initialParams={initialParams}
            onConsumed={() => setInitialParams(null)}
            refreshCredits={fetchCredits}
          />
        )}
        {activeTab === 'player' && (
          <TaskPlayerPage 
            selectedJobId={selectedJobId} 
            onJobSelected={setSelectedJobId}
          />
        )}
        {activeTab === 'history' && (
          <HistoryPage 
            onJobSelected={handleJobSelected} 
            onRegenerate={handleRegenerate}
          />
        )}
      </main>
    </div>
  );
};

export default App;
