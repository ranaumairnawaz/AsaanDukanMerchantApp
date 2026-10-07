import { useState, useEffect } from 'react';
import { BillingResponse } from '../types';
import { ApiClient } from '../utils/api';
import { 
  CreditCard, MessageSquare, AlertTriangle, Sparkles, Check, X,
  HelpCircle, Calendar, DollarSign, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';
import PaymentModal from './ui/PaymentModal';

interface BillingViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

const FEATURE_DEFS = [
  { key: 'product_limit',                   icon: '📦', label: 'Products',                    fmt: 'num' },
  { key: 'order_limit_monthly',             icon: '📝', label: 'Orders / month',               fmt: 'num' },
  { key: 'staff_logins_limit',              icon: '👥', label: 'Staff Logins',                 fmt: 'num' },
  { key: 'message_quota_monthly',           icon: '💬', label: 'WhatsApp Messages / mo',        fmt: 'num' },
  { key: 'analytics_enabled',               icon: '📊', label: 'Analytics Dashboard',           fmt: 'bool' },
  { key: 'customer_whatsapp_notifications', icon: '🔔', label: 'Customer Notifications',        fmt: 'bool' },
  { key: 'subdomain_allowed',               icon: '🌐', label: 'Free Subdomain',               fmt: 'bool' },
  { key: 'custom_domain_allowed',           icon: '🔗', label: 'Custom Domain',                fmt: 'bool' },
  { key: 'premium_themes_allowed',          icon: '🎨', label: 'Premium Themes',               fmt: 'bool' },
  { key: 'theme_change_allowed',            icon: '🖌️', label: 'Theme Changes',                fmt: 'num_or_bool' },
  { key: 'customer_crm',                    icon: '🗂️', label: 'Customer CRM',                 fmt: 'bool' },
  { key: 'bulk_import_export',              icon: '⬆️', label: 'Bulk Import / Export',          fmt: 'bool' },
  { key: 'store_info_change_allowed',       icon: '✏️', label: 'Store Info Edits',              fmt: 'num_or_bool' },
];

const getFeatVal = (plan: any, key: string) => plan.features?.find((f: any) => f.key === key)?.value ?? null;
const fmtFeat = (val: string | null, fmt: string) => {
  if (!val && val !== '0') return null;
  if (val === 'unlimited') return { t: 'text', v: '∞' };
  if (fmt === 'bool')        return { t: val === '1' ? 'yes' : 'no' };
  if (fmt === 'num')         return val === '0' ? { t: 'no' } : { t: 'text', v: val };
  if (fmt === 'num_or_bool') return val === '0' ? { t: 'no' } : val === '1' ? { t: 'yes' } : { t: 'text', v: val };
  return { t: 'text', v: val };
};

export default function BillingView({ showToast }: BillingViewProps) {
  const [billingData, setBillingData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any>(null);

  const loadBillingDetails = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getBilling();
      setBillingData(data);
    } catch (e: any) {
      showToast(e.message || "Failed to load billing details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingDetails();
  }, []);

  const handleUpgradeSubmit = async (file: File) => {
    if (!selectedPlanForUpgrade) return;
    await ApiClient.submitPlanPayment(selectedPlanForUpgrade.id || 0, file);
    loadBillingDetails();
  };

  const formatPKR = (val?: number | null) => {
    if (val === undefined || val === null) return 'Rs. 0';
    return `Rs. ${val.toLocaleString('en-US')}`;
  };

  if (loading) {
    return (
      <Spinner size="lg" label="Syncing billing cycles..." />
    );
  }

  if (!billingData) return null;

  const { billing, plan, all_plans } = billingData;
  const isQuotaReached = billing.messages_sent >= billing.quota_limit;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Title */}
      <div className="bg-bg-card border border-border-card/60 rounded-2xl p-4.5">
        <h1 className="font-serif font-bold text-xl text-text-main tracking-tight">Billing & Quota Metrics</h1>
        <p className="text-xs text-text-body-muted mt-0.5">Track your notification usage, monthly subscription, and invoices</p>
      </div>

      {/* Grid: Quotas progress & plan comparison */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT: Usage progress & stats (Col-span-5) */}
        <div className="md:col-span-5 space-y-4">
          
          {/* Active plan card */}
          <div className="bg-bg-card border border-border-card/60 rounded-2xl p-4.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 bg-btn-primary/10 rounded-bl-xl font-mono text-[9px] text-accent-amber font-bold border-l border-b border-accent-amber-border/20 uppercase tracking-wider">
              {billing.subscription_status}
            </div>
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-text-body-muted font-bold">Active Store Tier</h3>
            <h2 className="font-serif font-bold text-text-main text-xl mt-1 capitalize">{plan.name} Plan</h2>
            
            <div className="flex items-baseline gap-1 mt-3 font-mono">
              <span className="text-2xl font-bold text-text-main">{formatPKR(plan.price_monthly)}</span>
              <span className="text-xs text-text-body-muted">/ month</span>
            </div>

            <div className="pt-3.5 mt-4 border-t border-border-card/30 flex items-center gap-2 text-xs text-text-body-muted">
              <Calendar size={13} className="text-accent-amber shrink-0" />
              <span>Expires: {new Date(billing.subscription_expires_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* WhatsApp usage quota tracker progress bar */}
          <div className="bg-bg-card border border-border-card/60 rounded-2xl p-4.5 space-y-3.5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-text-main flex items-center gap-1.5">
                  <MessageSquare size={15} className="text-btn-primary" /> WhatsApp Quota Status
                </h3>
                <p className="text-[10px] text-text-body-muted mt-0.5 font-mono">Transactional messages tracker</p>
              </div>
              <span className="font-mono text-sm font-bold text-text-main">
                {billing.messages_sent} / {billing.quota_limit}
              </span>
            </div>

            {/* Warning threshold box if 100% */}
            {isQuotaReached && (
              <div className="bg-rose-500/10 border border-total-red/20 rounded-xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle size={15} className="text-total-red shrink-0 mt-0.5 animate-pulse" />
                <p className="text-[10px] text-text-body-muted leading-normal">
                  <span className="font-bold text-text-main block mb-0.5">Quota Limit Reached!</span>
                  Your WhatsApp quota is fully exhausted. Customer delivery logs are paused. Overage billing charges are now active or upgrade subscription immediately.
                </p>
              </div>
            )}

            {/* Custom styled progress bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-bg-primary border border-border-card/60 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isQuotaReached ? 'bg-total-red' : 'bg-btn-primary'}`} 
                  style={{ width: `${Math.min(billing.usage_pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-text-body-muted font-mono">
                <span>0 sent</span>
                <span>{billing.usage_pct}% used</span>
                <span>{billing.quota_limit} max</span>
              </div>
            </div>
          </div>

          {/* WhatsApp Overage invoicing logs */}
          {billing.overage_count > 0 && (
            <div className="bg-bg-card border border-total-red/20 rounded-2xl p-4.5 space-y-3">
              <h3 className="text-xs font-mono font-bold text-total-red uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} className="animate-pulse" /> WhatsApp Overage Invoice
              </h3>
              <p className="text-[10px] text-text-body-muted leading-normal">
                Usage exceeded the included quota package. Additional messages are billed per rate:
              </p>

              <div className="bg-bg-primary rounded-xl p-3 font-mono text-xs text-text-body-muted space-y-1.5 border border-border-card/40">
                <div className="flex justify-between">
                  <span>Additional Sent:</span>
                  <span className="text-text-main font-bold">{billing.overage_count} messages</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate per message:</span>
                  <span className="text-text-main font-bold">{formatPKR(billing.overage_price)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border-card/30 text-text-main font-bold">
                  <span>WA Overage Total:</span>
                  <span className="text-total-red">{formatPKR(billing.wa_overage_cost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Order Overage invoicing */}
          {(billing.order_overage_count ?? 0) > 0 && (
            <div className="bg-bg-card border border-amber-500/20 rounded-2xl p-4.5 space-y-3">
              <h3 className="text-xs font-mono font-bold text-accent-amber uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} className="animate-pulse" /> Order Overage Invoice
              </h3>
              <p className="text-[10px] text-text-body-muted leading-normal">
                Your store received more orders than your plan's monthly limit. You will be charged per extra order at renewal.
              </p>

              <div className="bg-bg-primary rounded-xl p-3 font-mono text-xs text-text-body-muted space-y-1.5 border border-border-card/40">
                <div className="flex justify-between">
                  <span>Plan Limit:</span>
                  <span className="text-text-main font-bold">{billing.order_limit ?? '∞'} orders / mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Orders This Cycle:</span>
                  <span className="text-text-main font-bold">{billing.orders_this_cycle ?? billing.orders_this_month ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Extra Orders:</span>
                  <span className="text-accent-amber font-bold">{billing.order_overage_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate per order:</span>
                  <span className="text-text-main font-bold">{formatPKR(billing.extra_order_fee)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border-card/30 text-text-main font-bold">
                  <span>Order Overage Total:</span>
                  <span className="text-accent-amber">{formatPKR(billing.order_overage_cost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Total Renewal Cost */}
          {((billing.total_overage_cost ?? 0) > 0) && (
            <div className="bg-bg-card border border-btn-primary/30 rounded-2xl p-4.5">
              <h3 className="text-xs font-mono font-bold text-btn-primary uppercase tracking-wider mb-3">Next Renewal Invoice</h3>
              <div className="bg-bg-primary rounded-xl p-3 font-mono text-xs text-text-body-muted space-y-1.5 border border-border-card/40">
                <div className="flex justify-between">
                  <span>Base Plan:</span>
                  <span className="text-text-main font-bold">{formatPKR(billing.plan_price_monthly)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Overages:</span>
                  <span className="text-total-red font-bold">+ {formatPKR(billing.total_overage_cost)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border-card/30 text-text-main font-bold text-sm">
                  <span>Total Due:</span>
                  <span className="text-btn-primary">{formatPKR(billing.renewal_total)}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Comparative Plan Grid (Col-span-7) */}
        <div className="md:col-span-7 bg-bg-card border border-border-card/60 rounded-2xl p-5 space-y-4">
          <h2 className="font-serif font-bold text-base text-text-main flex items-center gap-2 border-b border-border-card/40 pb-3">
            <Sparkles size={16} className="text-accent-amber" /> Comparative Subscription plans
          </h2>
          <p className="text-xs text-text-body-muted leading-relaxed">
            Upgrade your subscription tier to increase message quotas, unlock custom domain routing, list premium themes, and configure unlimited staff.
          </p>

          <div className="grid grid-cols-1 gap-4 pt-1.5">
            {all_plans.map((p) => {
              const isCurrent = plan?.name && p.name.toLowerCase() === plan.name.toLowerCase();
              return (
                <div 
                  key={p.name}
                  className={`border rounded-xl p-4.5 flex flex-col justify-between relative overflow-hidden transition-colors ${
                    isCurrent 
                      ? 'border-btn-primary bg-btn-primary/5' 
                      : 'border-border-card/65 bg-bg-primary'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute top-0 right-0 bg-btn-primary text-white px-2.5 py-0.5 rounded-bl-lg font-mono text-[8px] font-bold uppercase tracking-wider">
                      Current Active Plan
                    </div>
                  )}

                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-text-main capitalize">{p.name} Package</h4>
                      <div className="flex items-baseline gap-1 mt-1 font-mono text-xs">
                        <span className="text-base font-bold text-text-main">{formatPKR(p.price_monthly)}</span>
                        <span className="text-text-body-muted text-[10px]">/ month</span>
                      </div>
                    </div>
                  </div>

                  {/* Features listing list */}
                  <div className="space-y-1.5 py-2.5 border-t border-border-card/30">
                    {FEATURE_DEFS.map((def) => {
                      const val = getFeatVal(p, def.key);
                      const fmtd = fmtFeat(val, def.fmt);
                      
                      const isDisallowed = fmtd?.t === 'no' || !fmtd;
                      const isAllowed = fmtd?.t === 'yes' || fmtd?.t === 'text';

                      return (
                        <div key={def.key} className={`flex items-center justify-between gap-2 text-[11px] leading-relaxed ${
                          isDisallowed ? 'opacity-50 text-text-body-muted line-through' : 'text-text-main'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0">{def.icon}</span>
                            <span>{def.label}</span>
                          </div>
                          
                          {/* Value display */}
                          <div className="shrink-0 font-mono font-bold text-[10px]">
                            {!fmtd ? (
                              <span className="text-text-body-muted">—</span>
                            ) : fmtd.t === 'yes' ? (
                              <Check size={11} className="text-success-green inline" />
                            ) : fmtd.t === 'no' ? (
                              <X size={11} className="text-total-red inline" />
                            ) : (
                              <span className="text-accent-amber">{fmtd.v}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions call link to WhatsApp or Modal */}
                  {!isCurrent && (
                    <button
                      onClick={() => {
                        setSelectedPlanForUpgrade(p);
                        setShowPaymentModal(true);
                      }}
                      className="mt-3.5 w-full py-2 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-lg text-center flex items-center justify-center gap-1 transition-colors"
                    >
                      Upgrade to {p.name} <ArrowRight size={12} />
                    </button>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      </div>

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Upgrade Plan"
        description={`Submit payment for the ${selectedPlanForUpgrade?.name} plan. Includes any outstanding overages.`}
        amount={selectedPlanForUpgrade ? billing.renewal_total : 0}
        paymentAccounts={billingData.payment_accounts}
        onSubmit={handleUpgradeSubmit}
        showToast={showToast}
      />
    </div>
  );
}
