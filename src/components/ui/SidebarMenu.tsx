import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Compass, ShoppingCart, Layers, Percent, 
  Palette, Globe, Users, CreditCard, Settings, LogOut, X, ExternalLink,
  BarChart3, ChevronRight, Zap, Store, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarMenuProps {
  activeTab: string;
  merchantSection: string;
  onNavigate: (tab: 'discover' | 'dashboard' | 'help', section?: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const MENU_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard',  name: 'Dashboard',       icon: LayoutDashboard, type: 'section' },
      { id: 'analytics',  name: 'Analytics',        icon: BarChart3,       type: 'section' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { id: 'products',   name: 'Products',         icon: ShoppingCart,    type: 'section' },
      { id: 'orders',     name: 'Orders',            icon: Layers,          type: 'section' },
      { id: 'coupons',    name: 'Coupons',           icon: Percent,         type: 'section' },
    ],
  },
  {
    label: 'Store',
    items: [
      { id: 'theme',      name: 'Theme',             icon: Palette,         type: 'section' },
      { id: 'sections',   name: 'Home Sections',     icon: Layers,          type: 'section' },
      { id: 'domain',     name: 'Domain',            icon: Globe,           type: 'section' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'staff',      name: 'Staff',             icon: Users,           type: 'section' },
      { id: 'billing',    name: 'Subscription',      icon: CreditCard,      type: 'section' },
      { id: 'settings',   name: 'Settings',          icon: Settings,        type: 'section' },
      { id: 'discover',   name: 'Discover',          icon: Compass,         type: 'tab'     },
      { id: 'help',       name: 'Help Center',       icon: HelpCircle,      type: 'tab'     },
    ],
  },
];

const itemVariants = {
  hidden:  { opacity: 0, x: -12 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 } }),
};

export default function SidebarMenu({ activeTab, merchantSection, onNavigate, onLogout, isOpen, onClose }: SidebarMenuProps) {
  const [store, setStore] = useState<any>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    try {
      const raw = localStorage.getItem('merchant_store');
      if (raw) setStore(JSON.parse(raw));
    } catch {}
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const storeUrl = store?.store_slug ? `https://asaandukan.online/store/${store.store_slug}` : 'https://asaandukan.online';
  const greeting = (() => {
    const h = time.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const handleItemClick = (item: { id: string; type: string }) => {
    if (item.type === 'tab') {
      onNavigate(item.id as 'discover' | 'dashboard' | 'help');
    } else {
      onNavigate('dashboard', item.id);
    }
    onClose();
  };

  const isItemActive = (item: { id: string; type: string }) =>
    item.type === 'tab'
      ? activeTab === item.id
      : activeTab === 'dashboard' && merchantSection === item.id;

  let globalIdx = 0;

  const navContent = (
    <div className="flex flex-col h-full w-64 shrink-0 bg-bg-primary border-r border-border-card/70 relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-btn-primary/8 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-20 right-0 w-32 h-32 bg-accent-amber/6 rounded-full blur-2xl pointer-events-none translate-x-1/2" />

      {/* ── LOGO & STORE HEADER ─────────────────────────────── */}
      <div className="relative p-5 border-b border-border-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-btn-primary to-btn-primary-hover flex items-center justify-center font-serif font-bold text-white text-base shadow-lg shadow-btn-primary/30">
                {store?.store_name?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-green rounded-full border-2 border-bg-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif font-bold text-sm text-text-main leading-tight truncate max-w-[120px]">
                {store?.store_name ?? 'AsaanDukan'}
              </h1>
              <span className="text-[9px] font-mono font-bold text-text-body-muted uppercase tracking-widest block">
                Merchant Portal
              </span>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden p-1.5 text-text-body-muted hover:text-text-main rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Greeting pill */}
        <div className="mt-3 flex items-center gap-2 bg-bg-card/60 border border-border-card/50 rounded-xl px-3 py-2">
          <Zap size={12} className="text-accent-amber shrink-0" />
          <span className="text-[10px] text-text-body-muted font-medium truncate">{greeting},</span>
          <span className="text-[10px] font-bold text-text-main truncate">{store?.store_name ?? 'Merchant'}</span>
        </div>
      </div>

      {/* ── NAV GROUPS ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
        {MENU_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[9px] font-mono font-bold text-text-body-muted/60 uppercase tracking-[0.15em] px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                const idx = globalIdx++;
                return (
                  <motion.button
                    key={item.id}
                    custom={idx}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => handleItemClick(item)}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-sm font-medium group ${
                      active
                        ? 'bg-accent-amber/12 text-accent-amber font-bold'
                        : 'text-text-body-muted hover:text-text-main hover:bg-white/5'
                    }`}
                  >
                    {/* Active indicator pill */}
                    <AnimatePresence>
                      {active && (
                        <motion.div
                          layoutId="sidebar-active-pill"
                          className="nav-active-indicator"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          exit={{ scaleY: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </AnimatePresence>

                    <Icon
                      size={17}
                      className={`shrink-0 transition-all ${active ? 'stroke-[2.5]' : 'stroke-[1.8] group-hover:stroke-[2]'}`}
                    />
                    <span className="flex-1 text-left text-[13px]">{item.name}</span>
                    {active && <ChevronRight size={12} className="opacity-60" />}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <div className="p-3 border-t border-border-card/50 space-y-1.5">
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-[13px] font-medium border border-border-card/50 bg-bg-card/50 hover:bg-bg-card text-text-main cursor-pointer group"
        >
          <Store size={16} className="text-btn-primary" />
          <span className="flex-1">Visit Live Store</span>
          <ExternalLink size={12} className="text-text-body-muted group-hover:text-accent-amber transition-colors" />
        </a>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] font-medium text-text-body-muted hover:text-total-red hover:bg-total-red/8"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-screen sticky top-0 z-40">
        {navContent}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-[70] shadow-2xl md:hidden"
            >
              {navContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
