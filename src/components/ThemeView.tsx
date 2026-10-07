import React, { useState, useEffect } from 'react';
import { ThemeResponse, ThemeSettings } from '../types';
import { ApiClient } from '../utils/api';
import {
  Palette, Upload, Sparkles, ShieldAlert, Check,
  Image, Type, MessageSquare, Search, FileText, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';
import PaymentModal from './ui/PaymentModal';

interface ThemeViewProps {
  onNavigate: (tab: string, arg?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function ThemeView({ onNavigate, showToast }: ThemeViewProps) {
  const [themeData, setThemeData] = useState<ThemeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Custom form settings
  const [activeSlug, setActiveSlug] = useState('');
  const [accentColor, setAccentColor] = useState('#E0A458');
  const [secondaryColor, setSecondaryColor] = useState('#1C7A45');
  const [bgColor, setBgColor] = useState('#0F1A2E');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [typography, setTypography] = useState('Inter');
  const [headingFont, setHeadingFont] = useState('Lora');

  const [bannerText, setBannerText] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');

  // Branding files (Hold Files or URL strings)
  const [faviconFile, setFaviconFile] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<any>(null);
  const [bannerFile, setBannerFile] = useState<any>(null);
  const [seoFile, setSeoFile] = useState<any>(null);

  // Group tab within theme settings
  const [activeSettingsTab, setActiveSettingsTab] = useState<'branding' | 'styling' | 'copy' | 'seo'>('branding');

  // One time unlock drawer trigger
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadThemeSettings = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getTheme();
      setThemeData(data);

      // Seed form values
      setActiveSlug(data.active_slug);
      setAccentColor(data.settings.accent_color);
      setSecondaryColor(data.settings.secondary_color);
      setBgColor(data.settings.bg_color);
      setTextColor(data.settings.text_color);
      setTypography(data.settings.typography);
      setHeadingFont(data.settings.heading_font);
      setBannerText(data.settings.banner_text || '');
      setStoreDesc(data.settings.store_description || '');
      setSeoTitle(data.settings.seo_title || '');
      setSeoDesc(data.settings.seo_description || '');

      setFaviconFile(data.settings.favicon || null);
      setLogoFile(data.settings.logo || null);
      setBannerFile(data.settings.banner_image || null);
      setSeoFile(data.settings.seo_image || null);
    } catch (e: any) {
      showToast(e.message || "Failed to fetch theme profile", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThemeSettings();
  }, []);

  // Preset Theme selector handler (catches paid triggers)
  const handleSelectPresetTheme = (slug: string) => {
    if (!themeData) return;
    const selected = themeData.themes[slug];

    // Check if Premium & can_change is false
    if (selected.premium && !themeData.can_change && !themeData.theme_unlock_pending) {
      setActiveSlug(slug); // Visual select anyway
      setShowUnlockModal(true);
      return;
    }

    if (selected.premium && themeData.theme_unlock_pending) {
      showToast("Payment for theme change unlock is currently pending admin validation.", "warning");
      return;
    }

    // Set presets matching chosen themes
    setActiveSlug(slug);
    if (slug === 'default_slate') {
      setAccentColor('#E0A458');
      setSecondaryColor('#1C7A45');
      setBgColor('#0F1A2E');
      setTextColor('#FFFFFF');
      setTypography('Inter');
      setHeadingFont('Lora');
    } else if (slug === 'emerald_breeze') {
      setAccentColor('#10B981');
      setSecondaryColor('#065F46');
      setBgColor('#022C22');
      setTextColor('#F0FDF4');
      setTypography('Inter');
      setHeadingFont('Inter');
    } else if (slug === 'amber_nights') {
      setAccentColor('#F59E0B');
      setSecondaryColor('#78350F');
      setBgColor('#1E1B4B');
      setTextColor('#EEF2F6');
      setTypography('Inter');
      setHeadingFont('Lora');
    } else if (slug === 'royal_crimson') {
      setAccentColor('#E11D48');
      setSecondaryColor('#4C0519');
      setBgColor('#1E0209');
      setTextColor('#FFF1F2');
      setTypography('Inter');
      setHeadingFont('Lora');
    }
  };

  // Submit Save Changes
  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeData) return;

    setSaving(true);
    const payload: any = {
      theme_slug: activeSlug,
      accent_color: accentColor,
      secondary_color: secondaryColor,
      bg_color: bgColor,
      text_color: textColor,
      typography,
      heading_font: headingFont,
      banner_text: bannerText || null,
      store_description: storeDesc || null,
      seo_title: seoTitle || null,
      seo_description: seoDesc || null
    };

    // Attach File objects if they were newly selected (instanceof File)
    if (faviconFile instanceof File) payload.favicon = faviconFile;
    if (logoFile instanceof File) payload.logo = logoFile;
    if (bannerFile instanceof File) payload.banner_image = bannerFile;
    if (seoFile instanceof File) payload.seo_image = seoFile;

    try {
      const response = await ApiClient.updateTheme(payload);
      setThemeData(response);
      showToast("Store theme settings successfully updated! View live results in preview.", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to update theme profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockPayment = async (file: File) => {
    try {
      await ApiClient.requestUnlock('theme_change', file);
      loadThemeSettings(); // Reload to get pending status
    } catch (e: any) {
      throw e;
    }
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'favicon' | 'logo' | 'banner' | 'seo') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxLimit = field === 'favicon' ? 1 : 10; // Favicons 1MB max, others 10MB max

      if (file.size > maxLimit * 1024 * 1024) {
        showToast(`Selected file exceeds maximum limit of ${maxLimit}MB.`, "warning");
        return;
      }

      if (field === 'favicon') setFaviconFile(file);
      if (field === 'logo') setLogoFile(file);
      if (field === 'banner') setBannerFile(file);
      if (field === 'seo') setSeoFile(file);
    }
  };

  if (loading) {
    return (
      <Spinner size="lg" label="Retrieving visual layout metadata..." />
    );
  }

  if (!themeData) return null;

  // Render Theme Visual Preset Card
  const getPresetPreviewStyle = (slug: string) => {
    switch (slug) {
      case 'default_slate': return 'bg-gradient-to-br from-[#0F1A2E] via-[#162238] to-[#1C7A45] text-accent-amber';
      case 'emerald_breeze': return 'bg-gradient-to-br from-[#022C22] via-[#065F46] to-[#10B981] text-[#10B981]';
      case 'amber_nights': return 'bg-gradient-to-br from-[#1E1B4B] via-[#4C1D95] to-[#F59E0B] text-[#F59E0B]';
      case 'royal_crimson': return 'bg-gradient-to-br from-[#1E0209] via-[#4C0519] to-[#E11D48] text-[#E11D48]';
      default: return 'bg-slate-900';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Title */}
      <div className="bg-bg-card border border-border-card/60 rounded-2xl p-4.5">
        <h1 className="font-serif font-bold text-xl text-text-main tracking-tight">Theme & Styling Customizer</h1>
        <p className="text-xs text-text-body-muted mt-0.5">Customize your storefront visual identities, branding logs, and colors</p>
      </div>

      <form onSubmit={handleSaveTheme} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* LEFT PRESENTS PICKER PANEL (Col-span-5) */}
        <div className="md:col-span-5 bg-bg-card border border-border-card/60 rounded-2xl p-5 space-y-4">
          <h2 className="font-serif font-bold text-base text-text-main flex items-center gap-2">
            <Palette size={16} className="text-accent-amber" /> Presets Theme Gallery
          </h2>
          <p className="text-xs text-text-body-muted leading-relaxed">
            Select a theme template for your store. Premium themes require a plan with <span className="text-accent-amber font-bold">Theme Change</span> permission.
          </p>

          <div className="grid grid-cols-1 gap-3.5 pt-2">
            {Object.entries(themeData.themes).map(([slug, meta]: [string, any]) => {
              const isActive = activeSlug === slug;
              const isPremium = meta.premium || meta.is_premium;
              const isLocked = isPremium && !themeData.can_change;
              const isPending = isPremium && themeData.theme_unlock_pending;

              return (
                <div
                  key={slug}
                  onClick={() => handleSelectPresetTheme(slug)}
                  className={`border rounded-xl p-4.5 cursor-pointer flex justify-between items-center relative transition-all active:scale-[0.99] ${isActive
                    ? 'border-accent-amber bg-accent-amber/5'
                    : 'border-border-card/50 hover:border-white/20 bg-bg-primary'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Visual Preset Small Color Swatch box */}
                    <div className={`w-10 h-10 rounded-lg ${getPresetPreviewStyle(slug)} flex items-center justify-center border border-white/10 shrink-0 font-serif font-bold text-xs`}>
                      Aa
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-main">{meta.name}</h4>
                      <p className="text-[10px] text-text-body-muted font-mono mt-0.5 uppercase tracking-wide">
                        {(meta.premium || meta.is_premium) ? 'Premium Theme' : 'Free Theme'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isLocked && !isPending && (
                      <div className="p-1.5 bg-total-red/10 border border-total-red/20 text-total-red rounded-lg" title="Premium - Locked">
                        <Lock size={14} />
                      </div>
                    )}
                    {isPending && (
                      <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-accent-amber border border-accent-amber-border/30 px-2 py-1 rounded">
                        PENDING
                      </span>
                    )}
                    {isActive && !isLocked && !isPending && (
                      <div className="p-1 bg-btn-primary text-white rounded-full">
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT CUSTOMIZER OPTIONS PANEL (Col-span-7) */}
        <div className="md:col-span-7 bg-bg-card border border-border-card/60 rounded-2xl p-5 space-y-5">
          {/* Settings Group Tabs header */}
          <div className="flex border-b border-border-card/60 gap-1 overflow-x-auto scrollbar-none pb-1">
            {(['branding', 'styling', 'copy', 'seo'] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveSettingsTab(tab)}
                className={`px-3 py-2 text-xs font-bold capitalize transition-all border-b-2 cursor-pointer ${activeSettingsTab === tab
                  ? 'border-accent-amber text-accent-amber'
                  : 'border-transparent text-text-body-muted hover:text-text-main'
                  }`}
              >
                {tab === 'branding' && 'Branding'}
                {tab === 'styling' && 'Colors & Fonts'}
                {tab === 'copy' && 'Storefront Copy'}
                {tab === 'seo' && 'SEO Metas'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* BRANDING TAB */}
            {activeSettingsTab === 'branding' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-4 relative"
              >
                {/* Removed Theme Switching Locked overlay to allow branding customization on all plans */}
                {/* Favicon picker */}
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Browser Favicon (Max 1MB, .ico/png)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-bg-primary border border-border-card rounded-xl flex items-center justify-center text-text-body-muted overflow-hidden">
                      {faviconFile ? (
                        <img
                          src={faviconFile instanceof File ? URL.createObjectURL(faviconFile) : faviconFile}
                          alt="favicon"
                          className="w-8 h-8 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Palette size={18} />
                      )}
                    </div>
                    <label className="px-4 py-2 bg-bg-primary hover:bg-black/20 border border-border-card rounded-xl text-xs font-bold cursor-pointer text-white flex items-center gap-1.5">
                      <Upload size={13} /> Select Favicon
                      <input type="file" accept="image/*" onChange={(e) => handleFileUploadChange(e, 'favicon')} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Logo picker */}
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Store Logo Header (Max 2MB, transparent PNG)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-bg-primary border border-border-card rounded-xl flex items-center justify-center text-text-body-muted overflow-hidden">
                      {logoFile ? (
                        <img
                          src={logoFile instanceof File ? URL.createObjectURL(logoFile) : logoFile}
                          alt="logo"
                          className="w-full h-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Palette size={20} />
                      )}
                    </div>
                    <label className="px-4 py-2 bg-bg-primary hover:bg-black/20 border border-border-card rounded-xl text-xs font-bold cursor-pointer text-white flex items-center gap-1.5">
                      <Upload size={13} /> Upload Store Logo
                      <input type="file" accept="image/*" onChange={(e) => handleFileUploadChange(e, 'logo')} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Banner picker */}
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Storefront Promo Banner Cover (Max 2MB)</label>
                  <div className="space-y-3">
                    <div className="h-28 w-full bg-bg-primary border border-border-card rounded-xl flex items-center justify-center text-text-body-muted overflow-hidden relative">
                      {bannerFile ? (
                        <img
                          src={bannerFile instanceof File ? URL.createObjectURL(bannerFile) : bannerFile}
                          alt="banner cover"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Image size={24} className="opacity-40" />
                      )}
                    </div>
                    <label className="inline-flex px-4 py-2 bg-bg-primary hover:bg-black/20 border border-border-card rounded-xl text-xs font-bold cursor-pointer text-white items-center gap-1.5">
                      <Upload size={13} /> Choose Banner Image
                      <input type="file" accept="image/*" onChange={(e) => handleFileUploadChange(e, 'banner')} className="hidden" />
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* COLOR & FONTS TAB */}
            {activeSettingsTab === 'styling' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-4 relative"
              >
                {/* No lock on Colors & Fonts — available on all plans */}
                {/* Colors pickers grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Primary Accent Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-10 border-0 bg-transparent rounded-lg cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full bg-bg-primary border border-border-card rounded-lg px-2 text-xs font-mono text-text-main outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Secondary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-10 h-10 border-0 bg-transparent rounded-lg cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full bg-bg-primary border border-border-card rounded-lg px-2 text-xs font-mono text-text-main outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Background Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-10 h-10 border-0 bg-transparent rounded-lg cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-full bg-bg-primary border border-border-card rounded-lg px-2 text-xs font-mono text-text-main outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Body Text Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-10 h-10 border-0 bg-transparent rounded-lg cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-full bg-bg-primary border border-border-card rounded-lg px-2 text-xs font-mono text-text-main outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Fonts layout */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Body Font family</label>
                    <select
                      value={typography}
                      onChange={(e) => setTypography(e.target.value)}
                      className="w-full bg-bg-primary border border-border-card rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-accent-amber"
                    >
                      <option value="Inter">Inter (Clean Sans)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Technical)</option>
                      <option value="Lora">Lora (Elegant Serif)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Headings Font family</label>
                    <select
                      value={headingFont}
                      onChange={(e) => setHeadingFont(e.target.value)}
                      className="w-full bg-bg-primary border border-border-card rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-accent-amber"
                    >
                      <option value="Lora">Lora (Elegant Serif)</option>
                      <option value="Inter">Inter (Clean Sans)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Technical)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STOREFRONT COPY TAB */}
            {activeSettingsTab === 'copy' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-4 relative"
              >
                {/* No lock on Storefront Copy — available on all plans */}
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Top Ticker Promo Text</label>
                  <input
                    type="text"
                    maxLength={150}
                    placeholder="e.g. 7 Days Free Trial — No Credit Card Required!"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                  />
                  <span className="text-[10px] text-text-body-muted mt-1 block">Scrolls at the top of your webpage storefront banner.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Storefront Summary</label>
                  <textarea
                    maxLength={300}
                    rows={4}
                    placeholder="Provide a short description of your catalog craft for home screen visitors..."
                    value={storeDesc}
                    onChange={(e) => setStoreDesc(e.target.value)}
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                  />
                  <span className="text-[10px] text-text-body-muted mt-1 block">Limit to 300 characters maximum.</span>
                </div>
              </motion.div>
            )}

            {/* SEO METAS TAB */}
            {activeSettingsTab === 'seo' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-4 relative"
              >
                {/* No lock on SEO — available on all plans */}
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">SEO Title Tag</label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Discover authentic Peshawari Chappals"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                  />
                  <span className="text-[10px] text-text-body-muted mt-1 block">Recommended tag sizes are 50-60 characters.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">SEO Meta Description</label>
                  <textarea
                    maxLength={160}
                    rows={3}
                    placeholder="Buy direct from Peshawari artisans. Handcrafted genuine leather dual comfort soles with flat delivery..."
                    value={seoDesc}
                    onChange={(e) => setSeoDesc(e.target.value)}
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                  />
                  <span className="text-[10px] text-text-body-muted mt-1 block">Maximum 160 characters for search snippet formatting.</span>
                </div>

                {/* SEO Image picker */}
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Facebook/Social Preview Image (Max 2MB)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 bg-bg-primary border border-border-card rounded-lg flex items-center justify-center text-text-body-muted overflow-hidden">
                      {seoFile ? (
                        <img
                          src={seoFile instanceof File ? URL.createObjectURL(seoFile) : seoFile}
                          alt="SEO preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Palette size={16} />
                      )}
                    </div>
                    <label className="px-3 py-1.5 bg-bg-primary hover:bg-black/20 border border-border-card rounded-lg text-[11px] font-bold cursor-pointer text-white flex items-center gap-1">
                      <Upload size={12} /> Upload SEO Cover
                      <input type="file" accept="image/*" onChange={(e) => handleFileUploadChange(e, 'seo')} className="hidden" />
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Action footer */}
          <div className="pt-4 border-t border-border-card/60">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-btn-primary hover:bg-btn-primary-hover active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Save Theme & Settings'
              )}
            </button>
          </div>
        </div>

      </form>

      {/* PAID PREMIUM UNLOCK DRAWER MODAL */}
      <AnimatePresence>
        {showUnlockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.93, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 15 }}
              className="w-full max-w-sm bg-bg-card border border-accent-amber-border/30 rounded-2xl p-5 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-accent-amber/10 border border-accent-amber-border/20 flex items-center justify-center text-accent-amber mx-auto mb-3.5">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <h3 className="font-serif font-bold text-text-main text-lg">Unlock Premium Store Preset?</h3>
              <p className="text-xs text-text-body-muted mt-2 leading-relaxed">
                Applying this layout design (e.g. Amber Nights, Royal Crimson) requires a one-time activation unlock fee of <span className="text-accent-amber font-mono font-bold">Rs. {themeData.theme_change_fee}</span>, or an upgrade to our growth subscription tier.
              </p>

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setShowUnlockModal(false);
                    setShowPaymentModal(true);
                  }}
                  className="w-full py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-[#1E8449]/10"
                >
                  Pay One-Time Fee & Submit Proof
                </button>
                <button
                  onClick={() => {
                    setShowUnlockModal(false);
                    onNavigate('billing');
                  }}
                  className="w-full py-2.5 bg-bg-primary border border-btn-secondary-border text-text-main text-xs font-bold rounded-xl hover:bg-bg-card cursor-pointer"
                >
                  Explore Plan Upgrades
                </button>
                <button
                  onClick={() => {
                    setShowUnlockModal(false);
                    setActiveSlug(themeData.active_slug); // Revert
                  }}
                  className="text-[11px] text-text-body-muted hover:text-text-main underline mt-1 cursor-pointer"
                >
                  Back to safety
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Unlock Premium Themes"
        description="Submit one-time fee to permanently unlock premium themes"
        amount={themeData.theme_change_fee}
        paymentAccounts={themeData.payment_accounts}
        onSubmit={handleUnlockPayment}
        showToast={showToast}
      />
    </div>
  );
}
