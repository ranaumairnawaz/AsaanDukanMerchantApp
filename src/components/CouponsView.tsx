import React, { useState, useEffect } from 'react';
import { Coupon } from '../types';
import { ApiClient } from '../utils/api';
import { 
  Plus, Edit2, Trash2, Tag, Calendar, Users, 
  ToggleLeft, ToggleRight, X, ArrowLeft, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';
import { SkeletonList } from './ui/SkeletonCard';
import PullToRefresh from './ui/PullToRefresh';

interface CouponsViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function CouponsView({ showToast }: CouponsViewProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [formValue, setFormValue] = useState('');
  const [formLimit, setFormLimit] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getCoupons();
      setCoupons(data);
    } catch (e: any) {
      showToast(e.message || "Failed to load coupons", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  // Trigger Edit Form
  const triggerEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormType(coupon.type);
    setFormValue(String(coupon.value));
    setFormLimit(coupon.usage_limit ? String(coupon.usage_limit) : '');
    setFormExpiry(coupon.expires_at || '');
    setFormIsActive(coupon.is_active);
    setIsFormOpen(true);
  };

  // Trigger Create Form
  const triggerCreate = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormType('percentage');
    setFormValue('');
    setFormLimit('');
    setFormExpiry('');
    setFormIsActive(true);
    setIsFormOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await ApiClient.deleteCoupon(deletingId);
      showToast("Coupon discount successfully deleted", "success");
      setDeletingId(null);
      loadCoupons();
    } catch (e: any) {
      showToast(e.message || "Failed to delete coupon", "error");
    }
  };

  // Submit Handler (Auto uppercase code)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode || !formValue) {
      showToast("Code and Discount Value are required fields", "warning");
      return;
    }

    setSubmitting(true);
    const payload = {
      code: formCode.toUpperCase().replace(/\s+/g, ''),
      type: formType,
      value: Number(formValue),
      usage_limit: formLimit ? Number(formLimit) : null,
      expires_at: formExpiry || null,
      is_active: formIsActive
    };

    try {
      await ApiClient.saveCoupon(payload, editingCoupon?.id);
      showToast(editingCoupon ? "Coupon successfully updated!" : "New coupon successfully generated!", "success");
      setIsFormOpen(false);
      loadCoupons();
    } catch (e: any) {
      showToast(e.message || "Failed to save coupon", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No Expiry';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <PullToRefresh onRefresh={async () => { await loadCoupons(); }}>
    <div className="space-y-6 pb-20">
      <AnimatePresence mode="wait">
        {!isFormOpen ? (
          // LIST VIEW
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Title & Add button */}
            <div className="flex justify-between items-center bg-bg-card border border-border-card/60 rounded-2xl p-4.5">
              <div>
                <h1 className="font-serif font-bold text-xl text-text-main tracking-tight">Promo Coupons</h1>
                <p className="text-xs text-text-body-muted mt-0.5">Manage discounts & special checkout campaigns</p>
              </div>

              <button 
                onClick={triggerCreate}
                className="px-4 py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-btn-primary/10 transition-colors"
              >
                <Plus size={14} /> Create Coupon
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-5">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by promo code..."
                className="w-full bg-bg-primary border border-border-card rounded-xl pl-10 pr-4 py-3 text-sm text-text-main outline-none focus:border-accent-amber transition-colors"
              />
            </div>

            {/* Coupons table */}
            {loading ? (
              <SkeletonList />
            ) : coupons.length === 0 ? (
              <div className="bg-bg-card/40 border border-border-card/30 rounded-2xl p-12 text-center text-text-body-muted flex flex-col items-center">
                <Tag size={40} className="stroke-[1.2] text-border-card mb-3" />
                <h3 className="font-serif font-bold text-text-main text-base">No Coupons Set</h3>
                <p className="text-xs text-text-body-muted mt-1 max-w-xs leading-relaxed">
                  Offer special checkout discounts to your buyers! Generate codes like EidMubarak or Summer10.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coupons.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                  <div 
                    key={c.id}
                    className={`bg-bg-card border rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden ${
                      c.is_active ? 'border-border-card/60' : 'border-border-card/30 opacity-70'
                    }`}
                  >
                    {/* Top Active Color strip */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${c.is_active ? 'bg-btn-primary' : 'bg-border-card'}`} />

                    <div>
                      {/* Code Banner */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-mono text-sm font-bold bg-bg-primary text-accent-amber px-3 py-1.5 rounded-lg border border-accent-amber-border/20 tracking-wider">
                          {c.code}
                        </div>
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          c.is_active ? 'bg-emerald-500/10 text-success-green' : 'bg-gray-500/10 text-text-body-muted'
                        }`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Detail row */}
                      <h3 className="text-base font-bold text-text-main mt-1">
                        Saves {c.type === 'percentage' ? `${c.value}%` : `Rs. ${c.value.toLocaleString('en-US')}`} off order
                      </h3>

                      {/* Info items */}
                      <div className="flex flex-wrap items-center gap-4 mt-3 pt-2.5 border-t border-border-card/40 text-xs text-text-body-muted font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} className="text-accent-amber" />
                          <span>Expires: {formatDate(c.expires_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={13} className="text-accent-amber" />
                          <span>Limit: {c.usage_limit || 'Unlimited'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-border-card/30">
                      <button 
                        onClick={() => triggerEdit(c)}
                        className="p-1.5 rounded-lg border border-border-card bg-bg-primary text-xs text-text-main font-bold flex items-center gap-1 cursor-pointer hover:bg-white/2"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => setDeletingId(c.id)}
                        className="p-1.5 rounded-lg border border-rose-900/50 bg-total-red/5 text-xs text-total-red font-bold flex items-center gap-1 cursor-pointer hover:bg-total-red/10"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* Floating Action Button (Mobile) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={triggerCreate}
              className="fixed bottom-24 right-6 w-14 h-14 bg-btn-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-btn-primary/30 cursor-pointer z-40 md:hidden"
            >
              <Plus size={24} strokeWidth={2.5} />
            </motion.button>

          </motion.div>
        ) : (
          // CREATE / EDIT FORM
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-bg-card border border-border-card/60 rounded-2xl p-5"
          >
            {/* Form Title & Back Anchor */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-card/40">
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 bg-bg-primary border border-border-card text-text-body-muted hover:text-text-main rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="font-serif font-bold text-lg text-text-main">
                  {editingCoupon ? 'Edit Discount Code' : 'Generate New Coupon Code'}
                </h2>
                <p className="text-[11px] text-text-body-muted mt-0.5">
                  {editingCoupon ? `Properties for coupon #${editingCoupon.id}` : 'List discount criteria to increase buyer volume'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Coupon Code *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. EIDMUBARAK"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono font-bold tracking-wider"
                />
                <span className="text-[9px] text-text-body-muted mt-1 block">Saves uppercase only, whitespace is auto-trimmed.</span>
              </div>

              {/* Segmented select Type */}
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Discount Type *</label>
                <div className="grid grid-cols-2 bg-bg-primary border border-border-card p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormType('percentage')}
                    className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      formType === 'percentage' 
                        ? 'bg-btn-primary text-white' 
                        : 'text-text-body-muted hover:text-white'
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('fixed')}
                    className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      formType === 'fixed' 
                        ? 'bg-btn-primary text-white' 
                        : 'text-text-body-muted hover:text-white'
                    }`}
                  >
                    Fixed PKR Amount (Rs.)
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Discount Value *</label>
                <input 
                  type="number"
                  required
                  min="1"
                  placeholder={formType === 'percentage' ? "e.g. 15 for 15% off" : "e.g. 500 for Rs. 500 off"}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
                />
              </div>

              {/* Expiry & Usage limit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Usage Limit</label>
                  <input 
                    type="number"
                    min="1"
                    placeholder="e.g. 100 uses"
                    value={formLimit}
                    onChange={(e) => setFormLimit(e.target.value)}
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Expires On</label>
                  <input 
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-bg-primary border border-border-card rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-text-main uppercase font-mono">Coupon Status</h4>
                  <p className="text-[10px] text-text-body-muted mt-0.5">Toggle live capability instantly on buyer checkouts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formIsActive} 
                    onChange={(e) => setFormIsActive(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-bg-card border border-border-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-btn-primary"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border-card/40 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-bg-primary border border-btn-secondary-border rounded-xl text-xs font-bold text-white hover:bg-black/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-btn-primary/15"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  {editingCoupon ? 'Save Changes' : 'Publish Coupon'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETION DIALOG */}
      <AnimatePresence>
        {deletingId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="w-full max-w-sm bg-bg-card border border-total-red/20 rounded-2xl p-5 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-total-red/10 border border-total-red/20 flex items-center justify-center text-total-red mx-auto mb-3.5">
                <Trash2 size={22} />
              </div>
              <h3 className="font-serif font-bold text-text-main text-lg">Remove Promo Coupon?</h3>
              <p className="text-xs text-text-body-muted mt-2 leading-relaxed">
                This will permanently delete this coupon campaign. Customers trying to apply this code at checkout will receive an error notice.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-4 py-2 bg-bg-primary border border-btn-secondary-border text-xs font-bold rounded-xl text-text-main hover:bg-bg-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-total-red hover:bg-total-red/20 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Delete Code
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </PullToRefresh>
  );
}
