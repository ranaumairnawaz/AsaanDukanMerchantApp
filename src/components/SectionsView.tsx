import React, { useState, useEffect } from 'react';
import { StorefrontSection, Product, ThemeResponse } from '../types';
import { ApiClient } from '../utils/api';
import { 
  ArrowUp, ArrowDown, Trash2, Edit2, Plus, 
  ToggleLeft, ToggleRight, ArrowLeft, Grid, 
  MessageCircle, Star, HelpCircle, Layers, X, Upload, Image 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';

interface SectionsViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function SectionsView({ showToast }: SectionsViewProps) {
  const [sections, setSections] = useState<StorefrontSection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [themeData, setThemeData] = useState<ThemeResponse | null>(null);

  // Form togglers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSec, setEditingSec] = useState<StorefrontSection | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Common Form Fields
  const [formType, setFormType] = useState<StorefrontSection['type']>('promo_banner');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Type specific fields
  const [formCtaText, setFormCtaText] = useState('');
  const [formCtaLink, setFormCtaLink] = useState('');
  const [formLayout, setFormLayout] = useState('image_right');
  const [formImageFile, setFormImageFile] = useState<any>(null); // File object or URL
  const [formMessage, setFormMessage] = useState('');
  const [formLimit, setFormLimit] = useState('4');
  const [formColumns, setFormColumns] = useState('2');
  const [formProductIds, setFormProductIds] = useState<number[]>([]);
  
  // Testimonials, FAQs, Category Showcase dynamic repeaters
  const [repeaterItems, setRepeaterItems] = useState<any[]>([]);

  const loadSectionsData = async () => {
    setLoading(true);
    try {
      const [sectionsResp, themeResp] = await Promise.all([
        ApiClient.getSections(),
        ApiClient.getTheme()
      ]);
      setSections(Array.isArray(sectionsResp.sections) ? sectionsResp.sections : []);
      setProducts(Array.isArray(sectionsResp.products) ? sectionsResp.products : []);
      setThemeData(themeResp);
    } catch (e: any) {
      showToast(e.message || "Failed to load sections", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSectionsData();
  }, []);

  // Reordering: shift up/down
  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const updated = [...sections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Optimistic state set
    setSections(updated);

    try {
      const orderedIds = updated.map(s => s.id);
      await ApiClient.reorderSections(orderedIds);
      showToast("Storefront sections successfully reordered!", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to reorder sections", "error");
      loadSectionsData(); // Revert
    }
  };

  // Toggle visible status
  const handleToggleSectionActive = async (sec: StorefrontSection) => {
    const previous = sec.is_active;
    setSections(prev => prev.map(s => s.id === sec.id ? { ...s, is_active: !s.is_active } : s));

    try {
      const nextState = await ApiClient.toggleSectionActive(sec.id);
      showToast(`Section visibility toggled to ${nextState ? 'Active' : 'Inactive'}`, "success");
    } catch (e: any) {
      showToast(e.message || "Failed to toggle status", "error");
      setSections(prev => prev.map(s => s.id === sec.id ? { ...s, is_active: previous } : s));
    }
  };

  // Delete section
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await ApiClient.deleteSection(deletingId);
      showToast("Storefront section permanently removed", "success");
      setDeletingId(null);
      loadSectionsData();
    } catch (e: any) {
      showToast(e.message || "Failed to delete section", "error");
    }
  };

  // Trigger Edit Form
  const triggerEdit = (sec: StorefrontSection) => {
    setEditingSec(sec);
    setFormType(sec.type);
    setFormTitle(sec.title || '');
    setFormSubtitle(sec.subtitle || '');
    setFormIsActive(sec.is_active);

    // Seed specific fields
    setFormCtaText(sec.cta_text || '');
    setFormCtaLink(sec.cta_link || '');
    setFormLayout(sec.layout || 'image_right');
    setFormImageFile(sec.image || null);
    setFormMessage(sec.message || '');
    setFormLimit(sec.limit ? String(sec.limit) : '4');
    setFormColumns(sec.columns ? String(sec.columns) : '2');
    setFormProductIds(sec.product_ids || []);
    
    // Seed repeaters
    setRepeaterItems(sec.items ? JSON.parse(JSON.stringify(sec.items)) : []);

    setIsFormOpen(true);
  };

  // Trigger Create Form
  const triggerCreate = () => {
    setEditingSec(null);
    setFormType('promo_banner');
    setFormTitle('');
    setFormSubtitle('');
    setFormIsActive(true);

    setFormCtaText('');
    setFormCtaLink('');
    setFormLayout('image_right');
    setFormImageFile(null);
    setFormMessage('');
    setFormLimit('4');
    setFormColumns('2');
    setFormProductIds([]);
    setRepeaterItems([]);

    setIsFormOpen(true);
  };

  // Add repeater row
  const addRepeaterRow = () => {
    if (formType === 'testimonials') {
      setRepeaterItems([...repeaterItems, { name: '', text: '', rating: 5, location: '' }]);
    } else if (formType === 'faq') {
      setRepeaterItems([...repeaterItems, { question: '', answer: '' }]);
    } else if (formType === 'category_showcase') {
      setRepeaterItems([...repeaterItems, { label: '', category: '', image: null }]);
    }
  };

  const removeRepeaterRow = (idx: number) => {
    setRepeaterItems(repeaterItems.filter((_, i) => i !== idx));
  };

  const updateRepeaterRow = (idx: number, field: string, val: any) => {
    const updated = [...repeaterItems];
    updated[idx][field] = val;
    setRepeaterItems(updated);
  };

  const handleRepeaterImageUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showToast("Category images must be less than 2MB", "warning");
        return;
      }
      updateRepeaterRow(idx, 'image', file);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate type fields
    if (formType === 'testimonials' || formType === 'faq' || formType === 'category_showcase') {
      if (repeaterItems.length === 0) {
        showToast("Please add at least one dynamic repeater item", "warning");
        setLoading(false);
        return;
      }
    }

    const payload: any = {
      type: formType,
      title: formTitle || null,
      subtitle: formSubtitle || null,
      is_active: formIsActive
    };

    // Specific layouts
    if (formType === 'promo_banner') {
      payload.cta_text = formCtaText;
      payload.cta_link = formCtaLink;
      payload.layout = formLayout;
      if (formImageFile instanceof File) payload.image = formImageFile;
    } else if (formType === 'whatsapp_cta') {
      payload.message = formMessage;
    } else if (formType === 'new_arrivals') {
      payload.limit = Number(formLimit);
    } else if (formType === 'featured_products') {
      payload.layout = formLayout;
      payload.columns = Number(formColumns);
      payload.product_ids = formProductIds;
    } else if (formType === 'testimonials' || formType === 'faq' || formType === 'category_showcase') {
      payload.items = repeaterItems;
    }

    try {
      await ApiClient.saveSection(payload, editingSec?.id);
      showToast(editingSec ? "Section updated successfully!" : "New storefront section created!", "success");
      setIsFormOpen(false);
      loadSectionsData();
    } catch (e: any) {
      showToast(e.message || "Failed to save section", "error");
      setLoading(false);
    }
  };

  const handleFeaturedProductToggle = (prodId: number) => {
    if (formProductIds.includes(prodId)) {
      setFormProductIds(formProductIds.filter(id => id !== prodId));
    } else {
      setFormProductIds([...formProductIds, prodId]);
    }
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {themeData && themeData.active_slug === 'default_slate' && (
        <div className="absolute inset-0 z-50 bg-bg-card/90 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <div className="bg-bg-primary border border-accent-amber-border/30 p-6 rounded-2xl flex flex-col items-center gap-3 max-w-sm text-center shadow-2xl">
            <Layers size={32} className="text-accent-amber" />
            <h4 className="text-base font-bold text-text-main font-serif">Home Sections Locked</h4>
            <p className="text-xs text-text-body-muted leading-relaxed">
              Home sections are not supported on the Basic Theme. Please apply a premium theme to unlock custom storefront sections.
            </p>
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
        {!isFormOpen ? (
          // LIST REORDER VIEW
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Title */}
            <div className="flex justify-between items-center bg-bg-card border border-border-card/60 rounded-2xl p-4.5">
              <div>
                <h1 className="font-serif font-bold text-xl text-text-main tracking-tight">Homepage Sections</h1>
                <p className="text-xs text-text-body-muted mt-0.5 font-mono">Reorder, publish or edit your homepage components</p>
              </div>

              <button 
                onClick={triggerCreate}
                className="px-4 py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-btn-primary/10 transition-colors"
              >
                <Plus size={14} /> Add Section
              </button>
            </div>

            {/* Reorderable Section Rows */}
            {loading ? (
              <Spinner size="lg" label="Querying storefront structure..." />
            ) : sections.length === 0 ? (
              <div className="bg-bg-card/40 border border-border-card/30 rounded-2xl p-12 text-center text-text-body-muted flex flex-col items-center">
                <Layers size={40} className="stroke-[1.2] text-border-card mb-3" />
                <h3 className="font-serif font-bold text-text-main text-base">Your Home Is Blank</h3>
                <p className="text-xs text-text-body-muted mt-1.5 max-w-sm leading-relaxed">
                  Home screen sections structure your visitor storefront. Create banners, feature collections or add feedback!
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {sections.map((sec, index) => (
                  <div 
                    key={sec.id}
                    className={`bg-bg-card border rounded-2xl p-4 flex gap-4 items-center justify-between ${
                      sec.is_active ? 'border-border-card/60 bg-bg-card' : 'border-border-card/30 opacity-70 bg-bg-primary'
                    }`}
                  >
                    {/* Left Reorder Handles */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => handleMoveSection(index, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded bg-bg-primary border border-border-card text-text-body-muted transition-colors ${
                          index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-text-main cursor-pointer'
                        }`}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => handleMoveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className={`p-1 rounded bg-bg-primary border border-border-card text-text-body-muted transition-colors ${
                          index === sections.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-text-main cursor-pointer'
                        }`}
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    {/* Mid Details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-accent-amber bg-accent-amber/10 border border-accent-amber-border/30 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {sec.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-text-body-muted font-mono">Row #{index + 1}</span>
                      </div>

                      <h3 className="text-sm font-bold text-text-main mt-1.5 truncate">
                        {sec.title || `${sec.type.replace('_', ' ').toUpperCase()} section`}
                      </h3>
                      {sec.subtitle && <p className="text-[11px] text-text-body-muted truncate mt-0.5">{sec.subtitle}</p>}
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Active Status switch */}
                      <button
                        onClick={() => handleToggleSectionActive(sec)}
                        className={`p-1.5 rounded-lg border cursor-pointer ${
                          sec.is_active 
                            ? 'bg-btn-primary/10 border-btn-primary/30 text-success-green' 
                            : 'bg-bg-primary border-border-card text-text-body-muted'
                        }`}
                        title={sec.is_active ? "Visible — Click to hide" : "Hidden — Click to publish"}
                      >
                        {sec.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => triggerEdit(sec)}
                        className="p-1.5 rounded-lg border border-border-card bg-bg-primary text-text-main hover:bg-bg-card cursor-pointer"
                        title="Edit parameters"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeletingId(sec.id)}
                        className="p-1.5 rounded-lg border border-rose-900/50 bg-total-red/5 text-total-red hover:bg-total-red/10 cursor-pointer"
                        title="Delete section"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          // DYNAMIC SECTION CONFIGURATION FORM
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-bg-card border border-border-card/60 rounded-2xl p-5"
          >
            {/* Form Title */}
            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border-card/40">
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 bg-bg-primary border border-border-card text-text-body-muted hover:text-text-main rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="font-serif font-bold text-lg text-text-main">
                  {editingSec ? 'Configure Homepage Section' : 'Assemble Storefront Section'}
                </h2>
                <p className="text-[11px] text-text-body-muted mt-0.5">
                  Type: {formType.toUpperCase().replace('_', ' ')}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Type Picker (Locked in edit mode) */}
              {!editingSec && (
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Section Component Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-3 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber font-bold"
                  >
                    <option value="promo_banner">Promo Banner Cover</option>
                    <option value="whatsapp_cta">Direct WhatsApp Link</option>
                    <option value="new_arrivals">New Arrivals list</option>
                    <option value="featured_products">Featured Products Picker</option>
                    <option value="testimonials">Buyer Testimonials List</option>
                    <option value="faq">Frequently Asked Questions (FAQ)</option>
                    <option value="category_showcase">Visual Categories Grid</option>
                  </select>
                </div>
              )}

              {/* Title & Subtitle */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Headline / Title</label>
                  <input 
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Curated Collection"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Sub-heading</label>
                  <input 
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. Handcrafted for premium styling"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-accent-amber"
                  />
                </div>
              </div>

              {/* CONDITIONAL SUB-FORMS PER TYPE */}

              {/* 1. PROMO BANNER SUB-FORM */}
              {formType === 'promo_banner' && (
                <div className="space-y-4 p-4 rounded-xl border border-border-card/40 bg-black/10">
                  <h4 className="text-xs font-bold text-text-main uppercase font-mono mb-2">Banner Custom Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-body-muted mb-1.5 uppercase font-mono">Button CTA Label</label>
                      <input 
                        type="text"
                        placeholder="e.g. Shop Now"
                        value={formCtaText}
                        onChange={(e) => setFormCtaText(e.target.value)}
                        className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-body-muted mb-1.5 uppercase font-mono">CTA Button Link</label>
                      <input 
                        type="text"
                        placeholder="e.g. /products/101"
                        value={formCtaLink}
                        onChange={(e) => setFormCtaLink(e.target.value)}
                        className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-body-muted mb-1.5 uppercase font-mono">Layout Orientation</label>
                      <select
                        value={formLayout}
                        onChange={(e) => setFormLayout(e.target.value)}
                        className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none"
                      >
                        <option value="image_right">Cover Image Right</option>
                        <option value="image_left">Cover Image Left</option>
                      </select>
                    </div>

                    {/* Banner Image file picker */}
                    <div>
                      <label className="block text-[10px] font-bold text-text-body-muted mb-1.5 uppercase font-mono">Banner Image Cover</label>
                      <label className="px-3 py-2 bg-bg-primary border border-border-card rounded-lg text-xs font-bold text-white cursor-pointer hover:bg-black/20 flex items-center gap-1.5">
                        <Upload size={12} /> Select Image
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFormImageFile(e.target.files[0]);
                            }
                          }} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. WHATSAPP CTA SUB-FORM */}
              {formType === 'whatsapp_cta' && (
                <div className="space-y-4 p-4 rounded-xl border border-border-card/40 bg-black/10">
                  <h4 className="text-xs font-bold text-text-main uppercase font-mono mb-2">WhatsApp Custom Settings</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-text-body-muted mb-1.5 uppercase font-mono">WhatsApp Pre-filled Message</label>
                    <textarea 
                      placeholder="e.g. Salam! I am browsing your catalog and would like to order Peshawari Chappals..."
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      rows={3}
                      className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none"
                    />
                    <span className="text-[9px] text-text-body-muted mt-1 block">Launches customer's WhatsApp with this message when clicked.</span>
                  </div>
                </div>
              )}

              {/* 3. NEW ARRIVALS LIST SUB-FORM */}
              {formType === 'new_arrivals' && (
                <div className="p-4 rounded-xl border border-border-card/40 bg-black/10 space-y-3">
                  <h4 className="text-xs font-bold text-text-main uppercase font-mono mb-2">New Arrivals Limits</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-text-body-muted mb-1.5 uppercase font-mono">Maximum listings</label>
                    <input 
                      type="number"
                      min="1"
                      placeholder="e.g. 4 products"
                      value={formLimit}
                      onChange={(e) => setFormLimit(e.target.value)}
                      className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* 4. FEATURED PRODUCTS LIST SUB-FORM */}
              {formType === 'featured_products' && (
                <div className="p-4 rounded-xl border border-border-card/40 bg-black/10 space-y-4">
                  <h4 className="text-xs font-bold text-text-main uppercase font-mono mb-2">Feature Collection Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-body-muted mb-1.5 uppercase font-mono">Featured Layout</label>
                      <select
                        value={formLayout}
                        onChange={(e) => setFormLayout(e.target.value)}
                        className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none"
                      >
                        <option value="grid">Bento Grid layout</option>
                        <option value="list">Single Row list</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-body-muted mb-1.5 uppercase font-mono">Columns Size (Grid only)</label>
                      <input 
                        type="number"
                        min="2"
                        max="6"
                        placeholder="2 columns"
                        value={formColumns}
                        onChange={(e) => setFormColumns(e.target.value)}
                        className="w-full bg-bg-primary border border-border-card rounded-lg px-3 py-2 text-xs text-text-main outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-body-muted mb-2 uppercase font-mono font-bold">Pick Products to Feature *</label>
                    {products.length === 0 ? (
                      <p className="text-xs text-total-red">No catalog products listed yet. Go populate products first!</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-border-card rounded-lg p-2.5 bg-bg-primary space-y-2 pr-1.5">
                        {products.map((p) => {
                          const isChecked = formProductIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center justify-between text-xs text-text-main p-1.5 hover:bg-white/2 rounded-md cursor-pointer">
                              <span className="font-medium">{p.name} (PKR {p.price})</span>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => handleFeaturedProductToggle(p.id)} 
                                className="w-4 h-4 rounded border-border-card text-btn-primary" 
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. REPEATERS FOR TESTIMONIALS, FAQS, CATEGORY SHOWCASES */}
              {(formType === 'testimonials' || formType === 'faq' || formType === 'category_showcase') && (
                <div className="p-4 rounded-xl border border-border-card/40 bg-black/10 space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-bold text-text-main uppercase font-mono">
                      {formType === 'testimonials' && 'Feedback Review sub-items'}
                      {formType === 'faq' && 'Interactive FAQs sub-items'}
                      {formType === 'category_showcase' && 'Visual Categories showcase'}
                    </h4>
                    <button
                      type="button"
                      onClick={addRepeaterRow}
                      className="px-2.5 py-1.5 bg-bg-primary border border-btn-secondary-border hover:border-accent-amber hover:text-accent-amber rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} /> Add Sub-Item
                    </button>
                  </div>

                  {repeaterItems.length === 0 ? (
                    <div className="p-4 border border-dashed border-border-card/60 rounded-lg text-center text-xs text-text-body-muted">
                      No sub-items compiled yet. Click 'Add Sub-Item' to build structure.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                      {repeaterItems.map((item, idx) => (
                        <div key={idx} className="bg-bg-primary border border-border-card rounded-xl p-3.5 relative space-y-2.5 pr-8">
                          
                          {/* Close button */}
                          <button
                            type="button"
                            onClick={() => removeRepeaterRow(idx)}
                            className="absolute top-2 right-2 text-text-body-muted hover:text-total-red p-1 cursor-pointer animate-pulse"
                          >
                            <X size={14} />
                          </button>

                          {/* TESTIMONIAL REPEATER FORM */}
                          {formType === 'testimonials' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-bold text-text-body-muted block uppercase font-mono">Buyer Name</label>
                                  <input 
                                    type="text" required placeholder="e.g. Bilal Khan" value={item.name}
                                    onChange={(e) => updateRepeaterRow(idx, 'name', e.target.value)}
                                    className="w-full bg-bg-card border border-border-card rounded px-2 py-1 text-xs text-text-main"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-text-body-muted block uppercase font-mono">Buyer Location</label>
                                  <input 
                                    type="text" placeholder="e.g. Peshawar" value={item.location}
                                    onChange={(e) => updateRepeaterRow(idx, 'location', e.target.value)}
                                    className="w-full bg-bg-card border border-border-card rounded px-2 py-1 text-xs text-text-main"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-8">
                                  <label className="text-[9px] font-bold text-text-body-muted block uppercase font-mono">Review text *</label>
                                  <input 
                                    type="text" required placeholder="Very comfy soles, dual cushion foam!" value={item.text}
                                    onChange={(e) => updateRepeaterRow(idx, 'text', e.target.value)}
                                    className="w-full bg-bg-card border border-border-card rounded px-2 py-1 text-xs text-text-main"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <label className="text-[9px] font-bold text-text-body-muted block uppercase font-mono">Rating (1-5)</label>
                                  <input 
                                    type="number" min="1" max="5" value={item.rating}
                                    onChange={(e) => updateRepeaterRow(idx, 'rating', Number(e.target.value))}
                                    className="w-full bg-bg-card border border-border-card rounded px-2 py-1 text-xs text-text-main font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* FAQ REPEATER FORM */}
                          {formType === 'faq' && (
                            <div className="space-y-2">
                              <div>
                                <label className="text-[9px] font-bold text-text-body-muted block uppercase font-mono">Question *</label>
                                <input 
                                  type="text" required placeholder="What is your return policy?" value={item.question}
                                  onChange={(e) => updateRepeaterRow(idx, 'question', e.target.value)}
                                  className="w-full bg-bg-card border border-border-card rounded px-2.5 py-1 text-xs text-text-main"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-text-body-muted block uppercase font-mono">Answer *</label>
                                <textarea 
                                  required placeholder="We accept size swaps within 7 days of delivery..." value={item.answer}
                                  onChange={(e) => updateRepeaterRow(idx, 'answer', e.target.value)}
                                  rows={2}
                                  className="w-full bg-bg-card border border-border-card rounded px-2.5 py-1 text-xs text-text-main"
                                />
                              </div>
                            </div>
                          )}

                          {/* CATEGORIES REPEATER FORM */}
                          {formType === 'category_showcase' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-bold text-text-body-muted block uppercase font-mono">Showcase Label *</label>
                                  <input 
                                    type="text" required placeholder="Leather Chappals" value={item.label}
                                    onChange={(e) => updateRepeaterRow(idx, 'label', e.target.value)}
                                    className="w-full bg-bg-card border border-border-card rounded px-2 py-1 text-xs text-text-main"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-text-body-muted block uppercase font-mono">Category Match</label>
                                  <input 
                                    type="text" placeholder="Footwear" value={item.category}
                                    onChange={(e) => updateRepeaterRow(idx, 'category', e.target.value)}
                                    className="w-full bg-bg-card border border-border-card rounded px-2 py-1 text-xs text-text-main"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-[9px] font-bold text-text-body-muted block uppercase font-mono mb-1">Showcase Photo</label>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-bg-card border border-border-card overflow-hidden flex items-center justify-center">
                                    {item.image ? (
                                      <img 
                                        src={item.image instanceof File ? URL.createObjectURL(item.image) : item.image} 
                                        alt="cat preview" 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <Image size={14} className="text-text-body-muted" />
                                    )}
                                  </div>
                                  <label className="px-2.5 py-1 bg-bg-card border border-border-card rounded text-[10px] font-bold cursor-pointer text-text-main">
                                    Upload Photo
                                    <input type="file" accept="image/*" onChange={(e) => handleRepeaterImageUpload(e, idx)} className="hidden" />
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Toggle visible active switch */}
              <div className="flex items-center justify-between p-3.5 bg-bg-primary border border-border-card rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-text-main uppercase font-mono">Section Visibility</h4>
                  <p className="text-[10px] text-text-body-muted mt-0.5">Publish instantly on your active home storefront page</p>
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

              {/* Submit CTA */}
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
                  className="flex-1 py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-btn-primary/15"
                >
                  {editingSec ? 'Save Changes' : 'Create Section'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETION MODAL DIALOG */}
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
              <h3 className="font-serif font-bold text-text-main text-lg">Remove Home Section?</h3>
              <p className="text-xs text-text-body-muted mt-2 leading-relaxed">
                This will permanently delete this section from your active homepage design. Visitors will no longer see this segment upon page loading.
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
                  Delete Section
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
