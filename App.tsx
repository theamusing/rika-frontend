
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './services/supabaseClient.ts';
import { apiService } from './services/apiService.ts';
import { AuthUser, Job } from './types.ts';
import LoginPage from './pages/LoginPage.tsx';
import GenerationPage from './pages/GenerationPage.tsx';
import CharacterPage from './pages/CharacterPage.tsx';
import TaskPlayerPage from './pages/TaskPlayerPage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';
import LandingPage from './pages/LandingPage.tsx';
import DocumentPage from './pages/DocumentPage.tsx';
import ApiPage from './pages/ApiPage.tsx';
import { PixelButton } from './components/PixelComponents.tsx';
import { PricingModal } from './components/PricingModal.tsx';
import { PaymentSuccessModal } from './components/PaymentSuccessModal.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'intro' | 'character' | 'generate' | 'player' | 'history' | 'api' | 'docs'>('intro');
  const [pendingTab, setPendingTab] = useState<'character' | 'generate' | 'player' | 'history' | 'api' | 'docs' | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [navigationSource, setNavigationSource] = useState<{ tab: string, page?: number } | null>(null);
  const [initialParams, setInitialParams] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isPaymentSuccessOpen, setIsPaymentSuccessOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'forgot' | 'update'>('login');
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [isBackendDown, setIsBackendDown] = useState(false);
  
  const lastFetchTime = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const createDropdownRef = useRef<HTMLDivElement>(null);

  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (createDropdownRef.current && !createDropdownRef.current.contains(event.target as Node)) {
        setShowCreateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const checkHealth = async () => {
      const isUp = await apiService.checkHealth();
      setIsBackendDown(!isUp);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
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

    const checkPaymentStatus = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashQueryPart = hash.includes('?') ? hash.split('?')[1] : '';
      const hashParams = new URLSearchParams(hashQueryPart);

      if (searchParams.get('payment_status') === 'success' || hashParams.get('payment_status') === 'success') {
        setIsPaymentSuccessOpen(true);
        fetchCredits();
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };

    checkPaymentStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLoginMode('update');
        setActiveTab('generate');
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

  const navigateTo = (tab: 'intro' | 'character' | 'generate' | 'player' | 'history' | 'api' | 'docs') => {
    if (tab === 'intro' || tab === 'docs') {
      setActiveTab(tab);
      setPendingTab(null);
      return;
    }
    
    if (!user) {
      const target = (tab === 'history') ? 'history' : (tab === 'api' ? 'api' : (tab === 'character' ? 'character' : 'generate'));
      setPendingTab(target);
      setActiveTab(target); 
      return;
    }

    if (tab === 'player' && activeTab !== 'player') {
      setNavigationSource({ tab: activeTab });
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

  const handleJobSelected = (job: Job, page?: number) => {
    setSelectedJobId(job.gen_id);
    setSelectedJob(job);
    setNavigationSource({ tab: 'history', page });
    setActiveTab('player');
  };

  const handleBack = () => {
    if (navigationSource) {
      setActiveTab(navigationSource.tab as any);
      // If we need to pass page back to history, we might need more complex state, 
      // but for now history keeps its own page state if not unmounted.
    } else {
      setActiveTab('generate');
    }
  };

  const handleRegenerate = (params: any) => {
    setInitialParams(params);
    if (params.action === 'animate') {
      setActiveTab('generate');
    } else if (params.job_type === 'character') {
      setActiveTab('character');
    } else {
      setActiveTab('generate');
    }
  };

  if (isAuthChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0d0221] text-white uppercase text-xs">Loading Rika AI...</div>;
  }

  const isRecovering = loginMode === 'update';
  const showIntro = activeTab === 'intro' && !isRecovering;
  const showLogin = (isRecovering || !user) && !showIntro && activeTab !== 'docs';

  return (
    <div className="min-h-screen flex flex-col bg-[#0d0221]">
      {isBackendDown && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-[10px] font-bold uppercase animate-pulse z-[100]">
          {isZh 
            ? '网站服务器维护中，暂时无法使用，请谅解。您的积分不会丢失，只是暂时无法显示。' 
            : 'Server maintenance in progress. The site is temporarily unavailable. Your credits are safe but cannot be displayed at the moment.'}
        </div>
      )}
      <header className="sticky top-0 z-50 bg-[#2d1b4e] border-b-4 border-[#5a2d9c] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <img 
            src="https://cdn.rika-ai.com/assets/frontpage/icons/icon1.png" 
            className="h-10 w-auto cursor-pointer" 
            style={{ imageRendering: 'pixelated' }}
            onClick={() => navigateTo('intro')}
            alt="RIKA AI"
          />
          <nav className="flex gap-2">
            <div className="relative" ref={createDropdownRef}>
              <button 
                onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                className={`px-4 py-2 text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${activeTab === 'character' || activeTab === 'generate' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white'}`}
              >
                CREATE
                <span className={`transition-transform duration-200 ${showCreateDropdown ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {showCreateDropdown && (
                <div className="absolute left-0 mt-2 w-32 bg-[#2d1b4e] pixel-border border-[#5a2d9c] z-[100] shadow-xl">
                  <button 
                    onClick={() => { navigateTo('character'); setShowCreateDropdown(false); }}
                    className={`w-full px-4 py-3 text-[10px] font-bold uppercase text-left transition-all ${activeTab === 'character' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                    {isZh ? '角色' : 'CHARACTER'}
                  </button>
                  <button 
                    onClick={() => { navigateTo('generate'); setShowCreateDropdown(false); }}
                    className={`w-full px-4 py-3 text-[10px] font-bold uppercase text-left transition-all ${activeTab === 'generate' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                    {isZh ? '动画' : 'ANIMATION'}
                  </button>
                </div>
              )}
            </div>
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
              onClick={() => navigateTo('api')}
              className={`px-4 py-2 text-[10px] font-bold uppercase transition-all ${activeTab === 'api' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white'}`}
            >
              API
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
          <div className="flex bg-black/40 p-1 pixel-border border-[#5a2d9c] h-8 items-center">
            <button 
              onClick={() => setLang('en')}
              className={`px-2 h-full text-[8px] font-bold transition-all ${lang === 'en' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/40 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('zh')}
              className={`px-2 h-full font-bold transition-all ${lang === 'zh' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/40 hover:text-white'}`}
              style={{ fontSize: '10px' }}
            >
              中文
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-4 relative" ref={dropdownRef}>
              <div 
                className={`flex flex-col items-end cursor-pointer group ${isBackendDown ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isBackendDown) {
                    fetchCredits();
                    setIsPricingOpen(true);
                  }
                }}
                title={isBackendDown ? (isZh ? "服务器维护中" : "Server Maintenance") : (isZh ? "点击刷新积分/购买更多" : "Click to refresh credits / buy more")}
              >
                <span className="text-[8px] opacity-40 text-white group-hover:text-[#f7d51d]">CREDITS</span>
                <span className="text-sm font-bold text-[#f7d51d] group-hover:scale-105 transition-transform">
                  {isBackendDown ? '???' : credits}
                </span>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="text-[10px] font-bold text-white/60 hover:text-white flex items-center gap-1 uppercase"
                >
                  {user.email.split('@')[0]}
                  <span className={`transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`}>▼</span>
                </button>
                
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#2d1b4e] pixel-border border-[#5a2d9c] z-[100] shadow-xl">
                    <div className="p-2 border-b-2 border-[#5a2d9c] bg-black/20">
                      <p className="opacity-40 uppercase mb-1" style={{ fontSize: zhScale(8) }}>
                        {isZh ? '当前登录' : 'Signed in as'}
                      </p>
                      <p className="text-white truncate font-bold" style={{ fontSize: zhScale(9) }}>
                        {user.email}
                      </p>
                    </div>
                    <button 
                      onClick={async () => {
                        await handleLogout();
                        navigateTo('generate');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 font-bold text-white/60 hover:text-[#f7d51d] hover:bg-white/5 transition-colors uppercase"
                      style={{ fontSize: zhScale(10) }}
                    >
                      {isZh ? '切换账号' : 'Switch Account'}
                    </button>
                    <button 
                      onClick={() => {
                        handleLogout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 font-bold text-white/60 hover:text-red-400 hover:bg-white/5 transition-colors border-t-2 border-[#5a2d9c] uppercase"
                      style={{ fontSize: zhScale(10) }}
                    >
                      {isZh ? '退出登录' : 'Log Out'}
                    </button>
                  </div>
                )}
              </div>
            </div>
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
          <LandingPage 
            lang={lang} 
            onGetStarted={() => navigateTo('generate')} 
            onGenerateCharacter={() => navigateTo('character')}
            onViewDocs={() => navigateTo('docs')} 
          />
        ) : activeTab === 'docs' ? (
          <DocumentPage lang={lang} />
        ) : showLogin ? (
          <LoginPage onLogin={handleLoginSuccess} initialMode={loginMode} lang={lang} />
        ) : (
          <>
            {activeTab === 'character' && (
              <CharacterPage
                onJobCreated={(id) => { setSelectedJobId(id); setActiveTab('player'); }}
                lang={lang}
                credits={credits}
                onOpenPricing={() => setIsPricingOpen(true)}
                isBackendDown={isBackendDown}
                initialParams={initialParams}
                onConsumed={() => setInitialParams(null)}
              />
            )}
            {activeTab === 'generate' && (
              <GenerationPage 
                onJobCreated={(id) => { setSelectedJobId(id); setActiveTab('player'); }} 
                initialParams={initialParams}
                onConsumed={() => setInitialParams(null)}
                refreshCredits={fetchCredits}
                credits={credits}
                onOpenPricing={() => setIsPricingOpen(true)}
                lang={lang}
                isBackendDown={isBackendDown}
              />
            )}
            {activeTab === 'player' && (
              <TaskPlayerPage 
                selectedJobId={selectedJobId} 
                initialJob={selectedJob}
                onJobSelected={(id) => { setSelectedJobId(id); setSelectedJob(null); }}
                onRegenerate={handleRegenerate}
                onBack={handleBack}
                lang={lang}
              />
            )}
            {activeTab === 'history' && (
              <HistoryPage 
                onJobSelected={handleJobSelected} 
                onRegenerate={handleRegenerate}
                initialPage={navigationSource?.tab === 'history' ? navigationSource.page : undefined}
                lang={lang}
              />
            )}
            {activeTab === 'api' && (
              <ApiPage lang={lang} />
            )}
          </>
        )}
      </main>

      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
        onSimulatedSuccess={() => setIsPaymentSuccessOpen(true)}
        lang={lang}
        isBackendDown={isBackendDown}
      />
      <PaymentSuccessModal 
        isOpen={isPaymentSuccessOpen} 
        onClose={() => {
          setIsPaymentSuccessOpen(false);
          fetchCredits();
        }} 
        lang={lang}
      />
    </div>
  );
};

export default App;
