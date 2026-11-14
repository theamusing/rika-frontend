import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart } from 'lucide-react';
import AnimatedSpritePreview from '../components/AnimatedSpritePreview.tsx';
import AspectRatioPreview from '../components/AspectRatioPreview.tsx';
import ParameterPanel from '../components/ParameterPanel.tsx';
import { PixelButton, PixelCard } from '../components/PixelComponents.tsx';
import { apiService } from '../services/apiService.ts';
import { GalleryItem, GalleryJobType, GalleryMethod } from '../types.ts';

interface Props {
  lang: 'en' | 'zh';
  isLoggedIn: boolean;
  onLoginRequest: () => void;
}

const methods: { value: GalleryMethod; en: string; zh: string }[] = [
  { value: 'week', en: 'WEEKLY', zh: '周排行' },
  { value: 'month', en: 'MONTHLY', zh: '月排行' },
  { value: 'latest', en: 'LATEST', zh: '最新' },
  { value: 'random', en: 'RANDOM', zh: '随机' },
];
const categories: { value: GalleryJobType | ''; en: string; zh: string }[] = [
  { value: '', en: 'ALL', zh: '全部' },
  { value: 'character', en: 'CHARACTERS', zh: '角色' },
  { value: 'item', en: 'ITEMS', zh: '道具' },
  { value: 'map', en: 'MAPS', zh: '地图' },
  { value: 'animation', en: 'ANIMATIONS', zh: '动画' },
];

const frameRatio = (item: GalleryItem) => {
  const size = item.pixel_size;
  return size && typeof size === 'object' && size.y > 0 ? size.x / size.y : 1;
};

const OutputPreview: React.FC<{ item: GalleryItem; lang: 'en' | 'zh'; maxHeight?: number; play?: boolean }> =
  ({ item, lang, maxHeight = 256, play = true }) => {
    const animation = item.job_type === 'animation';
    return <AnimatedSpritePreview lang={lang} alt={lang === 'zh' ? '画廊作品' : 'Gallery work'}
      src={animation ? undefined : item.image_url}
      animationSrc={animation ? item.image_url : undefined}
      frameCount={animation ? item.frame_count : 0}
      columns={item.columns}
      fallbackRatio={frameRatio(item)} maxHeight={maxHeight} play={play}
      className="pixel-border border-[#5a2d9c] bg-black/40" />;
  };

