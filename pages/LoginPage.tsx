
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants.ts';
import { PixelButton, PixelCard, PixelInput } from '../components/PixelComponents.tsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type AuthMode = 'login' | 'forgot' | 'update';

const LoginPage: React.FC<{ onLogin: () => void, initialMode?: AuthMode }> = ({ onLogin, initialMode = 'login' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForgotLink, setShowForgotLink] = useState(false);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('PLEASE ENTER BOTH EMAIL AND PASSWORD.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setShowForgotLink(false);
    
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (signInError) {
        const errMsg = signInError.message.toLowerCase();
        
        if (errMsg.includes('email not confirmed') || errMsg.includes('confirm your email')) {
          setMessage('ACCOUNT FOUND BUT EMAIL IS NOT VERIFIED. PLEASE CHECK YOUR INBOX.');
          setLoading(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          if (signUpError.status === 400 || signUpError.message.toLowerCase().includes('already registered')) {
            setError('INCORRECT PASSWORD FOR THIS REGISTERED EMAIL.');
            setShowForgotLink(true);
          } else {
            throw signUpError;
          }
        } else if (signUpData.user) {
          const isExistingUser = signUpData.user.identities && signUpData.user.identities.length === 0;

          if (isExistingUser) {
            setError('INCORRECT PASSWORD FOR THIS REGISTERED EMAIL.');
            setShowForgotLink(true);
          } else {
            if (!signUpData.session) {
              setMessage('NEW ACCOUNT CREATED. A VERIFICATION LINK HAS BEEN SENT TO YOUR EMAIL.');
            } else {
              onLogin();
            }
          }
        }
      } else if (signInData.session) {
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || 'SYSTEM AUTHENTICATION FAILURE.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('PLEASE ENTER YOUR REGISTERED EMAIL.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const redirectUrl = window.location.origin;
      console.log("[AUTH] Initiating reset for:", email, "Redirecting to:", redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        console.error("[AUTH ERROR] Reset failed:", error);
        throw error;
      }

      setMessage('REQUEST RECEIVED. IF YOUR EMAIL IS VERIFIED, A RESET LINK WILL ARRIVE SHORTLY.');
      setMode('login');
    } catch (err: any) {
      console.error("[AUTH EXCEPTION] Reset protocol error:", err);
      setError(err.message || 'FAILED TO INITIATE RESET PROTOCOL.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('PASSWORD MUST BE AT LEAST 6 CHARACTERS.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setMessage('PASS-KEY UPDATED. CLEARANCE GRANTED.');
      
      // Delay to let user see success message before transitioning
      setTimeout(() => {
        onLogin(); 
      }, 1500);
      
    } catch (err: any) {
      console.error("[AUTH EXCEPTION] Password update failed:", err);
      setError(err.message || 'FAILED TO REWRITE PASS-KEY.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'github' | 'google') => {
    try {
      const origin = window.location.origin.replace(/\/$/, ""); 
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: origin,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(`${provider.toUpperCase()} ACCESS DENIED.`);
    }
  };

  const renderForm = () => {
    if (mode === 'forgot') {
      return (
        <form onSubmit={handleResetRequest} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase text-white/60">Registered Email</label>
            <PixelInput
              placeholder="commander@rika.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-900/20 pixel-border border-red-900">
              <p className="text-red-500 text-[8px] uppercase font-bold leading-relaxed">{error}</p>
            </div>
          )}
          <PixelButton className="w-full h-12" disabled={loading}>
            {loading ? 'TRANSMITTING...' : 'SEND RECOVERY LINK'}
          </PixelButton>
          <button 
            type="button" 
            onClick={() => { setMode('login'); setError(''); }}
            className="w-full text-[8px] text-white/40 hover:text-white uppercase tracking-widest mt-2"
          >
            Back to Terminal
          </button>
          <div className="mt-4 p-2 bg-white/5 border border-white/10">
            <p className="text-[7px] text-white/40 uppercase leading-tight text-center">
              Note: Reset only works for <span className="text-white">Confirmed</span> accounts.<br/>
              Check spam if no mail arrives in 2 mins.
            </p>
          </div>
        </form>
      );
    }

    if (mode === 'update') {
      return (
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase text-white/60">New Terminal Pass-Key</label>
            <PixelInput
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-900/20 pixel-border border-red-900">
              <p className="text-red-500 text-[8px] uppercase font-bold leading-relaxed">{error}</p>
            </div>
          )}
          {message && (
            <div className="p-3 bg-green-900/20 pixel-border border-green-500">
              <p className="text-green-500 text-[8px] uppercase font-bold leading-relaxed">{message}</p>
            </div>
          )}
          <PixelButton className="w-full h-12" disabled={loading}>
            {loading ? 'REWRITING...' : 'UPDATE PASS-KEY'}
          </PixelButton>
          <p className="text-[7px] text-white/30 text-center uppercase">Updating security credentials...</p>
        </form>
      );
    }

    return (
      <form onSubmit={handleAuth} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase text-white/60">Email Address</label>
          <PixelInput
            placeholder="commander@rika.ai"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase text-white/60">Pass-Key</label>
          <PixelInput
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 pixel-border border-red-900 animate-pulse">
            <p className="text-red-500 text-[8px] uppercase font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {message && (
          <div className="p-3 bg-[#f7d51d]/10 pixel-border border-[#f7d51d] animate-fade-in">
            <p className="text-[#f7d51d] text-[8px] uppercase font-bold leading-relaxed">{message}</p>
          </div>
        )}

        <PixelButton className="w-full h-12" disabled={loading}>
          {loading ? 'ANALYZING...' : 'LOGIN/REGISTER'}
        </PixelButton>

        {showForgotLink && (
          <div className="text-center pt-2">
            <button 
              type="button" 
              onClick={() => { setMode('forgot'); setError(''); setShowForgotLink(false); }}
              className="text-[8px] text-white/60 hover:text-white underline uppercase tracking-widest transition-colors"
            >
              Forget your password?
            </button>
          </div>
        )}
      </form>
    );
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#0d0221]">
      <PixelCard className="max-w-md w-full" title="RIKA AI ACCESS">
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2 uppercase tracking-tighter">
              {mode === 'login' ? 'Auth Terminal' : mode === 'forgot' ? 'Recovery' : 'Reset Keys'}
            </h2>
            <p className="text-[8px] opacity-70 uppercase tracking-widest">
              {mode === 'login' ? 'Identification Required' : mode === 'forgot' ? 'Send reset link to email' : 'Set your new terminal password'}
            </p>
        </div>

        {renderForm()}

        {mode === 'login' && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-[2px] bg-[#5a2d9c]"></div>
              <span className="text-[8px] text-white/40 uppercase">Or Connect Via</span>
              <div className="flex-1 h-[2px] bg-[#5a2d9c]"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleSocialLogin('github')}
                className="pixel-border bg-[#2d1b4e] hover:bg-[#3d2b5e] transition-colors p-3 flex items-center justify-center gap-2 group"
              >
                <svg className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                <span className="text-[10px] font-bold text-white uppercase">Github</span>
              </button>
              <button 
                onClick={() => handleSocialLogin('google')}
                className="pixel-border bg-white hover:bg-[#eeeeee] transition-colors p-3 flex items-center justify-center gap-2 group"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.49 12.275c0-.834-.067-1.638-.204-2.415H12v4.57h6.446c-.28 1.505-1.123 2.78-2.394 3.635v3.023h3.877c2.268-2.083 3.56-5.152 3.56-8.813z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.957-1.076 7.942-2.912l-3.877-3.023c-1.076.72-2.453 1.15-4.065 1.15-3.127 0-5.772-2.112-6.717-4.943H1.424v3.122A11.99 11.99 0 0 0 12 24z"/>
                  <path fill="#FBBC05" d="M5.283 14.272c-.24-.72-.376-1.488-.376-2.272s.136-1.552.376-2.272V6.606H1.424A11.99 11.99 0 0 0 0 12c0 1.92.45 3.737 1.424 5.394l3.859-3.122z"/>
                  <path fill="#EA4335" d="M12 4.773c1.763 0 3.346.606 4.59 1.794l3.442-3.442C17.95 1.19 15.234 0 12 0 7.31 0 3.254 2.69 1.424 6.606L5.283 9.728c.945-2.83 3.59-4.955 6.717-4.955z"/>
                </svg>
                <span className="text-[10px] font-bold text-[#4285F4] uppercase">Google</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t-4 border-[#5a2d9c] text-center">
            <p className="text-[8px] opacity-50 uppercase leading-relaxed">
              {mode === 'login' ? 'New users will be registered automatically.' : 'Finalize your identity update.'}<br/>
              By connecting, you agree to the Rika AI protocols.
            </p>
        </div>
      </PixelCard>
    </div>
  );
};

export default LoginPage;
