import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const siteUrl = (process.env.VITE_SITE_URL || 'https://rika-ai.com').replace(/\/$/, '');
const routeUrl = (lang, segment = '') => `${siteUrl}/${lang}/${segment ? `${segment}/` : ''}`;

const shared = {
  en: {
    nav: ['Animation', 'Sprite sheets', 'Docs', 'API'],
    workflow: 'Workflow', faq: 'Frequently asked questions', more: 'Explore more', docs: 'Read the docs', home: 'Home', language: '中文',
  },
  zh: {
    nav: ['动画生成', '序列帧', '文档', 'API'],
    workflow: '基本流程', faq: '常见问题', more: '继续了解', docs: '阅读文档', home: '首页', language: 'EN',
  },
};

const pages = {
  en: [
    {
      segment: 'pixel-art-animation-generator', type: 'product',
      title: 'AI Pixel Art Animation Generator – Rika AI',
      description: 'Animate pixel art characters and objects from one to three reference images, then edit and export a clean sprite sheet or GIF.',
      eyebrow: 'PIXEL ART ANIMATION', heading: 'Turn static pixel art into game-ready animation',
      intro: 'Rika AI is an AI pixel art animation generator built for sprite workflows. Upload a start image, describe the motion, and create a frame sequence that can be reviewed, cleaned up, and exported without leaving the browser.',
      sections: [
        ['Reference-guided movement', 'Start from your own pixel-art image instead of generating an unrelated character. Use one image for open-ended motion, two for a defined start and finish, or three to add a middle pose that guides a complex action.'],
        ['Two animation workflows', 'V1 handles common game actions through fast presets. V2 is intended for custom and multi-stage movement, supports 16, 20, 24, or 32 output frames, and can expand a short action description into a timed motion plan.'],
        ['Pixel-focused output', 'Generated video frames are sampled onto the selected logical pixel grid and palette-limited for a more readable sprite. Player lets you inspect, reorder, exclude, and edit frames before export.'],
      ],
      steps: ['Upload a 32×32, 64×64, 128×128, or 256×256 pixel-art image.', 'Describe the action in its intended order and choose the output frame count.', 'Generate the animation, review individual frames in Player, and export a PNG sprite sheet or GIF.'],
      faqs: [['Can I animate my own pixel art?', 'Yes. Animation generation begins with an uploaded pixel-art image and may also use middle and end references.'], ['What kinds of motion can V2 create?', 'V2 is designed for custom actions such as attacks, transformations, interactions, movement chains, and other multi-stage animation.'], ['Can I edit the generated frames?', 'Yes. Player supports frame selection and ordering, pixel editing, background removal, playback controls, sprite-sheet export, and GIF export.']],
      cta: 'Create a pixel animation', ctaPath: 'create/animation',
    },
    {
      segment: 'sprite-sheet-generator', type: 'product',
      title: 'AI Sprite Sheet Generator for Pixel Art – Rika AI',
      description: 'Generate, review, and export pixel-art animation frames as an organized PNG sprite sheet for games and creative projects.',
      eyebrow: 'SPRITE SHEET GENERATOR', heading: 'Create organized pixel-art sprite sheets from motion',
      intro: 'Generate an animated sequence from a pixel-art reference, choose the useful frames, and export them as one transparent or solid-background PNG sprite sheet. Rika AI keeps the generation and cleanup workflow together.',
      sections: [
        ['From reference to frames', 'Describe an idle loop, locomotion cycle, attack, transformation, or object interaction. Rika AI generates the motion and converts selected moments into a consistent frame sequence.'],
        ['Review before export', 'Player provides adjustable FPS, frame-by-frame inspection, reordering, exclusion, pixel editing, color cleanup, and background removal. You decide which frames belong in the finished sheet.'],
        ['Predictable sheet layout', 'Choose the number of columns and export selected frames in row order. Each cell preserves the chosen logical sprite dimensions, including non-square content.'],
      ],
      steps: ['Generate an animation from your pixel-art reference.', 'Inspect the sequence and remove or repair unwanted frames.', 'Set the column count and background behavior, then export the PNG sprite sheet.'],
      faqs: [['What is a sprite sheet?', 'A sprite sheet is one image containing multiple animation frames arranged in a grid for efficient use in games and interactive projects.'], ['Can Rika AI export non-square sprites?', 'Yes. The animation and Player workflows support non-square visible content and preserve its intended frame dimensions on export.'], ['Does export cost additional credits?', 'No. Editing and exporting an existing generation in Player do not consume additional generation credits.']],
      cta: 'Generate a sprite sheet', ctaPath: 'create/animation',
    },
    {
      segment: 'pixel-art-character-generator', type: 'product',
      title: 'AI Pixel Art Character Generator – Rika AI',
      description: 'Create pixel-art game characters from text and reference images, then use them directly as animation inputs in Rika AI.',
      eyebrow: 'CHARACTER GENERATOR', heading: 'Design pixel-art characters ready for animation',
      intro: 'Create a pixel character from a written description, optional reference image, style choice, pose, view, and dominant colors. The result can be downloaded or sent into the animation workflow.',
      sections: [
        ['Control the character brief', 'Describe silhouette, clothing, equipment, palette, pose, and viewing angle. An optional image reference can help communicate the visual identity or style.'],
        ['Choose a useful pixel size', 'Generate at a logical size appropriate for your project. Clear silhouettes and deliberate proportions generally animate more reliably than tiny, noisy details.'],
        ['Continue into animation', 'Use a generated character as the start reference for idle motion, movement, combat, transformations, or other custom actions, then export the result as frames.'],
      ],
      steps: ['Write a concise character description and select the view and pose.', 'Choose the pixel size, style, colors, and optional reference.', 'Generate the character, then download it or continue to animation.'],
      faqs: [['Can I use a reference image?', 'Yes. Character generation accepts an optional image reference in addition to the text description.'], ['Can generated characters be animated?', 'Yes. Send the result to Animation and use it as the start image for a V1 preset or V2 custom action.'], ['Can I use the result in a commercial game?', 'Generated results may be used in games and commercial projects subject to the Rika AI Terms of Use.']],
      cta: 'Create a pixel character', ctaPath: 'create/character',
    },
    {
      segment: 'pixel-art-map-generator', type: 'product',
      title: 'AI Pixel Art Map Generator – Rika AI',
      description: 'Generate pixel-art maps and game environments from a controllable structure layout and optional style reference.',
      eyebrow: 'MAP GENERATOR', heading: 'Generate pixel-art maps from a structure you control',
      intro: 'Rika AI separates map structure from appearance. Provide a layout by uploading a structure image or drawing one in the grid editor, then describe the environment and optionally add a style reference.',
      sections: [
        ['Structure-first generation', 'A structure reference establishes the large regions and composition before visual generation. This makes the result more useful for level concepts than an unconstrained text-only image.'],
        ['Built-in grid editor', 'Sketch the layout directly in the browser when you do not already have a structure image. Mark major paths, walls, rooms, terrain, or other spatial regions.'],
        ['Style and scene controls', 'Describe the setting, add an optional style reference, choose a pixel-art treatment, select the background mode, and guide the dominant colors.'],
      ],
      steps: ['Upload a structure reference or draw the layout in the grid editor.', 'Describe the environment and choose style, background, and color controls.', 'Generate the map and open it in Player for inspection or pixel editing.'],
      faqs: [['Do I need a structure image?', 'Yes. Map generation needs either an uploaded structure reference or a layout created with the built-in grid editor.'], ['Can I supply a separate style reference?', 'Yes. One optional style reference can be used alongside the structure layout.'], ['Can I edit the generated map?', 'Yes. Generated single images can be opened in Player for pixel-level inspection and editing.']],
      cta: 'Create a pixel map', ctaPath: 'create/map',
    },
    {
      segment: 'guides/how-to-animate-pixel-art', type: 'guide',
      title: 'How to Animate Pixel Art with AI – Rika AI Guide',
      description: 'A practical guide to preparing pixel-art references, describing motion, reviewing frames, and exporting an AI-generated sprite sheet.',
      eyebrow: 'PRACTICAL GUIDE', heading: 'How to turn a pixel-art image into an animation',
      intro: 'A strong pixel animation begins before generation. A readable source sprite, an action described in sequence, and careful frame review matter more than adding decorative words to the prompt.',
      sections: [
        ['Prepare a readable source', 'Use a supported logical resolution and keep the full moving subject visible. A simple solid or transparent background, clear silhouette, and unambiguous weapon or prop shape make motion easier to preserve.'],
        ['Describe one continuous action', 'Write the order of movement: preparation, main action, follow-through, and recovery when needed. Mention which hand or foot moves, where weight shifts, and how an important prop moves.'],
        ['Use reference poses deliberately', 'A start image is enough for open-ended movement. Add an end image when the final pose matters. For a complicated path, a middle image can show a key pose between beginning and end.'],
        ['Review as animation, not isolated art', 'Play the result at the intended speed, then inspect individual frames for silhouette breaks, unwanted holds, edge flicker, or prop identity changes before export.'],
      ],
      steps: ['Choose a clean reference at 32×32, 64×64, 128×128, or 256×256.', 'Write the motion as a short ordered sequence and select a suitable frame count.', 'Generate, preview at the target FPS, clean up frames, and export the final sprite sheet.'],
      faqs: [['Should a prompt describe every frame?', 'No. Describe meaningful action stages and physical relationships. Overloading a short animation with too many events can reduce clarity.'], ['When should I add an end reference?', 'Use one when a precise final pose, loop closure, or transformation destination is important.'], ['Why inspect the result frame by frame?', 'A sequence can look acceptable in motion while still containing duplicate, inconsistent, or hard-to-read frames that matter in a game.']],
      cta: 'Start animating', ctaPath: 'create/animation',
    },
    {
      segment: 'guides/pixel-art-animation-prompts', type: 'guide',
      title: 'Pixel Art Animation Prompt Guide – Rika AI',
      description: 'Learn how to write clear prompts for pixel-art character motion, attacks, loops, transformations, and prop interactions.',
      eyebrow: 'PROMPT GUIDE', heading: 'Write prompts that describe motion clearly',
      intro: 'The most useful animation prompt explains what moves, in what order, and how the subject interacts with the ground, a weapon, or another object. Style constraints should support the action instead of replacing it.',
      sections: [
        ['Lead with view and subject', 'Identify the intended view and visible subject: for example, a strict 2D side-view knight facing right with a long spear. Include identity-defining props when they matter to the animation.'],
        ['Use action stages', 'For a multi-step move, describe anticipation, execution, follow-through, and recovery. Timed segments can help a longer animation, but each segment should advance the action.'],
        ['Describe physical movement', 'Specify planted feet, steps, jumps, body lean, hand placement, weapon path, and momentum where relevant. This gives the model actionable spatial information.'],
        ['Keep effects intentional', 'Request trails, sparks, smoke, magic, or impact effects only when you want them. Simple solid-color effects read more clearly in small sprites than translucent gradients.'],
      ],
      steps: ['State the view, subject, facing direction, and important prop.', 'Describe the action in chronological stages using concrete body and object movement.', 'Finish with only the style and camera constraints needed for a readable pixel animation.'],
      faqs: [['Is a longer prompt always better?', 'No. A longer prompt helps only when it adds useful motion, timing, or identity information. Repetition and conflicting instructions can make the result worse.'], ['Should I request effects in every attack?', 'No. Include effects only when they are part of the intended action, and describe their color, shape, and timing concisely.'], ['How do I reduce frozen poses?', 'Describe transitions as continuous movement, avoid asking the character to hold multiple poses, and allow enough duration for the action stages.']],
      cta: 'Try your prompt', ctaPath: 'create/animation',
    },
  ],
};

