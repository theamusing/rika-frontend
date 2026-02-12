
import React, { useState } from 'react';
import { PixelButton, PixelCard } from './PixelComponents.tsx';
import { supabase } from '../services/supabaseClient.ts';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulatedSuccess?: () => void;
  lang?: 'en' | 'zh';
}

type Currency = 'USD' | 'CNY';
type Tier = 'starter' | 'pro' | 'ultimate';

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSimulatedSuccess, lang = 'en' }) => {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [loading, setLoading] = useState(false);

  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  const t = {
    title: isZh ? '积分商店' : 'Credit Store',
    starterSub: isZh ? '浅尝一口' : 'Taste the snack',
    proSub: isZh ? '独立游戏开发者之选' : "Indie Game Developer's Choice",
    ultimateSub: isZh ? '专业创作者必备' : 'For Professional Developers',
    select: isZh ? '选择' : 'SELECT',
    purchase: isZh ? '购买' : 'PURCHASE',
    power: isZh ? '获取力量' : 'GAIN POWER',
    footerNote: isZh ? '每次生成消耗 5 个积分。积分永不过期。' : 'EACH GENERATION CONSUMES 5 CREDITS. NO EXPIRATION ON ACQUIRED CREDITS.',
    cancel: isZh ? '取消' : 'CANCEL'
  };

  const handlePurchase = async (tier: Tier, amount: string, credits: number) => {
    if (currency === 'CNY') {
      alert(`[CNY GATEWAY] Simulating ¥${amount} transaction for ${credits} credits...`);
      onSimulatedSuccess?.();
      onClose();
      return;
    }

    setLoading(true);
    try {
      // Use the official Supabase SDK invoke method which is more robust for CORS
      const { data, error } = await supabase.functions.invoke('create-creem-checkout', {
        body: { tier },
      });

      if (error) throw error;
      if (!data?.checkout_url) throw new Error("Checkout session could not be created.");

      window.location.href = data.checkout_url;
    } catch (err: any) {
      console.error("Checkout failed:", err);
      // Fallback for environment specific fetch errors
      if (err.message === 'Failed to fetch') {
        alert("NETWORK ERROR: The connection to the payment gateway was blocked. This often happens in restricted preview environments. Please try in a standard browser tab.");
      } else {
        alert("PAYMENT PROTOCOL ERROR: " + (err.message || "COULD NOT INITIATE CHECKOUT."));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="max-w-3xl w-full my-auto">
        <PixelCard title="STORE TERMINAL" className="bg-[#0d0221] shadow-2xl p-6">
          <div className="flex flex-col items-center mb-10 space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-tighter" style={{ fontSize: zhScale(14) }}>{t.title}</h2>
            
            {/* Currency Switcher */}
            <div className="flex items-center gap-4 bg-[#2d1b4e] p-1 pixel-border border-[#5a2d9c]">
              <button 
                onClick={() => setCurrency('USD')}
                className={`px-4 py-1 text-[8px] font-bold transition-all ${currency === 'USD' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/40 hover:text-white'}`}
              >
                USD ($)
              </button>
              <button 
                onClick={() => setCurrency('CNY')}
                className={`px-4 py-1 text-[8px] font-bold transition-all ${currency === 'CNY' ? 'bg-[#f7d51d] text-[#2d1b4e]' : 'text-white/40 hover:text-white'}`}
              >
                CNY (¥)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {/* Starter Pack */}
            <PixelCard className="flex flex-col items-center text-center border-[#5a2d9c] bg-[#5a2d9c]/10 transition-all py-8 px-4 h-full">
              <div className="h-16 flex flex-col justify-start space-y-2 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-white">Starter</h3>
                <p className="text-white/60 uppercase leading-tight px-2" style={{ fontSize: zhScale(7) }}>{t.starterSub}</p>
              </div>
              <div className="h-20 flex flex-col justify-center mb-4">
                <span className="text-2xl font-bold text-[#f7d51d]">30</span>
                <p className="text-[7px] opacity-60 uppercase tracking-widest text-white">CREDITS</p>
              </div>
              <div className="h-12 flex items-center justify-center mb-6">
                <span className="text-lg font-bold text-white">
                  {currency === 'USD' ? '$1.9' : '¥9.9'}
                </span>
              </div>
              <PixelButton 
                variant="secondary" 
                disabled={loading}
                className="w-full h-10 mt-auto"
                style={{ fontSize: zhScale(7) }}
                onClick={() => handlePurchase('starter', currency === 'USD' ? '1.9' : '9.9', 30)}
              >
                {loading ? 'WAIT...' : t.select}
              </PixelButton>
            </PixelCard>

            {/* Pro Pack */}
            <PixelCard className="flex flex-col items-center text-center border-white bg-white/5 relative py-8 px-4 h-full">
              <div className="h-16 flex flex-col justify-start space-y-2 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-white">Pro Pack</h3>
                <p className="text-white/70 uppercase leading-tight px-2" style={{ fontSize: zhScale(7) }}>{t.proSub}</p>
              </div>
              <div className="h-20 flex flex-col justify-center mb-4">
                <span className="text-2xl font-bold text-[#f7d51d]">100</span>
                <p className="text-[7px] opacity-60 uppercase tracking-widest text-white">CREDITS</p>
              </div>
              <div className="h-12 flex items-center justify-center mb-6">
                <span className="text-lg font-bold text-white">
                  {currency === 'USD' ? '$4.9' : '¥29.9'}
                </span>
              </div>
              <PixelButton 
                variant="secondary" 
                disabled={loading}
                className="w-full h-10 mt-auto bg-transparent border-white text-white hover:bg-white hover:text-[#0d0221]"
                style={{ fontSize: zhScale(7) }}
                onClick={() => handlePurchase('pro', currency === 'USD' ? '4.9' : '29.9', 100)}
              >
                {loading ? 'WAIT...' : t.purchase}
              </PixelButton>
            </PixelCard>

            {/* Ultimate Pack */}
            <PixelCard className="flex flex-col items-center text-center border-[#f7d51d] bg-[#f7d51d]/5 py-8 px-4 h-full shadow-[0_0_25px_rgba(247,213,29,0.15)]">
              <div className="h-16 flex flex-col justify-start space-y-2 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#f7d51d]">Ultimate</h3>
                <p className="text-[#f7d51d]/50 uppercase leading-tight px-2" style={{ fontSize: zhScale(7) }}>{t.ultimateSub}</p>
              </div>
              <div className="h-20 flex flex-col justify-center mb-4">
                <span className="text-2xl font-bold text-[#f7d51d]">500</span>
                <p className="text-[7px] opacity-80 uppercase tracking-widest text-[#f7d51d]">CREDITS</p>
              </div>
              <div className="h-12 flex items-center justify-center mb-6">
                <span className="text-lg font-bold text-[#f7d51d]">
                  {currency === 'USD' ? '$19.9' : '¥129.9'}
                </span>
              </div>
              <PixelButton 
                variant="primary" 
                disabled={loading}
                className="w-full h-10 mt-auto whitespace-nowrap"
                style={{ fontSize: zhScale(7) }}
                onClick={() => handlePurchase('ultimate', currency === 'USD' ? '19.9' : '129.9', 500)}
              >
                {loading ? 'WAIT...' : t.power}
              </PixelButton>
            </PixelCard>
          </div>

          <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 border-t-2 border-[#5a2d9c] pt-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1 bg-[#f7d51d] animate-pulse"></div>
              <p className="opacity-60 uppercase leading-relaxed text-left font-bold tracking-wider" style={{ fontSize: zhScale(8) }}>
                {t.footerNote}
              </p>
            </div>
            <PixelButton onClick={onClose} variant="outline" className="h-8 px-8" style={{ fontSize: zhScale(8) }}>
              {t.cancel}
            </PixelButton>
          </div>
        </PixelCard>
      </div>
    </div>
  );
};
