import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '../types';
import { ApiClient } from '../utils/api';
import { 
  Plus, Search, Edit2, Trash2, Eye, EyeOff, AlertCircle, 
  ArrowLeft, Upload, X, ShieldAlert, BadgeInfo 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from './ui/Spinner';
import { SkeletonList } from './ui/SkeletonCard';
import PullToRefresh from './ui/PullToRefresh';

interface ProductsViewProps {
  onNavigate: (tab: string, arg?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function ProductsView({ onNavigate, showToast }: ProductsViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Limits
  const [productCount, setProductCount] = useState(0);
  const [productLimit, setProductLimit] = useState(30);
  const [canAdd, setCanAdd] = useState(true);

  // Form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formComparePrice, setFormComparePrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formImages, setFormImages] = useState<any[]>([]); // Array of Files or URL Strings
  const [formVariants, setFormVariants] = useState<ProductVariant[]>([]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await ApiClient.getProducts(search, statusFilter === 'all' ? '' : statusFilter);
      setProducts(Array.isArray(response.data) ? response.data : []);
      setProductCount(response.product_count);
      setProductLimit(response.product_limit);
      setCanAdd(response.can_add);
    } catch (e: any) {
      showToast(e.message || "Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search, statusFilter]);

  // Helper to resolve backend image paths
  const resolveImageUrl = (img: any): string => {
    if (!img) return '';
    if (img instanceof File) {
      return URL.createObjectURL(img);
    }
    if (typeof img === 'string') {
      if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('blob:')) {
        return img;
      }
      const cleanPath = img.startsWith('/') ? img.substring(1) : img;
      return `https://asaandukan.online/storage/${cleanPath}`;
    }
    return '';
  };

  // Handle active visibility toggle directly on the list
  const handleToggleActive = async (prod: Product) => {
    // Optimistic UI update
    const previousState = prod.is_active;
    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, is_active: !p.is_active } : p));
    
    try {
      const updatedState = await ApiClient.toggleProductActive(prod.id);
      showToast(`${prod.name} visibility toggled to ${updatedState ? 'Active' : 'Inactive'}`, "success");
    } catch (e: any) {
      showToast(e.message || "Failed to toggle product status", "error");
      // Revert state
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, is_active: previousState } : p));
    }
  };

  // Trigger Edit Form
  const triggerEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormDesc(prod.description || '');
    setFormPrice(String(prod.price));
    setFormComparePrice(prod.compare_at_price ? String(prod.compare_at_price) : '');
    setFormStock(String(prod.stock_quantity));
    setFormSku(prod.sku || '');
    setFormCategory(prod.category || '');
    setFormIsActive(prod.is_active);
    setFormImages(prod.images || []);
    setFormVariants(prod.variants ? [...prod.variants] : []);
    setIsFormOpen(true);
  };

  // Trigger Create Form
  const triggerCreate = () => {
    if (!canAdd) {
      showToast("Store catalog limit reached. Please upgrade to add more products!", "warning");
      onNavigate('billing');
      return;
    }
    setEditingProduct(null);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormComparePrice('');
    setFormStock('');
    setFormSku('');
    setFormCategory('');
    setFormIsActive(true);
    setFormImages([]);
    setFormVariants([]);
    setIsFormOpen(true);
  };

  // Deletion logic
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await ApiClient.deleteProduct(deletingId);
      showToast("Product successfully removed from your catalog", "success");
      setDeletingId(null);
      loadProducts();
    } catch (e: any) {
      showToast(e.message || "Deletion failed", "error");
    }
  };

  // Form Variant Repetitier Controls
  const addVariantRow = () => {
    setFormVariants([...formVariants, { option_name: 'Size', option_value: '', price_override: null, stock_quantity: 10 }]);
  };

  const removeVariantRow = (idx: number) => {
    setFormVariants(formVariants.filter((_, i) => i !== idx));
  };

  const updateVariantRow = (idx: number, field: keyof ProductVariant, val: any) => {
    const updated = [...formVariants];
    if (field === 'price_override') {
      updated[idx][field] = val === '' ? null : Number(val);
    } else if (field === 'stock_quantity') {
      updated[idx][field] = Number(val);
    } else {
      updated[idx][field] = val as never;
    }
    setFormVariants(updated);
  };

  // File Upload Helper
  const handleImagePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      // Validate up to 5 images total and 3MB max size
      const validFiles: File[] = [];
      for (const file of filesArray) {
        if (file.size > 3 * 1024 * 1024) {
          showToast(`Image ${file.name} is too large. Max size allowed is 3MB.`, "warning");
          continue;
        }
        validFiles.push(file);
      }
      
      const totalCombinedImages = [...formImages, ...validFiles];
      if (totalCombinedImages.length > 5) {
        showToast("Maximum of 5 catalog images allowed per product.", "warning");
        setFormImages(totalCombinedImages.slice(0, 5));
      } else {
        setFormImages(totalCombinedImages);
      }
    }
  };

  const removeImage = (idx: number) => {
    setFormImages(formImages.filter((_, i) => i !== idx));
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice || !formStock) {
      showToast("Please fill in all mandatory fields (*)", "warning");
      return;
    }

    // Validate Variants Row completeness
    for (const v of formVariants) {
      if (!v.option_name || !v.option_value || v.stock_quantity === undefined) {
        showToast("All variant rows must have completed names and values", "warning");
        return;
      }
    }

    const payload = {
      name: formName,
      description: formDesc || null,
      price: Number(formPrice),
      compare_at_price: formComparePrice ? Number(formComparePrice) : null,
      stock_quantity: Number(formStock),
      sku: formSku || null,
      category: formCategory || null,
      is_active: formIsActive,
      images: formImages,
      variants: formVariants
    };

    setLoading(true);
    try {
      await ApiClient.saveProduct(payload, editingProduct?.id);
      showToast(editingProduct ? "Product details successfully updated!" : "New product successfully listed!", "success");
      setIsFormOpen(false);
      loadProducts();
    } catch (e: any) {
      showToast(e.message || "Failed to save product", "error");
      setLoading(false);
    }
  };

  return (
    <PullToRefresh onRefresh={async () => { await loadProducts(); }}>
    <div className="space-y-6 pb-24">
      <AnimatePresence mode="wait">
        {!isFormOpen ? (
          // LIST VIEW
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Catalog Capacity Badge Bar */}
            <div className="bg-bg-card border border-border-card/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="font-serif font-bold text-xl text-text-main tracking-tight">Products Catalog</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono font-bold text-accent-amber bg-accent-amber/10 px-2.5 py-0.5 rounded-full border border-accent-amber-border/30">
                    {productCount} / {productLimit} listed
                  </span>
                  <span className="text-xs text-text-body-muted">plan catalog limit</span>
                </div>
              </div>
              
              <button 
                onClick={triggerCreate}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  canAdd 
                    ? 'bg-btn-primary hover:bg-btn-primary-hover text-white shadow-lg shadow-btn-primary/15' 
                    : 'bg-bg-card text-text-body-muted border border-btn-secondary-border cursor-not-allowed'
                }`}
              >
                <Plus size={16} />
                Add New Product
              </button>
            </div>

            {/* Upgrade banner if warning */}
            {!canAdd && (
              <div className="bg-red-500/10 border border-total-red/20 rounded-xl p-3.5 flex items-start gap-3">
                <ShieldAlert size={18} className="text-total-red shrink-0 mt-0.5" />
                <p className="text-xs text-text-body-muted leading-normal">
                  Your store is currently utilizing <span className="font-bold text-text-main">{productCount} of {productLimit}</span> available product listings. Add button has been locked. Upgrade your plan to expand.
                </p>
              </div>
            )}

            {/* Filter controls & search */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                <input 
                  type="text"
                  placeholder="Search catalog by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-bg-card text-text-main border border-border-card/50 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent-amber focus:ring-1 focus:ring-accent-amber transition-all"
                />
              </div>

              {/* Toggle filters */}
              <div className="flex bg-bg-card border border-border-card/50 p-1 rounded-xl">
                {(['all', 'active', 'inactive'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${
                      statusFilter === filter 
                        ? 'bg-btn-primary text-white' 
                        : 'text-text-body-muted hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table/Grid Area */}
            {loading ? (
              <SkeletonList />
            ) : products.length === 0 ? (
              <div className="bg-bg-card/40 border border-border-card/30 rounded-2xl p-12 text-center text-text-body-muted flex flex-col items-center">
                <Plus size={44} className="stroke-[1] text-border-card mb-3" />
                <h3 className="font-serif font-bold text-text-main text-base">Your Catalog Is Vacant</h3>
                <p className="text-xs text-text-body-muted mt-1.5 max-w-sm leading-relaxed">
                  Provide buyers with choices by listing your first product! Click 'Add Product' above or toggle filters to view older entries.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {products.map((p) => (
                  <div 
                    key={p.id}
                    className="bg-bg-card border border-border-card/60 rounded-2xl p-4 flex gap-4 items-center shadow-sm relative overflow-hidden group cursor-pointer transition-all hover:border-btn-primary/30"
                    onClick={() => triggerEdit(p)}
                  >
                    {/* Left Thumbnail */}
                    <div className="w-16 h-16 rounded-xl border border-border-card/80 overflow-hidden bg-bg-primary shrink-0 relative">
                      {p.images && p.images[0] ? (
                        <img 
                          src={resolveImageUrl(p.images[0])} 
                          alt={p.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-text-body-muted font-mono uppercase text-center p-1">No Pic</div>
                      )}
                      {/* Active Status Indicator Overlay */}
                      <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-bg-card ${p.is_active ? 'bg-success-green' : 'bg-text-body-muted'}`} />
                    </div>

                    {/* Mid Details */}
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-accent-amber font-bold bg-accent-amber/10 border border-accent-amber-border/30 px-1.5 py-0.5 rounded">
                          {p.category || 'Artisanal'}
                        </span>
                        {p.sku && <span className="text-[10px] font-mono text-text-body-muted">SKU: {p.sku}</span>}
                      </div>

                      <h3 className="text-sm font-bold text-text-main mt-1.5 truncate">{p.name}</h3>
                      
                      <div className="flex items-center gap-3 mt-1 font-mono">
                        <span className="text-sm font-bold text-text-main">Rs. {p.price.toLocaleString('en-US')}</span>
                        {p.compare_at_price && (
                          <span className="text-xs text-text-body-muted line-through">Rs. {p.compare_at_price.toLocaleString('en-US')}</span>
                        )}
                        <span className={`text-[11px] ${p.stock_quantity <= 5 ? 'text-total-red font-bold animate-pulse' : 'text-text-body-muted'}`}>
                          ({p.stock_quantity} in stock)
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions (Hover/Long-press) */}
                    <div 
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all sm:translate-x-4 sm:group-hover:translate-x-0 bg-bg-card/90 backdrop-blur-sm p-1.5 rounded-xl border border-border-card shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Active status Switch */}
                      <button 
                        onClick={() => handleToggleActive(p)}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${
                          p.is_active 
                            ? 'text-success-green hover:bg-success-green/10' 
                            : 'text-text-body-muted hover:bg-white/10'
                        }`}
                        title={p.is_active ? "Product Visible — Click to hide" : "Product Hidden — Click to publish"}
                      >
                        {p.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>

                      {/* Edit */}
                      <button 
                        onClick={() => triggerEdit(p)}
                        className="p-2 rounded-lg text-text-body-muted hover:text-text-main hover:bg-white/10 cursor-pointer transition-colors"
                        title="Edit product details"
                      >
                        <Edit2 size={16} />
                      </button>

                      {/* Delete */}
                      <button 
                        onClick={() => setDeletingId(p.id)}
                        className="p-2 rounded-lg text-total-red hover:bg-total-red/10 cursor-pointer transition-colors"
                        title="Delete product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Floating Action Button (Mobile) */}
            {canAdd && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={triggerCreate}
                className="fixed bottom-24 right-6 w-14 h-14 bg-btn-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-btn-primary/30 cursor-pointer z-40 md:hidden"
              >
                <Plus size={24} strokeWidth={2.5} />
              </motion.button>
            )}
          </motion.div>
        ) : (
          // CREATE / EDIT FORM
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-bg-card border border-border-card/60 rounded-2xl p-5 sm:p-6 shadow-xl"
          >
            {/* Form Title & Back Anchor */}
            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border-card/40">
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 bg-bg-primary border border-border-card text-text-body-muted hover:text-text-main rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="font-serif font-bold text-lg text-text-main">
                  {editingProduct ? 'Edit Store Product' : 'Add New Catalog Entry'}
                </h2>
                <p className="text-[11px] text-text-body-muted mt-0.5">
                  {editingProduct ? `Reviewing properties for SKU: ${editingProduct.id}` : 'List catalog assets for visitor purchases'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mandatory Name */}
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Product Title *</label>
                <input 
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Handmade Leather Sandals asking PKR"
                  className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-amber text-text-main transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Catalog Description</label>
                <textarea 
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Elaborate on leather material, manufacturing details, and packaging info..."
                  rows={3}
                  className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-amber text-text-main transition-colors"
                />
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Selling Price (Rs.) *</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="3850"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-amber text-text-main transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Original Price (Rs.)</label>
                  <input 
                    type="number"
                    min="1"
                    value={formComparePrice}
                    onChange={(e) => setFormComparePrice(e.target.value)}
                    placeholder="e.g. 5200 for discount tags"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-amber text-text-main transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Quantities, Sku, Categories */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Stock Qty *</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="45"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-3 py-2 text-sm outline-none focus:border-accent-amber text-text-main transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Catalog SKU</label>
                  <input 
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="PESH-CH-01"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-3 py-2 text-sm outline-none focus:border-accent-amber text-text-main transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Category</label>
                  <input 
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Footwear"
                    className="w-full bg-bg-primary border border-border-card rounded-xl px-3 py-2 text-sm outline-none focus:border-accent-amber text-text-main transition-colors"
                  />
                </div>
              </div>

              {/* Visibility Status toggle */}
              <div className="flex items-center justify-between p-3.5 bg-bg-primary border border-border-card rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-text-main uppercase font-mono">Publish Visibility</h4>
                  <p className="text-[10px] text-text-body-muted mt-0.5">Toggle live status instantly on your store storefront</p>
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

              {/* Image Picker Multi-select */}
              <div>
                <label className="block text-xs font-bold text-text-text-main mb-1.5 uppercase font-mono tracking-wider">Catalog Images (up to 5, max 3MB each)</label>
                
                {/* Images Preview strip */}
                <div className="flex flex-wrap gap-2.5 mb-3">
                  {formImages.map((img, idx) => {
                    const previewUrl = resolveImageUrl(img);
                    return (
                      <div key={idx} className="relative w-16 h-16 border border-border-card rounded-xl overflow-hidden bg-black/30">
                        <img 
                          src={previewUrl} 
                          alt="preview" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          type="button" 
                          onClick={() => removeImage(idx)}
                          className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/90 text-white rounded-full p-0.5 cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}

                  {formImages.length < 5 && (
                    <label className="w-16 h-16 border-2 border-dashed border-border-card hover:border-accent-amber rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-black/10">
                      <Upload size={14} className="text-text-body-muted" />
                      <span className="text-[8px] text-text-body-muted mt-1 font-mono">Upload</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleImagePicker} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Variant repeater section */}
              <div className="pt-4 border-t border-border-card/40">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-text-main uppercase font-mono tracking-wider">Option Variations</h4>
                    <p className="text-[10px] text-text-body-muted mt-0.5">Sizes, Colors, and individual stock overrides</p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="px-2.5 py-1.5 bg-bg-primary border border-btn-secondary-border hover:border-accent-amber hover:text-accent-amber rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={10} /> Add Variation
                  </button>
                </div>

                {formVariants.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border-card/60 text-center text-text-body-muted text-xs bg-black/5">
                    No variations defined. Product sells as single configuration.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {formVariants.map((v, idx) => (
                      <div 
                        key={idx} 
                        className="bg-bg-primary border border-border-card rounded-xl p-3.5 flex flex-col gap-2.5 relative"
                      >
                        {/* Remove Variant Row cross */}
                        <button 
                          type="button"
                          onClick={() => removeVariantRow(idx)}
                          className="absolute top-1.5 right-1.5 text-text-body-muted hover:text-total-red p-1 cursor-pointer"
                        >
                          <X size={14} />
                        </button>

                        <div className="grid grid-cols-2 gap-2 pr-5">
                          {/* Option Name */}
                          <div>
                            <label className="block text-[9px] font-bold text-text-body-muted mb-0.5 uppercase font-mono">Option Name</label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. Size or Color"
                              value={v.option_name}
                              onChange={(e) => updateVariantRow(idx, 'option_name', e.target.value)}
                              className="w-full bg-bg-card border border-border-card rounded-lg px-2.5 py-1 text-xs outline-none text-text-main focus:border-accent-amber"
                            />
                          </div>
                          {/* Option Value */}
                          <div>
                            <label className="block text-[9px] font-bold text-text-body-muted mb-0.5 uppercase font-mono">Option Value</label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. XL or Size 9"
                              value={v.option_value}
                              onChange={(e) => updateVariantRow(idx, 'option_value', e.target.value)}
                              className="w-full bg-bg-card border border-border-card rounded-lg px-2.5 py-1 text-xs outline-none text-text-main focus:border-accent-amber"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Price Override */}
                          <div>
                            <label className="block text-[9px] font-bold text-text-body-muted mb-0.5 uppercase font-mono">Price Override (Rs.)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 4000 (Omit to keep default)"
                              value={v.price_override === null ? '' : v.price_override}
                              onChange={(e) => updateVariantRow(idx, 'price_override', e.target.value)}
                              className="w-full bg-bg-card border border-border-card rounded-lg px-2.5 py-1 text-xs outline-none text-text-main focus:border-accent-amber font-mono"
                            />
                          </div>
                          {/* Stock overrides */}
                          <div>
                            <label className="block text-[9px] font-bold text-text-body-muted mb-0.5 uppercase font-mono">Variant Stock Qty</label>
                            <input 
                              type="number"
                              required
                              placeholder="10"
                              value={v.stock_quantity}
                              onChange={(e) => updateVariantRow(idx, 'stock_quantity', e.target.value)}
                              className="w-full bg-bg-card border border-border-card rounded-lg px-2.5 py-1 text-xs outline-none text-text-main focus:border-accent-amber font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-border-card/40 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-5 py-2.5 bg-bg-primary border border-btn-secondary-border rounded-xl text-xs font-bold text-white hover:bg-black/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-5 py-2.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-btn-primary/15"
                >
                  {loading && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  {editingProduct ? 'Save Changes' : 'Publish Product'}
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
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
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
              <h3 className="font-serif font-bold text-text-main text-lg">Remove Catalog Product?</h3>
              <p className="text-xs text-text-body-muted mt-2 leading-relaxed">
                This action is irreversible. Removing this product will permanently erase it from your visitor catalog. All associated variant options will be cleared.
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
                  Confirm Delete
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