pages.zh = [
  {
    segment: 'pixel-art-animation-generator', type: 'product', title: 'AI 像素动画生成器｜Rika AI', description: '上传一至三张像素画参考图，生成角色或物体动画，逐帧编辑并导出清晰的 PNG 序列帧或 GIF。',
    eyebrow: '像素动画生成', heading: '把静态像素画变成可用的游戏动画', intro: 'Rika AI 是面向序列帧工作流的 AI 像素动画生成器。上传起始图并描述动作，即可生成动画序列；之后可直接在浏览器中检查、清理并导出。',
    sections: [['参考图引导动作', '动画从你自己的像素图出发，而不是重新生成无关角色。一张图适合开放动作；两张图可确定首尾状态；三张图还可加入关键的中间姿态。'], ['两种动画工作流', 'V1 适合常见游戏动作的快速预设。V2 面向自定义和多阶段动作，支持输出 16、20、24 或 32 帧，并可把简短描述扩写成带时序的动作计划。'], ['面向像素画的输出', '生成帧会采样到所选逻辑像素网格，并限制色盘以提高可读性。Player 支持检查、排序、排除与逐像素编辑。']],
    steps: ['上传 32×32、64×64、128×128 或 256×256 的像素图。', '按发生顺序描述动作，并选择输出帧数。', '生成后在 Player 逐帧检查，再导出 PNG 序列帧或 GIF。'],
    faqs: [['可以让自己的像素画动起来吗？', '可以。动画生成必须有一张上传的起始像素图，也可以补充中间图和结尾图。'], ['V2 可以生成哪些动作？', 'V2 适合攻击、变身、交互、连续移动等自定义或多阶段动画。'], ['生成后可以修帧吗？', '可以。Player 支持选帧、排序、像素编辑、去背景、调整播放速度以及导出序列帧和 GIF。']], cta: '开始生成像素动画', ctaPath: 'create/animation',
  },
  {
    segment: 'sprite-sheet-generator', type: 'product', title: 'AI 像素序列帧生成器｜Rika AI', description: '从像素画参考图生成动作帧，完成检查与编辑后，导出排列整齐的 PNG spritesheet 序列帧。',
    eyebrow: '序列帧生成器', heading: '从角色动作生成整齐的像素序列帧', intro: '从像素画参考图生成动画，挑选真正有用的帧，再导出为一张透明或纯色背景的 PNG spritesheet。Rika AI 把生成、检查和清理放在同一套流程中。',
    sections: [['从参考图到动作帧', '描述待机、移动、攻击、变身或物体交互。Rika AI 生成连续动作，并把所选时刻转换成统一的帧序列。'], ['导出前逐帧检查', 'Player 可调 FPS、逐帧预览、排序、排除、修像素、整理颜色与去除背景。最终序列由你决定。'], ['可预期的排列方式', '设置列数后，所选帧会按行排列导出。每个单元格保留设定的逻辑像素尺寸，也支持非正方形内容。']],
    steps: ['使用像素画参考图生成动画。', '检查序列并删除或修复不需要的帧。', '设置列数和背景方式，导出 PNG 序列帧。'],
    faqs: [['什么是 spritesheet？', 'Spritesheet 是把多个动画帧排列在一张网格图片中的素材格式，适合游戏和交互项目读取。'], ['可以导出非正方形角色吗？', '可以。动画和 Player 支持非正方形可见内容，并在导出时保留目标帧尺寸。'], ['导出会额外扣积分吗？', '不会。在 Player 编辑和导出现有结果不额外消耗生成积分。']], cta: '生成像素序列帧', ctaPath: 'create/animation',
  },
  {
    segment: 'pixel-art-character-generator', type: 'product', title: 'AI 像素角色生成器｜Rika AI', description: '通过文字和参考图生成像素游戏角色，并可直接将结果作为 Rika AI 动画生成的输入。',
    eyebrow: '角色生成器', heading: '设计可以继续制作动画的像素角色', intro: '通过文字描述、可选参考图、画风、姿态、视角和主色生成像素角色。结果可直接下载，也可继续进入动画生成流程。',
    sections: [['控制角色设定', '描述剪影、服装、装备、色盘、姿态和视角。可选参考图能进一步传达角色身份或目标风格。'], ['选择合适像素尺寸', '根据项目选择逻辑像素大小。清楚的剪影和明确比例通常比过度细碎的纹理更容易制作稳定动画。'], ['继续生成动画', '把生成角色作为起始参考图，制作待机、移动、战斗、变身或其他自定义动作，最后导出序列帧。']],
    steps: ['填写精简的角色描述，选择视角和姿态。', '设置像素尺寸、画风、颜色和可选参考图。', '生成角色后下载，或继续前往动画生成。'],
    faqs: [['可以上传参考图吗？', '可以。除文字描述外，角色生成还支持一张可选的图像参考。'], ['生成的角色可以直接做动画吗？', '可以。将结果发送到动画页面，作为 V1 预设或 V2 自定义动作的起始图。'], ['结果可以用于商业游戏吗？', '生成结果可用于游戏及商业项目，具体使用需遵守 Rika AI 使用条款。']], cta: '生成像素角色', ctaPath: 'create/character',
  },
  {
    segment: 'pixel-art-map-generator', type: 'product', title: 'AI 像素地图生成器｜Rika AI', description: '使用可控结构图与可选风格参考，生成像素地图和游戏环境。',
    eyebrow: '地图生成器', heading: '按照你控制的结构生成像素地图', intro: 'Rika AI 将地图结构与外观分开控制。上传结构图或在网格编辑器中绘制布局，再描述环境，并可选添加风格参考图。',
    sections: [['先确定结构', '结构参考会在生成外观之前确定大区域和构图，因此比完全不受约束的纯文字图片更适合关卡概念设计。'], ['内置网格编辑器', '没有现成结构图时，可直接在浏览器里绘制布局，标记主要道路、墙体、房间、地形或其他空间区域。'], ['场景和风格控制', '描述环境，添加可选风格参考，选择像素画处理方式、背景模式和主导颜色。']],
    steps: ['上传结构参考，或在网格编辑器中绘制布局。', '描述环境，并设置画风、背景和颜色。', '生成地图，在 Player 中检查或进行像素编辑。'],
    faqs: [['必须提供结构图吗？', '是。地图生成需要上传结构参考，或使用内置网格编辑器制作布局。'], ['结构和风格可以使用不同参考图吗？', '可以。除结构图外，还能再添加一张可选的风格参考图。'], ['生成地图后可以编辑吗？', '可以。生成的单张图片能在 Player 中逐像素检查与编辑。']], cta: '生成像素地图', ctaPath: 'create/map',
  },
  {
    segment: 'guides/how-to-animate-pixel-art', type: 'guide', title: '如何用 AI 制作像素动画｜Rika AI 指南', description: '了解如何准备像素画参考图、描述动作、检查生成帧，并导出 AI 像素动画序列帧。',
    eyebrow: '实用指南', heading: '如何把一张像素图做成动画', intro: '优秀的像素动画在生成前就已经开始。清晰的源图、按顺序描述的动作和逐帧检查，比堆砌装饰性关键词更重要。',
    sections: [['准备可读的源图', '使用支持的逻辑分辨率，并让运动主体完整可见。简单的纯色或透明背景、清楚的剪影，以及明确的武器和道具形状，更有利于维持动作一致性。'], ['描述一个连续动作', '按需要写出准备、主要动作、随动和恢复。说明哪只手脚移动、重心怎样变化，以及重要道具如何运动。除非确实需要，不要加入无关特效。'], ['合理使用参考姿态', '开放动作只需起始图。结尾姿势重要时添加结尾图；动作路径复杂时，可以用中间图给出首尾之间的关键姿态。'], ['按动画而非单图检查', '先以目标速度播放，再逐帧检查剪影断裂、无意义停顿、边缘抖动或道具身份变化。导出前可以排除、排序或修复帧。']],
    steps: ['选择 32×32、64×64、128×128 或 256×256 的清晰参考图。', '将动作写成简短的有序过程，并选择适合的帧数。', '生成后按目标 FPS 预览、清理帧，再导出最终序列帧。'],
    faqs: [['需要描述每一帧吗？', '不需要。描述有意义的动作阶段和物理关系即可。短动画塞入太多事件反而会降低清晰度。'], ['什么时候应该添加结尾图？', '当最终姿态、循环闭合或变身后的目标形象很重要时，建议使用结尾参考。'], ['为什么还要逐帧检查？', '动画播放时看似正常，也可能包含重复、不一致或难以辨认的帧，而这些问题会影响游戏中的实际使用。']], cta: '开始制作动画', ctaPath: 'create/animation',
  },
  {
    segment: 'guides/pixel-art-animation-prompts', type: 'guide', title: '像素动画提示词写法｜Rika AI 指南', description: '学习如何为像素角色动作、攻击、循环、变身和道具交互编写清晰的动画提示词。',
    eyebrow: '提示词指南', heading: '写出模型能理解的连续动作', intro: '有效的动画提示词要说明什么在动、按什么顺序动，以及角色如何与地面、武器或物体发生关系。画风约束应该辅助动作，而不是代替动作。',
    sections: [['先写视角与主体', '明确目标视角和可见主体，例如“严格横板视角，手持长矛并面向右侧的骑士”。只有在道具影响动画时，才需要强调其身份。'], ['按动作阶段组织', '多阶段动作可以依次描述蓄力、执行、随动和恢复。较长动画可以划分时间段，但每一段都应推进动作，而不是让角色保持静止姿势。'], ['描述具体身体运动', '按需要说明脚是否站稳或迈步、身体如何倾斜、手放在哪里、武器经过什么路径，以及运动的力量和惯性。'], ['只加入真正需要的特效', '只有确实需要时才要求拖尾、火花、烟雾、魔法或冲击效果。对小尺寸像素角色而言，简单纯色效果通常比半透明渐变更清楚。']],
    steps: ['写清视角、主体、朝向和重要道具。', '使用具体的身体和物体运动，按时间顺序描述动作阶段。', '最后只补充保证画面可读所需的像素风格与镜头约束。'],
    faqs: [['提示词越长越好吗？', '不是。只有补充有效的动作、时序或身份信息时，长提示词才有帮助；重复或冲突要求可能让结果变差。'], ['每次攻击都应该写特效吗？', '不应该。只有目标动作需要特效时才加入，并精简说明颜色、形状和出现时机。'], ['怎样减少动作摆好姿势后停住？', '把阶段之间描述成连续移动，避免要求角色保持多个姿势，并为动作阶段数量留出足够时长。']], cta: '测试你的提示词', ctaPath: 'create/animation',
  },
];

