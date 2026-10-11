import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const template = await readFile(path.join(distDir, 'index.html'), 'utf8');
const siteUrl = (process.env.VITE_SITE_URL || 'https://rika-ai.com').replace(/\/$/, '');

const routes = [
  { segment: '', indexable: true },
  { segment: 'docs', indexable: true },
  { segment: 'api', indexable: true },
  { segment: 'create/character', indexable: false },
  { segment: 'create/item', indexable: false },
  { segment: 'create/animation', indexable: false },
  { segment: 'create/map', indexable: false },
  { segment: 'player', indexable: false },
  { segment: 'dashboard', indexable: false },
];

const copy = {
  en: {
    '': {
      title: 'Rika AI – AI Pixel Art Animation Generator',
      description: 'Create crisp pixel art characters, items, maps, and sprite animations with Rika AI. Generate longer and more complex animations from your own pixel art.',
      heading: 'AI pixel art and sprite animation generator',
      body: 'Create pixel art characters, items, maps, and smooth sprite animations from references. Rika AI supports longer and more complex animation workflows with sprite sheet export.',
    },
    docs: {
      title: 'Rika AI Documentation – Pixel Art Generation Guide',
      description: 'Learn how to create pixel art characters, items, maps, and sprite animations with Rika AI, including animation models, references, padding, playback, and exports.',
      heading: 'Rika AI documentation',
      body: 'Guides for pixel art image generation, animation references, padding, loop playback, sprite sheets, dashboards, and API integration.',
    },
    api: {
      title: 'Rika AI API – Pixel Art and Animation Generation',
      description: 'Integrate Rika AI pixel art character, item, map, and sprite animation generation into your application with the Rika AI API.',
      heading: 'Rika AI generation API',
      body: 'Integrate pixel art character, item, map, and animation generation into games, creative tools, and production pipelines.',
    },
  },
  zh: {
    '': {
      title: 'Rika AI 像素动画生成器｜AI 像素画与序列帧',
      description: '使用 Rika AI 创作清晰的像素角色、道具、地图和序列帧动画。上传像素画，即可生成更长、更复杂的像素动画。',
      heading: 'AI 像素画与序列帧动画生成器',
      body: '生成像素角色、道具、地图和流畅的序列帧动画。Rika AI 支持参考图输入、复杂长动画和 spritesheet 序列帧导出。',
    },
    docs: {
      title: 'Rika AI 使用文档｜像素画与动画生成指南',
      description: '了解如何使用 Rika AI 生成像素角色、道具、地图和序列帧动画，包括动画模型、参考图、扩展画布、播放与导出。',
      heading: 'Rika AI 使用文档',
      body: '查看像素画生成、动画参考图、扩展画布、循环播放、序列帧导出、仪表盘和 API 接入指南。',
    },
    api: {
      title: 'Rika AI API｜像素画与动画生成接口',
      description: '通过 Rika AI API 将像素角色、道具、地图和序列帧动画生成能力接入你的应用。',
      heading: 'Rika AI 生成 API',
      body: '将像素角色、道具、地图和动画生成能力接入游戏、创作工具与自动化生产流程。',
    },
  },
};

const internalCopy = {
  en: { title: 'Rika AI Creative Workspace', description: 'Rika AI pixel art creative workspace.' },
  zh: { title: 'Rika AI 创作工作台', description: 'Rika AI 像素画创作工作台。' },
};

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const replaceTagAttribute = (html, id, attribute, value) => html.replace(
  new RegExp(`(<[^>]+id=["']${id}["'][^>]*\\s${attribute}=["'])[^"']*(["'])`, 'i'),
  `$1${escapeHtml(value)}$2`,
);

const routeUrl = (lang, segment = '') => `${siteUrl}/${lang}/${segment ? `${segment}/` : ''}`;

