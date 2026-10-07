import { useState, useEffect, useCallback } from 'react';
import { AppNotification, User, MerchantCommunityPost, DiscoverProduct, Announcement, News, Event as AppEvent } from '../types';
import { ApiClient } from '../utils/api';
import {
  Heart, Plus, Image as ImageIcon, X, Store,
  ShoppingBag, MapPin, Calendar, Megaphone, Newspaper, Package, Play, Bell, Search, Video, Share2, Compass
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Haptics } from '../utils/haptics';

interface DiscoverViewProps {
  currentUser: User | null;
  onShowLogin?: () => void;
  discoverTab?: 'news' | 'products';
  onDiscoverTabChange?: (tab: 'news' | 'products') => void;
  onAddNotification?: (notif: AppNotification) => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
}

type FeedItem =
  | (Announcement    & { _type: 'announcement' })
  | (News            & { _type: 'news' })
  | (AppEvent        & { _type: 'event' })
  | (MerchantCommunityPost & { _type: 'merchant_post' })
  | (DiscoverProduct & { _type: 'product'; created_at: string });

type CategoryFilter = 'all' | 'announcement' | 'news' | 'event' | 'merchant_post' | 'product';

function getYouTubeId(html?: string): string | null {
  if (!html) return null;
  const m = html.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function resolveImage(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://asaandukan.online/storage/${path.replace(/^\//, '')}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const BADGE_CONFIG = {
  announcement: { label: 'Announcement', color: 'bg-red-500/10 text-red-500 border-red-500/20',    Icon: Megaphone },
  news:         { label: 'News',         color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   Icon: Newspaper },
  event:        { label: 'Event',        color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', Icon: Calendar },
  product:      { label: 'Top Product',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: Package },
  merchant_post:{ label: 'Merchant Post',color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  Icon: Store },
};

export default function DiscoverView({ 
  currentUser, 
  onShowLogin, 
  onAddNotification,
  onOpenNotifications,
  unreadNotifCount = 0
}: DiscoverViewProps) {
  const [items, setItems]               = useState<FeedItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery]   = useState('');
  
  // Post Creation
  const [isPosting, setIsPosting]       = useState(false);
  const [postForm, setPostForm]         = useState({ title: '', body: '', youtubeUrl: '', image: null as File | null });
  const [submitting, setSubmitting]     = useState(false);

  const getSavedLikedKeys = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem('merchant_liked_item_keys') || '[]');
    } catch {
      return [];
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ann, news, ev, posts, products] = await Promise.all([
        ApiClient.getAnnouncements(1, 50).catch(() => []),
        ApiClient.getNews(1, 50).catch(() => []),
        ApiClient.getEvents(1, 50).catch(() => []),
        ApiClient.getCommunityPosts(1, 50).catch(() => []),
        ApiClient.getDiscoverProducts().catch(() => []),
      ]);

      const merged: FeedItem[] = [
        ...ann.map((i: Announcement) => ({ ...i, _type: 'announcement' as const })),
        ...news.map((i: News) => ({ ...i, _type: 'news' as const })),
        ...ev.map((i: AppEvent) => ({ ...i, _type: 'event' as const })),
        ...posts.map((i: MerchantCommunityPost) => ({ ...i, _type: 'merchant_post' as const })),
        ...products.map((i: DiscoverProduct) => ({ ...i, _type: 'product' as const, created_at: new Date().toISOString() })),
      ];

      const savedLikedKeys = getSavedLikedKeys();
      const mergedWithLikes = merged.map(it => {
        const key = `${it._type}_${(it as any).id || (it as any).product_id}`;
        const isLocallyLiked = savedLikedKeys.includes(key);
        const serverLiked = (it as any).user_has_liked ?? false;
        const liked = isLocallyLiked || serverLiked;
        const count = (it as any).likes_count ?? 0;
        return {
          ...it,
          user_has_liked: liked,
          likes_count: liked && !serverLiked ? count + 1 : count
        };
      });

      setItems(mergedWithLikes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleOpenPostModal = () => setIsPosting(true);
    window.addEventListener('open_merchant_post_modal', handleOpenPostModal);
    return () => window.removeEventListener('open_merchant_post_modal', handleOpenPostModal);
  }, []);

  const handleLike = useCallback(async (index: number) => {
    if (!currentUser) {
      if (onShowLogin) onShowLogin();
      return;
    }
    const item = items[index];
    Haptics.selection();

    const itemKey = `${item._type}_${(item as any).id || (item as any).product_id}`;
    const savedLikedKeys = getSavedLikedKeys();
    const currentlyLiked = (item as any).user_has_liked ?? savedLikedKeys.includes(itemKey);
    const newLikedState = !currentlyLiked;

    let updatedKeys = [...savedLikedKeys];
    if (newLikedState) {
      if (!updatedKeys.includes(itemKey)) updatedKeys.push(itemKey);
    } else {
      updatedKeys = updatedKeys.filter(k => k !== itemKey);
    }
    localStorage.setItem('merchant_liked_item_keys', JSON.stringify(updatedKeys));

    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const count = (it as any).likes_count ?? 0;
      return {
        ...it,
        user_has_liked: newLikedState,
        likes_count: newLikedState ? count + 1 : Math.max(0, count - 1)
      };
    }));

    if (item._type === 'merchant_post') {
      try { await ApiClient.likeCommunityPost((item as MerchantCommunityPost).id); }
      catch { /* fallback */ }
    }
  }, [items, currentUser, onShowLogin]);

  const handlePost = async () => {
    if (!postForm.title || !postForm.body) return;
    setSubmitting(true);
    try {
      let fullBody = postForm.body.trim();
      if (postForm.youtubeUrl.trim()) {
        fullBody += `\n\n${postForm.youtubeUrl.trim()}`;
      }

      const fd = new FormData();
      fd.append('title', postForm.title);
      fd.append('body', fullBody);
      if (postForm.image) fd.append('image', postForm.image);

      const res = await ApiClient.createCommunityPost(fd);
      if (res.success || res.post) {
        setIsPosting(false);
        setPostForm({ title: '', body: '', youtubeUrl: '', image: null });
        Haptics.success();
        loadData();
      }
    } catch { Haptics.error(); }
    finally { setSubmitting(false); }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'all' 
      ? item._type !== 'product' 
      : item._type === activeCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (item._type === 'product' ? item.product_name : (item as any).title) || '';
    const body = (item._type === 'product' ? item.store_name : (item as any).body || (item as any).description) || '';
    return title.toLowerCase().includes(q) || body.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-bg-primary text-text-main pb-28 pt-2 px-4 md:px-6 max-w-5xl mx-auto">
      

      {/* ── SEARCH & CATEGORY FILTER BAR ── */}
      <div className="space-y-4 mb-6">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
          <input
            type="text"
            placeholder="Search news, products, stores..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-bg-card border border-border-card rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-main placeholder-text-body-muted focus:outline-none focus:border-btn-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-body-muted hover:text-text-main p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All Updates', icon: SparklesIcon },
            { id: 'announcement', label: 'Announcements', icon: Megaphone },
            { id: 'news', label: 'News', icon: Newspaper },
            { id: 'event', label: 'Events', icon: Calendar },
            { id: 'merchant_post', label: 'Merchant Posts', icon: Store },
            { id: 'product', label: 'Products', icon: Package },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as CategoryFilter)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-text-main text-bg-primary shadow-sm'
                  : 'bg-bg-card border border-border-card text-text-body-muted hover:text-text-main'
              }`}
            >
              <cat.icon size={13} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT FEED GRID ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-9 h-9 border-3 border-btn-primary/30 border-t-btn-primary rounded-full animate-spin mb-3" />
          <p className="text-xs text-text-body-muted font-mono uppercase tracking-wider">Loading feed...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center bg-bg-card border border-border-card rounded-2xl p-8">
          <div className="w-12 h-12 rounded-2xl bg-bg-primary flex items-center justify-center text-text-body-muted mx-auto mb-3 border border-border-card">
            <Search size={22} />
          </div>
          <h3 className="font-bold text-text-main text-sm">No updates found</h3>
          <p className="text-xs text-text-body-muted mt-1 max-w-sm mx-auto">
            {searchQuery ? `No results match "${searchQuery}". Try a different keyword.` : 'Check back later for new announcements and products!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map((item, index) => (
            <ClassicCard
              key={`${item._type}-${(item as any).id || (item as any).product_id}-${index}`}
              item={item}
              currentUser={currentUser}
              onLike={() => handleLike(items.indexOf(item))}
              onShowLogin={onShowLogin}
            />
          ))}
        </div>
      )}

      {/* ── CREATE POST MODAL SHEET ── */}
      <AnimatePresence>
        {isPosting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-bg-card border border-border-card rounded-3xl p-6 shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-border-card">
                <div>
                  <h3 className="font-serif font-bold text-text-main text-lg">Create Merchant Post</h3>
                  <p className="text-xs text-text-body-muted">Share announcements or products with the community</p>
                </div>
                <button
                  onClick={() => setIsPosting(false)}
                  className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-text-body-muted hover:text-text-main transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-main block mb-1">Post Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. New Summer Collection Arrived!"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-body-muted focus:outline-none focus:border-btn-primary"
                    value={postForm.title}
                    onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-main block mb-1">Description *</label>
                  <textarea
                    placeholder="Describe your offer, announcement, or product details..."
                    rows={4}
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-body-muted focus:outline-none focus:border-btn-primary resize-none"
                    value={postForm.body}
                    onChange={e => setPostForm({ ...postForm, body: e.target.value })}
                  />
                </div>

                {/* YouTube Video URL Input */}
                <div>
                  <label className="text-xs font-bold text-text-main flex items-center gap-1.5 mb-1">
                    <Video size={14} className="text-red-500" />
                    YouTube Video Link (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-body-muted focus:outline-none focus:border-btn-primary"
                    value={postForm.youtubeUrl}
                    onChange={e => setPostForm({ ...postForm, youtubeUrl: e.target.value })}
                  />
                  <span className="text-[10px] text-text-body-muted mt-1 block">
                    Paste any YouTube video or Short URL to embed a video player in your post.
                  </span>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-xs font-bold text-text-main block mb-1">Cover Image (Optional)</label>
                  <label className="flex items-center gap-3 px-4 py-3 bg-bg-primary border border-border-card rounded-xl cursor-pointer hover:border-btn-primary transition-colors">
                    {postForm.image ? (
                      <img src={URL.createObjectURL(postForm.image)} className="w-10 h-10 object-cover rounded-lg" />
                    ) : (
                      <ImageIcon size={20} className="text-text-body-muted" />
                    )}
                    <span className="text-xs text-text-body-muted font-medium">
                      {postForm.image ? postForm.image.name : 'Click to select image file'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) setPostForm({ ...postForm, image: e.target.files[0] });
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setIsPosting(false)}
                  className="px-4 py-2 bg-bg-primary border border-border-card text-text-body-muted hover:text-text-main text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePost}
                  disabled={!postForm.title || !postForm.body || submitting}
                  className="px-5 py-2 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Publish Post'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

// ─── Classic Card Component ──────────────────────────────────────────────────

function ClassicCard({
  item,
  currentUser,
  onLike,
  onShowLogin
}: {
  item: FeedItem;
  currentUser: User | null;
  onLike: () => void;
  onShowLogin?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlayingYoutube, setIsPlayingYoutube] = useState(false);

  const badge = BADGE_CONFIG[item._type];
  const liked = (item as any).user_has_liked ?? false;
  const likeCount = (item as any).likes_count ?? 0;

  const ytId = getYouTubeId((item as any).body ?? (item as any).description ?? '');
  const imgSrc = resolveImage(
    (item as any).image_path ?? (item as any).image ?? null
  ) ?? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);

  const title = item._type === 'product'
    ? (item as DiscoverProduct).product_name
    : (item as any).title;

  const rawBody = item._type === 'product' ? '' : stripHtml((item as any).body ?? (item as any).description ?? '');

  const dateString = (item as any).created_at || (item as any).publish_date;
  const formattedDate = dateString
    ? new Date(dateString).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
    : 'Recent';

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      Haptics.success();
    }
  };

  return (
    <div className="bg-bg-card border border-border-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}>
              <badge.Icon size={11} />
              {badge.label}
            </span>
            <span className="text-[10px] font-mono text-text-body-muted">{formattedDate}</span>
          </div>

          {(item._type === 'merchant_post' || item._type === 'product') && (
            <span className="text-xs font-semibold text-text-body-muted flex items-center gap-1 truncate max-w-[140px]">
              <Store size={12} className="text-accent-amber shrink-0" />
              <span className="truncate">{(item as any).store_name ?? (item as any).tenant?.name ?? 'Store'}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-serif font-bold text-base md:text-lg text-text-main leading-snug mb-2">
          {title}
        </h3>

        {/* Text Body */}
        {rawBody.length > 0 && (
          <p className="text-xs text-text-body-muted leading-relaxed mb-3">
            {isExpanded ? rawBody : (
              rawBody.length > 120 ? `${rawBody.slice(0, 120)}... ` : rawBody
            )}
            {rawBody.length > 120 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-block ml-1 font-bold text-btn-primary hover:underline cursor-pointer"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </p>
        )}

        {/* Product Meta */}
        {item._type === 'product' && (
          <div className="my-3 p-3 bg-bg-primary/50 border border-border-card/60 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs text-text-body-muted">{(item as DiscoverProduct).store_name}</div>
              <div className="text-lg font-extrabold text-accent-amber">
                Rs. {(item as DiscoverProduct).price?.toLocaleString()}
              </div>
            </div>
            <a
              href={`https://asaandukan.online/store/${(item as DiscoverProduct).store_slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
            >
              <ShoppingBag size={13} />
              Open Store
            </a>
          </div>
        )}

        {/* Event Meta */}
        {item._type === 'event' && (item as AppEvent).event_date && (
          <div className="flex flex-wrap items-center gap-3 my-2 text-xs text-text-body-muted">
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-purple-400" />
              {new Date((item as AppEvent).event_date).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
            </span>
            {(item as AppEvent).location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-purple-400" />
                {(item as AppEvent).location}
              </span>
            )}
          </div>
        )}

        {/* Media Block (YouTube or Image) */}
        {ytId ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/90 my-3">
            {isPlayingYoutube ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            ) : (
              <div
                onClick={() => setIsPlayingYoutube(true)}
                className="relative w-full h-full cursor-pointer group"
              >
                {imgSrc && (
                  <img src={imgSrc} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <Play size={24} className="ml-1 fill-white" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : imgSrc ? (
          <div className="w-full max-h-72 rounded-xl overflow-hidden bg-black/10 border border-border-card/40 my-3">
            <img src={imgSrc} className="w-full h-full object-cover hover:scale-102 transition-transform duration-300" loading="lazy" />
          </div>
        ) : null}
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-border-card/60 flex items-center justify-between">
        <button
          onClick={() => {
            if (!currentUser) {
              if (onShowLogin) onShowLogin();
              return;
            }
            onLike();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            liked
              ? 'bg-red-500/15 text-red-500 border border-red-500/30'
              : 'bg-bg-primary border border-border-card/60 text-text-body-muted hover:text-text-main'
          }`}
        >
          <Heart size={14} className={liked ? 'fill-red-500 text-red-500' : ''} />
          <span>{likeCount > 0 ? likeCount : 'Like'}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-primary border border-border-card/60 rounded-xl text-xs font-bold text-text-body-muted hover:text-text-main transition-colors cursor-pointer"
        >
          <Share2 size={13} />
          Share
        </button>
      </div>
    </div>
  );
}