const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const styles = `:root{color-scheme:dark;--bg:#0d0221;--panel:#16052d;--line:#5a2d9c;--yellow:#f7d51d;--cyan:#69d6e7;--text:#f8f5ff;--muted:#b5a9c8}*{box-sizing:border-box}html{background:var(--bg);scroll-behavior:smooth}body{margin:0;color:var(--text);background:radial-gradient(circle at 80% 0,#25104b 0,transparent 34rem),var(--bg);font-family:Inter,"Noto Sans SC",system-ui,sans-serif;line-height:1.75}a{color:inherit}.wrap{width:min(1080px,calc(100% - 36px));margin:auto}.pixel{font-family:"Courier New",monospace;letter-spacing:.06em;text-transform:uppercase}.top{border-bottom:3px solid var(--line);background:#0d0221ee}.nav{min-height:68px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{font-weight:900;color:var(--yellow);text-decoration:none;font-size:1.1rem}.navlinks{display:flex;flex-wrap:wrap;gap:18px}.navlinks a,.lang{color:var(--muted);text-decoration:none;font-size:.86rem}.navlinks a:hover,.lang:hover{color:white}.hero{padding:90px 0 64px}.eyebrow{color:var(--yellow);font-size:.78rem;font-weight:800}.hero h1{font-size:clamp(2.2rem,6vw,4.8rem);line-height:1.04;max-width:900px;margin:.5rem 0 1.5rem;letter-spacing:-.04em}.lead{font-size:clamp(1.05rem,2vw,1.25rem);color:#d8cfe5;max-width:820px}.actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:30px}.button{display:inline-block;border:3px solid var(--yellow);box-shadow:5px 5px 0 #6b4d00;padding:11px 18px;color:var(--yellow);text-decoration:none;font-weight:900;font-size:.82rem}.button.secondary{border-color:var(--line);box-shadow:5px 5px 0 #260f45;color:white}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{background:linear-gradient(145deg,#190832,#110420);border:2px solid #58318a;padding:28px;box-shadow:7px 7px 0 #080011}.card h2{font-size:1.16rem;line-height:1.35;margin:0 0 12px}.card p{margin:0;color:var(--muted)}section{padding:58px 0}.section-title{font-size:1.65rem;margin:0 0 24px;color:var(--yellow)}.steps{counter-reset:steps;display:grid;gap:14px}.step{counter-increment:steps;border-left:4px solid var(--cyan);padding:12px 18px;background:#ffffff08}.step:before{content:counter(steps,decimal-leading-zero);color:var(--cyan);font-weight:900;margin-right:14px}.faq{display:grid;gap:15px}.faq details{border:2px solid #462675;background:#140629;padding:16px 20px}.faq summary{cursor:pointer;font-weight:800}.faq p{color:var(--muted)}.related{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.related a{border:2px solid #402064;padding:16px;text-decoration:none;color:#dcd2e9}.related a:hover{border-color:var(--yellow);color:white}.footer{margin-top:48px;border-top:3px solid var(--line);padding:35px 0 48px;color:var(--muted);font-size:.86rem}.footer-row{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}.footer a{color:#dcd2e9}@media(max-width:760px){.grid{grid-template-columns:1fr}.related{grid-template-columns:1fr}.navlinks{display:none}.hero{padding-top:60px}.hero h1{font-size:2.45rem}}`;

