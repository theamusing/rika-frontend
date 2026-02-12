
import React, { useEffect, useRef } from 'react';
import { PixelButton, PixelCard } from './PixelComponents.tsx';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CDN_BASE = "https://cdn.rika-ai.com/assets/frontpage/";

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    // Vibrant pixel palette matching the app theme
    const colors = ['#f7d51d', '#5a2d9c', '#ffffff', '#ff00ff', '#00ffff'];

    class Particle {
      x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; decay: number;
      constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        // Spherical distribution
        const angle = Math.random() * Math.PI * 2;
        // INCREASED speed for a larger explosion range
        const speed = Math.random() * 8 + 4; 
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        // Large blocks for "pixel chunks" feel
        this.size = Math.random() * 5 + 5; 
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = 1.0;
        // Slower decay for longer flight time
        this.decay = Math.random() * 0.015 + 0.008;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        // Adjusted friction to allow further travel while staying spherical
        this.vx *= 0.94;
        this.vy *= 0.94;
        this.life -= this.decay;
      }
      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        // Ensure pixel-perfect rendering by rounding coords
        ctx.fillRect(
          Math.round(this.x - this.size / 2), 
          Math.round(this.y - this.size / 2), 
          Math.round(this.size), 
          Math.round(this.size)
        );
      }
    }

    // Burst 120 particles for a more dense "ball" effect
    for (let i = 0; i < 120; i++) {
      particles.push(new Particle());
    }

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
      if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="max-w-[300px] w-full p-4 relative">
        <PixelCard title="SUCCESS" className="bg-[#0d0221] border-[#f7d51d] text-center py-6">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                <img 
                  src={`${CDN_BASE}coin.gif`} 
                  className="w-full h-full object-contain" 
                  style={{ imageRendering: 'pixelated' }}
                  alt="Success Coin"
                />
              </div>
            </div>
            
            <h2 className="text-[11px] font-bold text-white uppercase tracking-tighter whitespace-nowrap px-2">
              Purchase Successful
            </h2>
            
            <p className="text-[8px] text-white/60 uppercase leading-normal tracking-tight px-4">
              Credits have been added to your balance.
            </p>
            
            <div className="pt-2 px-6">
              <PixelButton onClick={onClose} variant="primary" className="w-full h-8 text-[9px]">
                CLOSE
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      </div>
    </div>
  );
};
