import React from 'react';
import { PixelButton } from '../components/PixelComponents.tsx';

interface DocumentPageProps {
  lang?: 'en' | 'zh';
  onOpenPricing?: () => void;
}

const DocumentPage: React.FC<DocumentPageProps> = ({ lang = 'en', onOpenPricing }) => {
  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => `${isZh ? enSize + 3 : enSize}px`;

  const Section = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
    <section className="space-y-6 text-left scroll-mt-32">
      <div className="flex items-baseline gap-4 border-b-2 border-white/15 pb-3">
        <span className="text-white/35 font-mono" style={{ fontSize: '11px' }}>{number}</span>
        <h2 className="font-bold uppercase tracking-wide text-white" style={{ fontSize: zhScale(15) }}>{title}</h2>
      </div>
      {children}
    </section>
  );

  const tableHead = 'p-3 text-left font-medium text-white/80 border-b-2 border-white/15';
  const tableCell = 'p-3 align-top text-white/65 border-b border-white/10 leading-relaxed';

  return (
    <div className="ui-page py-6 md:py-8 text-white min-h-[80vh] flex flex-col items-center">
      <article className="w-full max-w-4xl space-y-16 pb-24 px-4">
        <header className="space-y-4 border-b-2 border-white/20 pb-8">
          <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: zhScale(24) }}>
            {isZh ? 'Rika AI 使用文档' : 'RIKA AI DOCUMENTATION'}
          </h1>
          <p className="text-white/60 leading-relaxed max-w-3xl" style={{ fontSize: zhScale(10) }}>
            {isZh
              ? '本文档介绍当前版本的图像生成、动画生成、Player 编辑器、导出、积分与 API 使用方式。'
              : 'This document covers the current image generators, animation pipelines, Player editor, export tools, credits, and API behavior.'}
          </p>
        </header>

        <Section number="01" title={isZh ? '产品功能' : 'PRODUCT CAPABILITIES'}>
          <div className="overflow-x-auto border-2 border-white/10">
            <table className="w-full border-collapse" style={{ fontSize: zhScale(9) }}>
              <thead className="bg-white/5">
                <tr>
                  <th className={tableHead}>{isZh ? '功能' : 'FEATURE'}</th>
                  <th className={tableHead}>{isZh ? '说明' : 'DESCRIPTION'}</th>
                  <th className={tableHead}>{isZh ? '积分' : 'COST'}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [isZh ? '动画 V1' : 'Animation V1', isZh ? '使用预设动作快速生成 8–16 帧动画。' : 'Preset-motion animation with 8–16 output frames.', '5'],
                  [isZh ? '动画 V2' : 'Animation V2', isZh ? '支持自定义、多阶段动作和 16–32 帧动画。' : 'Custom and multi-stage motion with 16–32 output frames.', '8'],
                  [isZh ? '角色生成' : 'Character', isZh ? '根据文字和可选参考图生成像素角色。' : 'Generate a pixel character from text and an optional reference.', '1'],
                  [isZh ? '道具生成' : 'Item', isZh ? '根据文字和可选参考图生成像素道具。' : 'Generate a pixel item from text and an optional reference.', '1'],
                  [isZh ? '地图生成' : 'Map', isZh ? '根据结构图、场景描述和可选风格图生成横板地图。' : 'Generate a side-scrolling map from structure, text, and an optional style reference.', '2'],
                  ['Player', isZh ? '播放、逐帧编辑、去背景并导出结果。' : 'Preview, edit, remove backgrounds, and export results.', isZh ? '免费' : 'Free'],
                ].map(row => (
                  <tr key={row[0]}>
                    <td className={`${tableCell} whitespace-nowrap text-white/85`}>{row[0]}</td>
                    <td className={tableCell}>{row[1]}</td>
                    <td className={`${tableCell} whitespace-nowrap`}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section number="02" title={isZh ? '动画生成快速开始' : 'ANIMATION QUICK START'}>
          <ol className="space-y-7 list-none" style={{ fontSize: zhScale(10) }}>
            {[
              {
                title: isZh ? '准备参考图' : 'Prepare the reference image',
                text: isZh ? '上传 PNG 图片，可使用透明或纯色背景。选择与原图实际像素画布一致的 32×32、64×64、128×128 或 256×256。角色默认建议面向右侧；必要时使用 FLIP。' : 'Upload a PNG with a transparent or solid background. Select the logical canvas that matches the source: 32×32, 64×64, 128×128, or 256×256. Characters should normally face right; use FLIP when needed.',
              },
              {
                title: isZh ? '选择动画版本' : 'Choose an animation version',
                text: isZh ? 'V1 适合标准预设动作；V2 适合自由描述、多阶段动作和较长动画。V1 与 V2 之间切换时会继承当前像素尺寸。' : 'Use V1 for standard preset motions and V2 for custom, multi-stage, or longer actions. The selected pixel size is preserved when switching versions.',
              },
              {
                title: isZh ? '填写动作描述' : 'Describe the action',
                text: isZh ? '写明主体、动作顺序和收势。复杂动作应按时间顺序描述准备、发力、接触和后续动作，避免互相矛盾的要求。' : 'State the subject, action order, and follow-through. For complex motion, describe anticipation, acceleration, contact, and recovery in chronological order and avoid conflicting instructions.',
              },
              {
                title: isZh ? '设置参考帧' : 'Set control frames',
                text: isZh ? '起始图必需。可只添加结尾图，也可同时添加中间姿态和结尾图。LOOP 会将起始图作为结尾参考，以辅助循环动作。控制帧是姿态参考，不是逐帧锁定。' : 'A start image is required. Add an end image alone, or add both a middle pose and an end image. LOOP reuses the start as the end reference. Control frames guide poses but do not lock every generated frame.',
              },
              {
                title: isZh ? '生成并检查结果' : 'Generate and review',
                text: isZh ? '任务创建后会进入 Player。等待生成完成后逐帧检查，必要时排序或排除帧、去背景和修正像素，然后导出 PNG spritesheet 或 GIF。' : 'The job opens in Player after submission. When generation completes, review each frame, reorder or exclude frames, clean the background and pixels when needed, then export PNG or GIF.',
              },
            ].map((step, index) => (
              <li key={step.title} className="grid grid-cols-[32px_1fr] gap-4">
                <span className="text-white/35 font-mono">{String(index + 1).padStart(2, '0')}</span>
                <div className="space-y-2">
                  <h3 className="font-medium text-white/90" style={{ fontSize: zhScale(11) }}>{step.title}</h3>
                  <p className="text-white/65 leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section number="03" title={isZh ? '动画 V1 与 V2' : 'ANIMATION V1 AND V2'}>
          <div className="overflow-x-auto border-2 border-white/10">
            <table className="w-full border-collapse" style={{ fontSize: zhScale(9) }}>
              <thead className="bg-white/5">
                <tr>
                  <th className={tableHead}>{isZh ? '项目' : 'ITEM'}</th>
                  <th className={tableHead}>V1</th>
                  <th className={tableHead}>V2</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [isZh ? '适用范围' : 'Use case', isZh ? '待机、行走、奔跑、跳跃、攻击、受击和倒地等预设动作' : 'Preset idle, walk, run, jump, attack, hit, and defeated motion', isZh ? '任意动作、多阶段动作、变形和更长动画' : 'Custom actions, multi-stage motion, transformations, and longer sequences'],
                  [isZh ? '网页帧数' : 'Web frame options', '8 / 10 / 12 / 14 / 16', '16 / 20 / 24 / 32'],
                  [isZh ? '动作设置' : 'Motion controls', isZh ? '动作类型；攻击时可选择近战、远程或其他' : 'Motion type; melee, ranged, or other attack subtype', isZh ? '直接填写动作提示词，由系统判断动作配置' : 'Direct action prompt with automatic motion-profile selection'],
                  [isZh ? '高级设置' : 'Advanced controls', isZh ? '噪声强度和 Seed；网页默认强度为 0.6' : 'Noise strength and seed; web default is 0.6', isZh ? 'AI 扩写和 Seed；AI 扩写默认开启' : 'AI prompt expansion and seed; expansion is enabled by default'],
                  [isZh ? '画布' : 'Canvas', isZh ? '固定方向 Padding 位置' : 'Preset padding positions', isZh ? '可视化 Padding；非正方形画布在模型内部自动补齐并在输出时还原' : 'Visual padding; non-square canvases are padded internally and restored on output'],
                  [isZh ? '积分' : 'Credits', '4', '6'],
                ].map(row => (
                  <tr key={row[0]}>
                    <td className={`${tableCell} text-white/85 whitespace-nowrap`}>{row[0]}</td>
                    <td className={tableCell}>{row[1]}</td>
                    <td className={tableCell}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-l-2 border-white/20 pl-4 text-white/60 leading-relaxed" style={{ fontSize: zhScale(9) }}>
            {isZh
              ? 'V2 AI 扩写会读取参考图和原始动作描述，补充角色外观、动作时序和连续的肢体运动。Dashboard 与重新生成始终向用户显示原始提示词，优化后的提示词仅供内部生成使用。'
              : 'V2 prompt expansion reads the references and original action text to add subject details, timing, and continuous body mechanics. Dashboard and Regenerate continue to show the original prompt; the optimized prompt is used only for generation.'}
          </div>
        </Section>

        <Section number="04" title={isZh ? '角色、道具与地图生成' : 'CHARACTER, ITEM, AND MAP GENERATION'}>
          <div className="space-y-7 text-white/65 leading-relaxed" style={{ fontSize: zhScale(10) }}>
            <div>
              <h3 className="font-medium text-white/90 mb-2" style={{ fontSize: zhScale(11) }}>{isZh ? '角色生成' : 'Character generation'}</h3>
              <p>{isZh ? '输入角色描述，可选上传一张形象参考图。支持 64、128 和 256 像素尺寸，可设置现代动画像素或复古像素画风、体型提示与主导色。' : 'Enter a character description and optionally upload one visual reference. Available sizes are 64, 128, and 256, with anime or retro pixel style, body-type guidance, and dominant colors.'}</p>
            </div>
            <div>
              <h3 className="font-medium text-white/90 mb-2" style={{ fontSize: zhScale(11) }}>{isZh ? '道具生成' : 'Item generation'}</h3>
              <p>{isZh ? '输入道具的外形、材质和细节，可选上传一张参考图。支持 64、128 和 256 像素尺寸、画风与主导色设置。' : 'Describe the item shape, material, and details, with one optional reference image. Available sizes are 64, 128, and 256, with style and dominant-color controls.'}</p>
            </div>
            <div>
              <h3 className="font-medium text-white/90 mb-2" style={{ fontSize: zhScale(11) }}>{isZh ? '地图生成' : 'Map generation'}</h3>
              <p>{isZh ? '地图必须提供结构参考，可上传结构图或使用网格编辑器创建。还可提供一张风格参考图，并设置现代/复古像素画风、视差/扁平/无背景和主导色。' : 'A map requires a structure reference, either uploaded or created with the grid editor. You may also add one style reference and choose anime/retro pixel style, parallax/flat/no background, and dominant colors.'}</p>
            </div>
          </div>
        </Section>

        <Section number="05" title={isZh ? 'Player 与编辑器' : 'PLAYER AND EDITOR'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ fontSize: zhScale(9) }}>
            <div>
              <h3 className="font-medium text-white/90 mb-3" style={{ fontSize: zhScale(11) }}>{isZh ? '帧与播放' : 'Frames and playback'}</h3>
              <ul className="list-disc pl-5 space-y-2 text-white/65 leading-relaxed">
                <li>{isZh ? '播放、暂停、逐帧查看并调整 FPS；V2 默认以 12 FPS 预览。' : 'Play, pause, step through frames, and adjust FPS. V2 previews at 12 FPS by default.'}</li>
                <li>{isZh ? '拖拽重新排序，或排除不需要的帧。' : 'Drag to reorder or exclude unwanted frames.'}</li>
                <li>{isZh ? '使用画笔、橡皮、移动、取色和魔棒工具修改像素。' : 'Edit pixels with brush, eraser, move, picker, and wand tools.'}</li>
                <li>{isZh ? '支持撤销、重做与恢复初始结果。' : 'Undo, redo, and restore the original result.'}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-white/90 mb-3" style={{ fontSize: zhScale(11) }}>{isZh ? '清理与导出' : 'Cleanup and export'}</h3>
              <ul className="list-disc pl-5 space-y-2 text-white/65 leading-relaxed">
                <li>{isZh ? '默认去背景只删除从四角连通的相近颜色区域。' : 'Default background removal clears similar-color regions connected to the four corners.'}</li>
                <li>{isZh ? '全局匹配会删除所有帧中接近指定背景色的像素，包括不与边缘相连的区域。' : 'Global Match removes every pixel close to the selected background color, including regions not connected to an edge.'}</li>
                <li>{isZh ? '去杂色工具可合并相近颜色，减少零散颜色点。' : 'De-noise merges nearby colors to reduce isolated color specks.'}</li>
                <li>{isZh ? '动画可导出 PNG spritesheet 或 GIF；单图可导出原尺寸或 4× PNG。' : 'Animations export as PNG sprite sheets or GIFs; single images export at native size or 4× PNG.'}</li>
              </ul>
            </div>
          </div>
          <div className="overflow-x-auto border-2 border-white/10">
            <table className="w-full border-collapse" style={{ fontSize: zhScale(9) }}>
              <tbody>
                {[
                  ['CTRL + S', isZh ? '保存到本地浏览器缓存' : 'Save to local browser cache'],
                  ['CTRL + Z / Y', isZh ? '撤销 / 重做' : 'Undo / Redo'],
                  ['CTRL + DRAG', isZh ? '移动画布' : 'Pan the canvas'],
                  ['SCROLL', isZh ? '缩放画布' : 'Zoom the canvas'],
                  ['Q + CLICK', isZh ? '快速取色' : 'Quick color picker'],
                ].map(row => (
                  <tr key={row[0]}>
                    <td className={`${tableCell} w-40 font-mono text-white/80`}>{row[0]}</td>
                    <td className={tableCell}>{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section number="06" title={isZh ? '任务、积分与存储' : 'JOBS, CREDITS, AND STORAGE'}>
          <div className="space-y-4 text-white/65 leading-relaxed" style={{ fontSize: zhScale(10) }}>
            <p>{isZh ? '网页生成任务可在 Dashboard 中查看、收藏、删除和重新生成。重新生成会恢复原始用户参数。' : 'Web generation jobs can be viewed, liked, deleted, and regenerated from Dashboard. Regenerate restores the original user controls.'}</p>
            <p>{isZh ? '任务失败或超时时，系统会自动返还本次生成消耗的积分。排队与生成耗时会随帧数、分辨率和计算资源状态变化。' : 'Credits are automatically refunded when a generation fails or times out. Queue and render time vary with frame count, resolution, and compute availability.'}</p>
            <p>{isZh ? '使用 API Key 调用时，输入与输出不长期存储。任务成功后应及时下载 output_images 中的文件。' : 'API-key requests do not store inputs or outputs permanently. Download files from output_images promptly after a job succeeds.'}</p>
          </div>
        </Section>

        <Section number="07" title={isZh ? '商用与许可' : 'COMMERCIAL USE'}>
          <div className="space-y-4 text-white/65 leading-relaxed" style={{ fontSize: zhScale(10) }}>
            <p>{isZh ? '生成结果可用于游戏项目及其他商业作品。' : 'Generated results may be used in games and other commercial projects.'}</p>
            <p>{isZh ? '如果将生成结果作为独立素材直接二次销售，应在显著位置注明由 Rika AI 生成。所有使用仍须遵守网站使用条款。' : 'If generated results are directly resold as standalone assets, clearly credit Rika AI. All use remains subject to the site Terms of Use.'}</p>
          </div>
        </Section>

        <footer className="pt-8 border-t-2 border-white/15 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-3 text-white/45 leading-relaxed" style={{ fontSize: zhScale(9) }}>
            <p>{isZh ? '开发者可前往 API 页面创建密钥并查看完整请求参数。' : 'Developers can create keys and review complete request parameters on the API page.'}</p>
            <nav aria-label={isZh ? '相关使用指南' : 'Related guides'} className="flex flex-wrap gap-x-5 gap-y-2">
              <a href={`/${lang}/guides/how-to-animate-pixel-art/`} className="underline underline-offset-4 hover:text-[#f7d51d]">{isZh ? '如何制作像素动画' : 'How to animate pixel art'}</a>
              <a href={`/${lang}/guides/pixel-art-animation-prompts/`} className="underline underline-offset-4 hover:text-[#f7d51d]">{isZh ? '动画提示词指南' : 'Animation prompt guide'}</a>
              <a href={`/${lang}/sprite-sheet-generator/`} className="underline underline-offset-4 hover:text-[#f7d51d]">{isZh ? '序列帧生成器' : 'Sprite sheet generator'}</a>
            </nav>
          </div>
          {onOpenPricing && (
            <PixelButton variant="secondary" onClick={onOpenPricing} style={{ fontSize: zhScale(9) }}>
              {isZh ? '查看定价' : 'VIEW PRICING'}
            </PixelButton>
          )}
        </footer>
      </article>
    </div>
  );
};

export default DocumentPage;
