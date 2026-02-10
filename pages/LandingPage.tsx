
import React, { useMemo } from 'react';
import { PixelButton } from '../components/PixelComponents.tsx';

interface LandingPageProps {
  onGetStarted: () => void;
}

// 14 display GIFs from assets/display/
const DISPLAY_GIFS = Array.from({ length: 14 }, (_, i) => `./assets/display/${i + 1}.gif`);
const FALLBACK_IMAGE = "./assets/display/1.gif";

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  // Randomly select one of the three hero images from the CDN on component initialization
  const heroImage = useMemo(() => {
    const images = [
      "https://cdn.rika-ai.com/assets/frontpage/image1.gif",
      "https://cdn.rika-ai.com/assets/frontpage/image2.gif",
      "https://cdn.rika-ai.com/assets/frontpage/image3.gif"
    ];
    return images[Math.floor(Math.random() * images.length)];
  }, []);

  return (
    <div className="bg-[#0d0221] text-white selection:bg-[#5a2d9c] selection:text-white overflow-hidden">
      {/* SECTION 1: HERO */}
      <section className="min-h-[80vh] flex flex-col lg:flex-row items-center justify-center px-6 lg:px-24 gap-12 py-16">
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight uppercase text-[#f7d51d] text-pretty">
            RIKA AI
          </h1>
          <div className="space-y-4">
             <h2 className="text-base md:text-lg font-medium text-white/90 leading-tight uppercase tracking-wider text-pretty">
                Automatically generate pixel animations from your art
             </h2>
             <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.15em] leading-relaxed max-w-md mx-auto lg:mx-0 text-pretty">
                The ultimate neural toolkit for 2D game developers. Transform static sprites into professional frame sequences instantly with high-fidelity motion synthesis.
             </p>
          </div>
          <div className="pt-4">
            <PixelButton 
              variant="outline"
              className="w-full max-w-[200px] h-11 text-xs hover:translate-y-[-1px] transition-all"
              onClick={onGetStarted}
            >
              GET STARTED
            </PixelButton>
          </div>
        </div>

        <div className="flex-1 flex justify-center items-center w-full max-w-sm lg:max-w-none">
          <div className="w-full aspect-square pixel-border bg-[#2d1b4e]/10 flex items-center justify-center overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#5a2d9c]/5 to-transparent"></div>
            <img 
              src={heroImage} 
              className="w-[70%] h-[70%] object-contain animate-fade-in z-10" 
              style={{ imageRendering: 'pixelated' }}
              alt="Hero Animation Preview"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: PIPELINE */}
      <section className="min-h-[90vh] flex flex-col justify-center py-20 px-6 lg:px-24 bg-black/10 border-t border-[#5a2d9c]/10">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-[#f7d51d] text-pretty">Automatic Animation Generator</h2>
          <p className="text-[8px] text-white/30 uppercase tracking-[0.4em] text-pretty">End-to-End Motion Synthesis Pipeline</p>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 w-full">
          {[
            { 
              num: "01", 
              title: "Input & Context", 
              desc: "Upload your pixel character, select motions, and write prompts.",
              img: "./assets/create.png",
              stage: "STAGE 01"
            },
            { 
              num: "02", 
              title: "AI Animation Generation", 
              desc: "Click generate, and the AI automatically produces pixel-perfect frame-by-frame animations.",
              img: "./assets/archive.png",
              stage: "STAGE 02"
            },
            { 
              num: "03", 
              title: "Edit Frame Sequence", 
              desc: "Modify and export generated frame sequences, or choose to regenerate.",
              img: "./assets/player.png",
              stage: "STAGE 03"
            }
          ].map((step, index) => (
            <React.Fragment key={step.num}>
              <div className="flex-1 min-w-[280px] p-8 border border-[#5a2d9c] bg-[#121212]/30 flex flex-col items-center text-center relative group hover:border-[#f7d51d] transition-colors">
                <span className="text-4xl font-bold text-[#5a2d9c] mb-6 opacity-60 group-hover:text-[#f7d51d] group-hover:opacity-100 transition-all">{step.num}</span>
                <h3 className="text-[10px] md:text-[12px] font-bold uppercase text-white mb-4 tracking-wider text-pretty">{step.title}</h3>
                <p className="text-[8px] text-white/40 leading-relaxed mb-8 uppercase tracking-wider text-pretty h-12 flex items-center">
                  {step.desc}
                </p>
                <div className="w-full aspect-[4/3] border border-[#5a2d9c]/40 bg-[#1e1e1e]/60 flex items-center justify-center relative overflow-hidden">
                  <img 
                    src={step.img} 
                    className="w-[85%] h-[85%] object-contain z-10 opacity-80 group-hover:opacity-100 transition-opacity" 
                    style={{ imageRendering: 'pixelated' }}
                    alt={step.title}
                    onError={(e) => {
                      e.currentTarget.style.opacity = '0.1';
                    }}
                  />
                  <span className="absolute bottom-2 right-2 text-[8px] font-bold text-white/10 uppercase tracking-widest">{step.stage}</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#5a2d9c]/10 to-transparent"></div>
                </div>
              </div>
              {index < 2 && (
                <div className="hidden md:flex items-center justify-center py-4">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-[#5a2d9c] border-b-[8px] border-b-transparent opacity-40"></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* TUTORIAL VIDEO SECTION */}
        <div className="max-w-4xl mx-auto w-full mt-20">
          <div className="pixel-border bg-black/40 overflow-hidden relative pointer-events-none select-none">
            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-[#f7d51d] text-[#0d0221] text-[8px] font-bold uppercase tracking-widest">
              Live Preview
            </div>
            <video 
              src="./assets/tutorial.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-auto block"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-[7px] text-white/20 uppercase tracking-[0.5em]">Real-time Generation Pipeline Showcase</p>
          </div>
        </div>
      </section>

      {/* SECTION 3: SPRITE PLAYER */}
      <section className="min-h-[70vh] flex flex-col justify-center py-20 px-6 lg:px-24">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-[#f7d51d] text-pretty">Sprite Player</h2>
          <p className="text-[8px] text-white/30 uppercase tracking-[0.4em] text-pretty">Advanced Frame Editor & Asset Management</p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[
            { title: "Background Removal", img: "./assets/bgremove.gif" },
            { title: "Pixel Editing", img: "./assets/edit.gif" },
            { title: "Sprite Sheet Export", img: "./assets/export.gif" }
          ].map((feature) => (
            <div key={feature.title} className="p-6 border border-[#5a2d9c] bg-[#121212]/30 flex flex-col items-center gap-5 group hover:border-[#f7d51d] transition-all">
              <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60 group-hover:text-white transition-colors text-pretty">{feature.title}</h3>
              <div className="w-full aspect-square bg-black/10 border border-[#5a2d9c]/20 overflow-hidden flex items-center justify-center relative group-hover:border-[#5a2d9c]/50">
                 <img 
                   src={feature.img} 
                   className="w-[80%] h-[80%] object-contain opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all" 
                   style={{ imageRendering: 'pixelated' }} 
                   alt={feature.title}
                   onError={(e) => {
                     e.currentTarget.src = FALLBACK_IMAGE;
                   }}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#5a2d9c]/5 to-transparent"></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: INFINITE SCROLL GALLERY */}
      <section className="py-24 bg-black/20 border-t border-b border-[#5a2d9c]/10 relative overflow-hidden">
        <div className="text-center mb-16 space-y-2 px-6">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-[#f7d51d] text-pretty">Neural Motion Gallery</h2>
          <p className="text-[8px] text-white/30 uppercase tracking-[0.4em] text-pretty">Generated with Rika-V1 Neural Synthesis Engine</p>
        </div>

        {/* The Marquee Container */}
        <div className="relative flex overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...DISPLAY_GIFS, ...DISPLAY_GIFS].map((src, i) => (
              <div 
                key={i} 
                className="inline-block px-4 py-2"
              >
                <div className="w-[180px] md:w-[220px] aspect-square pixel-border border-[#5a2d9c]/30 bg-[#2d1b4e]/20 flex items-center justify-center p-6 group hover:border-[#f7d51d] transition-all cursor-pointer">
                  <img 
                    src={src} 
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform" 
                    style={{ imageRendering: 'pixelated' }} 
                    alt={`Gallery Display ${i}`}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-24 text-center bg-[#0d0221]">
         <div className="max-w-2xl mx-auto space-y-6 px-6">
            <div className="flex flex-col items-center justify-center space-y-2">
              <h3 className="text-lg font-bold uppercase tracking-tight text-white text-pretty">Ready to Animate?</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] text-pretty">Try Rika AI</p>
            </div>
            <div className="pt-4">
              <PixelButton onClick={onGetStarted} variant="outline" className="w-full max-w-[200px] mx-auto h-12 text-[10px] font-bold">
                GET STARTED
              </PixelButton>
            </div>
            <div className="pt-8 opacity-10">
               <p className="text-[7px] uppercase tracking-[0.5em] text-pretty">Rika Neural Lab • v1.0.42</p>
            </div>
         </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-fade-in {
          animation: fade-in 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        .text-pretty {
          text-wrap: pretty;
        }
      `}} />
    </div>
  );
};

export default LandingPage;
