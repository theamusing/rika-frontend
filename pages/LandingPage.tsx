
import React, { useMemo } from 'react';
import { PixelButton } from '../components/PixelComponents.tsx';

interface LandingPageProps {
  onGetStarted: () => void;
}

// Centralized CDN base path
const CDN_BASE = "https://cdn.rika-ai.com/assets/frontpage/";
const GIF_BASE = `${CDN_BASE}gifs/`;

// 14 display GIFs from CDN subfolder
const DISPLAY_GIFS = Array.from({ length: 14 }, (_, i) => `${GIF_BASE}${i + 1}.gif`);
const FALLBACK_IMAGE = `${GIF_BASE}1.gif`;

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  // Randomly select one of the three hero images from the CDN on component initialization
  const heroImage = useMemo(() => {
    const images = [
      `${CDN_BASE}image1.gif`,
      `${CDN_BASE}image2.gif`,
      `${CDN_BASE}image3.gif`
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

      {/* SECTION 2: PIPELINE (Automatic Animation Generator) */}
      <section className="min-h-screen flex flex-col justify-center py-24 px-6 lg:px-24 bg-black/10 border-t border-[#5a2d9c]/10">
        <div className="text-center mb-24 space-y-2">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-[#f7d51d] text-pretty">Automatic Animation Generator</h2>
          <p className="text-[8px] text-white/30 uppercase tracking-[0.4em] text-pretty">End-to-End Motion Synthesis Pipeline</p>
        </div>

        {/* Flex container for the steps with padding to prevent edge clipping */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch justify-center gap-4 w-full px-4">
          {[
            { 
              num: "01", 
              title: "Input & Context", 
              desc: "Upload your pixel character, select motions, and write prompts.",
              img: `${CDN_BASE}origin.png`
            },
            { 
              num: "02", 
              title: "AI Animation Generation", 
              desc: "Click generate, and the AI automatically produces pixel-perfect frame-by-frame animations.",
              img: `${CDN_BASE}generated.png`
            },
            { 
              num: "03", 
              title: "Edit Frame Sequence", 
              desc: "Modify and export generated frame sequences, or choose to regenerate.",
              img: `${CDN_BASE}spritesheet.png`
            }
          ].map((step, index) => (
            <React.Fragment key={step.num}>
              <div className="flex-1 flex flex-col border-2 border-[#5a2d9c] bg-[#121212]/30 relative group hover:border-[#f7d51d] transition-colors overflow-hidden min-w-[300px]">
                  {/* Top Text Content - Increased padding and separation */}
                  <div className="p-10 pb-0 w-full flex flex-col items-center text-center">
                    <span className="text-5xl font-bold text-[#5a2d9c] mb-6 opacity-40 group-hover:text-[#f7d51d] group-hover:opacity-100 transition-all">{step.num}</span>
                    <h3 className="text-[11px] md:text-[13px] font-bold uppercase text-white mb-4 tracking-wider text-pretty">{step.title}</h3>
                    <p className="text-[8px] text-white/40 leading-relaxed mb-16 uppercase tracking-wider text-pretty min-h-[44px] flex items-center px-6">
                      {step.desc}
                    </p>
                  </div>

                  {/* Image Container - 4:3 Aspect Ratio, hitting horizontal edges (no padding) */}
                  <div className="w-full mt-auto aspect-[4/3] border-t border-[#5a2d9c]/40 bg-[#1e1e1e]/60 flex items-center justify-center relative overflow-hidden">
                    <img 
                      src={step.img} 
                      className="w-full h-full object-cover z-10 opacity-75 group-hover:opacity-100 transition-all duration-700" 
                      style={{ imageRendering: 'pixelated' }}
                      alt={step.title}
                      onError={(e) => {
                        e.currentTarget.style.opacity = '0.1';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#5a2d9c]/30 to-transparent z-10 pointer-events-none"></div>
                  </div>
              </div>

              {/* Directional Triangles between steps */}
              {index < 2 && (
                <div className="hidden lg:flex items-center justify-center px-2 self-center">
                  <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[14px] border-l-[#5a2d9c] border-b-[10px] border-b-transparent opacity-40 group-hover:opacity-100 transition-opacity"></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* TUTORIAL VIDEO SECTION */}
        <div className="max-w-4xl mx-auto w-full mt-28 px-4">
          <div className="pixel-border bg-black/40 overflow-hidden relative pointer-events-none select-none">
            <video 
              src={`${CDN_BASE}tutorial.mp4`} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-auto block"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: SPRITE PLAYER (Window-style layout) */}
      <section className="min-h-[70vh] flex flex-col justify-center py-24 px-6 lg:px-24 bg-[#0d0221]">
        <div className="text-center mb-20 space-y-2">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-[#f7d51d] text-pretty">Sprite Player & Editor</h2>
          <p className="text-[8px] text-white/30 uppercase tracking-[0.4em] text-pretty">Powerful, easy-to-use playback and editing tools</p>
          <p className="pt-4 text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.2em] max-w-2xl mx-auto text-pretty">
            Advanced features including background removal, pixel-perfect frame editing, and smart export options.
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-stretch px-4">
          {[
            { title: "Background Removal", img: `${CDN_BASE}bgremove.gif` },
            { title: "Pixel Editing", img: `${CDN_BASE}edit.gif` },
            { title: "Sprite Sheet Export", img: `${CDN_BASE}export.gif` }
          ].map((feature) => (
            <div key={feature.title} className="flex flex-col bg-[#1e1e1e] border-2 border-[#3a3a3a] shadow-[8px_8px_0px_#111] overflow-hidden group">
              <div className="flex items-center justify-between px-4 py-3 bg-[#3a3a3a] border-b-2 border-[#4a4a4a]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">{feature.title}</span>
                <div className="flex gap-1.5">
                   <div className="w-4 h-4 border border-white/20 flex items-center justify-center cursor-default">
                      <div className="w-2.5 h-[1px] bg-white/40"></div>
                   </div>
                   <div className="w-4 h-4 border border-white/20 flex items-center justify-center cursor-default">
                      <span className="text-[8px] text-white/40 leading-none">×</span>
                   </div>
                </div>
              </div>
              <div className="w-full aspect-[4/3] relative bg-black flex items-center justify-center overflow-hidden">
                 <img 
                   src={feature.img} 
                   className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" 
                   style={{ imageRendering: 'pixelated' }} 
                   alt={feature.title}
                   onError={(e) => {
                     e.currentTarget.src = FALLBACK_IMAGE;
                   }}
                 />
                 <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none"></div>
                 <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <PixelButton 
            variant="outline"
            className="w-full max-w-[200px] h-12 text-[10px] font-bold hover:bg-[#f7d51d] hover:text-[#0d0221] transition-all"
            onClick={onGetStarted}
          >
            TRY EDITOR
          </PixelButton>
        </div>
      </section>

      {/* SECTION 4: GALLERY */}
      <section className="py-24 bg-black/20 border-t border-b border-[#5a2d9c]/10 relative overflow-hidden">
        <div className="text-center mb-16 space-y-2 px-6">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-[#f7d51d] text-pretty">GALLERY</h2>
          <p className="text-[8px] text-white/30 uppercase tracking-[0.4em] text-pretty">Generated by Rika AI</p>
        </div>

        <div className="relative flex overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...DISPLAY_GIFS, ...DISPLAY_GIFS].map((src, i) => (
              <div key={i} className="inline-block px-4 py-2">
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
