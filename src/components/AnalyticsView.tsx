import React, { useState, useEffect } from 'react';
import { ApiClient } from '../utils/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, ShoppingBag, Layers, Award, ShieldAlert,
  RefreshCw, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';
import Card from './ui/Card';
import Button from './ui/Button';

interface AnalyticsViewProps {
  onNavigate: (tab: string, arg?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsView({ onNavigate, showToast }: AnalyticsViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'revenue' | 'orders' | 'products'>('revenue');

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const response = await ApiClient.getDashboard(); // Reuses dashboard endpoint which we enriched
      setData(response);
    } catch (e: any) {
      showToast(e.message || "Failed to load analytics data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  if (loading) {
    return <Spinner size="lg" label="Generating analytics report..." />;
  }

  if (!data) return null;

  const { 
    analytics_enabled,
    chart_data = [], 
    orders_chart = [], 
    monthly_revenue = [], 
    orders_by_status = [], 
    top_products_revenue = [],
    stats = {}
  } = data;

  const formatPKR = (val?: any) => {
    if (val === undefined || val === null || isNaN(Number(val))) return 'Rs. 0';
    return `Rs. ${Number(val).toLocaleString('en-US')}`;
  };

  return (
    <div className="space-y-6 pb-20 pt-1 animate-fade-in relative">
      {/* Title block */}
      <div className="flex justify-between items-center bg-bg-card border border-border-card/60 rounded-2xl p-4.5">
        <div>
          <h1 className="font-serif font-bold text-xl text-text-main tracking-tight flex items-center gap-2">
            Store Analytics
          </h1>
          <p className="text-xs text-text-body-muted mt-0.5">Deep-dive reports, sales graphs, and item rank analysis</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchAnalyticsData} className="flex items-center gap-1.5 animate-none">
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Sub tabs selectors */}
      <div className="flex bg-bg-card p-1 rounded-xl border border-border-card/50 max-w-md">
        {(['revenue', 'orders', 'products'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${
              activeSubTab === tab 
                ? 'bg-btn-primary text-white shadow-sm' 
                : 'text-text-body-muted hover:text-text-main'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="relative min-h-[400px]">
        {/* BLURRED / LOCKED OVERLAY IF NO PREMIUM ANALYTICS */}
        {!analytics_enabled && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px] z-30 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-border-card">
            <div className="w-16 h-16 bg-accent-amber/10 border border-accent-amber-border/30 text-accent-amber rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <ShieldAlert size={32} />
            </div>
            <h3 className="font-serif font-bold text-text-main text-lg">Advanced Analytics Locked</h3>
            <p className="text-xs text-text-body-muted mt-1 max-w-sm leading-relaxed">
              Your active plan does not include Advanced Analytics. Upgrade to unlock 30-day graphs, category performance, status distribution charts, and product revenue ranking.
            </p>
            <Button variant="primary" size="md" className="mt-5" onClick={() => onNavigate('billing')}>
              Upgrade Subscription
            </Button>
          </div>
        )}

        <div className={!analytics_enabled ? 'blur-md pointer-events-none select-none' : ''}>
          <AnimatePresence mode="wait">
            {activeSubTab === 'revenue' && (
              <motion.div
                key="revenue"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* 30 Day Revenue Area Chart */}
                <Card className="p-6 flex flex-col shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-text-main flex items-center gap-2 font-serif">
                        <TrendingUp size={18} className="text-success-green" /> 30-Day Revenue Trend
                      </h3>
                      <p className="text-[11px] text-text-body-muted mt-0.5">Daily gross revenue over the past month</p>
                    </div>
                    <div className="bg-success-green/10 border border-success-green/20 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] text-text-body-muted block font-bold uppercase tracking-wider">Gross Total</span>
                      <span className="text-sm font-bold text-success-green font-mono">{formatPKR(stats.total_revenue)}</span>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    {chart_data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chart_data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenueLong" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2E3547" />
                          <XAxis dataKey="date" stroke="#8c8d8f" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#8c8d8f" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₨${val}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#141B2E', borderColor: '#2E3547', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#FBF6EC' }}
                            formatter={(value) => [formatPKR(value), 'Revenue']}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenueLong)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-text-body-muted">No sales metrics recorded in this cycle.</div>
                    )}
                  </div>
                </Card>

                {/* 6-Month Monthly Revenue Bar Chart */}
                <Card className="p-6 flex flex-col shadow-lg">
                  <h3 className="text-base font-bold text-text-main flex items-center gap-2 font-serif mb-6">
                    <DollarSign size={18} className="text-accent-amber" /> Monthly Performance Comparison
                  </h3>
                  <div className="h-72 w-full">
                    {monthly_revenue.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthly_revenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2E3547" />
                          <XAxis dataKey="month" stroke="#8c8d8f" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#8c8d8f" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₨${val}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#141B2E', borderColor: '#2E3547', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#FBF6EC' }}
                            formatter={(value) => [formatPKR(value), 'Revenue']}
                          />
                          <Bar dataKey="revenue" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-text-body-muted">No monthly logs recorded.</div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {activeSubTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {/* 7-Day Order Volume trend (Bar Chart) */}
                <Card className="col-span-12 md:col-span-7 p-6 flex flex-col shadow-lg">
                  <h3 className="text-base font-bold text-text-main flex items-center gap-2 font-serif mb-6">
                    <ShoppingBag size={18} className="text-btn-primary" /> Daily Order Traffic
                  </h3>
                  <div className="h-72 w-full">
                    {orders_chart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={orders_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2E3547" />
                          <XAxis dataKey="date" stroke="#8c8d8f" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#8c8d8f" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#141B2E', borderColor: '#2E3547', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#FBF6EC' }}
                            formatter={(value) => [value, 'Orders']}
                          />
                          <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-text-body-muted">No orders traffic.</div>
                    )}
                  </div>
                </Card>

                {/* Orders by Status distribution (Pie Chart) */}
                <Card className="col-span-12 md:col-span-5 p-6 flex flex-col justify-between shadow-lg">
                  <h3 className="text-base font-bold text-text-main flex items-center gap-2 font-serif mb-4">
                    <Layers size={18} className="text-[#8B5CF6]" /> Order Status Share
                  </h3>
                  <div className="h-64 w-full flex items-center justify-center relative">
                    {orders_by_status.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orders_by_status}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="status"
                          >
                            {orders_by_status.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#141B2E', borderColor: '#2E3547', borderRadius: '12px', color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-text-body-muted">No orders to display share.</div>
                    )}
                  </div>
                  {/* Legend list */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border-card/30">
                    {orders_by_status.map((item: any, idx: number) => (
                      <div key={item.status} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-text-body-muted truncate">{item.status}:</span>
                        <span className="font-mono font-bold text-text-main ml-auto">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {activeSubTab === 'products' && (
              <motion.div
                key="products"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {/* Top Selling Products List with Sales revenue share */}
                <Card className="col-span-12 md:col-span-6 p-6 shadow-lg">
                  <h3 className="text-base font-bold text-text-main flex items-center gap-2 font-serif mb-6">
                    <Award size={18} className="text-accent-amber" /> Top Selling items by Units Sold
                  </h3>
                  <div className="space-y-4">
                    {top_products_revenue.length > 0 ? (
                      top_products_revenue.map((item: any, idx: number) => (
                        <div key={item.product_id} className="flex items-center gap-3 bg-bg-primary/45 p-3 rounded-xl border border-border-card hover:border-accent-amber/20 transition-all">
                          <span className="w-6 h-6 rounded-lg bg-btn-primary/10 border border-btn-primary/20 flex items-center justify-center text-xs font-mono font-bold text-accent-amber shrink-0">
                            #{idx+1}
                          </span>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.product_name}
                              className="w-10 h-10 object-cover rounded border border-border-card shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-bg-card rounded border border-border-card shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-text-main truncate">{item.product_name}</p>
                            <p className="text-[10px] text-text-body-muted mt-0.5">{item.total_sold} units shipped</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-success-green">{formatPKR(item.total_revenue)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-xs text-text-body-muted">No top products registered in order records.</div>
                    )}
                  </div>
                </Card>

                {/* Products Revenue Share Chart */}
                <Card className="col-span-12 md:col-span-6 p-6 shadow-lg flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-text-main flex items-center gap-2 font-serif mb-6">
                      <TrendingUp size={18} className="text-success-green" /> Product Revenue Distribution
                    </h3>
                    <div className="h-72 w-full">
                      {top_products_revenue.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={top_products_revenue} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#2E3547" />
                            <XAxis type="number" stroke="#8c8d8f" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₨${val}`} />
                            <YAxis type="category" dataKey="product_name" stroke="#8c8d8f" fontSize={10} tickLine={false} axisLine={false} width={80} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#141B2E', borderColor: '#2E3547', borderRadius: '12px', color: '#fff' }}
                              itemStyle={{ color: '#FBF6EC' }}
                              formatter={(value) => [formatPKR(value), 'Revenue']}
                            />
                            <Bar dataKey="total_revenue" fill="#10B981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-text-body-muted">No revenue share.</div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
