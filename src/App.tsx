import { useState, useEffect } from 'react';
import { User, Order } from './types';
import { ApiClient } from './utils/api';
import { Haptics } from './utils/haptics';
import { 
  Megaphone, Newspaper, Calendar, ShieldAlert,
  ChevronLeft, LayoutDashboard, ShoppingCart, Percent, 
  Palette, Layers, Settings, Globe, Users, 
  CreditCard, LogOut, CheckCircle, AlertTriangle, AlertCircle,
  Menu, Sun, Moon, Search, Smartphone, X, ChevronRight, Award, ShoppingBag, Download,
  WifiOff, Wifi, Database, Compass, HelpCircle, Store, UserCircle, Package, Bell, Trash2, CheckCheck, Sparkles, Heart, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppNotification } from './types';

// Subcomponents
import SidebarMenu from './components/ui/SidebarMenu';
import DiscoverView from './components/DiscoverView';
import HelpView from './components/HelpView';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import AnalyticsView from './components/AnalyticsView';
import ProductsView from './components/ProductsView';
import OrdersView from './components/OrdersView';
import CouponsView from './components/CouponsView';
import ThemeView from './components/ThemeView';
import SectionsView from './components/SectionsView';
import SettingsView from './components/SettingsView';
import DomainView from './components/DomainView';
import StaffView from './components/StaffView';
import BillingView from './components/BillingView';
import OnboardingScreen from './components/OnboardingScreen';

type AppTab = 'discover' | 'dashboard' | 'help';
type MerchantSection = 'dashboard' | 'analytics' | 'products' | 'orders' | 'coupons' | 'theme' | 'sections' | 'domain' | 'staff' | 'billing' | 'settings';
type NavDirection = 'forward' | 'back';

