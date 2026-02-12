
import React, { useEffect, useRef } from 'react';
import { PixelButton, PixelCard } from './PixelComponents.tsx';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    const colors = ['#f7d51d', '#5a2d9c', '#ffffff', '#2d1b4e'];

    class Particle {
      x: number; y: number; vx: number; vy: number; size: number; color: string; life: number;
      constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = Math.random() * 4 + 2;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = 1.0;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.life -= 0.01;
      }
      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
      }
    }

    for (let i = 0; i < 150; i++) {
      particles.push(new Particle());
    }

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
      });
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
      <div className="max-w-sm w-full p-4 relative">
        <PixelCard title="TRANSACTION COMPLETE" className="bg-[#0d0221] border-[#f7d51d] text-center py-8">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-[#f7d51d] pixel-border border-white flex items-center justify-center animate-bounce">
                <span className="text-2xl">✔</span>
              </div>
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-tighter">Purchase Successful</h2>
            <p className="text-[10px] text-white/60 uppercase leading-relaxed tracking-widest px-4">
              Credits have been added to your terminal balance. Access granted to premium generation protocols.
            </p>
            <div className="pt-4">
              <PixelButton onClick={onClose} variant="primary" className="w-full h-12">
                CLOSE
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      </div>
    </div>
  );
};