const renderPage = (lang, route) => {
  const publicCopy = copy[lang][route.segment];
  const pageCopy = publicCopy || internalCopy[lang];
  const canonical = routeUrl(lang, route.segment);
  const depth = 1 + (route.segment ? route.segment.split('/').length : 0);
  const assetPrefix = '../'.repeat(depth);
  const fallback = publicCopy
    ? `<main class="seo-fallback"><h1>${escapeHtml(publicCopy.heading)}</h1><p>${escapeHtml(publicCopy.body)}</p><p><a href="${assetPrefix}${lang}/docs/">${lang === 'zh' ? '阅读使用文档' : 'Read the documentation'}</a> · <a href="${assetPrefix}${lang}/api/">API</a></p></main>`
    : `<main class="seo-fallback"><h1>${escapeHtml(pageCopy.title)}</h1><p>${escapeHtml(pageCopy.description)}</p></main>`;

  let html = template
    .replace('<html lang="en">', `<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">`)
    .replaceAll('./assets/', `${assetPrefix}assets/`)
    .replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${fallback}</div>`)
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(pageCopy.title)}</title>`);

  html = replaceTagAttribute(html, 'seo-description', 'content', pageCopy.description);
  html = replaceTagAttribute(html, 'seo-robots', 'content', route.indexable ? 'index, follow' : 'noindex, nofollow');
  html = replaceTagAttribute(html, 'seo-canonical', 'href', canonical);
  html = replaceTagAttribute(html, 'seo-hreflang-en', 'href', routeUrl('en', route.segment));
  html = replaceTagAttribute(html, 'seo-hreflang-zh', 'href', routeUrl('zh', route.segment));
  html = replaceTagAttribute(html, 'seo-hreflang-default', 'href', routeUrl('en', route.segment));
  html = replaceTagAttribute(html, 'seo-og-title', 'content', pageCopy.title);
  html = replaceTagAttribute(html, 'seo-og-description', 'content', pageCopy.description);
  html = replaceTagAttribute(html, 'seo-og-url', 'content', canonical);
  html = replaceTagAttribute(html, 'seo-og-locale', 'content', lang === 'zh' ? 'zh_CN' : 'en_US');
  html = replaceTagAttribute(html, 'seo-twitter-title', 'content', pageCopy.title);
  html = replaceTagAttribute(html, 'seo-twitter-description', 'content', pageCopy.description);
  html = html.replace(
    /<script id="seo-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="seo-jsonld" type="application/ld+json">${JSON.stringify(route.segment === '' ? {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: 'Rika AI',
          description: pageCopy.description,
          url: canonical,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'Web',
          inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
        },
        { '@type': 'Organization', name: 'Rika AI', url: siteUrl },
        { '@type': 'WebSite', name: 'Rika AI', url: siteUrl, inLanguage: ['en', 'zh-CN'] },
      ],
    } : {
      '@context': 'https://schema.org',
      '@type': route.segment === 'docs' ? 'TechArticle' : route.segment === 'api' ? 'WebPage' : 'SoftwareApplication',
      name: pageCopy.title,
      description: pageCopy.description,
      url: canonical,
      inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
    })}</script>`,
  );
  return html;
};

for (const lang of ['en', 'zh']) {
  for (const route of routes) {
    const outputDir = path.join(distDir, lang, ...route.segment.split('/').filter(Boolean));
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, 'index.html'), renderPage(lang, route), 'utf8');
  }
}

const sitemapRoutes = routes.filter((route) => route.indexable);
const sitemapEntries = sitemapRoutes.flatMap((route) => ['en', 'zh'].map((lang) => {
  const loc = routeUrl(lang, route.segment);
  return `  <url>\n    <loc>${loc}</loc>\n    <xhtml:link rel="alternate" hreflang="en" href="${routeUrl('en', route.segment)}" />\n    <xhtml:link rel="alternate" hreflang="zh-CN" href="${routeUrl('zh', route.segment)}" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${routeUrl('en', route.segment)}" />\n  </url>`;
}));

await writeFile(path.join(distDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapEntries.join('\n')}\n</urlset>\n`, 'utf8');
await writeFile(path.join(distDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');

console.log(`Generated ${routes.length * 2} localized route entries and sitemap.xml for ${siteUrl}`);

