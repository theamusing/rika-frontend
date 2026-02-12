
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient.ts';
import { PixelButton, PixelCard, PixelInput } from '../components/PixelComponents.tsx';

type AuthMode = 'login' | 'forgot' | 'update';

const LoginPage: React.FC<{ onLogin: () => void, initialMode?: AuthMode, lang?: 'en' | 'zh' }> = ({ onLogin, initialMode = 'login', lang = 'en' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForgotLink, setShowForgotLink] = useState(false);

  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  const t = {
    login: isZh ? '登录' : 'LOGIN',
    register: isZh ? '注册' : 'REGISTER',
    identification: isZh ? '身份验证' : 'Identification Required',
    emailLabel: isZh ? '注册邮箱' : 'Registered Email',
    emailPlaceholder: 'commander@rika.ai',
    passwordLabel: isZh ? '密码' : 'Pass-Key',
    passwordPlaceholder: '********',
    newPasswordLabel: isZh ? '新密码' : 'New Terminal Pass-Key',
    minChars: isZh ? '至少 6 个字符' : 'Min 6 characters',
    analyzing: isZh ? '正在验证...' : 'ANALYZING...',
    transmitting: isZh ? '发送中...' : 'TRANSMITTING...',
    updating: isZh ? '正在更新...' : 'REWRITING...',
    forgotPass: isZh ? '忘记密码？' : 'Forget your password?',
    backToLogin: isZh ? '返回登录界面' : 'Back to Terminal',
    recovery: isZh ? '找回密码' : 'Recovery',
    resetKeys: isZh ? '重置密码' : 'Reset Keys',
    sendResetLink: isZh ? '发送重置链接' : 'SEND RECOVERY LINK',
    updatePassKey: isZh ? '更新密码' : 'UPDATE PASS-KEY',
    socialOr: isZh ? '或者通过以下方式登录' : 'Or Connect Via',
    newUsersRegister: isZh ? '新用户将自动注册。' : 'New users will be registered automatically.',
    finalizeIdentity: isZh ? '完成您的身份更新。' : 'Finalize your identity update.',
    agreeProtocols: isZh ? '登录即表示您同意 Rika AI 协议。' : 'By connecting, you agree to the Rika AI protocols.',
    resetNotice: isZh ? '注意：重置仅适用于已确认的账户。如果 2 分钟内没有收到邮件，请检查垃圾邮件。' : 'Note: Reset only works for Confirmed accounts. Check spam if no mail arrives in 2 mins.',
    securityCreds: isZh ? '正在更新安全凭证...' : 'Updating security credentials...',
    errorEmpty: isZh ? '请输入邮箱和密码。' : 'PLEASE ENTER BOTH EMAIL AND PASSWORD.',
    errorUnconfirmed: isZh ? '账户已存在但邮箱未验证。请检查收件箱。' : 'ACCOUNT FOUND BUT EMAIL IS NOT VERIFIED. PLEASE CHECK YOUR INBOX.',
    errorWrongPass: isZh ? '密码错误。' : 'INCORRECT PASSWORD FOR THIS REGISTERED EMAIL.',
    msgNewAccount: isZh ? '新账户已创建。验证链接已发送至您的邮箱。' : 'NEW ACCOUNT CREATED. A VERIFICATION LINK HAS BEEN SENT TO YOUR EMAIL.',
    errorEnterEmail: isZh ? '请输入注册邮箱。' : 'PLEASE ENTER YOUR REGISTERED EMAIL.',
    msgResetSent: isZh ? '请求已收到。如果您的邮箱已验证，重置链接将很快送达。' : 'REQUEST RECEIVED. IF YOUR EMAIL IS VERIFIED, A RESET LINK WILL ARRIVE SHORTLY.',
    errorPassLength: isZh ? '密码至少为 6 个字符。' : 'PASSWORD MUST BE AT LEAST 6 CHARACTERS.',
    msgPassUpdated: isZh ? '密码更新成功。访问权限已授予。' : 'PASS-KEY UPDATED. CLEARANCE GRANTED.',
    errorAccessDenied: isZh ? '访问被拒绝。' : 'ACCESS DENIED.'
  };

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t.errorEmpty);
      return;
    }

    if (password.length < 6) {
      setError(t.errorPassLength);
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
          setMessage(t.errorUnconfirmed);
          setLoading(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          if (signUpError.status === 400 || signUpError.message.toLowerCase().includes('already registered')) {
            setError(t.errorWrongPass);
            setShowForgotLink(true);
          } else {
            throw signUpError;
          }
        } else if (signUpData.user) {
          const isExistingUser = signUpData.user.identities && signUpData.user.identities.length === 0;

          if (isExistingUser) {
            setError(t.errorWrongPass);
            setShowForgotLink(true);
          } else {
            if (!signUpData.session) {
              setMessage(t.msgNewAccount);
            } else {
              onLogin();
            }
          }
        }
      } else if (signInData.session) {
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || (isZh ? '认证失败。' : 'SYSTEM AUTHENTICATION FAILURE.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t.errorEnterEmail);
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) throw error;

      setMessage(t.msgResetSent);
      setMode('login');
    } catch (err: any) {
      setError(err.message || (isZh ? '无法发起重置。' : 'FAILED TO INITIATE RESET PROTOCOL.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError(t.errorPassLength);
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setMessage(t.msgPassUpdated);
      
      setTimeout(() => {
        onLogin(); 
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || (isZh ? '密码重置失败。' : 'FAILED TO REWRITE PASS-KEY.'));
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
      setError(`${provider.toUpperCase()} ${t.errorAccessDenied}`);
    }
  };

  const renderForm = () => {
    if (mode === 'forgot') {
      return (
        <form onSubmit={handleResetRequest} className="space-y-4">
          <div className="space-y-2">
            <label className="uppercase text-white/60" style={{ fontSize: zhScale(10) }}>{t.emailLabel}</label>
            <PixelInput
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-900/20 pixel-border border-red-900">
              <p className="text-red-500 uppercase font-bold leading-relaxed" style={{ fontSize: zhScale(8) }}>{error}</p>
            </div>
          )}
          <PixelButton className="w-full h-12" disabled={loading} style={{ fontSize: zhScale(10) }}>
            {loading ? t.transmitting : t.sendResetLink}
          </PixelButton>
          <button 
            type="button" 
            onClick={() => { setMode('login'); setError(''); }}
            className="w-full text-white/40 hover:text-white uppercase tracking-widest mt-2"
            style={{ fontSize: zhScale(8) }}
          >
            {t.backToLogin}
          </button>
          <div className="mt-4 p-2 bg-white/5 border border-white/10">
            <p className="text-white/40 uppercase leading-tight text-center" style={{ fontSize: zhScale(7) }}>
              {t.resetNotice}
            </p>
          </div>
        </form>
      );
    }

    if (mode === 'update') {
      return (
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="space-y-2">
            <label className="uppercase text-white/60" style={{ fontSize: zhScale(10) }}>{t.newPasswordLabel}</label>
            <PixelInput
              type="password"
              placeholder={t.minChars}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-900/20 pixel-border border-red-900">
              <p className="text-red-500 uppercase font-bold leading-relaxed" style={{ fontSize: zhScale(8) }}>{error}</p>
            </div>
          )}
          {message && (
            <div className="p-3 bg-green-900/20 pixel-border border-green-500">
              <p className="text-green-500 uppercase font-bold leading-relaxed" style={{ fontSize: zhScale(8) }}>{message}</p>
            </div>
          )}
          <PixelButton className="w-full h-12" disabled={loading} style={{ fontSize: zhScale(10) }}>
            {loading ? t.updating : t.updatePassKey}
          </PixelButton>
          <p className="text-white/30 text-center uppercase" style={{ fontSize: zhScale(7) }}>{t.securityCreds}</p>
        </form>
      );
    }

    return (
      <form onSubmit={handleAuth} className="space-y-4">
        <div className="space-y-2">
          <label className="uppercase text-white/60" style={{ fontSize: zhScale(10) }}>{isZh ? '邮箱' : 'Email Address'}</label>
          <PixelInput
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="uppercase text-white/60" style={{ fontSize: zhScale(10) }}>{t.passwordLabel}</label>
          <PixelInput
            type="password"
            placeholder={t.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 pixel-border border-red-900 animate-pulse">
            <p className="text-red-500 uppercase font-bold leading-relaxed" style={{ fontSize: zhScale(8) }}>{error}</p>
          </div>
        )}

        {message && (
          <div className="p-3 bg-[#f7d51d]/10 pixel-border border-[#f7d51d] animate-fade-in">
            <p className="text-[#f7d51d] uppercase font-bold leading-relaxed" style={{ fontSize: zhScale(8) }}>{message}</p>
          </div>
        )}

        <PixelButton className="w-full h-12" disabled={loading} style={{ fontSize: zhScale(10) }}>
          {loading ? t.analyzing : (isZh ? '登录|注册' : 'LOGIN/REGISTER')}
        </PixelButton>

        {showForgotLink && (
          <div className="text-center pt-2">
            <button 
              type="button" 
              onClick={() => { setMode('forgot'); setError(''); setShowForgotLink(false); }}
              className="text-white/60 hover:text-white underline uppercase tracking-widest transition-colors"
              style={{ fontSize: zhScale(8) }}
            >
              {t.forgotPass}
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
            <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter whitespace-nowrap">
              {mode === 'login' ? 'Welcome to Rika AI' : mode === 'forgot' ? (isZh ? '找回密码' : 'Recovery') : (isZh ? '重置密码' : 'Reset Keys')}
            </h2>
            <p className="opacity-70 uppercase tracking-widest" style={{ fontSize: zhScale(8) }}>
              {mode === 'login' ? (isZh ?'创作之旅从此刻开始':'Your journey starts here') : mode === 'forgot' ? (isZh ? '发送重置链接到邮箱' : 'Send reset link to email') : (isZh ? '设置新的终端密码' : 'Set your new terminal password')}
            </p>
        </div>

        {renderForm()}

        {mode === 'login' && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-[2px] bg-[#5a2d9c]"></div>
              <span className="text-white/40 uppercase" style={{ fontSize: zhScale(8) }}>{t.socialOr}</span>
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
                <span className="font-bold text-white uppercase" style={{ fontSize: zhScale(10) }}>Github</span>
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
                <span className="font-bold text-[#4285F4] uppercase" style={{ fontSize: zhScale(10) }}>Google</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t-4 border-[#5a2d9c] text-center">
            <p className="opacity-50 uppercase leading-relaxed" style={{ fontSize: isZh ? '10px' : '7px' }}>
              {mode === 'login' ? t.newUsersRegister : t.finalizeIdentity}<br/>
              {t.agreeProtocols}
            </p>
        </div>
      </PixelCard>
    </div>
  );
};

export default LoginPage;