const relatedLinks = (lang, current) => {
  const labels = lang === 'zh'
    ? [['pixel-art-animation-generator', 'AI 像素动画生成器'], ['sprite-sheet-generator', '像素序列帧生成器'], ['pixel-art-character-generator', '像素角色生成器'], ['pixel-art-map-generator', '像素地图生成器'], ['guides/how-to-animate-pixel-art', '如何制作像素动画'], ['guides/pixel-art-animation-prompts', '像素动画提示词写法']]
    : [['pixel-art-animation-generator', 'AI Pixel Art Animation Generator'], ['sprite-sheet-generator', 'Sprite Sheet Generator'], ['pixel-art-character-generator', 'Pixel Art Character Generator'], ['pixel-art-map-generator', 'Pixel Art Map Generator'], ['guides/how-to-animate-pixel-art', 'How to Animate Pixel Art'], ['guides/pixel-art-animation-prompts', 'Animation Prompt Guide']];
  return labels.filter(([segment]) => segment !== current).slice(0, 4);
};

const render = (lang, page) => {
  const isZh = lang === 'zh'; const t = shared[lang]; const canonical = routeUrl(lang, page.segment); const alternate = isZh ? 'en' : 'zh';
  const breadcrumbs = [{ name: t.home, url: routeUrl(lang) }, ...(page.type === 'guide' ? [{ name: isZh ? '指南' : 'Guides', url: routeUrl(lang, 'docs') }] : []), { name: page.heading, url: canonical }];
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': page.type === 'guide' ? 'Article' : 'SoftwareApplication', name: page.title, headline: page.heading, description: page.description, url: canonical, inLanguage: isZh ? 'zh-CN' : 'en', publisher: { '@type': 'Organization', name: 'Rika AI', url: siteUrl }, ...(page.type === 'product' ? { applicationCategory: 'MultimediaApplication', operatingSystem: 'Web' } : {}) },
    { '@type': 'BreadcrumbList', itemListElement: breadcrumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })) },
    { '@type': 'FAQPage', mainEntity: page.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ] };
  const cards = page.sections.map(([title, text]) => `<article class="card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></article>`).join('');
  const steps = page.steps.map((step) => `<div class="step">${escapeHtml(step)}</div>`).join('');
  const faqs = page.faqs.map(([q, a]) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('');
  const related = relatedLinks(lang, page.segment).map(([segment, label]) => `<a href="${routeUrl(lang, segment)}">${escapeHtml(label)} →</a>`).join('');
  return `<!doctype html><html lang="${isZh ? 'zh-CN' : 'en'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(page.title)}</title><meta name="description" content="${escapeHtml(page.description)}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${routeUrl('en', page.segment)}"><link rel="alternate" hreflang="zh-CN" href="${routeUrl('zh', page.segment)}"><link rel="alternate" hreflang="x-default" href="${routeUrl('en', page.segment)}"><meta property="og:type" content="${page.type === 'guide' ? 'article' : 'website'}"><meta property="og:site_name" content="Rika AI"><meta property="og:title" content="${escapeHtml(page.title)}"><meta property="og:description" content="${escapeHtml(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://cdn.rika-ai.com/assets/frontpage/icons/rika2.png"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeHtml(page.title)}"><meta name="twitter:description" content="${escapeHtml(page.description)}"><meta name="twitter:image" content="https://cdn.rika-ai.com/assets/frontpage/icons/rika2.png"><link rel="icon" type="image/png" href="https://cdn.rika-ai.com/assets/frontpage/icons/rika2.png"><style>${styles}</style><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body><header class="top"><nav class="wrap nav" aria-label="${isZh ? '主导航' : 'Main navigation'}"><a class="brand pixel" href="${routeUrl(lang)}">RIKA AI</a><div class="navlinks"><a href="${routeUrl(lang, 'pixel-art-animation-generator')}">${t.nav[0]}</a><a href="${routeUrl(lang, 'sprite-sheet-generator')}">${t.nav[1]}</a><a href="${routeUrl(lang, 'docs')}">${t.nav[2]}</a><a href="${routeUrl(lang, 'api')}">${t.nav[3]}</a></div><a class="lang" href="${routeUrl(alternate, page.segment)}">${t.language}</a></nav></header><main><div class="wrap hero"><div class="eyebrow pixel">${escapeHtml(page.eyebrow)}</div><h1>${escapeHtml(page.heading)}</h1><p class="lead">${escapeHtml(page.intro)}</p><div class="actions"><a class="button pixel" href="${routeUrl(lang, page.ctaPath)}">${escapeHtml(page.cta)}</a><a class="button secondary pixel" href="${routeUrl(lang, 'docs')}">${t.docs}</a></div></div><section><div class="wrap grid">${cards}</div></section><section><div class="wrap"><h2 class="section-title pixel">${t.workflow}</h2><div class="steps">${steps}</div></div></section><section><div class="wrap"><h2 class="section-title pixel">${t.faq}</h2><div class="faq">${faqs}</div></div></section><section><div class="wrap"><h2 class="section-title pixel">${t.more}</h2><div class="related">${related}</div></div></section></main><footer class="footer"><div class="wrap footer-row"><span>© 2025 Rika AI</span><span><a href="${routeUrl(lang)}">${t.home}</a> · <a href="${routeUrl(lang, 'docs')}">${t.nav[2]}</a> · <a href="${routeUrl(lang, 'api')}">API</a></span></div></footer></body></html>`;
};

