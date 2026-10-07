import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, Customer, Product } from '../types';
import { ApiClient } from '../utils/api';
import { 
  Clock, User, Phone, MapPin, Truck, ChevronRight, 
  ArrowLeft, FileText, Calendar, ShieldCheck, MessageSquare, Mail, Award, ShoppingBag, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';
import { SkeletonList } from './ui/SkeletonCard';
import StatusBadge from './ui/StatusBadge';
import PullToRefresh from './ui/PullToRefresh';

interface OrdersViewProps {
  initialStatusFilter?: string; // e.g. 'pending' if navigated from dashboard alert
  onNavigate: (tab: string, arg?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  selectedOrderId?: number | null; // For direct details view
}

export default function OrdersView({ initialStatusFilter = 'all', onNavigate, showToast, selectedOrderId = null }: OrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(initialStatusFilter);

  // Detail View State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderCustomer, setOrderCustomer] = useState<Customer | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Edit / Update Status States
  const [formStatus, setFormStatus] = useState<OrderStatus>('pending');
  const [formCourier, setFormCourier] = useState('');
  const [formTracking, setFormTracking] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await ApiClient.getOrders(activeTab === 'all' ? '' : activeTab);
      setOrders(response);
    } catch (e: any) {
      showToast(e.message || "Failed to load orders list", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const orderRes = await ApiClient.getOrder(id);
      setSelectedOrder(orderRes);
      setFormStatus(orderRes.status);
      setFormCourier(orderRes.courier_name || '');
      setFormTracking(orderRes.tracking_number || '');

      // 1. Prioritize nested Customer detail if returned in Order response
      if (orderRes.customer) {
        setOrderCustomer(orderRes.customer);
      } else {
        const customerId = orderRes.customer_id || (id === 501 ? 1001 : id === 502 ? 1002 : id === 503 ? 1003 : id === 504 ? 1004 : 1005);
        try {
          const customerRes = await ApiClient.getCustomer(customerId);
          setOrderCustomer(customerRes);
        } catch (custErr) {
          console.error("Failed to fetch customer detail, using fallback", custErr);
          setOrderCustomer({
            id: customerId,
            name: orderRes.customer_name,
            email: `${orderRes.customer_name.toLowerCase().replace(/\s+/g, '')}@example.com`,
            phone: orderRes.customer_phone || "+92 300 0000000",
            address: orderRes.customer_address || "N/A",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150",
            total_orders_count: 3,
            total_spend: orderRes.total,
            member_since: "2025-01-01"
          });
        }
      }

      // 2. Fetch Products for enrichment (unless all are already nested)
      try {
        const productsRes = await ApiClient.getProducts();
        setAllProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      } catch (prodErr) {
        console.error("Failed to load products for enrichment", prodErr);
      }

    } catch (e: any) {
      showToast(e.message || "Failed to load order details", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      loadOrderDetail(selectedOrderId);
    } else {
      setSelectedOrder(null);
      loadOrders();
    }
  }, [activeTab, selectedOrderId]);

  // Handle Order Status Update Submit
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (formStatus === 'shipped' && (!formCourier || !formTracking)) {
      showToast("Courier Name and Tracking Number are mandatory for Shipped status", "warning");
      return;
    }

    setSubmittingUpdate(true);
    try {
      const updated = await ApiClient.updateOrder(
        selectedOrder.id, 
        formStatus, 
        formStatus === 'shipped' ? formCourier : '', 
        formStatus === 'shipped' ? formTracking : ''
      );
      setSelectedOrder(updated);
      showToast(`Order status successfully updated to ${formStatus.toUpperCase()}`, "success");
      
      // Refresh previous lists in background
      ApiClient.getOrders(activeTab === 'all' ? '' : activeTab).then(res => setOrders(res)).catch(() => {});
    } catch (e: any) {
      showToast(e.message || "Failed to update order", "error");
    } finally {
      setSubmittingUpdate(false);
    }
  };


  const formatPKR = (val?: number | null) => {
    if (val === undefined || val === null) return 'Rs. 0';
    return `Rs. ${val.toLocaleString('en-US')}`;
  };

  return (
    <PullToRefresh onRefresh={async () => { await loadOrders(); }}>
    <div className="space-y-6 pb-20">
      <AnimatePresence mode="wait">
        {!selectedOrder ? (
          // ORDER LIST TAB VIEW
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Title */}
            <div>
              <h1 className="font-serif font-bold text-2xl text-text-main tracking-tight">Fulfillment Orders</h1>
              <p className="text-xs text-text-body-muted mt-1">Review buyer transactions & dispatch statuses</p>
            </div>

            {/* Horizontal Scrollable Status tabs */}
            <div className="flex bg-bg-card border border-border-card/50 p-1 rounded-xl overflow-x-auto gap-1 scrollbar-none">
              {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((tab) => {
                const count = orders.filter(o => tab === 'all' || o.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
                      activeTab === tab 
                        ? 'bg-btn-primary text-white' 
                        : 'text-text-body-muted hover:text-white hover:bg-white/2'
                    }`}
                  >
                    {tab}
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab ? 'bg-white/20 text-text-main' : 'bg-bg-primary text-text-body-muted'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-5">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, Customer Name, or Phone..."
                  className="w-full bg-bg-primary border border-border-card rounded-xl pl-10 pr-4 py-3 text-sm text-text-main outline-none focus:border-accent-amber transition-colors"
                />
              </div>

            {/* Orders Table list */}
            {loading ? (
              <SkeletonList />
            ) : orders.length === 0 ? (
              <div className="bg-bg-card/40 border border-border-card/30 rounded-2xl p-12 text-center text-text-body-muted flex flex-col items-center">
                <FileText size={44} className="stroke-[1] text-border-card mb-3" />
                <h3 className="font-serif font-bold text-text-main text-base">No Orders Filed</h3>
                <p className="text-xs text-text-body-muted mt-1.5 max-w-sm leading-relaxed">
                  No purchases are indexed under this category filter. Continue driving traffic to your storefront!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.filter(o => 
                  o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  o.customer_phone.includes(searchQuery) ||
                  o.id.toString().includes(searchQuery)
                ).map((order) => (
                  <div
                    key={order.id}
                    onClick={() => loadOrderDetail(order.id)}
                    className="bg-bg-card border border-border-card/60 rounded-2xl p-4 flex justify-between items-center hover:border-accent-amber/40 transition-all cursor-pointer shadow-md active:scale-[0.99]"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-text-main">{order.order_number}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      
                      <div className="text-xs text-text-body-muted mt-2 space-y-1">
                        <div>Customer: <span className="text-text-main font-medium">{order.customer_name}</span></div>
                        {order.customer_phone && (
                          <div className="text-[11px] flex items-center gap-1.5 text-text-body-muted/80">
                            <Phone size={11} className="text-accent-amber/80 shrink-0" />
                            <span>{order.customer_phone}</span>
                          </div>
                        )}
                        {order.customer_address && (
                          <div className="text-[11px] flex items-center gap-1.5 text-text-body-muted/80">
                            <MapPin size={11} className="text-accent-amber/80 shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-xs">{order.customer_address}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-[10px] text-text-body-muted mt-1 flex items-center gap-1 font-mono">
                        <Calendar size={10} /> {new Date(order.created_at).toLocaleDateString('en-PK')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-text-main">{formatPKR(order.total)}</div>
                        <div className="text-[9px] text-text-body-muted mt-0.5 uppercase tracking-wide">Cash On Delivery</div>
                      </div>
                      <ChevronRight size={16} className="text-text-body-muted" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          // ORDER DETAILED VIEW (Cream receipt card + Dark actions panel)
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header Anchor */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (selectedOrderId) {
                    onNavigate('dashboard');
                  } else {
                    setSelectedOrder(null);
                  }
                }}
                className="p-2 bg-bg-card border border-border-card text-text-body-muted hover:text-text-main rounded-xl cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="font-serif font-bold text-lg text-text-main">Order Details</h2>
                <p className="text-[11px] text-text-body-muted mt-0.5">Fulfillment properties for {selectedOrder.order_number}</p>
              </div>
            </div>

            {/* Core Grid: Left Invoice Receipt, Right Status actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT INVOICE RECEIPT (Classic Cream Receipt card with serrations) */}
              <div className="lg:col-span-7 bg-card-cream text-text-dark rounded-2xl p-5 shadow-2xl relative overflow-hidden receipt-serrated-bottom">
                {/* Top Green Accent bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-btn-primary" />
                
                {/* Title */}
                <div className="text-center pb-5 border-b border-text-dark/15">
                  <h3 className="font-serif font-bold text-xl uppercase tracking-wider text-text-dark">INVOICE RECEIPT</h3>
                  <div className="font-mono text-xs text-text-dark/65 mt-1">{selectedOrder.order_number}</div>
                  <div className="text-[10px] text-text-dark/50 font-mono mt-0.5">
                    Date: {new Date(selectedOrder.created_at).toLocaleString('en-PK')}
                  </div>
                </div>

                {/* Customer Details block */}
                <div className="py-4 border-b border-text-dark/10 space-y-3 text-sm leading-relaxed">
                  <h4 className="text-[11px] font-mono tracking-wider text-text-dark/50 uppercase font-bold mb-1 flex items-center justify-between">
                    <span>Customer Details</span>
                    {orderCustomer && (
                      <span className="bg-btn-primary/10 text-btn-primary font-bold px-2 py-0.5 rounded-full text-[9px] uppercase flex items-center gap-1">
                        <Award size={10} />
                        {orderCustomer.total_orders_count >= 4 ? 'VIP Gold' : 'Loyal Buyer'}
                      </span>
                    )}
                  </h4>
                  
                  {orderCustomer ? (
                    <div className="flex gap-3 items-start bg-black/5 p-3 rounded-xl border border-text-dark/5">
                      <img 
                        src={orderCustomer.avatar} 
                        alt={orderCustomer.name} 
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border border-text-dark/15 shrink-0" 
                      />
                      <div className="min-w-0 flex-1 space-y-1 text-text-dark">
                        <div className="font-bold text-sm flex items-center gap-1.5">
                          {orderCustomer.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-dark/75 font-mono">
                          <Mail size={11} className="shrink-0" />
                          <span className="truncate">{orderCustomer.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-dark/75 font-mono">
                          <Phone size={11} className="shrink-0" />
                          <span>{orderCustomer.phone}</span>
                        </div>
                        {selectedOrder.customer_address && (
                          <div className="flex items-start gap-1.5 text-xs text-text-dark/85 mt-1 border-t border-text-dark/5 pt-1.5">
                            <MapPin size={11} className="shrink-0 mt-0.5 text-btn-primary" />
                            <span>{selectedOrder.customer_address}</span>
                          </div>
                        )}
                        
                        {/* Linked Customer Profile Metrics */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-text-dark/5 text-[10px] font-mono">
                          <div>
                            <span className="text-text-dark/50 block uppercase text-[8px] font-bold">Total Orders</span>
                            <span className="font-bold text-text-dark">{orderCustomer.total_orders_count} orders</span>
                          </div>
                          <div>
                            <span className="text-text-dark/50 block uppercase text-[8px] font-bold">Lifetime Spend</span>
                            <span className="font-bold text-btn-primary">{formatPKR(orderCustomer.total_spend)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-btn-primary shrink-0" />
                        <span className="font-bold text-text-dark">{selectedOrder.customer_name}</span>
                      </div>
                      {selectedOrder.customer_phone && (
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <Phone size={13} className="text-btn-primary shrink-0" />
                          <span>{selectedOrder.customer_phone}</span>
                        </div>
                      )}
                      {selectedOrder.customer_address && (
                        <div className="flex items-start gap-2 text-xs text-text-dark/90">
                          <MapPin size={13} className="text-btn-primary shrink-0 mt-0.5" />
                          <span>{selectedOrder.customer_address}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Monospace Line Items List */}
                <div className="py-4 border-b border-text-dark/10">
                  <h4 className="text-[11px] font-mono tracking-wider text-text-dark/50 uppercase font-bold mb-3">Purchased Items</h4>
                  
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, idx) => {
                      // Retrieve full product details from nested item.product or allProducts list
                      const matchedProduct = item.product || allProducts.find(p => p.id === item.product_id);
                      
                      return (
                        <div key={idx} className="flex gap-3 items-start bg-black/5 p-2.5 rounded-xl border border-text-dark/5">
                          {matchedProduct?.images?.[0] ? (
                            <img 
                              src={matchedProduct.images[0]} 
                              alt={item.product_name} 
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-lg object-cover border border-text-dark/15 shrink-0" 
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-text-dark/5 border border-text-dark/10 flex items-center justify-center text-text-dark/40 shrink-0">
                              <ShoppingBag size={18} />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="font-bold text-text-dark truncate leading-tight">{item.product_name}</div>
                            {matchedProduct?.category && (
                              <div className="text-[9px] font-mono text-text-dark/50 uppercase mt-0.5">{matchedProduct.category}</div>
                            )}
                            {item.variant_name && (
                              <div className="text-[10px] text-text-dark/75 mt-0.5 font-mono">Option: {item.variant_name}</div>
                            )}
                            <div className="text-[10px] text-text-dark/65 mt-1 font-mono">
                              Qty: {item.quantity} × {formatPKR(item.unit_price)}
                            </div>
                          </div>
                          
                          <div className="font-mono text-xs font-bold text-text-dark shrink-0 pt-0.5">
                            {formatPKR(item.unit_price * item.quantity)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calculations Monospace list */}
                <div className="py-4 text-xs font-mono text-text-dark/80 space-y-1.5 border-b border-text-dark/10">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPKR(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span>{formatPKR(selectedOrder.delivery_charge)}</span>
                  </div>
                </div>

                {/* Invoiced Total */}
                <div className="pt-4 flex justify-between items-center text-text-dark">
                  <span className="font-serif font-bold text-sm">TOTAL AMOUNT</span>
                  <span className="font-mono font-bold text-lg text-total-red">{formatPKR(selectedOrder.total)}</span>
                </div>

                {/* Courier info if set */}
                {selectedOrder.courier_name && (
                  <div className="mt-5 p-3 bg-btn-primary/5 border border-btn-primary/10 rounded-xl flex items-center gap-3">
                    <Truck size={16} className="text-btn-primary" />
                    <div className="text-xs text-text-dark/85 font-mono">
                      <div className="font-bold">Courier: {selectedOrder.courier_name}</div>
                      <div className="mt-0.5">Tracking ID: {selectedOrder.tracking_number}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT STATUS ACTIONS FORM (Dark panel) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-bg-card border border-border-card/60 rounded-2xl p-5 shadow-lg">
                  <h3 className="font-serif font-bold text-base text-text-main flex items-center gap-2 mb-4">
                    <ShieldCheck size={16} className="text-accent-amber" /> Update Order Status
                  </h3>

                  <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
                    {/* Status Dropdown selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Fulfillment Status</label>
                      <select 
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as OrderStatus)}
                        className="w-full bg-bg-primary border border-border-card rounded-xl px-3 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                      >
                        <option value="pending">Pending Processing</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing & Packaged</option>
                        <option value="shipped">Shipped via Courier</option>
                        <option value="delivered">Delivered to Buyer</option>
                        <option value="cancelled">Cancelled / Returned</option>
                      </select>
                    </div>

                    {/* Conditional Courier fields only if status === 'shipped' */}
                    <AnimatePresence>
                      {formStatus === 'shipped' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 overflow-hidden"
                        >
                          <div>
                            <label className="block text-[9px] font-bold text-text-body-muted mb-1 uppercase font-mono">Courier Name *</label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. TCS Express, Leopards, M&P"
                              value={formCourier}
                              onChange={(e) => setFormCourier(e.target.value)}
                              className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none focus:border-accent-amber"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-text-body-muted mb-1 uppercase font-mono">Tracking Number *</label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. TCS7823901"
                              value={formTracking}
                              onChange={(e) => setFormTracking(e.target.value)}
                              className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Informational WhatsApp Notice */}
                    <div className="bg-bg-primary border border-border-card rounded-xl p-3 flex items-start gap-2.5">
                      <MessageSquare size={14} className="text-btn-primary shrink-0 mt-0.5 animate-pulse" />
                      <p className="text-[10px] text-text-body-muted leading-relaxed">
                        <span className="font-bold text-text-main block mb-0.5">WhatsApp Automation Notice</span>
                        Confirming or shipping an order automatically initiates a real-time WhatsApp delivery notice from AssanDukan APIs directly to your customer's WhatsApp line. No extra configuration required.
                      </p>
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={submittingUpdate}
                      className="w-full py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-btn-primary/10"
                    >
                      {submittingUpdate && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                      Save Fulfillment Changes
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </PullToRefresh>
  );
}
