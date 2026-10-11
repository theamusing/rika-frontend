export type AppLanguage = 'en' | 'zh';

export type AppTab =
  | 'intro'
  | 'character'
  | 'item'
  | 'generate'
  | 'map'
  | 'player'
  | 'history'
  | 'api'
  | 'docs';

const TAB_SEGMENTS: Record<AppTab, string> = {
  intro: '',
  character: 'create/character',
  item: 'create/item',
  generate: 'create/animation',
  map: 'create/map',
  player: 'player',
  history: 'dashboard',
  api: 'api',
  docs: 'docs',
};

const SEGMENT_TABS = new Map(
  Object.entries(TAB_SEGMENTS).map(([tab, segment]) => [segment, tab as AppTab]),
);

const INDEXABLE_TABS = new Set<AppTab>(['intro', 'docs', 'api']);

const SEO_COPY: Record<AppLanguage, Record<AppTab, { title: string; description: string }>> = {
  en: {
    intro: {
      title: 'Rika AI – AI Pixel Art Animation Generator',
      description: 'Create crisp pixel art characters, items, maps, and sprite animations with Rika AI. Generate longer and more complex animations from your own pixel art.',
    },
    docs: {
      title: 'Rika AI Documentation – Pixel Art Generation Guide',
      description: 'Learn how to create pixel art characters, items, maps, and sprite animations with Rika AI, including animation models, references, padding, playback, and exports.',
    },
    api: {
      title: 'Rika AI API – Pixel Art and Animation Generation',
      description: 'Integrate Rika AI pixel art character, item, map, and sprite animation generation into your application with the Rika AI API.',
    },
    character: { title: 'Create Pixel Art Characters – Rika AI', description: 'Generate pixel art characters with Rika AI.' },
    item: { title: 'Create Pixel Art Items – Rika AI', description: 'Generate pixel art items and props with Rika AI.' },
    generate: { title: 'Create Pixel Art Animations – Rika AI', description: 'Turn pixel art references into sprite animations with Rika AI.' },
    map: { title: 'Create Pixel Art Maps – Rika AI', description: 'Generate pixel art maps and environments with Rika AI.' },
    player: { title: 'Animation Player – Rika AI', description: 'Preview and edit your Rika AI generation.' },
    history: { title: 'Dashboard – Rika AI', description: 'Manage your Rika AI generations.' },
  },
  zh: {
    intro: {
      title: 'Rika AI 像素动画生成器｜AI 像素画与序列帧',
      description: '使用 Rika AI 创作清晰的像素角色、道具、地图和序列帧动画。上传像素画，即可生成更长、更复杂的像素动画。',
    },
    docs: {
      title: 'Rika AI 使用文档｜像素画与动画生成指南',
      description: '了解如何使用 Rika AI 生成像素角色、道具、地图和序列帧动画，包括动画模型、参考图、扩展画布、播放与导出。',
    },
    api: {
      title: 'Rika AI API｜像素画与动画生成接口',
      description: '通过 Rika AI API 将像素角色、道具、地图和序列帧动画生成能力接入你的应用。',
    },
    character: { title: '生成像素角色｜Rika AI', description: '使用 Rika AI 生成像素画角色。' },
    item: { title: '生成像素道具｜Rika AI', description: '使用 Rika AI 生成像素画道具与物品。' },
    generate: { title: '生成像素动画｜Rika AI', description: '使用 Rika AI 将像素画参考图生成序列帧动画。' },
    map: { title: '生成像素地图｜Rika AI', description: '使用 Rika AI 生成像素画地图与场景。' },
    player: { title: '动画播放器｜Rika AI', description: '预览和编辑你的 Rika AI 生成结果。' },
    history: { title: '仪表盘｜Rika AI', description: '管理你的 Rika AI 生成记录。' },
  },
};

