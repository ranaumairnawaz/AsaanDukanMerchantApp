import { useState, useEffect } from 'react';
import { Announcement, News, Event as AppEvent } from '../types';
import { ApiClient } from '../utils/api';
import { Calendar, User, Clock, MapPin, Search, ChevronRight, X, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PublicTabsProps {
  onShowLogin?: () => void;
}

export default function PublicTabs({ onShowLogin }: PublicTabsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [mergedItems, setMergedItems] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ type: 'announcement' | 'news' | 'event'; data: any } | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Category filter state (All, Announcements, News, Events)
  const [activeCategory, setActiveCategory] = useState<'all' | 'announcement' | 'news' | 'event'>('all');

  // Load Initial Data from all 3 resources and merge
  const loadData = async (isRefresh = false) => {
    setLoading(true);
    try {
      const [annData, newsData, evData] = await Promise.all([
        ApiClient.getAnnouncements(1, 40).catch(() => []),
        ApiClient.getNews(1, 40).catch(() => []),
        ApiClient.getEvents(1, 40).catch(() => [])
      ]);

      setAnnouncements(annData);
      setNews(newsData);
      setEvents(evData);

      const taggedAnn = annData.map(item => ({ ...item, type: 'announcement' as const }));
      const taggedNews = newsData.map(item => ({ ...item, type: 'news' as const }));
      const taggedEv = evData.map(item => ({ ...item, type: 'event' as const }));

      const combined = [...taggedAnn, ...taggedNews, ...taggedEv];

      // Sort combined list by date (newest first)
      combined.sort((a, b) => {
        const dateA = a.publish_date || a.event_date || a.created_at || '';
        const dateB = b.publish_date || b.event_date || b.created_at || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setMergedItems(combined);
    } catch (e) {
      console.error('Error fetching community data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handlePullToRefresh = () => {
    loadData(true);
  };

  // Image Path Resolver: prepend https://asaandukan.online/ to relative paths
  // Falls back to YouTube thumbnail if body contains a YouTube URL
  const getResolvedImageUrl = (item: any) => {
    if (!item) return null;
    if (item.image_path) {
      const path = item.image_path.trim();
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `https://asaandukan.online/storage/${cleanPath}`;
    }
    if (item.image) return item.image;
    // Fallback: extract YT thumbnail from body
    return getYouTubeThumbnailFromBody(item.body || item.description) || null;
  };

  // Check if a resolved image URL is a YouTube thumbnail (to show play button overlay)
  const isYouTubeThumbnail = (url: string | null) =>
    url?.includes('img.youtube.com') ?? false;

  // Date Formatting Helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return { day, month, time };
  };

  // Determine if an event is in the past
  const isPastEvent = (dateStr: string) => {
    const eventTime = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return eventTime < now;
  };

  // Helper to strip HTML tags for clean preview
  const stripHtml = (htmlStr?: string) => {
    if (!htmlStr) return '';
    return htmlStr.replace(/<[^>]*>/g, ' ');
  };

  // Extract YouTube video ID from any YouTube URL format
  const getYouTubeId = (url: string): string | null => {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  // Get YouTube thumbnail URL from video ID
  const getYouTubeThumbnail = (videoId: string) =>
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Convert bare YouTube URLs in body text to responsive iframe embeds
  const processContent = (html?: string): string => {
    if (!html) return '';
    // Match bare YouTube URLs (not already inside href/src attributes)
    const ytUrlRe = /(?<!['">=])(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w\-?=&]+)/g;
    return html.replace(ytUrlRe, (url) => {
      const id = getYouTubeId(url);
      if (!id) return url;
      return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:12px 0;">
  <iframe
    src="https://www.youtube.com/embed/${id}"
    title="YouTube video"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:12px;"
  ></iframe>
</div>`;
    });
  };

  // Get YouTube thumbnail from body text (used as card image fallback)
  const getYouTubeThumbnailFromBody = (body?: string): string | null => {
    if (!body) return null;
    const ytUrlRe = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w\-?=&]+)/;
    const match = body.match(ytUrlRe);
    if (!match) return null;
    const id = getYouTubeId(match[0]);
    return id ? getYouTubeThumbnail(id) : null;
  };

  // Filters search and category queries
  const getFilteredItems = () => {
    const q = searchQuery.toLowerCase().trim();
    return mergedItems.filter(item => {
      // 1. Filter by category
      if (activeCategory !== 'all' && item.type !== activeCategory) {
        return false;
      }

      // 2. Filter by search query
      if (!q) return true;

      const titleMatches = item.title?.toLowerCase().includes(q) || false;
      const bodyMatches = item.body?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || false;
      const locationMatches = item.location?.toLowerCase().includes(q) || false;

      return titleMatches || bodyMatches || locationMatches;
    });
  };

  const items = getFilteredItems();
  const hasMore = false; // All fetched items loaded together in merged stream

  return (
    <div className="flex flex-col h-full bg-bg-primary text-text-main">
      {/* Title & Search Headers */}
      <div className="px-5 pt-4 pb-3 space-y-3.5">
        <div className="flex justify-between items-center">
          <h1 className="font-serif font-bold text-2xl tracking-tight capitalize">
            Asaan <span className="text-accent-amber italic">Community</span>
          </h1>
          <button
            onClick={handlePullToRefresh}
            disabled={loading}
            className="text-xs text-text-body-muted border border-btn-secondary-border px-2.5 py-1 rounded-full hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer font-sans"
          >
            <Clock size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Custom Search bar */}
        <div className="relative font-sans">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
          <input
            type="text"
            placeholder="Search community updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-card text-text-main border border-border-card/50 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent-amber focus:ring-1 focus:ring-accent-amber transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-body-muted hover:text-text-main">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-text-body-muted font-sans">
            <div className="w-8 h-8 border-2 border-accent-amber/30 border-t-accent-amber rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading updates...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-text-body-muted font-sans">
            <Search size={40} className="stroke-[1.5] mb-3 text-border-card" />
            <p className="text-sm">No items found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-accent-amber hover:underline"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item, index) => {
              const imageUrl = getResolvedImageUrl(item);

              // ANNOUNCEMENTS & NEWS CARD (Cream Receipt Style)
              if (item.type === 'announcement' || item.type === 'news') {
                return (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.4) }}
                    onClick={() => setSelectedItem({ type: item.type, data: item })}
                    className="bg-bg-card text-text-main rounded-2xl p-5 shadow-lg border border-border-card/60 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden flex flex-col h-full"
                  >
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-btn-primary" />

                    {/* Category Label */}
                    <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-text-body-muted uppercase mb-1.5">
                      <span>{item.type === 'announcement' ? 'Platform Alert' : 'Market Insight'}</span>
                      <span>#{item.id}026</span>
                    </div>

                    <h2 className="font-serif font-bold text-lg leading-snug tracking-tight text-text-main hover:text-accent-amber transition-colors">
                      {item.title}
                    </h2>

                    {/* Image inside card if available */}
                    {imageUrl && (
                      <div className="my-3.5 rounded-lg overflow-hidden h-44 w-full border border-black/5 shadow-sm relative">
                        <img
                          src={imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        {/* Play button overlay for YouTube thumbnails */}
                        {isYouTubeThumbnail(imageUrl) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-xl">
                              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-text-body-muted line-clamp-2 mt-2 leading-relaxed">
                      {stripHtml(item.type === 'news' ? (item.excerpt || item.body) : item.body)}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-3.5 border-t border-border-card/40 text-xs text-text-body-muted font-sans">
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-accent-amber" />
                        <span className="font-medium">{item.author?.name || 'Admin'}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono">
                        <Calendar size={12} className="text-accent-amber" />
                        <span>{formatDate(item.publish_date || item.created_at)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              // EVENTS CARD (Dark Navy Card with Special Date Highlight)
              const eventInfo = formatEventDate(item.event_date);
              const past = isPastEvent(item.event_date);

              return (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.4) }}
                  onClick={() => setSelectedItem({ type: 'event', data: item })}
                  className="bg-bg-card border border-border-card/60 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer shadow-lg flex flex-col h-full"
                >
                  {/* Left Highlight Date Badge */}
                  <div className={`w-full sm:w-24 flex sm:flex-col items-center justify-center p-4 text-center ${past ? 'bg-bg-card text-text-body-muted' : 'bg-btn-primary text-white'} gap-1.5 sm:gap-1 border-b sm:border-b-0 sm:border-r border-border-card/60 shrink-0`}>
                    <div className="text-[10px] font-mono tracking-widest uppercase opacity-80 sm:block hidden">{eventInfo.month}</div>
                    <div className="text-3xl font-serif font-bold leading-none">{eventInfo.day}</div>
                    <div className="text-[10px] font-mono sm:hidden block uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full">{eventInfo.month}</div>
                    <div className="text-[11px] font-mono sm:block hidden mt-1 opacity-90">{eventInfo.time}</div>
                    {past && <span className="text-[9px] uppercase tracking-wider font-bold text-total-red bg-total-red/10 px-2 py-0.5 rounded-full sm:mt-1.5">PAST</span>}
                    {!past && <span className="text-[9px] uppercase tracking-wider font-bold text-accent-amber bg-bg-primary/50 px-2 py-0.5 rounded-full sm:mt-1.5 font-sans">LIVE</span>}
                  </div>

                  {/* Event Image if available */}
                  {imageUrl && (
                    <div className="w-full sm:w-36 h-36 sm:h-auto shrink-0 relative overflow-hidden border-b sm:border-b-0 sm:border-r border-border-card/60">
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="font-serif font-bold text-lg leading-tight text-text-main hover:text-accent-amber transition-colors mb-2">
                        {item.title}
                      </h2>
                      <p className="text-sm text-text-body-muted line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-4 pt-3 border-t border-border-card/40 text-xs text-text-body-muted font-sans">
                      {item.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={13} className="text-accent-amber" />
                          <span>{item.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 font-mono sm:hidden">
                        <Clock size={13} className="text-accent-amber" />
                        <span>{eventInfo.time}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {hasMore && (
              <div className="pt-2 pb-6 flex justify-center">
                <button
                  disabled={loading}
                  className="px-6 py-2.5 bg-bg-card border border-border-card text-sm font-medium rounded-xl text-text-main hover:bg-bg-card active:scale-95 transition-all flex items-center gap-2 cursor-pointer font-sans"
                >
                  <ArrowDown size={14} className="animate-bounce" />
                  Load More Items
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAIL MODAL OVERLAY */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-lg bg-bg-card text-text-main rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Image if available */}
              {(() => {
                const imgUrl = getResolvedImageUrl(selectedItem.data);
                if (imgUrl) {
                  // If playing video in header
                  if (playingVideoId) {
                    return (
                      <div className="relative h-56 sm:h-64 w-full bg-black shrink-0">
                        <iframe
                          src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                          title="YouTube video"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        ></iframe>
                        <button
                          onClick={() => { setSelectedItem(null); setPlayingVideoId(null); }}
                          className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 active:scale-95 cursor-pointer backdrop-blur-md z-10"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="relative h-52 w-full overflow-hidden shrink-0">
                      <img
                        src={imgUrl}
                        alt={selectedItem.data.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {/* Play button overlay for YouTube thumbnails */}
                      {isYouTubeThumbnail(imgUrl) && (
                        <div
                          className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                          onClick={() => {
                            const match = selectedItem.data.body?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                            if (match) setPlayingVideoId(match[1]);
                          }}
                        >
                          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 group-hover:scale-110 transition-transform">
                            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => { setSelectedItem(null); setPlayingVideoId(null); }}
                        className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 active:scale-95 cursor-pointer backdrop-blur-md"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex justify-between items-center px-6 py-4 border-b border-black/10 shrink-0 font-sans">
                      <span className="text-xs font-mono tracking-widest text-text-body-muted uppercase">
                        {selectedItem.type} Details
                      </span>
                      <button
                        onClick={() => { setSelectedItem(null); setPlayingVideoId(null); }}
                        className="rounded-full p-1.5 hover:bg-white/10 text-text-main cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  );
                }
              })()}

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 leading-relaxed">
                {/* Metas inside body if no image */}
                {!getResolvedImageUrl(selectedItem.data) && (
                  <div className="flex items-center gap-3 text-xs mb-3 font-mono opacity-80">
                    <span className="text-btn-primary font-bold">#{selectedItem.data.id}026</span>
                    <span>&bull;</span>
                    <span>{formatDate(selectedItem.data.publish_date || selectedItem.data.created_at)}</span>
                  </div>
                )}

                {/* Event specific badge */}
                {selectedItem.type === 'event' && (
                  <div className="mb-3 flex gap-2 flex-wrap font-sans">
                    <span className={`text-[10px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${isPastEvent(selectedItem.data.event_date) ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {isPastEvent(selectedItem.data.event_date) ? 'Past Event' : 'Upcoming Event'}
                    </span>
                    {selectedItem.data.location && (
                      <span className="text-[10px] font-mono uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full text-text-body-muted flex items-center gap-1">
                        <MapPin size={10} /> {selectedItem.data.location}
                      </span>
                    )}
                  </div>
                )}

                <h2 className="font-serif font-bold text-2xl leading-snug mb-4">
                  {selectedItem.data.title}
                </h2>

                {/* Event Date Board */}
                {selectedItem.type === 'event' && (
                  <div className="bg-bg-card border border-border-card/60 rounded-xl p-4 mb-4 flex gap-4 items-center font-sans">
                    <Calendar size={24} className="text-accent-amber" />
                    <div>
                      <div className="text-sm font-bold text-text-main">
                        {new Date(selectedItem.data.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-text-body-muted mt-0.5">
                        Time: {new Date(selectedItem.data.event_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className="text-base space-y-4 whitespace-pre-line text-text-body-muted"
                  dangerouslySetInnerHTML={{ __html: processContent(selectedItem.data.body || selectedItem.data.description) }}
                />

                {/* Event Location Detail */}
                {selectedItem.type === 'event' && selectedItem.data.location && (
                  <div className="mt-6 pt-4 border-t border-border-card/40 text-sm font-sans">
                    <div className="font-bold text-text-main mb-1 flex items-center gap-1">
                      <MapPin size={14} className="text-accent-amber" /> Venue Location
                    </div>
                    <div className="text-text-body-muted">{selectedItem.data.location}</div>
                  </div>
                )}

                {/* Author footer */}
                {selectedItem.data.author && (
                  <div className="mt-8 pt-4 border-t border-border-card/40 flex items-center justify-between text-xs opacity-80 font-sans">
                    <span className="font-medium">Written by: {selectedItem.data.author.name}</span>
                    <span>{formatDate(selectedItem.data.publish_date || selectedItem.data.created_at)}</span>
                  </div>
                )}
              </div>

              {/* Bottom CTA to Login or Start Free Trial */}
              <div className="p-4 border-t border-border-card/40 bg-bg-card/40 flex justify-between items-center shrink-0 font-sans">
                <p className="text-xs text-text-body-muted">Want to launch your own store?</p>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setPlayingVideoId(null);
                    onShowLogin?.();
                  }}
                  className="px-4 py-2 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Start Free Trial
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
