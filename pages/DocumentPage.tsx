
import React from 'react';
import { PixelCard } from '../components/PixelComponents.tsx';

interface DocumentPageProps {
  lang?: 'en' | 'zh';
}

const DocumentPage: React.FC<DocumentPageProps> = ({ lang = 'en' }) => {
  const isZh = lang === 'zh';
  
  // Chinese text gets +3px as requested for better readability of the bitmap font
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;
  const enOnly = (size: number) => `${size}px`;

  return (
    <div className="py-8 text-white min-h-[80vh] flex flex-col items-center">
      {/* Main Content Area */}
      <div className="w-full max-w-4xl space-y-12 pb-24 px-4">
        <header className="space-y-4 border-b-2 border-[#5a2d9c] pb-8 text-center md:text-left">
          <h1 className="font-bold text-white uppercase tracking-tighter" style={{ fontSize: zhScale(24) }}>
            {isZh ? '文档' : 'Documentation'}
          </h1>
          <p className="text-white/60 leading-relaxed" style={{ fontSize: zhScale(10) }}>
            {isZh ? (
              <>
                <span style={{ fontSize: enOnly(10) }}>Rika AI</span> 使用手册与快速入门指南
              </>
            ) : (
              'Technical Manual & Quick Start Guide for Rika AI'
            )}
          </p>
        </header>

        <section className="space-y-16">
          <div className="space-y-6 text-left">
            <h2 className="font-bold uppercase tracking-tight flex items-center gap-3 text-white" style={{ fontSize: zhScale(16) }}>
              <span className="w-2 h-6 bg-white/20"></span>
              {isZh ? '快速开始' : 'Quick Start'}
            </h2>
            <p className="text-white/70 leading-relaxed max-w-2xl" style={{ fontSize: zhScale(10) }}>
              {isZh ? '遵循以下步骤，将您的静态像素图片转换成动画序列帧。' : 'Follow these steps to transform your static pixel assets into high-fidelity animated sequences.'}
            </p>
          </div>

          {/* STEP 1 */}
          <div id="upload" className="space-y-6 scroll-mt-32 text-left">
            <div className="flex items-start gap-6">
              <span className="text-3xl font-bold text-[#5a2d9c]/40">01</span>
              <div className="space-y-4 flex-1">
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(16) }}>
                  {isZh ? '上传角色' : 'Upload Character'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8" style={{ fontSize: zhScale(10) }}>
                  <p>
                    {isZh ? (
                      <>
                        准备一个符合以下标准分辨率的像素角色图像：
                        <span className="text-[#f7d51d] font-bold ml-1" style={{ fontSize: enOnly(10) }}>64x64, 128x128, or 256x256</span>。
                      </>
                    ) : (
                      <>
                        Prepare a pixel character PNG in one of the following standard resolutions: 
                        <span className="text-[#f7d51d] font-bold ml-1">64x64, 128x128, or 256x256</span>.
                      </>
                    )}
                  </p>
                  <p>
                    {isZh ? (
                      <>
                        角色应朝向 <span className="text-white font-bold">右侧</span>。如果您的角色朝向左侧，请使用参考图部分的 <span className="text-[#f7d51d] font-bold">"FLIP"</span> 开关来校正方向。
                      </>
                    ) : (
                      <>
                        Characters should be oriented facing to the <span className="text-white font-bold">RIGHT</span>. If your character is facing left, please use the <span className="text-[#f7d51d] font-bold">"FLIP"</span> toggle in the reference section to correct the orientation.
                      </>
                    )}
                  </p>
                  <p>
                    {isZh ? '图像可以具有透明背景或纯色背景。' : 'Images can have a transparent background or a solid background.'}
                  </p>
                  <PixelCard className="bg-[#2d1b4e]/20 border-[#5a2d9c]/30">
                    <p className="text-white/50 italic leading-relaxed uppercase" style={{ fontSize: zhScale(9) }}>
                      {isZh ? (
                        <>
                          专业提示：您的角色应与图像边缘保持一定距离。如果角色填满了整个画布，请勾选参考图部分的 <span className="text-white font-bold">"PADDING"</span> 框以获得更好的效果。
                        </>
                      ) : (
                        <>
                          PRO TIP: Your character should have some breathing room from the image edges. 
                          If the character fills the entire canvas, toggle the <span className="text-white font-bold">"PADDING"</span> 
                          checkbox in the reference section to get better results.
                        </>
                      )}
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
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(16) }}>
                  {isZh ? '调整参数' : 'Adjust Parameters'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8" style={{ fontSize: zhScale(10) }}>
                  <p>
                    {isZh ? '使用侧边栏参数生成上下文：' : 'Configure the generation context using the sidebar controls:'}
                  </p>
                  <ul className="list-disc list-inside space-y-3 text-white/70">
                    <li><span className="text-white font-medium">{isZh ? '动作类型：' : 'Motion Type:'}</span> {isZh ? '选择预期的动作' : 'Select the intended action'}</li>
                    <li><span className="text-white font-medium">{isZh ? '像素尺寸：' : 'Pixel Size:'}</span> {isZh ? '必须与您的像素格子尺寸匹配' : 'Must match your source pixel grid resolution'}</li>
                    <li><span className="text-white font-medium">{isZh ? '提示词：' : 'Prompts:'}</span> {isZh ? '使用默认值或自行编写。' : 'Use optimized defaults or write your own.'}</li>
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
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(16) }}>
                  {isZh ? '图像控制' : 'Image Control'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8" style={{ fontSize: zhScale(10) }}>
                  <p>
                    {isZh ? '使用高级选项优化动画：' : 'Fine-tune the animation using advanced options:'}
                  </p>
                  <ul className="list-disc list-inside space-y-4">
                    <li>
                      <span className="text-white font-bold underline">{isZh ? '循环模式：' : 'Loop Mode:'}</span> {isZh ? <>切换 <span className="text-[#f7d51d] font-bold">"LOOP"</span> 以实现无缝循环。</> : <>Toggle <span className="text-[#f7d51d] font-bold">"LOOP"</span> for seamless cycles.</>}
                    </li>
                    <li>
                      <span className="text-white font-bold underline">{isZh ? '高级控制：' : 'Advanced Control:'}</span> {isZh ? <>点击 <span className="text-[#f7d51d] font-bold">"EXPAND"</span> 上传自定义关键帧。</> : <>Click <span className="text-[#f7d51d] font-bold">"EXPAND"</span> to upload custom Keyframes.</>}
                    </li>
                  </ul>
                  <PixelCard className="bg-white/5 border-white/10">
                    <p className="text-white/50 italic leading-relaxed uppercase" style={{ fontSize: zhScale(9) }}>
                      {isZh ? (
                        <>
                          注意：建议在使用自定义 <span className="text-white font-medium">MID IMAGE</span> 时配合 <span className="text-[#f7d51d] font-bold" style={{ fontSize: enOnly(9) }}>16 FRAMES</span> 设置，以获得更平滑的过渡。
                        </>
                      ) : (
                        <>
                          NOTICE: Using a custom <span className="text-white font-medium">MID IMAGE</span> is recommended with <span className="text-[#f7d51d] font-bold">16 FRAMES</span> for smoother transitions.
                        </>
                      )}
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
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(16) }}>
                  {isZh ? '启动生成' : 'Generation'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8" style={{ fontSize: zhScale(10) }}>
                  <p>
                    {isZh ? (
                      <>
                        每次生成操作消耗 <span className="text-[#f7d51d] font-bold">5 个积分</span>。请通过积分商店充值。
                      </>
                    ) : (
                      <>
                        Each generation operation costs <span className="text-[#f7d51d] font-bold">5 CREDITS</span>. 
                        Recharge via the Credit Store.
                      </>
                    )}
                  </p>
                  <p>
                    {isZh ? (
                      <>
                        在 <span className="text-white font-bold underline">DASHBOARD</span> 中监控任务。点击重新生成可重新加载之前的参数。
                      </>
                    ) : (
                      <>
                        Monitor tasks in the <span className="text-white font-bold underline">DASHBOARD</span>. 
                        Click <span className="text-white font-bold">"RE-GENERATE"</span> to reload previous parameters.
                      </>
                    )}
                  </p>
                  <PixelCard className="bg-[#2d1b4e]/20 border-[#5a2d9c]/30">
                    <p className="text-white/50 italic leading-relaxed uppercase" style={{ fontSize: zhScale(9) }}>
                      {isZh ? (
                        <>
                          耗时：完整的生成通常需要 <span className="text-white font-bold">1-5 分钟</span>，具体取决于复杂程度和排队情况。
                        </>
                      ) : (
                        <>
                          TIMING: A complete generation typically takes between <span className="text-white font-bold">1-5 minutes</span> depending on the complexity and queue.
                        </>
                      )}
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
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(16) }}>
                  {isZh ? '浏览与导出' : 'Browsing & Export'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8" style={{ fontSize: zhScale(10) }}>
                  <p>
                    {isZh ? (
                      <>
                        <span className="text-white font-bold underline">PLAYER</span> 提供了完整的预览和编辑工具：
                      </>
                    ) : (
                      <>
                        The <span className="text-white font-bold underline">PLAYER</span> provides full preview and editing tools:
                      </>
                    )}
                  </p>
                  <ul className="list-disc list-inside space-y-3 text-white/70">
                    <li><span className="text-white font-medium">{isZh ? '查看：' : 'Review:'}</span> {isZh ? '以自定义 FPS 播放序列。' : 'Play sequences at custom FPS.'}</li>
                    <li><span className="text-white font-medium">{isZh ? '编辑：' : 'Edit:'}</span> {isZh ? '移除帧或修改像素。' : 'Remove frames or modify pixels.'}</li>
                    <li><span className="text-white font-medium">{isZh ? '导出：' : 'Export:'}</span> {isZh ? '导出为序列帧或动图。' : 'Export as sprite sheet (PNG) or GIF.'}</li>
                  </ul>
                  <div className="p-4 bg-white/5 border-2 border-white/20 text-center">
                    <p className="text-white/80 font-bold uppercase" style={{ fontSize: zhScale(9) }}>
                      {isZh ? (
                        <>
                          编辑器和导出工具 <span className="text-[#f7d51d]">不会</span> 消耗任何积分。
                        </>
                      ) : (
                        <>
                          EDITOR AND EXPORT TOOLS <span className="text-[#f7d51d]">DO NOT</span> CONSUME ANY CREDITS.
                        </>
                      )}
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
              <h2 className="font-bold uppercase tracking-tight flex items-center gap-3 text-white" style={{ fontSize: zhScale(16) }}>
                <span className="w-2 h-6 bg-[#f7d51d]"></span>
                {isZh ? '高级控制' : 'Advanced Control'}
              </h2>
              <p className="text-white/70 leading-relaxed max-w-2xl" style={{ fontSize: zhScale(10) }}>
                {isZh ? '使用高级参数更好地控制动画细节。' : 'Use advanced parameters to better control animation details.'}
              </p>
            </div>

            <div className="space-y-12">
              {/* 1. Parameters */}
              <div className="space-y-6">
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(12) }}>
                  {isZh ? '1. 高级参数' : '1. Advanced Parameters'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8 border-l border-white/10 pl-6" style={{ fontSize: zhScale(10) }}>
                  <p>
                    {isZh ? (
                      <>
                        <span style={{ fontSize: enOnly(10) }}>Rika AI</span> 采用自有的自定义训练视频模型进行动画生成。为了获得更好的生成效果，特别是对于 <span className="text-white font-bold">"ATTACK"</span> 和 <span className="text-white font-bold">"DEFEATED"</span> 等复杂动画，需要特定的参数调整。
                      </>
                    ) : (
                      <>
                        Rika AI adopts its own custom-trained video model for animation generation. To achieve better generation results, especially for complex animations such as <span className="text-white font-bold">"ATTACK"</span> and <span className="text-white font-bold">"DEFEATED"</span>, specific parameter adjustments are required.
                      </>
                    )}
                  </p>
                  <p>
                    {isZh ? (
                      <>
                        点击 <span style={{ fontSize: enOnly(10) }}>Create</span> 界面中的 <span className="text-[#f7d51d] font-bold">"SHOW ADVANCED"</span> 可展开高级菜单，其中包括模型强度（Strength）、帧数和种子（Seed）。
                      </>
                    ) : (
                      <>
                        Clicking <span className="text-[#f7d51d] font-bold">"SHOW ADVANCED"</span> in the Create interface expands the advanced menu, which includes Model Strength, Frame Count, and Seed.
                      </>
                    )}
                  </p>
                  <ul className="space-y-4 list-none">
                    <li className="flex gap-4">
                      <span className="text-[#f7d51d] font-bold shrink-0">{isZh ? '模型强度：' : 'STRENGTH:'}</span>
                      <span>
                        {isZh ? (
                          <>
                            对于大多数动画，将强度设置为 <span className="text-white font-bold" style={{ fontSize: enOnly(10) }}>0.8</span> 是理想的选择。强度值 <span className="text-white font-bold">越高</span>，动画风格越统一和一致；相反，强度值 <span className="text-white font-bold">越低</span>，动画越倾向于遵循提示词，尽管质量可能会变得不稳定。
                          </>
                        ) : (
                          <>
                            For most animations, setting the strength to <span className="text-white font-bold">0.8</span> is an ideal choice. 
                            A <span className="text-white font-bold">higher strength</span> value results in a more unified and consistent animation style. 
                            Conversely, a <span className="text-white font-bold">lower strength</span> value makes the animation adhere more closely to the prompt, though the quality may become more unstable.
                          </>
                        )}
                      </span>
                    </li>
                    <li className="flex gap-4">
                      <span className="text-[#f7d51d] font-bold shrink-0">{isZh ? '种子：' : 'SEED:'}</span>
                      <span>
                        {isZh ? (
                          <>
                            用于生成的随机数种子。您可以勾选 <span className="text-white font-bold">"FIX"</span> 来固定种子，确保每次生成都使用相同的随机值。如果您对某次生成的动作非常满意，可以使用该种子进行后续生成，以保持连贯性。
                          </>
                        ) : (
                          <>
                            The random number seed used for generation. You can choose to fix the seed by selecting <span className="text-white font-bold">"FIX"</span> to ensure the same random value is used for every generation. If you are very satisfied with the motion in a particular generation, you can use its seed for subsequent generation tasks to maintain consistency.
                          </>
                        )}
                      </span>
                    </li>
                    <li className="flex gap-4">
                      <span className="text-red-400 font-bold shrink-0">{isZh ? '注意：' : 'NOTICE:'}</span>
                      <span>
                        {isZh ? (
                          <>
                            <span className="text-white font-bold">"ATTACK"</span> 动作默认是近战武器挥砍。如果您希望生成其他类型的攻击（如射击），请尝试将强度调低至 <span className="text-white font-bold" style={{ fontSize: enOnly(10) }}>0.3</span>。
                          </>
                        ) : (
                          <>
                            The <span className="text-white font-bold">"ATTACK"</span> motion defaults to a melee weapon slashing action. If you wish to generate other types of attack motions (e.g., shooting a gun), try adjusting the strength to <span className="text-white font-bold">0.3</span>.
                          </>
                        )}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 2. Prompt Writing */}
              <div className="space-y-6">
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(12) }}>
                  {isZh ? '2. 提示词编写' : '2. Prompt Writing'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8 border-l border-white/10 pl-6" style={{ fontSize: zhScale(10) }}>
                  <p>
                    {isZh ? (
                      <>
                        虽然 <span style={{ fontSize: enOnly(10) }}>Rika AI</span> 提供的默认提示词足以应对大多数情况，但精确的提示词编写可以显著提升动画的效果。以下以攻击动画为例子：
                      </>
                    ) : (
                      <>
                        While the default prompts provided by Rika AI are sufficient for most cases, precise prompt writing can significantly enhance the final result for animations. Take attack animation as an example:
                      </>
                    )}
                  </p>
                  <p>{isZh ? '高质量提示词应遵循以下蓝图：' : 'A high-quality prompt should follow this blueprint:'}</p>
                  
                  <PixelCard className="bg-black/40 border-[#5a2d9c]/40 py-8">
                    <code className="text-[#f7d51d] uppercase tracking-wider block text-center leading-relaxed font-bold" style={{ fontSize: enOnly(18) }}>
                      a [character description] uses [his/her/its] [weapon description] to perform a [attack description].
                    </code>
                  </PixelCard>

                  <div className="space-y-4">
                    <p>{isZh ? '示例：' : 'Examples:'}</p>
                    <ul className="space-y-4 text-white/60 italic border-l-2 border-[#5a2d9c]/40 pl-4">
                      <li style={{ fontSize: enOnly(10) }}>"A female knight raises her sword to perform a powerful slash attack forward."</li>
                      <li style={{ fontSize: enOnly(10) }}>"A warrior points her pistol forward to shoot a bullet." {isZh ? '(应将模型强度调至 0.3)' : '(You should adjust the model strength to 0.3 for this).'}</li>
                    </ul>
                  </div>

                  <p>
                    {isZh ? '详细的武器描述有助于在整个动画中保持武器的一致性。' : 'Detailed weapon descriptions help maintain the consistency of the weapon throughout the animation.'}
                  </p>

                  <PixelCard className="bg-[#2d1b4e]/20 border-[#5a2d9c]/30">
                    <p className="text-white/50 italic leading-relaxed uppercase" style={{ fontSize: zhScale(9) }}>
                      {isZh ? (
                        <>
                          限制：攻击动画默认设置为 <span className="text-white font-bold" style={{ fontSize: enOnly(9) }}>16 FRAMES</span>。您应避免描述过于复杂、无法在规定帧数内完成的动作。
                        </>
                      ) : (
                        <>
                          LIMITATION: Attack animations are set to <span className="text-white font-bold">16 FRAMES</span> by default. You should avoid describing actions that are too complex to be completed within this frame count.
                        </>
                      )}
                    </p>
                  </PixelCard>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-[#5a2d9c]/20" />

          {/* EDITOR SECTION */}
          <div id="player" className="space-y-12 scroll-mt-32 text-left">
            <div className="space-y-6">
              <h2 className="font-bold uppercase tracking-tight flex items-center gap-3 text-white" style={{ fontSize: zhScale(16) }}>
                <span className="w-2 h-6 bg-[#5a2d9c]"></span>
                {isZh ? '编辑器' : 'Player'}
              </h2>
              <p className="text-white/70 leading-relaxed max-w-2xl" style={{ fontSize: zhScale(10) }}>
                {isZh ? '生成完成后，在 Dashboard 中点击 "预览" 即可进入编辑器对动画进行微调。' : 'Once generation is complete, click "View in Player" in the Dashboard to enter the editor and fine-tune your animation.'}
              </p>
            </div>

            <div className="space-y-12">
              {/* 1. Editor Functionalities */}
              <div className="space-y-6">
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(12) }}>
                  {isZh ? '1. 编辑器功能' : '1. Editor Functionalities'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8 border-l border-white/10 pl-6" style={{ fontSize: zhScale(10) }}>
                  <ul className="space-y-6 list-none">
                    <li className="space-y-1">
                      <span className="text-[#f7d51d] font-bold block">{isZh ? '背景去除：' : 'BACKGROUND REMOVAL:'}</span>
                      <span>{isZh ? '一键识别并清除背景颜色。' : 'Built-in smart algorithm to identify and clear background colors with one click.'}</span>
                    </li>
                    <li className="space-y-1">
                      <span className="text-[#f7d51d] font-bold block">{isZh ? '画笔与橡皮擦：' : 'BRUSH & ERASER:'}</span>
                      <span>{isZh ? '支持逐像素精准编辑，您可以修改角色的细节或修正生成瑕疵。' : 'Supports precise pixel-by-pixel editing, allowing you to modify character details or fix generation artifacts.'}</span>
                    </li>
                    <li className="space-y-1">
                      <span className="text-[#f7d51d] font-bold block">{isZh ? '魔棒工具：' : 'WAND TOOL:'}</span>
                      <span>{isZh ? '允许快速选中相似颜色区域并一键删除，高效清理残留像素。' : 'Allows quick selection of similar color regions for deletion, efficiently cleaning up stray pixels.'}</span>
                    </li>
                    <li className="space-y-1">
                      <span className="text-[#f7d51d] font-bold block">{isZh ? '背景亮暗切换：' : 'BACKGROUND TOGGLE:'}</span>
                      <span>{isZh ? '切换编辑区的明暗背景模式，方便观察动画在不同背景下的表现情况。' : 'Toggle between dark and light background modes to check animation visibility in different environments.'}</span>
                    </li>
                    <li className="space-y-1">
                      <span className="text-[#f7d51d] font-bold block">{isZh ? '帧选择工具：' : 'FRAME SELECTOR:'}</span>
                      <span>{isZh ? '通过序列面板勾选剔除不理想的单帧，从而优化整体动画的流畅度。' : 'Use the sequence panel to exclude specific undesirable frames, optimizing the overall motion flow.'}</span>
                    </li>
                    <li className="space-y-1">
                      <span className="text-[#f7d51d] font-bold block">{isZh ? '导出工具：' : 'EXPORT TOOLS:'}</span>
                      <span>{isZh ? '支持将结果导出为动图或具有透明通道的序列帧。' : 'Supports exporting results as animated GIFs or transparent PNG Sprite Sheets.'}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 2. Shortcuts */}
              <div className="space-y-6">
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(12) }}>
                  {isZh ? '2. 编辑器快捷键' : '2. Editor Shortcuts'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8 border-l border-white/10 pl-6" style={{ fontSize: zhScale(10) }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-black/30 border border-white/10">
                      <span className="text-[#f7d51d] font-bold mr-2" style={{ fontSize: enOnly(10) }}>CTRL + S</span>
                      <span className="opacity-80">{isZh ? '保存进度至本地浏览器缓存' : 'Save progress to local browser cache'}</span>
                    </div>
                    <div className="p-3 bg-black/30 border border-white/10">
                      <span className="text-[#f7d51d] font-bold mr-2" style={{ fontSize: enOnly(10) }}>CTRL + Z / Y</span>
                      <span className="opacity-80">{isZh ? '撤销 / 重做上一步操作' : 'Undo / Redo previous action'}</span>
                    </div>
                    <div className="p-3 bg-black/30 border border-white/10">
                      <span className="text-[#f7d51d] font-bold mr-2" style={{ fontSize: enOnly(10) }}>CTRL + DRAG</span>
                      <span className="opacity-80">{isZh ? '按住 Ctrl 拖拽鼠标以移动画布' : 'Hold Ctrl and drag to pan the canvas'}</span>
                    </div>
                    <div className="p-3 bg-black/30 border border-white/10">
                      <span className="text-[#f7d51d] font-bold mr-2" style={{ fontSize: enOnly(10) }}>SCROLL</span>
                      <span className="opacity-80">{isZh ? '使用鼠标滚轮缩放画布' : 'Scroll wheel to zoom in/out'}</span>
                    </div>
                    <div className="p-3 bg-black/30 border border-white/10">
                      <span className="text-[#f7d51d] font-bold mr-2" style={{ fontSize: enOnly(10) }}>Q + CLICK</span>
                      <span className="opacity-80">{isZh ? '按住 Q 使用鼠标左键快速取色' : 'Hold Q and left click to pick color'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Limitations */}
              <div className="space-y-6">
                <h3 className="font-bold uppercase text-white" style={{ fontSize: zhScale(12) }}>
                  {isZh ? '3. 限制说明' : '3. Limitations'}
                </h3>
                <div className="leading-relaxed text-white/80 space-y-4 ml-8 border-l border-white/10 pl-6" style={{ fontSize: zhScale(10) }}>
                  <PixelCard className="bg-red-900/10 border-red-500/30">
                    <p className="text-white/80 leading-relaxed uppercase" style={{ fontSize: zhScale(10) }}>
                      {isZh ? (
                        <>
                          此编辑器被设计为对动画的 <span className="text-white font-bold">初步编辑</span>。对于更加复杂的重绘或特效需求，请在导出序列帧后使用 Aseprite 或 Photoshop 等专业像素软件。
                        </>
                      ) : (
                        <>
                          This editor is designed for <span className="text-white font-bold">PRELIMINARY EDITING</span>. For more complex repainting or special effects, please use professional software after exporting.
                        </>
                      )}
                    </p>
                  </PixelCard>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="pt-16 border-t border-[#5a2d9c]/20">
          <p className="text-white/20 uppercase tracking-[0.3em] text-center" style={{ fontSize: zhScale(8) }}>
            {isZh ? '文档结束 • Rika AI' : 'End of Document • Rika AI'}
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
