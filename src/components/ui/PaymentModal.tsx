import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, CreditCard, Copy, Check } from 'lucide-react';
import Spinner from './Spinner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  amount: number;
  paymentAccounts?: Array<{
    bank_name: string;
    account_title: string;
    account_number: string;
    iban?: string;
  }>;
  onSubmit: (file: File) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function PaymentModal({ isOpen, onClose, title, description, amount, paymentAccounts = [], onSubmit, showToast }: PaymentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB', 'error');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (!selected.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Copied to clipboard!', 'success');
  };

  const handleSubmit = async () => {
    if (!file && amount > 0) {
      showToast('Please upload a payment screenshot', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const submitFile = file || new File([''], 'dummy.png', { type: 'image/png' });
      await onSubmit(submitFile);
      showToast(amount === 0 ? 'Request submitted successfully!' : 'Payment proof submitted successfully! Awaiting admin approval.', 'success');
      setTimeout(() => {
        setFile(null);
        setPreviewUrl(null);
        onClose();
      }, 1500);
    } catch (e: any) {
      showToast(e.message || 'Failed to submit payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={!loading ? onClose : undefined}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-bg-card border border-border-card/60 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border-card/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-btn-primary/10 flex items-center justify-center">
                    <CreditCard className="text-btn-primary" size={20} />
                  </div>
                  <div>
                    <h2 className="text-text-main font-serif font-bold text-lg">{title}</h2>
                    <p className="text-xs text-text-body-muted">{description}</p>
                  </div>
                </div>
                {!loading && (
                  <button onClick={onClose} className="p-2 text-text-body-muted hover:text-text-main rounded-lg hover:bg-white/5 transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                
                {/* Amount */}
                <div className="bg-bg-primary border border-btn-primary/30 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-btn-primary uppercase tracking-wider font-bold mb-1">Amount to Pay</span>
                  <span className="text-3xl font-serif font-bold text-text-main">Rs. {amount.toLocaleString('en-US')}</span>
                </div>

                {/* Bank Accounts */}
                {amount > 0 && (
                  <div className="space-y-3">
                  <h3 className="text-sm font-bold text-text-main border-b border-border-card/30 pb-2">Admin Payment Accounts</h3>
                  {paymentAccounts.length === 0 ? (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center text-xs text-text-body-muted">
                      No admin payment accounts configured. Please contact support.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentAccounts.map((acc, idx) => (
                        <div key={idx} className="bg-bg-primary border border-border-card/40 rounded-xl p-4 space-y-3 relative group">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-text-main">{acc.bank_name}</span>
                          </div>
                          <div className="space-y-2 font-mono text-xs text-text-body-muted">
                            <div className="flex items-center justify-between">
                              <span className="opacity-70">Title:</span>
                              <div className="flex items-center gap-2 text-text-main">
                                <span>{acc.account_title}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="opacity-70">Account No:</span>
                              <div className="flex items-center gap-2 text-text-main font-bold">
                                <span>{acc.account_number}</span>
                                <button 
                                  onClick={() => copyToClipboard(acc.account_number, `acc-${idx}`)}
                                  className="text-btn-primary hover:text-text-main transition-colors p-1"
                                >
                                  {copiedId === `acc-${idx}` ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            </div>
                            {acc.iban && (
                              <div className="flex items-center justify-between">
                                <span className="opacity-70">IBAN:</span>
                                <div className="flex items-center gap-2 text-text-main">
                                  <span className="text-[10px] break-all">{acc.iban}</span>
                                  <button 
                                    onClick={() => copyToClipboard(acc.iban!, `iban-${idx}`)}
                                    className="text-btn-primary hover:text-text-main transition-colors p-1"
                                  >
                                    {copiedId === `iban-${idx}` ? <Check size={14} /> : <Copy size={14} />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Upload Section */}
                {amount > 0 && (
                  <div className="space-y-3">
                  <h3 className="text-sm font-bold text-text-main border-b border-border-card/30 pb-2">Upload Payment Proof</h3>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />

                  <div 
                    className={`border-2 border-dashed rounded-xl p-6 transition-all relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] cursor-pointer ${
                      previewUrl ? 'border-btn-primary/50 bg-btn-primary/5' : 'border-border-card bg-bg-primary hover:border-btn-primary/50 hover:bg-white/5'
                    }`}
                    onClick={() => !loading && fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    {previewUrl ? (
                      <div className="relative w-full h-full flex flex-col items-center">
                        <img src={previewUrl} alt="Payment Proof" className="max-h-40 rounded-lg shadow-md object-contain" />
                        {!loading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                            <span className="bg-white/20 backdrop-blur-md text-text-main text-xs px-3 py-1.5 rounded-full font-bold">Change Image</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                          <Upload className="text-text-body-muted" size={24} />
                        </div>
                        <p className="text-sm text-text-main font-bold mb-1">Click to upload screenshot</p>
                        <p className="text-[10px] text-text-body-muted font-mono">PNG, JPG up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-5 border-t border-border-card/30 bg-bg-primary">
                <button
                  onClick={handleSubmit}
                  disabled={loading || (!file && amount > 0)}
                  className="w-full py-3 bg-btn-primary hover:bg-btn-primary-hover disabled:bg-border-card disabled:text-text-body-muted disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-btn-primary/10 flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner size="sm" /> : <Check size={18} />}
                  {loading ? 'Submitting...' : (amount === 0 ? 'Submit Request' : 'Submit Payment For Approval')}
                </button>
              </div>

            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
