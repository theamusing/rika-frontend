
import React from 'react';
import { PixelCard } from '../components/PixelComponents.tsx';

const DocumentPage: React.FC = () => {
  return (
    <div className="py-8 text-white min-h-[80vh] flex flex-col items-center">
      {/* Main Content Area */}
      <div className="w-full max-w-4xl space-y-12 pb-24 px-4">
        <header className="space-y-4 border-b-2 border-[#5a2d9c] pb-8 text-center md:text-left">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tighter">Documentation</h1>
          <p className="text-[10px] text-white/60 leading-relaxed">
            Technical Manual & Quick Start Guide for Rika AI v1.0
          </p>
        </header>

        <section className="space-y-16">
          <div className="space-y-6 text-left">
            <h2 className="text-base font-bold uppercase tracking-tight flex items-center gap-3 text-white">
              <span className="w-2 h-6 bg-white/20"></span>
              Quick Start
            </h2>
            <p className="text-[10px] text-white/70 leading-relaxed max-w-2xl">
              Follow these steps to transform your static pixel assets into high-fidelity animated sequences.
            </p>
          </div>

          {/* STEP 1 */}
          <div id="upload" className="space-y-6 scroll-mt-32 text-left">
            <div className="flex items-start gap-6">
              <span className="text-3xl font-bold text-[#5a2d9c]/40">01</span>
              <div className="space-y-4 flex-1">
                <h3 className="text-base font-bold uppercase text-white">Upload Character</h3>
                <div className="text-[10px] leading-relaxed text-white/80 space-y-4 ml-8">
                  <p>
                    Prepare a pixel character PNG in one of the following standard resolutions: 
                    <span className="text-[#f7d51d] font-bold ml-1">64x64, 128x128, or 256x256</span>.
                  </p>
                  <p>
                    Characters should be oriented facing to the <span className="text-white font-bold">RIGHT</span>. If your character is facing left, please use the <span className="text-[#f7d51d] font-bold">"FLIP"</span> toggle in the reference section to correct the orientation.
                  </p>
                  <p>
                    Images can have a transparent background or a solid background. 
                  </p>
                  <PixelCard className="bg-[#2d1b4e]/20 border-[#5a2d9c]/30">
                    <p className="text-[9px] text-white/50 italic leading-relaxed uppercase">
                      PRO TIP: Your character should have some breathing room from the image edges. 
                      If the character fills the entire canvas, toggle the <span className="text-white font-bold">"PADDING"</span> 
                      checkbox in the reference section to avoid animation clipping.
                    </p>
                  </PixelCard>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div id="params" className="space-y-6 scroll-mt-32 text-left">
            <div className="flex items-start gap-6">
              <span className="text-3xl font-bold text-[#5a2d9c]/40">02</span>
              <div className="space-y-4 flex-1">
                <h3 className="text-base font-bold uppercase text-white">Adjust Parameters</h3>
                <div className="text-[10px] leading-relaxed text-white/80 space-y-4 ml-8">
                  <p>
                    Configure the generation context using the sidebar controls:
                  </p>
                  <ul className="list-disc list-inside space-y-3 text-white/70">
                    <li><span className="text-white font-medium">Motion Type:</span> Select the intended action</li>
                    <li><span className="text-white font-medium">Pixel Size:</span> Must match your source resolution</li>
                    <li><span className="text-white font-medium">Prompts:</span> Use optimized defaults or write your own.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3 */}
          <div id="control" className="space-y-6 scroll-mt-32 text-left">
            <div className="flex items-start gap-6">
              <span className="text-3xl font-bold text-[#5a2d9c]/40">03</span>
              <div className="space-y-4 flex-1">
                <h3 className="text-base font-bold uppercase text-white">Image Control</h3>
                <div className="text-[10px] leading-relaxed text-white/80 space-y-4 ml-8">
                  <p>
                    Fine-tune the animation flow using the reference matrix:
                  </p>
                  <ul className="list-disc list-inside space-y-4">
                    <li>
                      <span className="text-white font-bold underline">Loop Mode:</span> Toggle <span className="text-[#f7d51d] font-bold">"LOOP"</span> for seamless cycles.
                    </li>
                    <li>
                      <span className="text-white font-bold underline">Advanced Control:</span> Click <span className="text-[#f7d51d] font-bold">"EXPAND"</span> to upload custom Keyframes.
                    </li>
                  </ul>
                  <PixelCard className="bg-white/5 border-white/10">
                    <p className="text-[9px] text-white/50 italic leading-relaxed uppercase">
                      NOTICE: Using a custom <span className="text-white font-medium">MID IMAGE</span> is recommended with <span className="text-[#f7d51d] font-bold">16 FRAMES</span> for smoother transitions.
                    </p>
                  </PixelCard>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4 */}
          <div id="generate" className="space-y-6 scroll-mt-32 text-left">
            <div className="flex items-start gap-6">
              <span className="text-3xl font-bold text-[#5a2d9c]/40">04</span>
              <div className="space-y-4 flex-1">
                <h3 className="text-base font-bold uppercase text-white">Generation</h3>
                <div className="text-[10px] leading-relaxed text-white/80 space-y-4 ml-8">
                  <p>
                    Each generation operation costs <span className="text-[#f7d51d] font-bold">5 CREDITS</span>. 
                    Recharge via the Store Terminal.
                  </p>
                  <p>
                    Monitor tasks in the <span className="text-white font-bold underline">DASHBOARD</span>. 
                    Click <span className="text-white font-bold">"RE-GENERATE"</span> to reload previous parameters.
                  </p>
                  <PixelCard className="bg-[#2d1b4e]/20 border-[#5a2d9c]/30">
                    <p className="text-[9px] text-white/50 italic leading-relaxed uppercase">
                      TIMING: A complete generation typically takes between <span className="text-white font-bold">5-15 seconds</span> depending on the complexity and queue.
                    </p>
                  </PixelCard>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 5 */}
          <div id="export" className="space-y-6 scroll-mt-32 text-left">
            <div className="flex items-start gap-6">
              <span className="text-3xl font-bold text-[#5a2d9c]/40">05</span>
              <div className="space-y-4 flex-1">
                <h3 className="text-base font-bold uppercase text-white">Browsing & Export</h3>
                <div className="text-[10px] leading-relaxed text-white/80 space-y-4 ml-8">
                  <p>
                    The <span className="text-white font-bold underline">PLAYER</span> provides full preview and editing tools:
                  </p>
                  <ul className="list-disc list-inside space-y-3 text-white/70">
                    <li><span className="text-white font-medium">Review:</span> Play sequences at custom FPS.</li>
                    <li><span className="text-white font-medium">Edit:</span> Remove frames or modify pixels.</li>
                    <li><span className="text-white font-medium">Export:</span> Download as PNG or GIF.</li>
                  </ul>
                  <div className="p-4 bg-white/5 border-2 border-white/20 text-center">
                    <p className="text-[9px] text-white/80 font-bold uppercase">
                      EDITOR AND EXPORT TOOLS <span className="text-[#f7d51d]">DO NOT</span> CONSUME ANY CREDITS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-[#5a2d9c]/20" />

          {/* ADVANCED CONTROL */}
          <div id="advanced" className="space-y-12 scroll-mt-32 text-left">
            <div className="space-y-6">
              <h2 className="text-base font-bold uppercase tracking-tight flex items-center gap-3 text-white">
                <span className="w-2 h-6 bg-[#f7d51d]"></span>
                Advanced Control
              </h2>
              <p className="text-[10px] text-white/70 leading-relaxed max-w-2xl">
                Use advanced parameters to better control animation details.
              </p>
            </div>

            <div className="space-y-12">
              {/* 1. Parameters */}
              <div className="space-y-6">
                <h3 className="text-[12px] font-bold uppercase text-white">1. Advanced Parameters</h3>
                <div className="text-[10px] leading-relaxed text-white/80 space-y-4 ml-8 border-l border-white/10 pl-6">
                  <p>
                    Rika AI adopts its own custom-trained video model for animation generation. To achieve better generation results, especially for complex animations such as <span className="text-white font-bold">"ATTACK"</span> and <span className="text-white font-bold">"DEFEATED"</span>, specific parameter adjustments are required.
                  </p>
                  <p>
                    Clicking <span className="text-[#f7d51d] font-bold">"SHOW ADVANCED"</span> in the Create interface expands the advanced menu, which includes Model Strength, Frame Count, and Seed.
                  </p>
                  <ul className="space-y-4 list-none">
                    <li className="flex gap-4">
                      <span className="text-[#f7d51d] font-bold shrink-0">STRENGTH:</span>
                      <span>
                        For most animations, setting the strength to <span className="text-white font-bold">0.8</span> is an ideal choice. 
                        A <span className="text-white font-bold">higher strength</span> value results in a more unified and consistent animation style. 
                        Conversely, a <span className="text-white font-bold">lower strength</span> value makes the animation adhere more closely to the prompt, though the quality may become more unstable.
                      </span>
                    </li>
                    <li className="flex gap-4">
                      <span className="text-[#f7d51d] font-bold shrink-0">SEED:</span>
                      <span>
                        The random number seed used for generation. You can choose to fix the seed by selecting <span className="text-white font-bold">"FIX"</span> to ensure the same random value is used for every generation. If you are very satisfied with the motion in a particular generation, you can use its seed for subsequent generation tasks to maintain consistency.
                      </span>
                    </li>
                    <li className="flex gap-4">
                      <span className="text-red-400 font-bold shrink-0">NOTICE:</span>
                      <span>
                        The <span className="text-white font-bold">"ATTACK"</span> motion defaults to a melee weapon slashing action. If you wish to generate other types of attack motions (e.g., shooting a gun), try adjusting the strength to <span className="text-white font-bold">0.3</span>.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 2. Prompt Writing */}
              <div className="space-y-6">
                <h3 className="text-[12px] font-bold uppercase text-white">2. Prompt Writing</h3>
                <div className="text-[10px] leading-relaxed text-white/80 space-y-4 ml-8 border-l border-white/10 pl-6">
                  <p>
                    While the default prompts provided by Rika AI are sufficient for most cases, precise prompt writing can significantly enhance the final result for attack animations.
                  </p>
                  <p>A high-quality prompt should follow this blueprint:</p>
                  
                  <PixelCard className="bg-black/40 border-[#5a2d9c]/40 py-8">
                    <code className="text-lg text-[#f7d51d] uppercase tracking-wider block text-center leading-relaxed font-bold">
                      a [character description] uses [his/her/its] [weapon description] to perform a [attack description].
                    </code>
                  </PixelCard>

                  <div className="space-y-4">
                    <p>Examples:</p>
                    <ul className="space-y-4 text-white/60 italic border-l-2 border-[#5a2d9c]/40 pl-4">
                      <li>"A female knight raises her sword to perform a powerful slash attack forward."</li>
                      <li>"A warrior points her pistol forward to shoot a bullet." (As noted above, you should adjust the model strength to <span className="text-white font-bold">0.3</span> for this).</li>
                    </ul>
                  </div>

                  <p>
                    Detailed weapon descriptions help maintain the consistency of the weapon throughout the animation.
                  </p>

                  <PixelCard className="bg-[#2d1b4e]/20 border-[#5a2d9c]/30">
                    <p className="text-[9px] text-white/50 italic leading-relaxed uppercase">
                      LIMITATION: Attack animations are set to <span className="text-white font-bold">16 FRAMES</span> by default. You should avoid describing actions that are too complex to be completed within this frame count.
                    </p>
                  </PixelCard>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="pt-16 border-t border-[#5a2d9c]/20">
          <p className="text-[8px] text-white/20 uppercase tracking-[0.3em] text-center">
            End of Document • Rika AI
          </p>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .scroll-mt-32 {
          scroll-margin-top: 8rem;
        }
      `}} />
    </div>
  );
};

export default DocumentPage;
