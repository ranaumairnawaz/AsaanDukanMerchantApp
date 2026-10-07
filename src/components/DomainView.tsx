import React, { useState, useEffect } from 'react';
import { DomainResponse } from '../types';
import { ApiClient } from '../utils/api';
import { 
  Globe, Check, X, AlertCircle, RefreshCw,
  Clock, CheckCircle2, XCircle, CreditCard, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';
import PaymentModal from './ui/PaymentModal';

interface DomainViewProps {
  onNavigate: (tab: string, arg?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

// Status display config
const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  pending: {
    icon: <Clock size={16} />,
    label: 'Under Review',
    color: 'text-accent-amber',
    bg: 'bg-accent-amber/10 border-accent-amber/30',
  },
  quote_sent: {
    icon: <CreditCard size={16} />,
    label: 'Quote Received – Payment Required',
    color: 'text-btn-primary',
    bg: 'bg-btn-primary/10 border-btn-primary/30',
  },
  payment_submitted: {
    icon: <Clock size={16} />,
    label: 'Payment Submitted – Awaiting Setup',
    color: 'text-accent-amber',
    bg: 'bg-accent-amber/10 border-accent-amber/30',
  },
  active: {
    icon: <CheckCircle2 size={16} />,
    label: 'Domain Active',
    color: 'text-success-green',
    bg: 'bg-success-green/10 border-success-green/30',
  },
  rejected: {
    icon: <XCircle size={16} />,
    label: 'Request Rejected',
    color: 'text-total-red',
    bg: 'bg-total-red/10 border-total-red/30',
  },
};

export default function DomainView({ onNavigate, showToast }: DomainViewProps) {
  const [domainData, setDomainData] = useState<DomainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Subdomain fields
  const [subdomainInput, setSubdomainInput] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<'available' | 'taken' | null>(null);
  const [submittingSub, setSubmittingSub] = useState(false);

  // Custom domain fields
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [merchantOwnsDomain, setMerchantOwnsDomain] = useState(false);
  const [submittingCustom, setSubmittingCustom] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadDomainProfile = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getDomain();
      setDomainData(data);
      if (data.current_subdomain) setSubdomainInput(data.current_subdomain);
    } catch (e: any) {
      showToast(e.message || "Failed to load domain records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDomainProfile(); }, []);

  const checkSubdomainAvailability = async () => {
    const trimmed = subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!trimmed) { showToast("Please enter a subdomain", "warning"); return; }
    setCheckingAvailability(true);
    setAvailabilityResult(null);
    try {
      const available = await ApiClient.checkSubdomainAvailability(trimmed);
      setAvailabilityResult(available ? 'available' : 'taken');
    } catch (e: any) {
      showToast(e.message || "Availability scan failed", "error");
    } finally { setCheckingAvailability(false); }
  };

  const handleSubmitSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!trimmed) { showToast("Please enter a valid subdomain name", "warning"); return; }
    setSubmittingSub(true);
    try {
      const updated = await ApiClient.saveDomain('subdomain', trimmed);
      setDomainData(updated);
      showToast(`Subdomain '${trimmed}.asaandukan.online' request submitted!`, "success");
      setAvailabilityResult(null);
    } catch (e: any) {
      showToast(e.message || "Failed to save subdomain", "error");
    } finally { setSubmittingSub(false); }
  };

  const handleSubmitCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customDomainInput.trim().toLowerCase().replace(/\s+/g, '');
    if (!trimmed || !trimmed.includes('.')) {
      showToast("Please enter a valid domain (e.g. mybrand.pk)", "warning");
      return;
    }
    setSubmittingCustom(true);
    try {
      const res = await ApiClient.requestCustomDomain(trimmed, merchantOwnsDomain);
      setDomainData(res);
      if (merchantOwnsDomain) {
        showToast(`Domain request submitted! A configuration fee of Rs. ${res.connection_fee?.toLocaleString('en-US') ?? 400} applies.`, "success");
      } else {
        showToast(`Domain request submitted! Admin will review and send you a quote.`, "success");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to submit domain request", "error");
    } finally { setSubmittingCustom(false); }
  };

  const handleDomainPayment = async (file: File) => {
    if (!domainData?.custom_domain_request_id) return;
    await ApiClient.submitDomainPayment(domainData.custom_domain_request_id, file);
    loadDomainProfile();
  };

  if (loading) return <Spinner size="lg" label="Syncing domain records..." />;
  if (!domainData) return null;

  const hasActiveCustomDomain = !!domainData.current_custom_domain;
  const hasPendingCustomRequest = !!domainData.custom_domain_request && domainData.custom_domain_status !== 'rejected';
  const customStatus = domainData.custom_domain_status;
  const statusCfg = customStatus ? STATUS_CONFIG[customStatus] : null;

  const paymentAmount = domainData.merchant_owns_domain
    ? (domainData.connection_fee ?? 400)
    : (domainData.custom_domain_quote ?? 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-bg-card border border-border-card/60 rounded-2xl p-4.5">
        <h1 className="font-serif font-bold text-xl text-text-main tracking-tight">Domain & Store Routing</h1>
        <p className="text-xs text-text-body-muted mt-0.5">Configure your subdomain or link a custom brand domain to your storefront</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* ─── LEFT: Subdomain ─── */}
        <div className="bg-bg-card border border-border-card/60 rounded-2xl p-5 space-y-4">
          <h2 className="font-serif font-bold text-base text-text-main flex items-center gap-2 border-b border-border-card/40 pb-3">
            <Globe size={16} className="text-accent-amber" /> Standard Subdomain
          </h2>
          <p className="text-xs text-text-body-muted leading-relaxed">
            Every store gets a free <b className="text-text-main">.asaandukan.online</b> subdomain.
          </p>

          <form onSubmit={handleSubmitSubdomain} className="space-y-4 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Subdomain Handle</label>
              <div className="flex bg-bg-primary border border-border-card rounded-xl overflow-hidden p-1 items-center">
                <input
                  type="text"
                  disabled={domainData.subdomain_status === 'active'}
                  value={subdomainInput}
                  onChange={(e) => { setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setAvailabilityResult(null); }}
                  placeholder="e.g. peshawari-styles"
                  className="w-full bg-transparent px-3 py-1.5 text-xs text-text-main outline-none font-mono font-bold"
                />
                <span className="text-xs text-text-body-muted px-3 shrink-0 font-mono bg-bg-card py-1.5 rounded-lg border border-border-card/50">
                  .asaandukan.online
                </span>
              </div>
              <span className="text-[10px] text-text-body-muted mt-1 block">Lowercase letters, numbers, and hyphens only.</span>
            </div>

            {domainData.subdomain_status !== 'active' && (
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={checkSubdomainAvailability}
                  disabled={checkingAvailability || !subdomainInput}
                  className="px-4 py-2 bg-bg-primary border border-border-card hover:border-accent-amber hover:text-accent-amber text-xs font-bold text-text-main rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {checkingAvailability ? <RefreshCw size={11} className="animate-spin" /> : null}
                  Check Availability
                </button>
                {availabilityResult === 'available' && (
                  <span className="text-[11px] font-bold text-success-green flex items-center gap-1">
                    <Check size={12} /> Available
                  </span>
                )}
                {availabilityResult === 'taken' && (
                  <span className="text-[11px] font-bold text-total-red flex items-center gap-1">
                    <X size={12} /> Already taken
                  </span>
                )}
              </div>
            )}

            {domainData.subdomain_status === 'active' ? (
              <div className="p-3 bg-btn-primary/10 border border-btn-primary/30 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-success-green shrink-0" />
                <p className="text-[11px] text-text-body-muted font-mono leading-normal">
                  Active: <span className="font-bold text-text-main">{domainData.current_subdomain}.asaandukan.online</span>
                </p>
              </div>
            ) : domainData.subdomain_status === 'pending' ? (
              <div className="p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-xl flex items-center gap-2.5">
                <Clock size={14} className="text-accent-amber shrink-0 animate-pulse" />
                <p className="text-[11px] text-text-body-muted font-mono leading-normal">
                  Pending activation: <span className="font-bold text-text-main">{domainData.subdomain_request}.asaandukan.online</span>
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={submittingSub || availabilityResult !== 'available'}
                className={`w-full py-2 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md ${
                  availabilityResult === 'available'
                    ? 'bg-btn-primary hover:bg-btn-primary-hover text-white'
                    : 'bg-bg-card text-text-body-muted border border-border-card cursor-not-allowed'
                }`}
              >
                {submittingSub && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                Request Subdomain
              </button>
            )}
          </form>
        </div>

        {/* ─── RIGHT: Custom Domain ─── */}
        <div className="bg-bg-card border border-border-card/60 rounded-2xl p-5 space-y-4">
          <h2 className="font-serif font-bold text-base text-text-main flex items-center gap-2 border-b border-border-card/40 pb-3">
            <Globe size={16} className="text-accent-amber" /> Custom Brand Domain
          </h2>
          <p className="text-xs text-text-body-muted leading-relaxed">
            Link your own domain (e.g. <b className="text-text-main">mybrand.pk</b>) to your storefront. Admin will handle DNS configuration.
          </p>

          {/* Active custom domain banner */}
          {hasActiveCustomDomain && (
            <div className="p-3.5 bg-success-green/10 border border-success-green/30 rounded-xl flex items-center gap-3">
              <CheckCircle2 size={18} className="text-success-green shrink-0" />
              <div>
                <p className="text-xs font-bold text-text-main">Domain Active</p>
                <p className="text-[10px] text-text-body-muted font-mono mt-0.5">{domainData.current_custom_domain}</p>
              </div>
            </div>
          )}

          {/* Pending request status card */}
          {hasPendingCustomRequest && statusCfg && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-4 space-y-3 ${statusCfg.bg}`}
              >
                <div className={`flex items-center gap-2 text-xs font-bold ${statusCfg.color}`}>
                  {statusCfg.icon}
                  {statusCfg.label}
                </div>

                <div className="bg-black/20 rounded-lg px-3 py-2 font-mono text-xs text-white border border-white/10">
                  {domainData.custom_domain_request}
                </div>

                {/* Ownership pill */}
                <p className="text-[10px] text-text-body-muted">
                  {domainData.merchant_owns_domain ? '✓ You own this domain — configuration fee applies.' : '× You do not own this domain — admin will quote a price.'}
                </p>

                {/* Admin note on rejection */}
                {customStatus === 'rejected' && domainData.admin_note && (
                  <div className="bg-total-red/10 border border-total-red/20 rounded-lg px-3 py-2 text-[10px] text-text-body-muted">
                    <span className="text-total-red font-bold block mb-0.5">Reason:</span>
                    {domainData.admin_note}
                  </div>
                )}

                {/* Quote card */}
                {customStatus === 'quote_sent' && (
                  <div className="space-y-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] text-text-body-muted font-mono uppercase tracking-wider">Amount Due</span>
                      <span className="text-lg font-serif font-bold text-text-main">Rs. {paymentAmount.toLocaleString('en-US')}</span>
                    </div>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard size={14} /> Submit Payment Proof
                    </button>
                  </div>
                )}

                {customStatus === 'payment_submitted' && (
                  <p className="text-[10px] text-accent-amber font-mono">
                    Payment received. Admin will configure your domain shortly.
                  </p>
                )}

                {/* Option to cancel and re-request (if rejected or pending) */}
                {(customStatus === 'rejected') && (
                  <button
                    onClick={() => setDomainData({ ...domainData, custom_domain_request: null, custom_domain_status: undefined, custom_domain_request_id: undefined })}
                    className="w-full py-1.5 border border-border-card text-[10px] font-bold text-text-body-muted rounded-lg hover:border-white hover:text-text-main transition-colors"
                  >
                    Submit a new request
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* New request form — shown when no active/pending custom domain */}
          {!hasPendingCustomRequest && !hasActiveCustomDomain && (
            <form onSubmit={handleSubmitCustomDomain} className="space-y-4 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Domain Address</label>
                <input
                  type="text"
                  placeholder="e.g. www.mybrand.pk or mybrand.com"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
                />
              </div>

              {/* Domain ownership toggle */}
              <div className="p-4 bg-bg-primary border border-border-card rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setMerchantOwnsDomain(!merchantOwnsDomain)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                      merchantOwnsDomain ? 'bg-btn-primary border-btn-primary' : 'border-border-card bg-bg-card'
                    }`}
                  >
                    {merchantOwnsDomain && <Check size={12} className="text-text-main" />}
                  </button>
                  <div>
                    <p className="text-xs font-bold text-text-main">I already own this domain</p>
                    <p className="text-[10px] text-text-body-muted mt-0.5 leading-relaxed">
                      Check this if you've purchased the domain yourself. A one-time configuration fee of <span className="text-accent-amber font-bold">Rs. {(domainData.connection_fee ?? 400).toLocaleString('en-US')}</span> applies.
                    </p>
                  </div>
                </div>

                {!merchantOwnsDomain && (
                  <div className="flex items-start gap-2 pt-2 border-t border-border-card/30">
                    <HelpCircle size={12} className="text-text-body-muted shrink-0 mt-0.5" />
                    <p className="text-[10px] text-text-body-muted leading-relaxed">
                      If you don't own a domain, admin will check availability and send you a price quote before purchase.
                    </p>
                  </div>
                )}
              </div>

              {!domainData.custom_domain_allowed && (
                <div className="p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-xl flex items-center gap-2.5">
                  <AlertCircle size={14} className="text-accent-amber shrink-0" />
                  <p className="text-[11px] text-text-body-muted">Custom domains require an upgraded plan.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingCustom || !customDomainInput || !domainData.custom_domain_allowed}
                className="w-full py-2.5 bg-btn-primary hover:bg-btn-primary-hover disabled:bg-border-card disabled:text-text-body-muted disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-btn-primary/10"
              >
                {submittingCustom && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                {merchantOwnsDomain ? 'Request Configuration (Rs. ' + (domainData.connection_fee ?? 400).toLocaleString('en-US') + ')' : 'Send Domain Request'}
              </button>
            </form>
          )}
        </div>

      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Custom Domain Payment"
        description={`Submit payment proof for: ${domainData?.custom_domain_request}`}
        amount={paymentAmount}
        paymentAccounts={domainData?.payment_accounts}
        onSubmit={handleDomainPayment}
        showToast={showToast}
      />
    </div>
  );
}