for (const lang of ['en', 'zh']) {
  for (const page of pages[lang]) {
    const outputDir = path.join(distDir, lang, ...page.segment.split('/'));
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, 'index.html'), render(lang, page), 'utf8');
  }
}

const baseSegments = ['', 'docs', 'api'];
const marketingSegments = pages.en.map((page) => page.segment);
const segments = [...baseSegments, ...marketingSegments];
const urls = segments.flatMap((segment) => ['en', 'zh'].map((lang) => routeUrl(lang, segment)));
const entries = segments.flatMap((segment) => ['en', 'zh'].map((lang) => `  <url>\n    <loc>${routeUrl(lang, segment)}</loc>\n    <xhtml:link rel="alternate" hreflang="en" href="${routeUrl('en', segment)}" />\n    <xhtml:link rel="alternate" hreflang="zh-CN" href="${routeUrl('zh', segment)}" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${routeUrl('en', segment)}" />\n  </url>`));
await writeFile(path.join(distDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`, 'utf8');
await writeFile(path.join(distDir, 'sitemap.txt'), `${urls.join('\n')}\n`, 'utf8');
await writeFile(path.join(distDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\nSitemap: ${siteUrl}/sitemap.txt\n`, 'utf8');
console.log(`Generated ${pages.en.length * 2} SEO content pages and ${urls.length} indexable URLs for ${siteUrl}`);
