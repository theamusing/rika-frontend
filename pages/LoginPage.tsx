import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants.ts';
import { PixelButton, PixelCard, PixelInput } from '../components/PixelComponents.tsx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f171e]">
      <PixelCard className="max-w-md w-full" title="RIKA AI LOGIN">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">ACCESS TERMINAL</h2>
            <p className="text-[8px] opacity-70 uppercase">Internal Beta V1.0 - Authorization Required</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase">User Email</label>
            <PixelInput
              placeholder="commander@rika.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase">Pass-Key</label>
            <PixelInput
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
          </div>

          {error && <p className="text-red-500 text-[8px] uppercase">{error}</p>}

          <PixelButton className="w-full h-12" disabled={loading}>
            {loading ? 'AUTHENTICATING...' : 'ENTER SYSTEM'}
          </PixelButton>
        </form>

        <div className="mt-8 pt-4 border-t-4 border-[#306230] text-center">
            <p className="text-[8px] opacity-50">REGISTRATION IS CURRENTLY CLOSED FOR INTERNAL TESTING MEMBERS ONLY.</p>
        </div>
      </PixelCard>
    </div>
  );
};

export default LoginPage;