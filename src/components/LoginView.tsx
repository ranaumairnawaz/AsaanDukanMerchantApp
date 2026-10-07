import React, { useState, useEffect } from 'react';
import { ApiClient } from '../utils/api';
import { User } from '../types';
import { Key, Mail, ShoppingBag, User as UserIcon, Phone, Store, Hash, Tag, ArrowLeft, Check, ExternalLink, Info, MessageSquare, ShieldCheck, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  onBack?: () => void;
  /** Fired whenever the register flow is entered/exited so the parent shell can hide its own chrome (navbar, bottom tabs) on mobile while onboarding takes over the full screen. */
  onRegisterModeChange?: (isRegistering: boolean) => void;
}

export default function LoginView({ onLoginSuccess, showToast, onBack, onRegisterModeChange }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [category, setCategory] = useState('');
  const [themeSlug, setThemeSlug] = useState('');

  const [loading, setLoading] = useState(false);
  const [themes, setThemes] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [planSlug, setPlanSlug] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly'|'yearly'>('monthly');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  // Forgot Password (WhatsApp OTP) state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState<1|2|3>(1); // 1=phone, 2=otp, 3=new password
  const [fpPhone, setFpPhone] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpResetToken, setFpResetToken] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpShowPw, setFpShowPw] = useState(false);

  // Registration WhatsApp OTP state
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtp, setRegOtp] = useState('');
  const [regOtpVerified, setRegOtpVerified] = useState(false);
  const [regOtpLoading, setRegOtpLoading] = useState(false);

  // Tell the parent shell when we're in the register flow so it can hide its
  // own navbar/bottom-tabs and let onboarding take the full screen on mobile.
  useEffect(() => {
    onRegisterModeChange?.(mode === 'register');
    return () => { onRegisterModeChange?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Load plans once on register mode
  useEffect(() => {
    if (mode === 'register' && plans.length === 0) {
      ApiClient.getPublicPlans().then((data) => {
        setPlans(data);
        if (data.length > 0) {
          const freePlan = data.find(p => p.is_free) || data[0];
          setPlanSlug(freePlan.slug);
        }
      }).catch(e => console.error("Failed to load plans", e));
    }
  }, [mode, plans.length]);

  // Load themes whenever plan changes (to get correct premium status)
  useEffect(() => {
    if (mode === 'register') {
      ApiClient.getPublicThemes(planSlug).then((data) => {
        setThemes(data);
        if (data.length > 0) {
          const firstAvailable = data.find(t => !t.is_premium) || data[0];
          if (firstAvailable) setThemeSlug(firstAvailable.slug);
        }
      }).catch(e => console.error("Failed to load themes", e));
    }
  }, [mode, planSlug]);

  // Auto-generate slug from store name
  useEffect(() => {
    if (!slugEdited) {
      const autoSlug = storeName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setStoreSlug(autoSlug);
    }
  }, [storeName, slugEdited]);

  const handleNextStep = () => {
    if (registerStep === 1) {
      if (!storeName || !storeSlug || !category) {
        showToast("Please fill all store details", "warning");
        return;
      }
      setRegisterStep(2);
    } else if (registerStep === 2) {
      if (!name || !phone || !email || !password || !passwordConfirmation) {
        showToast("Please fill all verification details", "warning");
        return;
      }
      if (password !== passwordConfirmation) {
        showToast("Passwords do not match", "warning");
        return;
      }
      if (!regOtpVerified) {
        showToast("Please verify your WhatsApp number with OTP first", "warning");
        return;
      }
      setRegisterStep(3);
    } else if (registerStep === 3) {
      if (!planSlug) {
        showToast("Please select a plan", "warning");
        return;
      }
      setRegisterStep(4);
    }
  };

  // Forgot Password handlers
  const handleFpSendOtp = async () => {
    if (!fpPhone.trim()) {
      showToast("Please enter your WhatsApp number", "warning");
      return;
    }
    setFpLoading(true);
    try {
      const res = await ApiClient.sendPasswordResetOtp(fpPhone.trim());
      if (res.success) {
        setFpStep(2);
        showToast("OTP sent to your WhatsApp number", "success");
      } else {
        showToast(res.message || "Could not find account with that number", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setFpLoading(false);
    }
  };

  const handleFpVerifyOtp = async () => {
    if (!fpOtp.trim() || fpOtp.length < 6) {
      showToast("Please enter the 6-digit OTP", "warning");
      return;
    }
    setFpLoading(true);
    try {
      const res = await ApiClient.verifyPasswordResetOtp(fpPhone.trim(), fpOtp.trim());
      if (res?.reset_token) {
        setFpResetToken(res.reset_token);
        setFpStep(3);
        showToast("OTP verified!", "success");
      } else {
        showToast("Invalid or expired OTP", "error");
      }
    } catch (err: any) {
      showToast(err.message || "OTP verification failed", "error");
    } finally {
      setFpLoading(false);
    }
  };

  const handleFpResetPassword = async () => {
    if (!fpNewPassword || fpNewPassword.length < 6) {
      showToast("Password must be at least 6 characters", "warning");
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      showToast("Passwords do not match", "warning");
      return;
    }
    setFpLoading(true);
    try {
      const res = await ApiClient.resetPasswordWithOtp(fpResetToken, fpNewPassword);
      if (res.success) {
        showToast("Password reset successful! Please login.", "success");
        setShowForgotPassword(false);
        setFpStep(1); setFpPhone(''); setFpOtp(''); setFpResetToken(''); setFpNewPassword(''); setFpConfirmPassword('');
      } else {
        showToast(res.message || "Password reset failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Password reset failed", "error");
    } finally {
      setFpLoading(false);
    }
  };

  // Registration OTP handlers
  const handleRegSendOtp = async () => {
    if (!phone.trim()) {
      showToast("Please enter your WhatsApp number first", "warning");
      return;
    }
    setRegOtpLoading(true);
    try {
      const res = await ApiClient.sendRegistrationOtp(phone.trim());
      if (res.success) {
        setRegOtpSent(true);
        showToast("OTP sent to your WhatsApp number", "success");
      } else {
        showToast(res.message || "Failed to send OTP", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleRegVerifyOtp = async () => {
    if (!regOtp.trim() || regOtp.length < 6) {
      showToast("Please enter the 6-digit OTP", "warning");
      return;
    }
    setRegOtpLoading(true);
    try {
      const res = await ApiClient.verifyRegistrationOtp(phone.trim(), regOtp.trim());
      if (res.success) {
        setRegOtpVerified(true);
        showToast("WhatsApp number verified! ✅", "success");
      } else {
        showToast(res.message || "Invalid OTP code", "error");
      }
    } catch (err: any) {
      showToast(err.message || "OTP verification failed", "error");
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleBackStep = () => {
    if (mode === 'register') {
      if (registerStep > 1) {
        setRegisterStep((registerStep - 1) as 1 | 2 | 3 | 4);
      } else {
        if (onBack) onBack();
      }
    } else {
      if (onBack) onBack();
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'login') {
      if (!email || !password) {
        showToast("Email and Password are required fields", "warning");
        return;
      }

      setLoading(true);
      try {
        const response = await ApiClient.login(email, password);
        if (response.success && response.user && response.token) {
          showToast("Successfully connected to Live Dukan API!", "success");
          onLoginSuccess(response.user, response.token);
        } else {
          showToast(response.message || "Invalid merchant credentials.", "error");
        }
      } catch (err: any) {
        showToast(err.message || "Authentication failed. Please verify and retry.", "error");
      } finally {
        setLoading(false);
      }
    } else {
      // Register
      if (registerStep !== 4) {
        handleNextStep();
        return;
      }

      if (!themeSlug) {
        showToast("Please select a theme", "warning");
        return;
      }

      setLoading(true);
      try {
        const payload = {
          name,
          email,
          phone,
          password,
          password_confirmation: passwordConfirmation,
          store_name: storeName,
          store_slug: storeSlug,
          category,
          theme_slug: themeSlug,
          plan_slug: planSlug
        };
        const response = await ApiClient.register(payload);
        if (response.success && response.user && response.token) {
          showToast("Registration successful! Welcome to Asaan Dukan.", "success");
          onLoginSuccess(response.user, response.token);
        } else {
          showToast(response.message || "Registration failed.", "error");
        }
      } catch (err: any) {
        showToast(err.message || "Registration failed. Please check your inputs.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className={isRegister
      ? "h-full w-full bg-bg-primary flex flex-col md:h-auto md:min-h-[70vh] md:flex md:items-center md:justify-center md:p-4 md:py-12"
      : "min-h-[70vh] flex items-center justify-center p-4 py-12"
    }>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={isRegister
          ? "w-full flex-1 min-h-0 flex flex-col bg-bg-card md:flex-none md:w-full md:max-w-2xl md:border md:border-border-card/60 md:rounded-2xl md:shadow-2xl relative overflow-hidden"
          : "w-full max-w-md bg-bg-card border border-border-card/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        }
      >
        {/* Decorative Top Accent bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-btn-primary z-10" />

        {/* Header with Back Button */}
        <div className={`relative flex items-center justify-center shrink-0 ${isRegister ? 'px-5 pt-6 pb-4 md:p-6 md:pb-0' : 'mb-5'}`} style={isRegister ? { paddingTop: 'max(1.5rem, env(safe-area-inset-top))' } : undefined}>
          <button 
            type="button" 
            onClick={handleBackStep}
            className="absolute left-4 md:left-6 p-2 text-text-body-muted hover:text-text-main transition-colors cursor-pointer rounded-lg hover:bg-white/5"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h2 className="font-serif font-bold text-text-main text-xl">
            {mode === 'login' ? 'Merchant Login' : 'Merchant Onboarding'}
          </h2>
        </div>

        {mode === 'register' && (
          <div className={`flex items-center justify-between relative shrink-0 ${isRegister ? 'px-7 md:px-8 mb-6 mt-1' : 'mb-8 px-2'}`}>
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-border-card -z-10" />
            <div className={`absolute left-6 top-1/2 -translate-y-1/2 h-[2px] bg-btn-primary -z-10 transition-all duration-500`} style={{ width: registerStep === 1 ? '0%' : registerStep === 2 ? '33%' : registerStep === 3 ? '66%' : '100%' }} />
            
            {[
              { num: 1, label: 'Store' },
              { num: 2, label: 'Details' },
              { num: 3, label: 'Plan' },
              { num: 4, label: 'Theme' }
            ].map(step => (
              <div key={step.num} className="flex flex-col items-center gap-1.5 bg-bg-card">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  registerStep > step.num ? 'bg-btn-primary text-white shadow-lg shadow-btn-primary/20' : 
                  registerStep === step.num ? 'bg-btn-primary/20 text-btn-primary border-2 border-btn-primary' : 
                  'bg-bg-primary text-text-body-muted border-2 border-border-card'
                }`}>
                  {registerStep > step.num ? <Check size={14} strokeWidth={3} /> : step.num}
                </div>
                <span className={`text-[10px] font-bold tracking-wide uppercase ${registerStep >= step.num ? 'text-btn-primary' : 'text-text-body-muted'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {mode === 'login' && (
          <div className="text-center mb-5 mt-2">
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl mx-auto mb-3 border bg-btn-primary/10 border-btn-primary/20 text-btn-primary transition-all">
              <ShoppingBag size={24} />
            </div>
            <p className="text-xs text-text-body-muted mt-1 leading-normal">
              Log in to manage catalog, fulfill buyer orders, and configure custom themes via the Live Dukan API.
            </p>
          </div>
        )}

        {/* Toggle Login/Register (Only show in login mode or if we want users to switch before starting) */}
        {mode === 'login' && (
          <div className="flex bg-bg-primary rounded-xl p-1 mb-6">
            <button 
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-btn-primary text-white shadow' : 'text-text-body-muted hover:text-white'}`}
            >
              Login
            </button>
            <button 
              type="button"
              onClick={() => { setMode('register'); setRegisterStep(1); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-btn-primary text-white shadow' : 'text-text-body-muted hover:text-white'}`}
            >
              Register
            </button>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className={isRegister ? "flex-1 min-h-0 flex flex-col" : "space-y-4 relative min-h-[220px]"}>
          <div className={isRegister ? "flex-1 min-h-0 overflow-y-auto px-5 md:px-0 pb-2 space-y-5 relative" : "contents"}>
          <AnimatePresence mode="wait">
            
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider">
                    Registered Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                    <input 
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="merchant@asaandukan.online"
                      className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-main outline-none focus:border-accent-amber transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider">
                    Access Password
                  </label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                    <input 
                      type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-main outline-none focus:border-accent-amber transition-colors font-mono"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* FORGOT PASSWORD LINK */}
            {mode === 'login' && (
              <div className="text-center mt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-text-body-muted hover:text-btn-primary transition-colors cursor-pointer"
                >
                  Forgot Password? Reset via WhatsApp
                </button>
              </div>
            )}

            {/* REGISTER STEP 1 */}
            {mode === 'register' && registerStep === 1 && (
              <motion.div
                key="register-step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider">Store Name</label>
                  <div className="relative">
                    <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                    <input 
                      type="text" required value={storeName} onChange={(e) => setStoreName(e.target.value)}
                      placeholder="My Awesome Store"
                      className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-main outline-none focus:border-accent-amber"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider flex items-center gap-2">
                    Store Slug
                    {!slugEdited && storeName && (
                      <span className="text-[9px] text-btn-primary font-normal normal-case tracking-normal">✦ Auto-generated</span>
                    )}
                  </label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                    <input 
                      type="text" required value={storeSlug}
                      onChange={(e) => { setSlugEdited(true); setStoreSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()); }}
                      placeholder="my-awesome-store"
                      className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-main outline-none focus:border-accent-amber font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-text-body-muted mt-1 ml-1">Your store URL: asaandukan.online/store/<span className="text-btn-primary">{storeSlug || 'slug'}</span></p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider">Category</label>
                  <div className="relative">
                    <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                    <select
                      required value={category} onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-main outline-none focus:border-accent-amber appearance-none"
                    >
                      <option value="" disabled>Select a Category</option>
                      <option value="fashion">Fashion & Clothing</option>
                      <option value="electronics">Electronics & Gadgets</option>
                      <option value="grocery">Grocery & FMCG</option>
                      <option value="cosmetics">Cosmetics & Beauty</option>
                      <option value="decor">Home & Decor</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* REGISTER STEP 2 */}
            {mode === 'register' && registerStep === 2 && (
              <motion.div
                key="register-step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider">Full Name</label>
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                      <input 
                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-bg-primary border border-border-card rounded-xl pl-10 pr-3 py-3.5 text-sm text-text-main outline-none focus:border-accent-amber"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider">WhatsApp Number</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                        <input 
                          type="text" required value={phone} onChange={(e) => { setPhone(e.target.value); setRegOtpSent(false); setRegOtpVerified(false); }}
                          placeholder="03001234567"
                          className={`w-full bg-bg-primary border rounded-xl pl-10 pr-3 py-3.5 text-sm text-text-main outline-none transition-colors ${
                            regOtpVerified ? 'border-green-500 bg-green-500/5' : 'border-border-card focus:border-accent-amber'
                          }`}
                        />
                      </div>
                      {!regOtpVerified && (
                        <button
                          type="button"
                          onClick={handleRegSendOtp}
                          disabled={!phone || regOtpLoading}
                          className="px-3 py-2 bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
                        >
                          {regOtpLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Send OTP'}
                        </button>
                      )}
                      {regOtpVerified && (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-500 px-2">
                          <ShieldCheck size={16} /> Verified
                        </span>
                      )}
                    </div>

                    {/* OTP Input Field (shows after OTP is sent) */}
                    <AnimatePresence>
                      {regOtpSent && !regOtpVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 flex gap-2"
                        >
                          <div className="relative flex-1">
                            <MessageSquare size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                            <input
                              type="text"
                              maxLength={6}
                              value={regOtp}
                              onChange={e => setRegOtp(e.target.value.replace(/\D/g, ''))}
                              placeholder="Enter 6-digit OTP"
                              className="w-full bg-bg-primary border border-btn-primary/40 rounded-xl pl-10 pr-3 py-3 text-sm text-text-main outline-none focus:border-btn-primary font-mono tracking-widest"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleRegVerifyOtp}
                            disabled={regOtp.length < 6 || regOtpLoading}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {regOtpLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Verify'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                    <input 
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="merchant@asaandukan.online"
                      className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-main outline-none focus:border-accent-amber"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider">Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                      <input 
                        type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-bg-primary border border-border-card rounded-xl pl-10 pr-3 py-3.5 text-sm text-text-main outline-none focus:border-accent-amber font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-text-main mb-2 uppercase font-mono tracking-wider">Confirm</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                      <input 
                        type="password" required value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-bg-primary border border-border-card rounded-xl pl-10 pr-3 py-3.5 text-sm text-text-main outline-none focus:border-accent-amber font-mono"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* REGISTER STEP 3: PLAN */}
            {mode === 'register' && registerStep === 3 && (
              <motion.div
                key="register-step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="mb-2">
                  <h3 className="font-serif font-bold text-text-main text-lg">Select a Plan</h3>
                  <p className="text-xs text-text-body-muted">All plans include a <span className="text-btn-primary font-bold">7-day free trial</span>.</p>
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex bg-bg-primary rounded-xl p-1 mb-4">
                  <button 
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-btn-primary text-white shadow' : 'text-text-body-muted hover:text-white'}`}
                  >
                    Monthly
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-btn-primary text-white shadow' : 'text-text-body-muted hover:text-white'}`}
                  >
                    Yearly <span className="text-[9px] bg-accent-amber text-black px-1.5 py-0.5 rounded-full font-bold ml-1 tracking-tighter">SAVE 15%</span>
                  </button>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {plans.map(plan => {
                    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                    const suffix = billingCycle === 'monthly' ? '/mo' : '/yr';
                    const isExpanded = expandedPlan === plan.slug;
                    return (
                    <div 
                      key={plan.slug}
                      className={`relative rounded-xl border-2 p-3 transition-all cursor-pointer ${planSlug === plan.slug ? 'border-btn-primary bg-btn-primary/5 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'border-border-card bg-bg-primary hover:border-white/20'}`}
                      onClick={() => setPlanSlug(plan.slug)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-bold text-text-main flex items-center gap-2">
                          {plan.name}
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedPlan(isExpanded ? null : plan.slug); }}
                            className="text-text-body-muted hover:text-text-main transition-colors"
                            title="View Plan Features"
                          >
                            <Info size={14} />
                          </button>
                        </span>
                        {planSlug === plan.slug && (
                          <div className="w-5 h-5 rounded-full bg-btn-primary text-white flex items-center justify-center">
                            <Check size={12} strokeWidth={4} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-end gap-1 mb-2">
                        <span className="text-lg font-bold text-accent-amber">
                          {price == 0 ? 'Free' : `Rs.${price}`}
                        </span>
                        {price > 0 && <span className="text-[10px] text-text-body-muted mb-1">{suffix}</span>}
                      </div>
                      <div className="bg-btn-primary/10 text-btn-primary text-[9px] font-bold font-mono px-2 py-1 rounded inline-block uppercase tracking-wider">
                        7-Day Free Trial Included
                      </div>

                      {/* Expandable Features List */}
                      <AnimatePresence>
                        {isExpanded && plan.features && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden border-t border-border-card/30 pt-3 space-y-1.5"
                          >
                            <p className="text-[10px] font-bold text-text-main uppercase tracking-wider mb-2">Included Features</p>
                            {plan.features.map((feat: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-[10px] text-text-body-muted leading-snug">
                                <Check size={11} className="text-btn-primary shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )})}
                </div>
              </motion.div>
            )}

            {/* REGISTER STEP 4: THEME */}
            {mode === 'register' && registerStep === 4 && (
              <motion.div
                key="register-step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="mb-2">
                  <h3 className="font-serif font-bold text-text-main text-lg">Pick your vibe</h3>
                  <p className="text-xs text-text-body-muted">
                    {themes.some(t => t.is_premium)
                      ? <>Your selected plan doesn't include <span className="text-btn-primary font-bold">premium themes</span>. Upgrade to unlock them.</>
                      : <>Premium themes are unlocked with your plan. Pick any theme below.</>}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {themes.map(theme => {
                    // incorrectly showing premium themes as unlocked before.
                    const isThemePremium = theme.is_premium;
                    const isLocked = isThemePremium;
                    const isSelected = themeSlug === theme.slug;

                    return (
                    <div 
                      key={theme.slug}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                        isSelected ? 'border-btn-primary shadow-[0_0_15px_rgba(34,197,94,0.15)]' 
                        : isLocked ? 'border-border-card/40 opacity-60 cursor-not-allowed' 
                        : 'border-border-card bg-bg-primary hover:border-white/20 cursor-pointer'
                      }`}
                      onClick={() => !isLocked && setThemeSlug(theme.slug)}
                    >
                      {/* Theme Image */}
                      <div className="aspect-[4/3] bg-bg-card relative group">
                        {theme.screenshot_url ? (
                          <img src={theme.screenshot_url} alt={theme.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-border-card/50">
                            <span className="text-xs font-mono font-bold mt-2 opacity-50">NO IMAGE</span>
                          </div>
                        )}
                        
                        {/* Lock Overlay for premium themes on free plan */}
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                            <div className="p-2 bg-accent-amber/10 border border-accent-amber/30 rounded-full">
                              <Info size={14} className="text-accent-amber" />
                            </div>
                            <span className="text-[9px] text-accent-amber font-bold font-mono uppercase tracking-wider">Paid Plan Only</span>
                          </div>
                        )}

                        {/* Live Preview Button */}
                        {theme.demo_url && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2">
                            <a 
                              href={theme.demo_url.startsWith('http') ? theme.demo_url : `https://asaandukan.online/${theme.demo_url}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white shadow-lg text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition-all hover:scale-105"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={14} />
                              Live Preview
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Theme Info */}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-text-main leading-none truncate">{theme.name}</span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-btn-primary text-white flex items-center justify-center">
                              <Check size={10} strokeWidth={4} />
                            </div>
                          )}
                        </div>
                        {isThemePremium ? (
                          <span className={`text-[10px] font-mono font-bold ${isLocked ? 'text-total-red' : 'text-accent-amber'}`}>
                            {isLocked ? 'Locked' : 'Premium'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-btn-primary font-mono font-bold">Free</span>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
          </div>

          {/* Submit/Next button — pinned to the bottom so it's always in reach on mobile */}
          <div
            className={isRegister
              ? "shrink-0 px-5 md:px-0 pt-3 pb-5 md:pb-0 md:pt-4 border-t border-border-card/50 md:border-t-0 bg-bg-card"
              : "pt-4"
            }
            style={isRegister ? { paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' } : undefined}
          >
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg bg-btn-primary hover:bg-btn-primary-hover shadow-btn-primary/10 ${isRegister ? 'py-4 text-sm' : 'py-3 text-xs'}`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : mode === 'login' ? (
                'Login to Dashboard'
              ) : registerStep === 4 ? (
                'Complete Registration'
              ) : (
                <>
                  Continue <ArrowLeft size={16} className="rotate-180" />
                </>
              )}
            </button>
          </div>
        </form>

      </motion.div>

      {/* =====================================================================
          FORGOT PASSWORD MODAL (WhatsApp OTP 3-step flow)
      ===================================================================== */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForgotPassword(false); }}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-bg-card border border-border-card/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-btn-primary" />

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-btn-primary/10 border border-btn-primary/20 flex items-center justify-center text-btn-primary">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-text-main text-base">Reset Password</h3>
                  <p className="text-xs text-text-body-muted">via WhatsApp OTP</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="ml-auto text-text-body-muted hover:text-text-main transition-colors cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-2 mb-5">
                {[1,2,3].map((s) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      fpStep > s ? 'bg-btn-primary text-white' :
                      fpStep === s ? 'bg-btn-primary/20 text-btn-primary border-2 border-btn-primary' :
                      'bg-bg-primary text-text-body-muted border-2 border-border-card'
                    }`}>
                      {fpStep > s ? <Check size={12} strokeWidth={3} /> : s}
                    </div>
                    {s < 3 && <div className={`flex-1 h-[2px] transition-all ${fpStep > s ? 'bg-btn-primary' : 'bg-border-card'}`} />}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1: Enter phone */}
                {fpStep === 1 && (
                  <motion.div key="fp-step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <p className="text-sm text-text-body-muted">Enter your registered WhatsApp number. We'll send you a one-time code.</p>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                      <input
                        type="text"
                        value={fpPhone}
                        onChange={e => setFpPhone(e.target.value)}
                        placeholder="03001234567"
                        className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-main outline-none focus:border-btn-primary transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleFpSendOtp}
                      disabled={!fpPhone || fpLoading}
                      className="w-full py-3.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {fpLoading ? <RefreshCw size={16} className="animate-spin" /> : <><MessageSquare size={16} /> Send OTP via WhatsApp</>}
                    </button>
                  </motion.div>
                )}

                {/* Step 2: Enter OTP */}
                {fpStep === 2 && (
                  <motion.div key="fp-step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <p className="text-sm text-text-body-muted">Enter the 6-digit OTP sent to <span className="text-btn-primary font-semibold">{fpPhone}</span>.</p>
                    <div className="relative">
                      <ShieldCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                      <input
                        type="text"
                        maxLength={6}
                        value={fpOtp}
                        onChange={e => setFpOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="• • • • • •"
                        className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-4 py-3.5 text-lg text-text-main outline-none focus:border-btn-primary transition-colors font-mono tracking-[0.5em] text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleFpVerifyOtp}
                      disabled={fpOtp.length < 6 || fpLoading}
                      className="w-full py-3.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {fpLoading ? <RefreshCw size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Verify OTP</>}
                    </button>
                    <button type="button" onClick={() => setFpStep(1)} className="w-full text-xs text-text-body-muted hover:text-btn-primary transition-colors cursor-pointer">
                      ← Back / Resend OTP
                    </button>
                  </motion.div>
                )}

                {/* Step 3: New password */}
                {fpStep === 3 && (
                  <motion.div key="fp-step-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <p className="text-sm text-text-body-muted">Create your new password.</p>
                    <div>
                      <label className="block text-xs font-bold text-text-body-muted mb-2 uppercase tracking-wider font-mono">New Password</label>
                      <div className="relative">
                        <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                        <input
                          type={fpShowPw ? 'text' : 'password'}
                          value={fpNewPassword}
                          onChange={e => setFpNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-11 py-3.5 text-sm text-text-main outline-none focus:border-btn-primary transition-colors font-mono"
                        />
                        <button type="button" onClick={() => setFpShowPw(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-body-muted hover:text-text-main cursor-pointer">
                          {fpShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-body-muted mb-2 uppercase tracking-wider font-mono">Confirm Password</label>
                      <div className="relative">
                        <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body-muted" />
                        <input
                          type={fpShowPw ? 'text' : 'password'}
                          value={fpConfirmPassword}
                          onChange={e => setFpConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full bg-bg-primary border border-border-card rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-main outline-none focus:border-btn-primary transition-colors font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleFpResetPassword}
                      disabled={!fpNewPassword || fpNewPassword !== fpConfirmPassword || fpLoading}
                      className="w-full py-3.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {fpLoading ? <RefreshCw size={16} className="animate-spin" /> : <><Key size={16} /> Reset Password</>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

