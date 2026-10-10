
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './services/supabaseClient.ts';
import { apiService } from './services/apiService.ts';
import { AuthUser, Job } from './types.ts';
import LoginPage from './pages/LoginPage.tsx';
import GenerationPage from './pages/GenerationPage.tsx';
import CharacterPage from './pages/CharacterPage.tsx';
import ItemPage from './pages/ItemPage.tsx';
import MapPage from './pages/MapPage.tsx';
import TaskPlayerPage from './pages/TaskPlayerPage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';
import LandingPage from './pages/LandingPage.tsx';
import DocumentPage from './pages/DocumentPage.tsx';
import ApiPage from './pages/ApiPage.tsx';
import { PixelButton } from './components/PixelComponents.tsx';
import { PricingModal } from './components/PricingModal.tsx';
import { PaymentSuccessModal } from './components/PaymentSuccessModal.tsx';
import {
  AppLanguage,
  AppTab,
  applySeoMetadata,
  readAppRoute,
  writeAppRoute,
} from './utils/appRoutes.ts';

const initialRoute = readAppRoute();

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<AppTab>(initialRoute.tab);
  const [pendingTab, setPendingTab] = useState<Exclude<AppTab, 'intro'> | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [navigationSource, setNavigationSource] = useState<{ tab: string, page?: number } | null>(null);
  const [initialParams, setInitialParams] = useState<any>(null);
  const [generationEntryVersion, setGenerationEntryVersion] = useState<'v1' | 'v2'>('v1');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isPaymentSuccessOpen, setIsPaymentSuccessOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'forgot' | 'update'>('login');
  const [forceLogin, setForceLogin] = useState(false);
  const [lang, setLang] = useState<AppLanguage>(initialRoute.lang);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [dashboardNotice, setDashboardNotice] = useState<string | null>(null);
  
  const lastFetchTime = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const createDropdownRef = useRef<HTMLDivElement>(null);
  const basePathRef = useRef(initialRoute.basePath);
  const langRef = useRef<AppLanguage>(initialRoute.lang);

  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => `${isZh ? enSize + 3 : enSize}px`;

  const setTabWithRoute = useCallback((tab: AppTab, mode: 'push' | 'replace' = 'push') => {
    setActiveTab(tab);
    writeAppRoute(basePathRef.current, langRef.current, tab, mode);
  }, []);

  const changeLanguage = useCallback((nextLanguage: AppLanguage) => {
    langRef.current = nextLanguage;
    setLang(nextLanguage);
    writeAppRoute(basePathRef.current, nextLanguage, activeTab, 'push');
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.lang = isZh ? 'zh-CN' : 'en';
    langRef.current = lang;
    localStorage.setItem('rika-ui-language', lang);
    applySeoMetadata(basePathRef.current, lang, activeTab);
  }, [activeTab, isZh, lang]);

  useEffect(() => {
    if (!initialRoute.hasLanguagePrefix) {
      writeAppRoute(basePathRef.current, initialRoute.lang, initialRoute.tab, 'replace');
    }

    const handlePopState = () => {
      const route = readAppRoute();
      basePathRef.current = route.basePath;
      langRef.current = route.lang;
      setLang(route.lang);
      setActiveTab(route.tab);
      setIsPricingOpen(false);
      setShowCreateDropdown(false);
      setShowUserDropdown(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
        setTabWithRoute('generate', 'replace');
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
  }, [fetchCredits, setTabWithRoute]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTabWithRoute('intro');
    setPendingTab(null);
    setLoginMode('login');
  };

  const navigateTo = (tab: AppTab) => {
    setIsPricingOpen(false);
    
    if (tab === 'intro' || tab === 'docs') {
      setTabWithRoute(tab);
      setPendingTab(null);
      return;
    }
    
    if (tab === 'player' && activeTab !== 'player') {
      setNavigationSource({ tab: activeTab });
    }
    
    setTabWithRoute(tab);
    setPendingTab(null);
  };

  const handleLoginSuccess = () => {
    const target = pendingTab || activeTab || 'generate';
    setTabWithRoute(target);
    setPendingTab(null);
    setForceLogin(false);
    setLoginMode('login');
  };

  const handleJobSelected = (job: Job, page?: number) => {
    setSelectedJobId(job.gen_id);
    setSelectedJob(job);
    setNavigationSource({ tab: 'history', page });
    setTabWithRoute('player');
  };

  const handleBack = () => {
    if (navigationSource) {
      setTabWithRoute(navigationSource.tab as AppTab);
      // If we need to pass page back to history, we might need more complex state, 
      // but for now history keeps its own page state if not unmounted.
    } else {
      setTabWithRoute('generate');
    }
  };

  const handleRegenerate = (params: any) => {
    setInitialParams(params);
    if (params.action === 'animate') {
      setTabWithRoute('generate');
    } else if (params.job_type === 'character') {
      setTabWithRoute('character');
    } else if (params.job_type === 'item') {
      setTabWithRoute('item');
    } else if (params.job_type === 'map') {
      setTabWithRoute('map');
    } else {
      setTabWithRoute('generate');
    }
  };

  const handleGenerationFailed = useCallback((message: string) => {
    setDashboardNotice(message);
    setSelectedJobId(null);
    setSelectedJob(null);
    setNavigationSource(null);
    setTabWithRoute('history');
    fetchCredits();
    window.setTimeout(fetchCredits, 1500);
  }, [fetchCredits, setTabWithRoute]);

  if (isAuthChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0d0221] text-white uppercase text-xs loading-shimmer">Loading Rika AI...</div>;
  }

  const isRecovering = loginMode === 'update';
  const showIntro = activeTab === 'intro' && !isRecovering;
  const showLogin = isRecovering || (!user && forceLogin);

  return (
    <div lang={isZh ? 'zh-CN' : 'en'} className={`ui-shell min-h-screen flex flex-col bg-[#0d0221] ${isZh ? 'lang-zh' : 'lang-en'}`}>
      {isBackendDown && (
        <div className="ui-status-strip bg-red-700 text-white text-center py-2 px-4 text-[10px] font-bold uppercase z-[100]">
          {isZh 
            ? '网站服务器维护中，暂时无法使用，请谅解。您的积分不会丢失，只是暂时无法显示。' 
            : 'Server maintenance in progress. The site is temporarily unavailable. Your credits are safe but cannot be displayed at the moment.'}
        </div>
      )}
      <header className="app-header sticky top-0 z-50 px-3 py-3 md:px-5">
        <div className="app-header-inner flex w-full max-w-none flex-wrap items-center justify-between gap-4">
        <div className="header-primary flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
          <img 
            src="https://cdn.rika-ai.com/assets/frontpage/icons/icon1.png" 
            className="brand-mark h-9 w-auto cursor-pointer md:h-10"
            style={{ imageRendering: 'pixelated' }}
            onClick={() => navigateTo('intro')}
            alt="RIKA AI"
          />
          <nav className="top-nav">
            <div className="relative" ref={createDropdownRef}>
              <button 
                onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                className={`nav-button flex items-center gap-1 ${activeTab === 'character' || activeTab === 'item' || activeTab === 'generate' || activeTab === 'map' ? 'is-active' : ''}`}
              >
                {isZh ? '创作' : 'CREATE'}
                <span className={`transition-transform duration-200 ${showCreateDropdown ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {showCreateDropdown && (
                <div className="pixel-dropdown absolute left-0 z-[100] mt-2 w-36">
                  <button 
                    onClick={() => { navigateTo('character'); setShowCreateDropdown(false); }}
                    className={`w-full px-4 py-3 text-[10px] font-bold uppercase text-left transition-all ${activeTab === 'character' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                    {isZh ? '角色' : 'CHARACTER'}
                  </button>
                  <button 
                    onClick={() => { navigateTo('item'); setShowCreateDropdown(false); }}
                    className={`w-full px-4 py-3 text-[10px] font-bold uppercase text-left transition-all ${activeTab === 'item' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                    {isZh ? '道具' : 'ITEM'}
                  </button>
                  <button 
                    onClick={() => { navigateTo('generate'); setShowCreateDropdown(false); }}
                    className={`w-full px-4 py-3 text-[10px] font-bold uppercase text-left transition-all ${activeTab === 'generate' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                    {isZh ? '动画' : 'ANIMATION'}
                  </button>
                  <button 
                    onClick={() => { navigateTo('map'); setShowCreateDropdown(false); }}
                    className={`w-full px-4 py-3 text-[10px] font-bold uppercase text-left transition-all ${activeTab === 'map' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                    {isZh ? '地图' : 'MAP'}
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => navigateTo('player')}
              className={`nav-button ${activeTab === 'player' ? 'is-active' : ''}`}
            >
              {isZh ? '编辑器' : 'PLAYER'}
            </button>
            <button 
              onClick={() => navigateTo('history')}
              className={`nav-button ${activeTab === 'history' ? 'is-active' : ''}`}
            >
              {isZh ? '仪表盘' : 'DASHBOARD'}
            </button>
            <button 
              onClick={() => navigateTo('api')}
              className={`nav-button ${activeTab === 'api' ? 'is-active' : ''}`}
            >
              API
            </button>
            <button 
              onClick={() => navigateTo('docs')}
              className={`nav-button ${activeTab === 'docs' ? 'is-active' : ''}`}
            >
              {isZh ? '文档' : 'DOCS'}
            </button>
            <button 
              onClick={() => setIsPricingOpen(true)}
              className="nav-button hover:!text-[#f7d51d]"
            >
              {isZh ? '定价' : 'PRICING'}
            </button>
          </nav>
        </div>

        <div className="header-actions flex items-center gap-3 md:gap-4">
          <div className="language-switch">
            <button 
              onClick={() => changeLanguage('en')}
              className={lang === 'en' ? 'is-active' : ''}
            >
              EN
            </button>
            <button 
              onClick={() => changeLanguage('zh')}
              className={lang === 'zh' ? 'is-active' : ''}
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
                <span className="text-[8px] opacity-40 text-white group-hover:text-[#f7d51d]" style={{ fontSize: zhScale(8) }}>
                  {isZh ? '积分' : 'CREDITS'}
                </span>
                <span className="text-sm font-bold text-[#f7d51d] group-hover:scale-105 transition-transform">
                  {isBackendDown ? '???' : credits}
                </span>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="nav-button flex max-w-[180px] items-center gap-1 overflow-hidden"
                >
                  {user.email.split('@')[0]}
                  <span className={`transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`}>▼</span>
                </button>
                
                {showUserDropdown && (
                  <div className="pixel-dropdown absolute right-0 z-[100] mt-2 w-52">
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
                        const returnTab = activeTab === 'intro' || activeTab === 'docs' ? 'generate' : activeTab;
                        await handleLogout();
                        setPendingTab(returnTab as Exclude<typeof pendingTab, null>);
                        setLoginMode('login');
                        setForceLogin(true);
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
              onClick={() => {
                const target = (activeTab === 'intro' || activeTab === 'docs') ? 'generate' : activeTab;
                setPendingTab(target as any);
                setForceLogin(true);
              }} 
              className="min-h-9 px-4 py-1"
            >
              {isZh ? '登录' : 'LOGIN'}
            </PixelButton>
          )}
        </div>
        </div>
      </header>

      <main className="app-main flex-1 container mx-auto max-w-7xl">
        {showLogin ? (
          <LoginPage
            onLogin={handleLoginSuccess}
            onCancel={() => setForceLogin(false)}
            initialMode={loginMode}
            lang={lang}
          />
        ) : showIntro ? (
          <LandingPage 
            lang={lang} 
            onGetStarted={() => {
              setGenerationEntryVersion('v1');
              navigateTo('generate');
            }}
            onTryV2={() => {
              setGenerationEntryVersion('v2');
              navigateTo('generate');
            }}
            onGenerateCharacter={() => navigateTo('character')}
            onGenerateMap={() => navigateTo('map')}
            onViewDocs={() => navigateTo('docs')} 
          />
        ) : activeTab === 'docs' ? (
          <DocumentPage lang={lang} onOpenPricing={() => setIsPricingOpen(true)} />
        ) : (
          <>
            {activeTab === 'character' && (
              <CharacterPage
                onJobCreated={(id) => { setSelectedJobId(id); setTabWithRoute('player'); }}
                lang={lang}
                credits={credits}
                onOpenPricing={() => setIsPricingOpen(true)}
                isBackendDown={isBackendDown}
                initialParams={initialParams}
                onConsumed={() => setInitialParams(null)}
                isLoggedIn={!!user}
                onLoginRequest={() => {
                  setPendingTab('character');
                  setForceLogin(true);
                  setIsPricingOpen(false);
                }}
              />
            )}
            {activeTab === 'item' && (
              <ItemPage
                onJobCreated={(id) => { setSelectedJobId(id); setTabWithRoute('player'); }}
                lang={lang}
                credits={credits}
                onOpenPricing={() => setIsPricingOpen(true)}
                isBackendDown={isBackendDown}
                initialParams={initialParams}
                onConsumed={() => setInitialParams(null)}
                isLoggedIn={!!user}
                onLoginRequest={() => {
                  setPendingTab('item');
                  setForceLogin(true);
                  setIsPricingOpen(false);
                }}
              />
            )}
            {activeTab === 'map' && (
              <MapPage
                onJobCreated={(id) => { setSelectedJobId(id); setTabWithRoute('player'); }}
                lang={lang}
                credits={credits}
                onOpenPricing={() => setIsPricingOpen(true)}
                isBackendDown={isBackendDown}
                initialParams={initialParams}
                onConsumed={() => setInitialParams(null)}
                isLoggedIn={!!user}
                onLoginRequest={() => {
                  setPendingTab('map');
                  setForceLogin(true);
                  setIsPricingOpen(false);
                }}
              />
            )}
            {activeTab === 'generate' && (
              <GenerationPage 
                onJobCreated={(id) => { setSelectedJobId(id); setTabWithRoute('player'); }}
                initialVersion={generationEntryVersion}
                onGenerateImage={() => navigateTo('character')}
                initialParams={initialParams}
                onConsumed={() => setInitialParams(null)}
                refreshCredits={fetchCredits}
                credits={credits}
                onOpenPricing={() => setIsPricingOpen(true)}
                lang={lang}
                isBackendDown={isBackendDown}
                isLoggedIn={!!user}
                onLoginRequest={() => {
                   setPendingTab('generate');
                   setForceLogin(true);
                }}
              />
            )}
            {activeTab === 'player' && (
              <TaskPlayerPage 
                selectedJobId={selectedJobId} 
                initialJob={selectedJob}
                onJobSelected={(id) => { setSelectedJobId(id); setSelectedJob(null); }}
                onRegenerate={handleRegenerate}
                onBack={handleBack}
                onJobFailed={handleGenerationFailed}
                lang={lang}
                isLoggedIn={!!user}
                onLoginRequest={() => {
                  setPendingTab('player');
                  setForceLogin(true);
                }}
              />
            )}
            {activeTab === 'history' && (
              <HistoryPage 
                onJobSelected={handleJobSelected} 
                onRegenerate={handleRegenerate}
                initialPage={navigationSource?.tab === 'history' ? navigationSource.page : undefined}
                notice={dashboardNotice}
                onDismissNotice={() => setDashboardNotice(null)}
                lang={lang}
                isLoggedIn={!!user}
                onLoginRequest={() => {
                  setPendingTab('history');
                  setForceLogin(true);
                }}
              />
            )}
            {activeTab === 'api' && (
              <ApiPage lang={lang} isLoggedIn={!!user} onLoginRequest={() => navigateTo('generate')} />
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
        onLoginRequest={() => {
          setIsPricingOpen(false);
          navigateTo('generate');
        }}
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
