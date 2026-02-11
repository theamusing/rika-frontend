
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants.ts';
import { apiService } from './services/apiService.ts';
import { AuthUser, Job } from './types.ts';
import LoginPage from './pages/LoginPage.tsx';
import GenerationPage from './pages/GenerationPage.tsx';
import TaskPlayerPage from './pages/TaskPlayerPage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';
import LandingPage from './pages/LandingPage.tsx';
import DocumentPage from './pages/DocumentPage.tsx';
import { PixelButton } from './components/PixelComponents.tsx';
import { PricingModal } from './components/PricingModal.tsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'intro' | 'generate' | 'player' | 'history' | 'docs'>('intro');
  const [pendingTab, setPendingTab] = useState<'generate' | 'player' | 'history' | 'docs' | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [initialParams, setInitialParams] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'forgot' | 'update'>('login');
  
  const lastFetchTime = useRef<number>(0);

  const fetchCredits = useCallback(async () => {
    if (Date.now() - lastFetchTime.current < 300) return;
    try {
      const res = await apiService.getCredits();
      setCredits(res.credits);
      lastFetchTime.current = Date.now();
    } catch (err: any) {
      console.error("Failed to fetch credits", err);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        apiService.setToken(session.access_token);
        fetchCredits();
      }
      setIsAuthChecking(false);
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AUTH EVENT] ${event}`);

      if (event === 'PASSWORD_RECOVERY') {
        // Force the app to show the update password form
        setLoginMode('update');
        setActiveTab('generate'); // The tab that holds the Login/Register container
        return;
      }

      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        apiService.setToken(session.access_token);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
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
    setActiveTab('intro');
    setPendingTab(null);
    setLoginMode('login');
  };

  const navigateTo = (tab: 'intro' | 'generate' | 'player' | 'history' | 'docs') => {
    if (tab === 'intro' || tab === 'docs') {
      setActiveTab(tab);
      setPendingTab(null);
      return;
    }
    
    if (!user) {
      const target = (tab === 'history') ? 'history' : 'generate';
      setPendingTab(target);
      setActiveTab(target); 
      return;
    }
    
    setActiveTab(tab);
    setPendingTab(null);
  };

  const handleLoginSuccess = () => {
    const target = pendingTab || 'generate';
    setActiveTab(target);
    setPendingTab(null);
    setLoginMode('login');
  };

  const handleJobSelected = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveTab('player');
  };

  const handleRegenerate = (params: any) => {
    setInitialParams(params);
    setActiveTab('generate');
  };

  if (isAuthChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0d0221] text-white uppercase text-xs">Loading OS...</div>;
  }

  // Recovery mode should override showIntro if the user is in the middle of a password reset
  const isRecovering = loginMode === 'update';
  const showIntro = activeTab === 'intro' && !isRecovering;
  const showLogin = !user && !showIntro && activeTab !== 'docs';

  return (
    <div className="min-h-screen flex flex-col bg-[#0d0221]">
      <header className="sticky top-0 z-50 bg-[#2d1b4e] border-b-4 border-[#5a2d9c] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h1 
            className="text-xl font-bold tracking-tighter text-white cursor-pointer"
            onClick={() => navigateTo('intro')}
          >
            RIKA AI
          </h1>
          <nav className="flex gap-2">
            <button 
              onClick={() => navigateTo('generate')}
              className={`px-4 py-2 text-[10px] font-bold uppercase transition-all ${activeTab === 'generate' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white'}`}
            >
              CREATE
            </button>
            <button 
              onClick={() => navigateTo('player')}
              className={`px-4 py-2 text-[10px] font-bold uppercase transition-all ${activeTab === 'player' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white'}`}
            >
              PLAYER
            </button>
            <button 
              onClick={() => navigateTo('history')}
              className={`px-4 py-2 text-[10px] font-bold uppercase transition-all ${activeTab === 'history' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white'}`}
            >
              DASHBOARD
            </button>
            <button 
              onClick={() => navigateTo('docs')}
              className={`px-4 py-2 text-[10px] font-bold uppercase transition-all ${activeTab === 'docs' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white'}`}
            >
              DOCS
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div 
                className="flex flex-col items-end cursor-pointer group"
                onClick={() => setIsPricingOpen(true)}
                title="Click to buy more credits"
              >
                <span className="text-[8px] opacity-40 text-white group-hover:text-[#f7d51d]">CREDITS</span>
                <span className="text-sm font-bold text-[#f7d51d] group-hover:scale-105 transition-transform">{credits}</span>
              </div>
              <button onClick={handleLogout} className="text-[10px] font-bold uppercase text-white/60 hover:text-white">LOGOUT</button>
            </>
          ) : (
            <PixelButton 
              variant="primary" 
              onClick={() => navigateTo('generate')} 
              className="text-[10px] h-8"
            >
              LOGIN
            </PixelButton>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 max-w-7xl">
        {showIntro ? (
          <LandingPage onGetStarted={() => navigateTo('generate')} onViewDocs={() => navigateTo('docs')} />
        ) : activeTab === 'docs' ? (
          <DocumentPage />
        ) : showLogin ? (
          <LoginPage onLogin={handleLoginSuccess} initialMode={loginMode} />
        ) : (
          <>
            {activeTab === 'generate' && (
              <GenerationPage 
                onJobCreated={(id) => { setSelectedJobId(id); setActiveTab('player'); }} 
                initialParams={initialParams}
                onConsumed={() => setInitialParams(null)}
                refreshCredits={fetchCredits}
                credits={credits}
                onOpenPricing={() => setIsPricingOpen(true)}
              />
            )}
            {activeTab === 'player' && (
              <TaskPlayerPage 
                selectedJobId={selectedJobId} 
                onJobSelected={setSelectedJobId}
                onRegenerate={handleRegenerate}
              />
            )}
            {activeTab === 'history' && (
              <HistoryPage 
                onJobSelected={handleJobSelected} 
                onRegenerate={handleRegenerate}
              />
            )}
          </>
        )}
      </main>

      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
      />
    </div>
  );
};

export default App;