const normalizeBasePath = (path: string) => {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const preferredLanguage = (): AppLanguage => {
  const saved = window.localStorage.getItem('rika-ui-language');
  if (saved === 'en' || saved === 'zh') return saved;
  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export interface AppRouteState {
  lang: AppLanguage;
  tab: AppTab;
  basePath: string;
  hasLanguagePrefix: boolean;
}

export const readAppRoute = (pathname = window.location.pathname): AppRouteState => {
  const segments = pathname.split('/').filter(Boolean);
  const languageIndex = segments.findIndex((segment) => segment === 'en' || segment === 'zh');

  if (languageIndex >= 0) {
    const lang = segments[languageIndex] as AppLanguage;
    const routeSegment = segments.slice(languageIndex + 1).join('/');
    const tab = SEGMENT_TABS.get(routeSegment) ?? 'intro';
    const baseSegments = segments.slice(0, languageIndex);

    return {
      lang,
      tab,
      basePath: normalizeBasePath(baseSegments.length ? `/${baseSegments.join('/')}` : '/'),
      hasLanguagePrefix: true,
    };
  }

  const looksLikeFile = segments.at(-1)?.includes('.') ?? false;
  const baseSegments = looksLikeFile ? segments.slice(0, -1) : segments;

  return {
    lang: preferredLanguage(),
    tab: 'intro',
    basePath: normalizeBasePath(baseSegments.length ? `/${baseSegments.join('/')}` : '/'),
    hasLanguagePrefix: false,
  };
};

export const buildAppPath = (basePath: string, lang: AppLanguage, tab: AppTab) => {
  const routeSegment = TAB_SEGMENTS[tab];
  return `${normalizeBasePath(basePath)}${lang}/${routeSegment ? `${routeSegment}/` : ''}`;
};

export const writeAppRoute = (
  basePath: string,
  lang: AppLanguage,
  tab: AppTab,
  mode: 'push' | 'replace' = 'push',
) => {
  const nextUrl = `${buildAppPath(basePath, lang, tab)}${window.location.search}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) return;

  if (mode === 'replace') {
    window.history.replaceState({ tab, lang }, '', nextUrl);
  } else {
    window.history.pushState({ tab, lang }, '', nextUrl);
  }
};

const setMeta = (selector: string, attribute: string, value: string) => {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
};

const setAlternate = (hreflang: string, href: string) => {
  const element = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
  if (element) element.setAttribute('href', href);
};

export const applySeoMetadata = (basePath: string, lang: AppLanguage, tab: AppTab) => {
  const copy = SEO_COPY[lang][tab];
  const canonical = new URL(buildAppPath(basePath, lang, tab), window.location.origin).toString();
  const englishUrl = new URL(buildAppPath(basePath, 'en', tab), window.location.origin).toString();
  const chineseUrl = new URL(buildAppPath(basePath, 'zh', tab), window.location.origin).toString();
  const robots = INDEXABLE_TABS.has(tab) ? 'index, follow' : 'noindex, nofollow';

  document.title = copy.title;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  setMeta('meta[name="description"]', 'content', copy.description);
  setMeta('meta[name="robots"]', 'content', robots);
  setMeta('meta[property="og:title"]', 'content', copy.title);
  setMeta('meta[property="og:description"]', 'content', copy.description);
  setMeta('meta[property="og:url"]', 'content', canonical);
  setMeta('meta[property="og:locale"]', 'content', lang === 'zh' ? 'zh_CN' : 'en_US');
  setMeta('meta[name="twitter:title"]', 'content', copy.title);
  setMeta('meta[name="twitter:description"]', 'content', copy.description);
  setMeta('link[rel="canonical"]', 'href', canonical);
  setAlternate('en', englishUrl);
  setAlternate('zh-CN', chineseUrl);
  setAlternate('x-default', englishUrl);

  const structuredData = document.getElementById('seo-jsonld');
  if (structuredData) {
    structuredData.textContent = JSON.stringify(tab === 'intro' ? {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: 'Rika AI',
          description: copy.description,
          url: canonical,
          inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'Web',
        },
        { '@type': 'Organization', name: 'Rika AI', url: window.location.origin },
        { '@type': 'WebSite', name: 'Rika AI', url: window.location.origin, inLanguage: ['en', 'zh-CN'] },
      ],
    } : {
      '@context': 'https://schema.org',
      '@type': tab === 'docs' ? 'TechArticle' : tab === 'api' ? 'WebPage' : 'SoftwareApplication',
      name: copy.title,
      description: copy.description,
      url: canonical,
      inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
    });
  }
};