export default function App() {
  // Navigation states
  const [activeTab, setActiveTab] = useState<AppTab>('discover');
  const [merchantSection, setMerchantSection] = useState<MerchantSection>('dashboard');
  const [navDirection, setNavDirection] = useState<NavDirection>('forward');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Theme conversion state
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  // Menu Search Query state
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  
  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // True while the merchant registration flow (inside LoginView) is active,
  // so the app shell can hide its own header/bottom nav on mobile and let
  // onboarding take the full screen.
  const [isRegistering, setIsRegistering] = useState(false);

  // Scroll position progress
  const [scrollProgress, setScrollProgress] = useState(0);

  // PWA install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  // Discover tab (lifted here so nav can switch it)
  const [discoverTab, setDiscoverTab] = useState<'news' | 'products'>('news');

  // Notifications system state
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('merchant_app_notifications');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'n_1',
        title: 'Welcome to Asaan Dukan!',
        message: 'Your merchant portal is active. Start sharing posts & products to grow your store.',
        type: 'system',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        read: false
      },
      {
        id: 'n_2',
        title: 'New Like Received! ❤️',
        message: 'A merchant liked your community post "Welcome to Asaan Dukan Community!"',
        type: 'like',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        read: false
      }
    ];
  });
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);

  const handleAddNotification = (notif: AppNotification) => {
    setNotifications(prev => {
      const updated = [notif, ...prev];
      localStorage.setItem('merchant_app_notifications', JSON.stringify(updated));
      return updated;
    });
    showToast(notif.message, 'success');
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('merchant_app_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('merchant_app_notifications');
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('merchant_app_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  // Onboarding: show only on first-ever launch (standalone PWA install)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const done = localStorage.getItem('onboarding_complete') === 'true';
    return isStandalone && !done;
  });

  // Authenticated User states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [appInitializing, setAppInitializing] = useState(true);
  const [showOfflinePopup, setShowOfflinePopup] = useState(false);

  // Global Toast States
  type ToastMessage = { id: number; msg: string; type: 'success' | 'error' | 'warning' };
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (type === 'error') Haptics.error();
    else if (type === 'warning') Haptics.impactHeavy();
    else Haptics.success();

    setToasts(prev => [...prev, { id: Date.now() + Math.random(), msg, type }]);
  };

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  // Online/Offline connection states
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [checkingConnection, setCheckingConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflinePopup(false);
      showToast("Your internet connection is restored! Syncing data...", "success");
      // Background Sync offline mutations
      ApiClient.syncOfflineQueue().then(() => {
        // Optionally refresh current view
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflinePopup(true);
      showToast("Connection lost. Operating in offline mode.", "error");
    };
    const handleApiConnectionFailed = () => {
      setIsOnline(false);
      setShowOfflinePopup(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('api_connection_failed', handleApiConnectionFailed);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('api_connection_failed', handleApiConnectionFailed);
    };
  }, []);

  const handleRetryConnection = async () => {
    setCheckingConnection(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      // Attempt to fetch favicon with no-cors mode, which is safe from CORS issues
      await fetch(window.location.origin + '/favicon.ico', { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      
      setIsOnline(true);
      showToast("Connection successfully restored!", "success");
    } catch (err) {
      if (navigator.onLine) {
        setIsOnline(true);
        showToast("Connection successfully restored!", "success");
      } else {
        setIsOnline(false);
        showToast("Still offline. Please check your internet connection.", "error");
      }
    } finally {
      setCheckingConnection(false);
    }
  };

  // Light/Dark mode element sync
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Scroll tracking effect
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // PWA banner effect
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone && !sessionStorage.getItem('pwa_dismissed')) {
        setShowInstallPopup(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !isStandalone && !sessionStorage.getItem('pwa_dismissed')) {
      const timer = setTimeout(() => {
        setShowInstallPopup(true);
      }, 4000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Welcome popup for unregistered users
  useEffect(() => {
    if (!appInitializing && !currentUser && !sessionStorage.getItem('welcome_dismissed')) {
      const timer = setTimeout(() => {
        setShowWelcomePopup(true);
      }, 3500); // Show after 3.5 seconds
      return () => clearTimeout(timer);
    }
  }, [appInitializing, currentUser]);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast("Welcome to the native Asaan Dukan App!", "success");
      }
      setDeferredPrompt(null);
      setShowInstallPopup(false);
    } else {
      showToast("Tap 'Share' then select 'Add to Home Screen' to save on iOS Safari.", "warning");
    }
  };

  const handleDismissInstallPopup = () => {
    sessionStorage.setItem('pwa_dismissed', 'true');
    setShowInstallPopup(false);
  };

  // Automatically dismiss toasts after 4s
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // Auth restore on startup
  useEffect(() => {
    const restoreAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      const savedUserStr = localStorage.getItem('auth_user');

      if (savedToken && savedUserStr) {
        try {
          setAuthToken(savedToken);
          const parsedUser = JSON.parse(savedUserStr);
          setCurrentUser(parsedUser);
          
          // Verify token against live profile
          const freshUser = await ApiClient.getProfile();
          setCurrentUser(freshUser);
          localStorage.setItem('auth_user', JSON.stringify(freshUser));
        } catch (e: any) {
          // If token stale or invalid (401), perform clean logout
          if (e.status === 401 || e.message?.includes('401')) {
            handleLogout(true);
          }
        }
      }
      setAppInitializing(false);
    };

    restoreAuth();

    // Register a global event listener for unauthorized 401 exceptions
    const handleAuthError = () => {
      handleLogout(true);
    };
    window.addEventListener('unauthorized-api-call', handleAuthError);
    window.addEventListener('merchant_logout_unauthorized', handleAuthError);

    // Register a global listener for 503 maintenance responses
    const handleMaintenance = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message || 'The app is currently under maintenance. Please try again later.';
      setMaintenanceMessage(msg);
    };
    window.addEventListener('merchant_maintenance', handleMaintenance);

    return () => {
      window.removeEventListener('unauthorized-api-call', handleAuthError);
      window.removeEventListener('merchant_logout_unauthorized', handleAuthError);
      window.removeEventListener('merchant_maintenance', handleMaintenance);
    };
  }, []);

  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setMerchantSection('dashboard');
  };

  const handleLogout = (isStale = false) => {
    ApiClient.logout();
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setMerchantSection('dashboard');
    setActiveTab('dashboard');
    
    if (isStale) {
      showToast("Your session has expired. Please log in again.", "warning");
    } else {
      showToast("You have been securely logged out.", "success");
    }
  };

  // Custom secondary navigation bridge for subviews
  const handleMerchantNavigation = (section: string, arg?: any, direction: NavDirection = 'forward') => {
    if (section === 'orders' && merchantSection !== 'orders') {
      setOrderStatusFilter('all');
    }
    setNavDirection(direction);
    setMerchantSection(section as MerchantSection);
    if (arg?.initialStatusFilter) {
      setOrderStatusFilter(arg.initialStatusFilter);
    }
    if (arg?.selectedOrderId) {
      setSelectedOrderId(arg.selectedOrderId);
    }
  };

  // Render sub-components based on active navigation
  const renderMerchantSubSection = () => {
    switch (merchantSection) {
      case 'dashboard':
        return (
          <DashboardView 
            onNavigate={handleMerchantNavigation} 
            showToast={showToast} 
          />
        );
      case 'analytics':
        return (
          <AnalyticsView 
            onNavigate={handleMerchantNavigation} 
            showToast={showToast} 
          />
        );
      case 'products':
        return (
          <ProductsView 
            onNavigate={handleMerchantNavigation}
            showToast={showToast} 
          />
        );
      case 'orders':
        return (
          <OrdersView 
            initialStatusFilter={orderStatusFilter}
            onNavigate={handleMerchantNavigation}
            showToast={showToast}
            selectedOrderId={selectedOrderId}
          />
        );
      case 'coupons':
        return (
          <CouponsView 
            showToast={showToast} 
          />
        );
      case 'theme':
        return (
          <ThemeView 
            onNavigate={handleMerchantNavigation}
            showToast={showToast} 
          />
        );
      case 'sections':
        return (
          <SectionsView 
            showToast={showToast} 
          />
        );
      case 'settings':
        return (
          <SettingsView 
            showToast={showToast} 
          />
        );
      case 'domain':
        return (
          <DomainView 
            onNavigate={handleMerchantNavigation}
            showToast={showToast} 
          />
        );
      case 'staff':
        return (
          <StaffView 
            currentUser={currentUser}
            showToast={showToast} 
          />
        );
      case 'billing':
        return (
          <BillingView 
            showToast={showToast} 
          />
        );
      default:
        return null;
    }
  };

  if (appInitializing) {
    return (
      <div className="min-h-screen bg-[#0F1A2E] flex flex-col items-center justify-center text-text-body-muted">
        <div className="w-10 h-10 border-3 border-white/20 border-t-accent-amber rounded-full animate-spin" />
        <span className="text-xs mt-3.5 font-mono tracking-widest text-text-body-muted">BOOTING WORKSPACE...</span>
      </div>
    );
  }

  const getSubSectionTitle = (section: MerchantSection) => {
    switch (section) {
      case 'analytics': return 'Store Analytics';
      case 'products': return 'Products Catalog';
      case 'orders': return 'Order Logs';
      case 'coupons': return 'Discount Coupons';
      case 'theme': return 'Theme Customizer';
      case 'sections': return 'Home Sections';
      case 'domain': return 'Domain Shop';
      case 'staff': return 'Staff Logins';
      case 'billing': return 'Subscription Plan';
      case 'settings': return 'Store Settings';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-main flex flex-col relative antialiased selection:bg-accent-amber/30 selection:text-text-main">

      {/* ONBOARDING SCREEN — shown only on first PWA launch */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAINTENANCE OVERLAY */}
      <AnimatePresence>
        {maintenanceMessage && (
          <motion.div
            key="maintenance"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-bg-primary flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
              <ShieldAlert size={36} className="text-amber-400" />
            </div>
            <h1 className="font-serif font-extrabold text-2xl text-text-main mb-3">Under Maintenance</h1>
            <p className="text-text-body-muted text-sm max-w-sm leading-relaxed mb-8">{maintenanceMessage}</p>
            <button
              onClick={() => setMaintenanceMessage(null)}
              className="px-6 py-2.5 bg-bg-card border border-border-card text-text-body-muted hover:text-text-main text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* OFFLINE BANNER */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-red-600 dark:bg-red-700 text-text-main text-xs py-2.5 px-4 flex items-center justify-between gap-4 z-50 relative border-b border-red-500/30 shadow-md select-none overflow-hidden font-sans"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-white/10 rounded-lg animate-pulse">
                <WifiOff size={16} className="text-text-main" />
              </div>
              <div>
                <span className="font-bold tracking-tight">Offline Mode Active.</span>
                <span className="opacity-90 ml-1.5 hidden md:inline">Your connection was lost. Some features or real-time updates may be limited.</span>
              </div>
            </div>
            <button
              onClick={handleRetryConnection}
              disabled={checkingConnection}
              className="bg-white text-red-600 dark:text-red-700 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg hover:bg-white/90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
            >
              {checkingConnection ? (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-red-600 dark:border-red-700 border-t-transparent rounded-full animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Wifi size={12} />
                  <span>Retry Connection</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCROLL PROGRESS BAR */}
      <div className="fixed top-0 left-0 w-full h-[3px] bg-black/10 dark:bg-white/5 z-50 pointer-events-none">
        <div 
          className="h-full bg-accent-amber transition-all duration-100 ease-out shadow-[0_0_8px_#E0A458]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="flex flex-row w-full flex-1 min-h-0">
        {currentUser && (
          <SidebarMenu 
            activeTab={activeTab} 
            merchantSection={merchantSection} 
            onNavigate={(tab, section) => {
              setActiveTab(tab);
              if (section) setMerchantSection(section as MerchantSection);
            }}
            onLogout={() => handleLogout(false)}
            isOpen={isMobileDrawerOpen}
            onClose={() => setIsMobileDrawerOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* GLOBAL HEADER BAR */}
          <header className={`sticky top-0 z-40 bg-bg-primary/85 backdrop-blur-md border-b border-border-card px-4 py-3 justify-between items-center w-full ${isRegistering ? 'hidden' : 'flex'}`}>
            {currentUser && merchantSection !== 'dashboard' ? (
              // NATIVE-LIKE SUB-PAGE HEADER (No branding, back button, page title)
              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="md:hidden p-2 bg-bg-card hover:bg-bg-card/80 border border-border-card text-text-body-muted hover:text-text-main rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  <Menu size={16} />
                </button>
                <button 
                  onClick={() => {
                    setMerchantSection('dashboard');
                    setSelectedOrderId(null);
                  }}
                  className="p-2 bg-bg-card hover:bg-bg-card/80 border border-border-card text-accent-amber hover:text-text-main rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1 font-mono text-xs font-bold"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <div className="flex-1 text-center">
                  <h2 className="font-serif font-bold text-base text-text-main tracking-tight">
                    {getSubSectionTitle(merchantSection)}
                  </h2>
                  <span className="text-[9px] font-mono text-text-body-muted uppercase tracking-wider block">
                    Workspace Tool
                  </span>
                </div>
                
                {/* Theme Toggle Button */}
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 bg-bg-card border border-border-card text-text-body-muted hover:text-accent-amber rounded-xl cursor-pointer active:scale-95"
                  title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>
              </div>
            ) : (
              // STANDARD BRANDED HEADER
              <>
                <div className="flex items-center gap-2">
                  {currentUser && (
                    <button 
                      onClick={() => setIsMobileDrawerOpen(true)}
                      className="md:hidden p-2 bg-bg-card hover:bg-bg-card/80 border border-border-card text-text-body-muted hover:text-text-main rounded-xl transition-all cursor-pointer mr-1"
                    >
                      <Menu size={16} />
                    </button>
                  )}
                  <div className={`w-8 h-8 rounded-xl bg-btn-primary flex items-center justify-center font-serif font-bold text-white text-base shadow-md ${currentUser ? 'hidden md:flex' : ''}`}>
                    AD
                  </div>
                  <div className={currentUser ? 'hidden md:block' : ''}>
                    <h1 className="font-serif font-bold text-base text-text-main leading-tight">AssanDukan</h1>
                    <span className="text-[9px] font-mono font-bold text-text-body-muted uppercase tracking-wider block">Merchant Portal</span>
                  </div>
                </div>

                {!currentUser && (
                  <button 
                    onClick={() => {
                      setActiveTab('dashboard');
                      setMerchantSection('dashboard');
                    }}
                    className="flex px-4 py-1.5 bg-btn-primary hover:bg-btn-primary-hover text-white text-[11px] font-bold uppercase tracking-wide rounded-xl transition-all cursor-pointer shadow-sm items-center gap-1.5 active:scale-95"
                  >
                    <LogOut size={13} className="rotate-180" />
                    Login
                  </button>
                )}

                {/* Logged in user detail chip with Theme Toggle & Notifications */}
                {currentUser && (
                  <div className="flex items-center gap-2 bg-bg-card border border-border-card px-2.5 py-1.5 rounded-xl">
                    {/* Notifications Bell */}
                    <button
                      onClick={() => {
                        setShowNotificationsModal(true);
                        markAllNotificationsRead();
                      }}
                      className="relative p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-text-body-muted hover:text-text-main transition-colors cursor-pointer"
                      title="Notifications"
                    >
                      <Bell size={15} />
                      {unreadNotifCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white font-bold text-[8px] rounded-full flex items-center justify-center animate-pulse">
                          {unreadNotifCount}
                        </span>
                      )}
                    </button>

                    {/* Light/Dark Toggle */}
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-text-body-muted hover:text-accent-amber transition-colors cursor-pointer"
                      title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                      {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    
                    <div className="text-right hidden sm:block pl-2 border-l border-border-card">
                      <div className="text-xs font-bold text-text-main">{currentUser.name}</div>
                      <span className="text-[9px] font-mono text-accent-amber font-bold uppercase tracking-wide block">{currentUser.tenant_role}</span>
                    </div>
                    <button 
                      onClick={() => handleLogout(false)}
                      className="p-1.5 bg-bg-primary hover:bg-[#c93e32]/10 border border-border-card hover:border-total-red hover:text-total-red rounded-lg transition-colors cursor-pointer"
                      title="Secure Logout"
                    >
                      <LogOut size={13} />
                    </button>
                  </div>
                )}
              </>
            )}
          </header>

      {/* PRIMARY CENTRAL STAGE VIEWPORT */}
      <motion.main 
        className={`flex-1 max-w-7xl mx-auto w-full overflow-x-hidden ${
          activeTab === 'discover'
            ? 'px-0 pt-0 pb-0'
            : isRegistering ? 'px-0 pt-0 pb-0 md:px-4 md:pt-5 md:pb-24' : 'px-4 pt-5 pb-24'
        }`}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.05}
        onDragEnd={(e, { offset }) => {
          const swipe = offset.x;
          if (swipe < -60) {
            // swipe left -> go to dashboard
            if (activeTab === 'discover') {
              setNavDirection('forward');
              setActiveTab('dashboard');
              if (!currentUser) setMerchantSection('dashboard');
            } else if (activeTab === 'dashboard' && merchantSection === 'dashboard') {
              setNavDirection('forward');
              setActiveTab('help');
            }
          } else if (swipe > 60) {
            // swipe right -> go to discover
            if (activeTab === 'dashboard' && merchantSection === 'dashboard') {
              setNavDirection('back');
              setActiveTab('discover');
            } else if (activeTab === 'help') {
              setNavDirection('back');
              setActiveTab('dashboard');
            }
          }
        }}
      >
        
        {/* DISCOVER TAB */}
        {activeTab === 'discover' && (
          <motion.div
            key="discover"
            initial={navDirection === 'back' ? { x: -40, opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="h-full"
          >
            <DiscoverView 
              currentUser={currentUser} 
              onShowLogin={() => { setNavDirection('forward'); setActiveTab('dashboard'); }}
              discoverTab={discoverTab}
              onDiscoverTabChange={setDiscoverTab}
              onAddNotification={handleAddNotification}
              onOpenNotifications={() => {
                setShowNotificationsModal(true);
                markAllNotificationsRead();
              }}
              unreadNotifCount={unreadNotifCount}
            />
          </motion.div>
        )}

        {/* HELP TAB */}
        {activeTab === 'help' && (
          <motion.div
            key="help"
            initial={navDirection === 'forward' ? { x: 40, opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          >
            <HelpView />
          </motion.div>
        )}

        {/* AUTHENTICATED OR LOGIN GATEWAYS */}
        {activeTab === 'dashboard' && (
          !currentUser ? (
            <motion.div
              key="login"
              initial={navDirection === 'forward' ? { x: 40, opacity: 0 } : false}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className={isRegistering ? 'h-full flex flex-col' : ''}
            >
              <LoginView
                onLoginSuccess={handleLoginSuccess}
                showToast={showToast}
                onBack={() => { setNavDirection('back'); setActiveTab('discover'); }}
                onRegisterModeChange={setIsRegistering}
              />
            </motion.div>
          ) : (
            <div>
              <AnimatePresence mode="wait" custom={navDirection}>
                <motion.div
                  key={merchantSection}
                  custom={navDirection}
                  variants={{
                    enter: (dir: NavDirection) => ({ x: dir === 'forward' ? 40 : -40, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir: NavDirection) => ({ x: dir === 'forward' ? -40 : 40, opacity: 0 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                >
                  {renderMerchantSubSection()}
                </motion.div>
              </AnimatePresence>
            </div>
          )
        )}

      </motion.main>
      </div>
      </div>

      {/* FLOATING ISLAND BOTTOM NAVIGATION */}
      <nav className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-40 md:hidden w-[90%] max-w-sm ${isRegistering ? 'hidden' : ''}`}>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 280, damping: 22 }}
          className="flex items-center justify-around bg-bg-card/95 backdrop-blur-xl border border-border-card/80 px-2 py-2 rounded-full shadow-2xl shadow-black/40"
        >
          {/* ── DISCOVER (always present) ── */}
          <button
            onClick={() => { setNavDirection('back'); setActiveTab('discover'); setDiscoverTab('news'); }}
            className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all cursor-pointer active:scale-95 ${
              activeTab === 'discover' && discoverTab === 'news' ? 'bg-text-main text-bg-primary' : 'text-text-body-muted hover:text-text-main'
            }`}
          >
            <Compass size={20} className={activeTab === 'discover' && discoverTab === 'news' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
          </button>

          {currentUser ? (
            <>
              <button
                onClick={() => { setNavDirection('forward'); setActiveTab('dashboard'); setMerchantSection('dashboard'); }}
                className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all cursor-pointer active:scale-95 ${
                  activeTab === 'dashboard' && !isMobileDrawerOpen ? 'bg-text-main text-bg-primary' : 'text-text-body-muted hover:text-text-main'
                }`}
              >
                <LayoutDashboard size={20} className={activeTab === 'dashboard' && !isMobileDrawerOpen ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              </button>

              {/* POST BUTTON (TikTok style) */}
              <button
                onClick={() => {
                  setActiveTab('discover');
                  setTimeout(() => window.dispatchEvent(new Event('open_merchant_post_modal')), 100);
                }}
                className="relative flex items-center justify-center w-12 h-12 mx-1 bg-btn-primary hover:bg-btn-primary-hover text-white rounded-[14px] transition-all cursor-pointer active:scale-95 shadow-lg shadow-btn-primary/30"
              >
                <Plus size={26} className="stroke-[2.5]" />
              </button>

              <button
                onClick={() => { setNavDirection('forward'); setActiveTab('help'); }}
                className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all cursor-pointer active:scale-95 ${
                  activeTab === 'help' && !isMobileDrawerOpen ? 'bg-text-main text-bg-primary' : 'text-text-body-muted hover:text-text-main'
                }`}
              >
                <HelpCircle size={20} className={activeTab === 'help' && !isMobileDrawerOpen ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              </button>

              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all cursor-pointer active:scale-95 ${
                  isMobileDrawerOpen ? 'bg-text-main text-bg-primary' : 'text-text-body-muted hover:text-text-main'
                }`}
              >
                <Menu size={20} className={isMobileDrawerOpen ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              </button>
            </>
          ) : (
            <>
              {/* Login (User icon) */}
              <button
                onClick={() => { setNavDirection('forward'); setActiveTab('dashboard'); }}
                className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all cursor-pointer active:scale-95 ${
                  activeTab === 'dashboard' ? 'bg-text-main text-bg-primary' : 'text-text-body-muted hover:text-text-main'
                }`}
              >
                <UserCircle size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              </button>

              {/* Help */}
              <button
                onClick={() => { setNavDirection('forward'); setActiveTab('help'); }}
                className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all cursor-pointer active:scale-95 ${
                  activeTab === 'help' ? 'bg-text-main text-bg-primary' : 'text-text-body-muted hover:text-text-main'
                }`}
              >
                <HelpCircle size={20} className={activeTab === 'help' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              </button>
            </>
          )}
        </motion.div>
      </nav>

      {/* PWA INSTALLATION POPUP */}
      <AnimatePresence>
        {showInstallPopup && (activeTab === 'discover' || (activeTab === 'dashboard' && merchantSection === 'dashboard')) && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 z-50 bg-bg-card border border-border-card rounded-2xl p-4 shadow-2xl max-w-sm ml-auto text-text-main"
          >
            <div className="flex items-start gap-3">
              <div className="bg-btn-primary/15 p-2.5 rounded-xl text-btn-primary border border-btn-primary/20 shrink-0">
                <Smartphone size={20} className="animate-pulse" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono">Install Asaan Dukan</h3>
                  <button 
                    onClick={handleDismissInstallPopup}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-text-body-muted hover:text-text-main transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
                <p className="text-xs text-text-body-muted mt-1 leading-relaxed">
                  Install our lightweight app on your Home Screen for immediate offline access, fullscreen mode, and instant tool loading.
                </p>
                
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleInstallApp}
                    className="flex-1 bg-btn-primary hover:bg-btn-primary-hover text-white text-[11px] font-bold py-1.5 px-3 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-btn-primary/10 uppercase font-mono tracking-wider"
                  >
                    <Download size={12} />
                    Install Now
                  </button>
                  <button
                    onClick={handleDismissInstallPopup}
                    className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-text-body-muted text-[11px] font-bold py-1.5 px-3 rounded-lg active:scale-95 transition-all cursor-pointer uppercase font-mono tracking-wider"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OFFLINE MODAL POPUP */}
      <AnimatePresence>
        {showOfflinePopup && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#162238] border border-[#243554] rounded-2xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden"
            >
              {/* Red warning top bar */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500 animate-pulse" />
              
              <div className="text-center">
                <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <WifiOff size={28} />
                </div>
                
                <h3 className="font-serif font-bold text-text-main text-lg leading-snug">
                  Connection Offline
                </h3>
                
                <p className="text-xs text-text-body-muted mt-2 leading-relaxed">
                  We're having trouble connecting to the Live Dukan API servers. Please check your internet connection and try again.
                </p>
                
                <div className="mt-6 space-y-2">
                  <button
                    onClick={async () => {
                      await handleRetryConnection();
                      if (navigator.onLine) {
                        setShowOfflinePopup(false);
                      }
                    }}
                    disabled={checkingConnection}
                    className="w-full bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-bold py-2.5 px-4 rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-btn-primary/10 font-mono uppercase tracking-wider"
                  >
                    {checkingConnection ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Wifi size={14} />
                        Retry Connection
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowOfflinePopup(false)}
                    className="w-full bg-[#0F1A2E]/50 hover:bg-[#0F1A2E] text-text-body-muted hover:text-text-main text-[11px] font-bold py-2 px-4 rounded-xl transition-all cursor-pointer font-mono uppercase tracking-wider"
                  >
                    Browse Offline Cache
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WELCOME POPUP FOR NEW USERS */}
      <AnimatePresence>
        {showWelcomePopup && !currentUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-bg-card border border-border-card rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-btn-primary/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent-amber/10 rounded-full blur-3xl pointer-events-none" />
              
              <button 
                onClick={() => {
                  sessionStorage.setItem('welcome_dismissed', 'true');
                  setShowWelcomePopup(false);
                }}
                className="absolute top-4 right-4 p-1.5 bg-black/10 dark:bg-white/10 rounded-full text-text-body-muted hover:text-text-main transition-colors z-10"
              >
                <X size={16} />
              </button>

              <div className="text-center relative z-10 mt-2">
                <div className="w-16 h-16 bg-gradient-to-tr from-btn-primary to-accent-amber rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-btn-primary/30">
                  <Store size={32} className="text-white" />
                </div>
                
                <h3 className="font-serif font-extrabold text-text-main text-2xl leading-tight">
                  Welcome to <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-btn-primary to-accent-amber">Asaan Dukan</span>
                </h3>
                
                <p className="text-[13px] text-text-body-muted mt-3 mb-6 leading-relaxed px-2">
                  Join thousands of successful merchants growing their business online. Create your free digital store today in less than 2 minutes!
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      sessionStorage.setItem('welcome_dismissed', 'true');
                      setShowWelcomePopup(false);
                      setNavDirection('forward');
                      setActiveTab('dashboard');
                      setIsRegistering(true); // Jump straight to register view
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-btn-primary to-btn-primary-hover text-white text-sm font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-btn-primary/20"
                  >
                    Create Free Store
                  </button>
                  
                  <button
                    onClick={() => {
                      sessionStorage.setItem('welcome_dismissed', 'true');
                      setShowWelcomePopup(false);
                    }}
                    className="w-full py-3.5 bg-bg-primary border border-border-card text-text-main text-sm font-bold rounded-xl active:scale-95 transition-all"
                  >
                    Explore App First
                  </button>
                </div>
                
                <div className="mt-4 text-[11px] text-text-body-muted">
                  Already have a store?{' '}
                  <button 
                    onClick={() => {
                      sessionStorage.setItem('welcome_dismissed', 'true');
                      setShowWelcomePopup(false);
                      setNavDirection('forward');
                      setActiveTab('dashboard');
                      setIsRegistering(false);
                    }}
                    className="text-btn-primary font-bold hover:underline"
                  >
                    Login here
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NOTIFICATIONS MODAL DRAWER */}
      <AnimatePresence>
        {showNotificationsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-bg-card border-l border-border-card w-full max-w-md h-full flex flex-col shadow-2xl relative"
            >
              {/* Header */}
              <div className="p-5 border-b border-border-card/60 flex items-center justify-between bg-bg-primary/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-btn-primary/15 rounded-xl text-btn-primary">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-text-main text-base">Notifications</h3>
                    <p className="text-[11px] text-text-body-muted">Activity, likes, and updates</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="p-1.5 text-text-body-muted hover:text-total-red rounded-lg transition-colors cursor-pointer text-xs font-mono flex items-center gap-1"
                      title="Clear all"
                    >
                      <Trash2 size={14} /> Clear
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationsModal(false)}
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-text-body-muted hover:text-text-main transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 relative ${
                      !notif.read ? 'bg-btn-primary/5 border-btn-primary/30' : 'bg-bg-primary/40 border-border-card/60'
                    }`}
                  >
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-btn-primary absolute top-4 right-4" />
                    )}

                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      notif.type === 'like' ? 'bg-red-500/15 text-red-500' :
                      notif.type === 'order' ? 'bg-green-500/15 text-success-green' : 'bg-blue-500/15 text-blue-400'
                    }`}>
                      {notif.type === 'like' && <Heart size={18} className="fill-red-500 text-red-500" />}
                      {notif.type === 'order' && <Package size={18} />}
                      {notif.type === 'system' && <Sparkles size={18} />}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-xs font-bold text-text-main leading-snug">{notif.title}</h4>
                      <p className="text-xs text-text-body-muted mt-1 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] font-mono text-text-body-muted/70 mt-2 block">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="text-text-body-muted/50 hover:text-total-red p-1 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {notifications.length === 0 && (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-14 h-14 rounded-2xl bg-bg-primary flex items-center justify-center text-text-body-muted mb-3 border border-border-card">
                      <Bell size={24} />
                    </div>
                    <h4 className="font-bold text-text-main text-sm">No notifications yet</h4>
                    <p className="text-xs text-text-body-muted mt-1 max-w-xs">When users like your products or posts, you'll see notifications here!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING ACTION TOAST DISCLOSURES */}
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 z-50 flex flex-col gap-2 pointer-events-none items-end">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => dismissToast(t.id)}
              className="p-4 rounded-xl border flex items-center gap-3 shadow-2xl cursor-pointer max-w-sm ml-auto bg-bg-card select-none pointer-events-auto"
              style={{
                borderColor: t.type === 'success' ? '#1E8449' : t.type === 'error' ? '#c93e32' : '#E0A458'
              }}
            >
              {t.type === 'success' && <CheckCircle size={18} className="text-success-green shrink-0" />}
              {t.type === 'error' && <AlertCircle size={18} className="text-total-red shrink-0" />}
              {t.type === 'warning' && <AlertTriangle size={18} className="text-accent-amber shrink-0 animate-bounce" />}
              
              <p className="text-xs text-text-main leading-normal pr-4 flex-1">
                {t.msg}
              </p>
              
              <button className="text-[10px] text-text-body-muted hover:text-text-main uppercase font-bold font-mono">
                Dismiss
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