const GalleryPage: React.FC<Props> = ({ lang, isLoggedIn, onLoginRequest }) => {
  const isZh = lang === 'zh';
  const [method, setMethod] = useState<GalleryMethod>('week');
  const [category, setCategory] = useState<GalleryJobType | ''>('');
  const [refresh, setRefresh] = useState(0);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likesReady, setLikesReady] = useState(false);
  const [likePending, setLikePending] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [largePreview, setLargePreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSelected(null);
    setLargePreview(false);
    setLikesReady(false);
    apiService.getGallery(method, category ? 50 : 20, category || undefined).then(async result => {
      if (!active) return;
      const next = (result.items || []).filter(item => !category || item.job_type === category).slice(0, 20);
      setItems(next);
      setLoading(false);
      if (isLoggedIn && next.length) {
        try {
          const ids = await apiService.getGalleryLikedIds(next.map(item => item.post_id));
          if (active) { setLikedIds(new Set(ids)); setLikesReady(true); }
        } catch (cause) {
          console.warn('Could not load gallery likes', cause);
          if (active) {
            setLikedIds(new Set());
            setError(isZh ? '暂时无法读取点赞状态，请刷新后重试。' : 'Could not load your likes. Refresh to retry.');
          }
        }
      } else { setLikedIds(new Set()); setLikesReady(true); }
    }).catch(cause => {
      if (!active) return;
      setLoading(false);
      setError(cause instanceof Error ? cause.message : 'Gallery could not be loaded');
    });
    return () => { active = false; };
  }, [method, category, refresh, isLoggedIn, isZh]);

  const toggleLike = async (event: React.MouseEvent, item: GalleryItem) => {
    event.stopPropagation();
    if (!isLoggedIn) { onLoginRequest(); return; }
    if (!likesReady) return;
    if (likePending.has(item.post_id)) return;
    const nextLiked = !likedIds.has(item.post_id);
    setLikePending(previous => new Set(previous).add(item.post_id));
    setLikedIds(previous => {
      const next = new Set(previous);
      nextLiked ? next.add(item.post_id) : next.delete(item.post_id);
      return next;
    });
    const nextCount = (count: number) => Math.max(0, count + (nextLiked ? 1 : -1));
    setItems(previous => previous.map(entry => entry.post_id === item.post_id
      ? { ...entry, like_count: nextCount(entry.like_count) } : entry));
    setSelected(previous => previous?.post_id === item.post_id
      ? { ...previous, like_count: nextCount(previous.like_count) } : previous);
    try {
      await apiService.setGalleryLike(item.post_id, nextLiked);
    } catch (cause) {
      setLikedIds(previous => {
        const next = new Set(previous);
        nextLiked ? next.delete(item.post_id) : next.add(item.post_id);
        return next;
      });
      setItems(previous => previous.map(entry => entry.post_id === item.post_id
        ? { ...entry, like_count: item.like_count } : entry));
      setSelected(previous => previous?.post_id === item.post_id
        ? { ...previous, like_count: item.like_count } : previous);
      setError(cause instanceof Error ? cause.message : (isZh ? '点赞失败' : 'Like failed'));
    } finally {
      setLikePending(previous => {
        const next = new Set(previous); next.delete(item.post_id); return next;
      });
    }
  };

  const heart = (item: GalleryItem, large = false) =>
    <button type="button" onClick={event => void toggleLike(event, item)}
      disabled={likePending.has(item.post_id) || (isLoggedIn && !likesReady)}
      className="flex items-center gap-1.5 bg-[#0d0221]/80 px-2 py-1 text-white hover:text-red-400 disabled:opacity-50"
      aria-label={isZh ? `${item.like_count} 个赞` : `${item.like_count} likes`}>
      <Heart size={large ? 20 : 15} className={likedIds.has(item.post_id) ? 'fill-red-500 text-red-500' : 'text-white/70'} />
      <span style={{ fontSize: isZh ? 13 : 10 }}>{item.like_count}</span>
    </button>;

  return <div className="ui-page space-y-7 text-white">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="ui-page-title font-bold">{isZh ? '作品画廊' : 'GALLERY'}</h1>
      <PixelButton variant="secondary" onClick={() => setRefresh(value => value + 1)}
        style={{ fontSize: isZh ? 13 : 10 }}>
        {isZh ? '刷新' : 'Refresh'}
      </PixelButton>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {methods.map(option => <PixelButton key={option.value}
        variant={method === option.value ? 'primary' : 'secondary'}
        onClick={() => { setMethod(option.value); if (method === option.value) setRefresh(value => value + 1); }}
        style={{ fontSize: isZh ? 13 : 10 }}>
        {isZh ? option.zh : option.en}
      </PixelButton>)}
      <select value={category} onChange={event => setCategory(event.target.value as GalleryJobType | '')}
        aria-label={isZh ? '作品类型' : 'Work type'}
        className="bg-[#5a2d9c]/20 pixel-border border-[#5a2d9c] text-white/60 text-[10px] px-2 py-1 outline-none cursor-pointer hover:text-white"
        style={{ fontSize: isZh ? 11 : 8 }}>
        {categories.map(option => <option key={option.value} value={option.value}>{isZh ? option.zh : option.en}</option>)}
      </select>
    </div>
    {error && <div role="alert" className="pixel-border border-red-600 bg-red-950/50 p-3 text-red-200" style={{ fontSize: isZh ? 13 : 10 }}>{error}</div>}
    {loading ? <p className="py-20 text-center text-white/60">{isZh ? '正在加载画廊…' : 'LOADING GALLERY…'}</p>
      : items.length === 0 ? <p className="py-20 text-center text-white/60">{isZh ? '目前没有公开作品' : 'NO PUBLIC WORKS YET'}</p>
      : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(item => <PixelCard key={item.post_id} className="group cursor-pointer hover:bg-[#5a2d9c]/20"
          onClick={() => setSelected(item)}>
          <div className="relative mb-4">
            <OutputPreview item={item} lang={lang} play={!selected} />
            <div className="absolute top-2 left-2 z-30">{heart(item)}</div>
            <span className="absolute top-2 right-2 z-20 bg-[#f7d51d] text-[#2d1b4e] px-1.5 py-0.5"
              style={{ fontSize: 9 }}>{item.job_type === 'animation' ? `V${item.animation_version || 1}` : item.job_type.toUpperCase()}</span>
          </div>
          <p className="truncate text-white/90" style={{ fontSize: isZh ? 13 : 10 }}>
            {String(item.parameters?.prompt || (isZh ? '未命名作品' : 'Untitled work'))}
          </p>
          <p className="mt-2 text-white/50" style={{ fontSize: isZh ? 11 : 8 }}>
            {item.author.name} · {new Date(item.published_at).toLocaleDateString()}
          </p>
        </PixelCard>)}
      </div>}
    {selected && createPortal(
      <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-6 pt-9" role="dialog" aria-modal="true">
        <PixelCard className="w-full max-w-4xl pt-7" title={isZh ? '作品详情' : 'WORK DETAILS'}>
          <div className="max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {!!selected.input_images?.length && <div>
                  <h3 className="mb-2 text-white/60" style={{ fontSize: isZh ? 12 : 9 }}>{isZh ? '输入图像' : 'INPUT REFERENCES'}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(selected.input_images || []).map((url, index) => <AspectRatioPreview key={url + index} src={url}
                      alt={`Input ${index + 1}`} fallbackRatio={frameRatio(selected)} maxHeight={160}
                      className="pixel-border border-[#5a2d9c] bg-black/40" />)}
                  </div>
                </div>}
                <div>
                  <h3 className="mb-2 text-white/60" style={{ fontSize: isZh ? 12 : 9 }}>{isZh ? '生成结果' : 'GENERATED OUTPUT'}</h3>
                  <div className="relative">
                    <OutputPreview item={selected} lang={lang} maxHeight={420} />
                    <div className="absolute top-2 left-2 z-30">{heart(selected, true)}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-5">
                <p className="text-white/60" style={{ fontSize: isZh ? 12 : 9 }}>
                  {isZh ? '作者' : 'CREATOR'}: <span className="text-white">{selected.author.name}</span>
                </p>
                <ParameterPanel parameters={selected.parameters || {}} lang={lang} />
                <div className="flex flex-col gap-3">
                  <PixelButton onClick={() => setLargePreview(true)}>{isZh ? '预览' : 'PREVIEW'}</PixelButton>
                  <PixelButton variant="secondary" onClick={() => setSelected(null)}>{isZh ? '关闭' : 'CLOSE'}</PixelButton>
                </div>
              </div>
            </div>
          </div>
        </PixelCard>
      </div>, document.body)}
    {selected && largePreview && createPortal(
      <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center gap-5 p-6" role="dialog" aria-modal="true">
        <div className="w-full max-w-2xl"><OutputPreview item={selected} lang={lang} maxHeight={Math.max(320, window.innerHeight - 140)} /></div>
        <PixelButton variant="secondary" onClick={() => setLargePreview(false)}>{isZh ? '关闭预览' : 'CLOSE PREVIEW'}</PixelButton>
      </div>, document.body)}
  </div>;
};

export default GalleryPage;
