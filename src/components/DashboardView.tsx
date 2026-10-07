import { useState, useEffect } from 'react';
import { DashboardData } from '../types';
import { ApiClient } from '../utils/api';
import {
  Package, AlertCircle, ArrowRight, ShieldAlert, Sparkles,
  ExternalLink, TrendingUp, ShoppingBag, DollarSign, Clock,
  BarChart3, RefreshCw, ChevronRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';
import Button from './ui/Button';
import AnimatedNumber from './ui/AnimatedNumber';
import PullToRefresh from './ui/PullToRefresh';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardViewProps {
  onNavigate: (tab: string, arg?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

export default function DashboardView({ onNavigate, showToast }: DashboardViewProps) {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [store, setStore]     = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('merchant_store');
      if (raw) setStore(JSON.parse(raw));
    } catch {}
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await ApiClient.getDashboard();
      setData(response);
    } catch (e: any) {
      showToast(e.message || 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const formatPKR = (val?: any) => {
    if (val === undefined || val === null || isNaN(Number(val))) return 'Rs. 0';
    return `Rs. ${Number(val).toLocaleString('en-US')}`;
  };
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch { return 'N/A'; }
  };

  // ── LOADING SKELETON ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 pb-20 pt-1 animate-fade-in">
        {/* Hero skeleton */}
        <div className="skeleton h-28 rounded-2xl" />
        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        {/* Chart skeleton */}
        <div className="skeleton h-52 rounded-2xl" />
        {/* Orders skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { analytics_enabled, chart_data } = data;
  const stats = {
    pending_orders:  data.stats?.pending_orders  ?? 0,
    total_products:  data.stats?.total_products  ?? 0,
    active_products: data.stats?.active_products ?? 0,
    today_revenue:   data.stats?.today_revenue   ?? 0,
    total_revenue:   data.stats?.total_revenue   ?? 0,
    today_orders:    (data.stats as any)?.today_orders ?? 0,
  };
  const recent_orders = data.recent_orders || [];
  const top_products  = data.top_products  || [];
  const storeUrl = store?.store_slug ? `https://asaandukan.online/store/${store.store_slug}` : null;

  // Greeting
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Status colour helper
  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      pending:    'text-accent-amber  bg-amber-500/10  border-amber-500/20',
      confirmed:  'text-blue-400      bg-blue-500/10   border-blue-500/20',
      processing: 'text-purple-400    bg-purple-500/10 border-purple-500/20',
      shipped:    'text-cyan-400      bg-cyan-500/10   border-cyan-500/20',
      delivered:  'text-success-green bg-green-500/10  border-green-500/20',
      cancelled:  'text-total-red     bg-red-500/10    border-red-500/20',
    };
    return map[s] ?? 'text-text-body-muted bg-bg-card border-border-card';
  };

  return (
    <PullToRefresh onRefresh={async () => { await fetchDashboardData(); }}>
    <div className="space-y-5 pb-24 pt-1">

      {/* ── HERO WELCOME BANNER ────────────────────────────────────────────── */}
      <motion.div
        variants={cardVariants} initial="hidden" animate="visible"
        className="relative overflow-hidden rounded-2xl border border-border-card/60 bg-bg-card p-5 md:p-6"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-btn-primary/8 via-transparent to-accent-amber/5 pointer-events-none" />
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-btn-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-accent-amber/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-text-body-muted uppercase tracking-widest mb-1">
              {greeting} 👋
            </p>
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-text-main leading-tight">
              {store?.name ?? 'Your Store'}
            </h1>
            <p className="text-xs text-text-body-muted mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success-green inline-block animate-pulse" />
              Store is live &amp; active
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {storeUrl && (
              <a
                href={storeUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-accent-amber/30 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 transition-colors"
              >
                <ExternalLink size={12} /> Visit Store
              </a>
            )}
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-border-card/60 bg-bg-primary/50 text-text-body-muted hover:text-text-main transition-colors cursor-pointer"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* Pending orders inline alert */}
        <AnimatePresence>
          {stats.pending_orders > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="relative flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5"
            >
              <AlertCircle size={16} className="text-accent-amber shrink-0 animate-pulse" />
              <p className="text-xs text-text-body-muted flex-1">
                You have <span className="text-accent-amber font-bold font-mono">{stats.pending_orders} pending orders</span> waiting for fulfilment.
              </p>
              <button
                onClick={() => onNavigate('orders', { initialStatusFilter: 'pending' })}
                className="flex items-center gap-1 text-xs text-accent-amber font-bold hover:underline cursor-pointer shrink-0"
              >
                Fulfill <ArrowRight size={11} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── KPI STAT CARDS ─────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={containerVariants} initial="hidden" animate="visible"
      >
        {/* Total Revenue */}
        <motion.div
          variants={cardVariants}
          className="relative col-span-2 md:col-span-1 bg-bg-card border border-border-card/60 rounded-2xl p-5 overflow-hidden group hover-lift"
          onClick={() => analytics_enabled && onNavigate('analytics')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-success-green/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-success-green/15 flex items-center justify-center">
              <DollarSign size={15} className="text-success-green" />
            </div>
            {analytics_enabled && (
              <ChevronRight size={14} className="text-text-body-muted/50 group-hover:text-accent-amber transition-colors" />
            )}
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-text-body-muted font-bold mb-1">Total Revenue</p>
          {analytics_enabled ? (
            <h2 className="text-xl font-bold text-text-main font-mono">
              <AnimatedNumber value={stats.total_revenue} isCurrency />
            </h2>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldAlert size={12} className="text-text-body-muted" />
              <span className="text-xs text-text-body-muted">Upgrade to unlock</span>
            </div>
          )}
        </motion.div>

        {/* Today's Revenue */}
        <motion.div
          variants={cardVariants}
          className="relative bg-bg-card border border-border-card/60 rounded-2xl p-5 overflow-hidden hover-lift"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent-amber/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-accent-amber/15 flex items-center justify-center">
              <Zap size={15} className="text-accent-amber" />
            </div>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-text-body-muted font-bold mb-1">Today</p>
          {analytics_enabled ? (
            <h2 className="text-xl font-bold text-accent-amber font-mono">
              <AnimatedNumber value={stats.today_revenue} isCurrency />
            </h2>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldAlert size={12} className="text-text-body-muted" />
              <span className="text-xs text-text-body-muted">Locked</span>
            </div>
          )}
        </motion.div>

        {/* Pending Orders */}
        <motion.div
          variants={cardVariants}
          onClick={() => onNavigate('orders', { initialStatusFilter: 'pending' })}
          className="bg-bg-card border border-border-card/60 rounded-2xl p-5 overflow-hidden hover-lift cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Clock size={15} className="text-accent-amber" />
            </div>
            {stats.pending_orders > 0 && (
              <span className="text-[9px] font-mono font-bold bg-accent-amber text-black px-1.5 py-0.5 rounded-full animate-pulse">
                ACTION
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-text-body-muted font-bold mb-1">Pending</p>
          <h2 className="text-3xl font-bold text-accent-amber font-mono">
            <AnimatedNumber value={stats.pending_orders} />
          </h2>
        </motion.div>

        {/* Catalog / Products */}
        <motion.div
          variants={cardVariants}
          onClick={() => onNavigate('products')}
          className="bg-gradient-to-br from-btn-primary to-btn-primary-hover border border-btn-primary/30 rounded-2xl p-5 overflow-hidden hover-lift cursor-pointer relative"
        >
          <div className="absolute -bottom-5 -right-5 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />
          <div className="flex items-center gap-2 mb-3">
            <Package size={15} className="text-white/80" />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/70 font-bold mb-1">Catalog</p>
          <h2 className="text-3xl font-bold text-white font-mono">
            <AnimatedNumber value={stats.active_products} />
          </h2>
          <p className="text-[10px] text-white/60 mt-0.5 font-mono">{stats.total_products} total listed</p>
        </motion.div>
      </motion.div>

      {/* ── QUICK ACTIONS ──────────────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants} initial="hidden" animate="visible"
        className="grid grid-cols-3 sm:grid-cols-6 gap-2.5"
      >
        {[
          { label: 'New Product', icon: Package,    tab: 'products', color: 'text-btn-primary bg-btn-primary/10 border-btn-primary/20' },
          { label: 'Orders',      icon: ShoppingBag, tab: 'orders',   color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'Analytics',   icon: BarChart3,   tab: 'analytics', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
          { label: 'Coupons',     icon: Sparkles,    tab: 'coupons',  color: 'text-accent-amber bg-amber-500/10 border-amber-500/20' },
          { label: 'Theme',       icon: TrendingUp,  tab: 'theme',    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
          { label: 'Billing',     icon: DollarSign,  tab: 'billing',  color: 'text-success-green bg-green-500/10 border-green-500/20' },
        ].map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.tab}
              variants={cardVariants}
              onClick={() => onNavigate(action.tab)}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all active:scale-95 hover:scale-[1.03] ${action.color}`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-bold uppercase tracking-wide leading-none text-center">{action.label}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* ── REVENUE CHART ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {analytics_enabled && chart_data && chart_data.length > 0 ? (
          <motion.div
            variants={cardVariants} initial="hidden" animate="visible"
            className="bg-bg-card border border-border-card/60 rounded-2xl p-5 md:p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-serif font-bold text-base text-text-main flex items-center gap-2">
                  <TrendingUp size={16} className="text-success-green" /> Revenue Overview
                </h3>
                <p className="text-[10px] text-text-body-muted mt-0.5">Last 30 days · daily gross</p>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs text-accent-amber font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Full Analytics <ChevronRight size={12} />
              </button>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart_data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevDash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1E8449" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#1E8449" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#243554" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₨${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141B2E', borderColor: '#2E3547', borderRadius: '12px', color: '#fff', fontSize: 12 }}
                    formatter={(value) => [formatPKR(value), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#1E8449" strokeWidth={2.5} fillOpacity={1} fill="url(#gradRevDash)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ) : !analytics_enabled ? (
          <motion.div
            variants={cardVariants} initial="hidden" animate="visible"
            onClick={() => onNavigate('billing')}
            className="bg-bg-card border border-dashed border-border-card/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer hover:border-accent-amber/40 transition-colors group"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 size={22} className="text-accent-amber" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-main">Analytics Charts Locked</p>
              <p className="text-xs text-text-body-muted mt-1">Upgrade your plan to unlock revenue graphs, order trends, and product rankings.</p>
            </div>
            <span className="text-xs text-accent-amber font-bold border-b border-accent-amber">Upgrade Plan →</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── BOTTOM BENTO: RECENT ORDERS + TOP PRODUCTS ─────────────────────── */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-12 gap-5"
        variants={containerVariants} initial="hidden" animate="visible"
      >
        {/* Recent Orders */}
        <motion.div
          variants={cardVariants}
          className="md:col-span-8 bg-bg-card border border-border-card/60 rounded-2xl p-5 md:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif font-bold text-base text-text-main flex items-center gap-2">
              <ShoppingBag size={15} className="text-btn-primary" /> Recent Orders
            </h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-accent-amber font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all <ChevronRight size={12} />
            </button>
          </div>

          {recent_orders.length === 0 ? (
            <EmptyState icon={Package} title="No orders yet" message="Customer orders will appear here as they come in." />
          ) : (
            <div className="space-y-2">
              {recent_orders.slice(0, 5).map((order: any, i) => (
                <motion.button
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => onNavigate('orders', { selectedOrderId: order.id })}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-primary/50 border border-border-card/40 hover:border-accent-amber/25 hover:bg-bg-primary transition-all text-left group cursor-pointer"
                >
                  {/* Order ID */}
                  <div className="w-9 h-9 rounded-xl bg-bg-card border border-border-card flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-mono font-bold text-text-body-muted">#{order.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text-main truncate">{order.customer_name}</p>
                    <p className="text-[10px] text-text-body-muted font-mono">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${statusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="text-xs font-bold text-text-main font-mono">{formatPKR(order.total)}</span>
                    <ChevronRight size={12} className="text-text-body-muted/50 group-hover:text-accent-amber transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Products + Inventory */}
        <motion.div
          variants={cardVariants}
          className="md:col-span-4 bg-bg-card border border-border-card/60 rounded-2xl p-5 md:p-6 flex flex-col relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-amber/4 rounded-full blur-3xl pointer-events-none" />
          <h3 className="font-serif font-bold text-base text-text-main flex items-center gap-2 mb-1">
            <Sparkles size={15} className="text-accent-amber" /> Top Performers
          </h3>
          <p className="text-[10px] text-text-body-muted mb-4">Best-selling items this month</p>

          {analytics_enabled ? (
            top_products.length > 0 ? (
              <div className="space-y-2.5 flex-1">
                {top_products.slice(0, 4).map((item: any, i) => (
                  <motion.div
                    key={item.product_id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="w-5 text-[10px] font-mono font-bold text-text-body-muted text-right shrink-0">#{i + 1}</span>
                    {item.image ? (
                      <img src={item.image} alt={item.product_name} className="w-9 h-9 rounded-lg object-cover border border-border-card shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 bg-bg-primary rounded-lg border border-border-card shrink-0 flex items-center justify-center">
                        <Package size={14} className="text-text-body-muted" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-text-main truncate">{item.product_name}</p>
                      <p className="text-[9px] text-success-green font-mono">{item.total_sold} sold</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-body-muted text-center py-4">No sales data yet</p>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <ShieldAlert size={24} className="text-text-body-muted" />
              <p className="text-xs text-text-body-muted">Top products locked</p>
              <button onClick={() => onNavigate('billing')} className="text-[10px] text-accent-amber font-bold border-b border-accent-amber hover:opacity-80 cursor-pointer">
                Upgrade Plan
              </button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border-card/40">
            <Button variant="primary" size="sm" className="w-full" onClick={() => onNavigate('products')}>
              + Add New Product
            </Button>
          </div>
        </motion.div>
      </motion.div>

    </div>
    </PullToRefresh>
  );
}
