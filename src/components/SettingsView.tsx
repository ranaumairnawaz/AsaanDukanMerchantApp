import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { ApiClient } from '../utils/api';
import { 
  Settings, Save, Landmark, Upload, CheckCircle, 
  HelpCircle, ShieldCheck, Mail, Phone, MapPin, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';
import PaymentModal from './ui/PaymentModal';

interface SettingsViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function SettingsView({ showToast }: SettingsViewProps) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Core Fields
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState<number | string>(0);

  // Bank fields
  const [bankName, setBankName] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Payment proof submission fields
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const response = await ApiClient.getSettings();
      setSettings(response);
      
      // Seed fields
      setStoreName(response.store_name);
      setPhone(response.phone);
      setSupportEmail(response.support_email || '');
      setSupportPhone(response.support_phone || '');
      setAddress(response.address || '');
      setCity(response.city || '');
      setDeliveryCharge(response.delivery_charge || 0);
      setBankName(response.bank_name || '');
      setAccountTitle(response.account_title || '');
      setAccountNumber(response.account_number || '');
    } catch (e: any) {
      showToast(e.message || "Failed to load store settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings && storeName !== settings.store_name && !settings.can_change_store_info) {
      setShowPaymentModal(true);
      return;
    }

    setSaving(true);

    const payload = {
      name: storeName,
      whatsapp_number: phone,
      support_email: supportEmail || null,
      support_phone: supportPhone || null,
      address: address || null,
      city: city || null,
      delivery_charge: Number(deliveryCharge),
      bank_name: bankName || null,
      account_title: accountTitle || null,
      account_number: accountNumber || null
    };

    try {
      const updated = await ApiClient.updateSettings(payload);
      setSettings(updated);
      showToast("Store configuration changes successfully saved!", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockPayment = async (file: File) => {
    try {
      await ApiClient.requestUnlock('store_info_change', file);
      loadSettingsData(); // Reload to get pending status
    } catch (e: any) {
      throw e;
    }
  };

  if (loading) {
    return (
      <Spinner size="lg" label="Syncing server parameters..." />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* Settings Grid */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Core settings (Col-span-7) */}
        <div className="md:col-span-7 bg-bg-card border border-border-card/60 rounded-2xl p-5 space-y-4">
          <h2 className="font-serif font-bold text-base text-text-main flex items-center gap-2 border-b border-border-card/40 pb-3">
            <Settings size={16} className="text-accent-amber" /> Store & Contact Profiling
          </h2>

          <div className="space-y-4">
            {/* Store name */}
            <div>
              <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Storefront Brand Name *</label>
              <input 
                type="text" required value={storeName} onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Peshawari Artisans"
                className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
              />
            </div>

            {/* Primary account phone */}
            <div>
              <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Owner Primary Phone *</label>
              <input 
                type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +923001234567"
                className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
              />
              <span className="text-[10px] text-text-body-muted mt-1 block">Receives backup notifications if automated webhooks face delivery queues.</span>
            </div>

            {/* Support communications */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Support Email</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-body-muted" />
                  <input 
                    type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@asaandukan.online"
                    className="w-full bg-bg-primary border border-border-card rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Customer Support Phone</label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-body-muted" />
                  <input 
                    type="text" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="+923330001111"
                    className="w-full bg-bg-primary border border-border-card rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Physical location */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Physical Address</label>
                <input 
                  type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Qissa Khwani Bazaar Shop #4"
                  className="w-full bg-bg-primary border border-border-card rounded-xl px-3 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">City</label>
                <input 
                  type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Peshawar"
                  className="w-full bg-bg-primary border border-border-card rounded-xl px-3 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                />
              </div>
              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Delivery Charge (Rs.) *</label>
                <input 
                  type="number" required value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Bank setup & Verification attachments (Col-span-5) */}
        <div className="md:col-span-5 space-y-5">
          {/* Bank setup card */}
          <div className="bg-bg-card border border-border-card/60 rounded-2xl p-5 space-y-4">
            <h2 className="font-serif font-bold text-base text-text-main flex items-center gap-2 border-b border-border-card/40 pb-3">
              <Landmark size={16} className="text-accent-amber" /> Commercial Bank Payout
            </h2>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-text-body-muted mb-1 uppercase font-mono">Bank Name</label>
                <input 
                  type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Habib Bank Limited, Meezan Bank"
                  className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-body-muted mb-1 uppercase font-mono">Account Title</label>
                <input 
                  type="text" value={accountTitle} onChange={(e) => setAccountTitle(e.target.value)}
                  placeholder="e.g. Muhammad Bilal Chappal Traders"
                  className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-body-muted mb-1 uppercase font-mono">Account / IBAN Number</label>
                <input 
                  type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. PK83MEZN000109283921"
                  className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none font-mono"
                />
              </div>
              <span className="text-[10px] text-text-body-muted block leading-normal">
                If Cash-on-Delivery is active, these commercial credentials display as fallback options for online buyer payments at final checkout.
              </span>
            </div>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="md:col-span-12 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto px-6 py-3 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#1E8449]/15"
          >
            <Save size={14} />
            {saving ? 'Saving changes...' : 'Save All Settings'}
          </button>
        </div>

      </form>

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Store Information Change"
        description="Your plan requires a one-time fee to change store branding."
        amount={settings?.store_info_change_fee || 0}
        paymentAccounts={settings?.payment_accounts}
        onSubmit={handleUnlockPayment}
        showToast={showToast}
      />
    </div>
  );
}
