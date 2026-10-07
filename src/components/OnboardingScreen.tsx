import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ShoppingCart, Link2, MessageCircle, UserPlus, X } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    step: 1,
    icon: UserPlus,
    iconColor: 'text-emerald-400',
    iconBg: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    tag: 'Get Started',
    tagColor: 'bg-emerald-500/20 text-emerald-400',
    title: 'Create Your Free Account',
    subtitle: 'Set up your merchant account in minutes — no credit card required.',
    bullets: [
      'Register with name, email & phone',
      'Instantly activate your store',
      'Secure & verified login',
    ],
    bulletColor: 'text-emerald-400',
  },
  {
    step: 2,
    icon: ShoppingCart,
    iconColor: 'text-blue-400',
    iconBg: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    tag: 'Your Catalog',
    tagColor: 'bg-blue-500/20 text-blue-400',
    title: 'Upload Your Products',
    subtitle: 'Add your products with images, prices, and stock — your digital shelf is ready.',
    bullets: [
      'Add unlimited products',
      'Upload photos & set prices',
      'Manage stock levels easily',
    ],
    bulletColor: 'text-blue-400',
  },
  {
    step: 3,
    icon: Link2,
    iconColor: 'text-amber-400',
    iconBg: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    tag: 'Your Store Link',
    tagColor: 'bg-amber-500/20 text-amber-400',
    title: 'Get a Unique Store Link',
    subtitle: 'Every merchant gets a personalised store URL you can share anywhere.',
    bullets: [
      'Custom subdomain link',
      'Share on WhatsApp & social',
      'Professional store page',
    ],
    bulletColor: 'text-amber-400',
  },
  {
    step: 4,
    icon: MessageCircle,
    iconColor: 'text-green-400',
    iconBg: 'from-green-500/20 to-green-500/5 border-green-500/30',
    tag: 'Start Selling',
    tagColor: 'bg-green-500/20 text-green-400',
    title: 'Receive Orders on WhatsApp',
    subtitle: 'Customers place orders and you get instant WhatsApp notifications — zero missed sales.',
    bullets: [
      'Instant order notifications',
      'Manage orders from dashboard',
      'Accept cash or digital payment',
    ],
    bulletColor: 'text-green-400',
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startX = useRef(0);

  const goTo = (index: number, dir: number) => {
    setDirection(dir);
    setCurrent(index);
    setAutoPlay(false); // user took control
  };

  const next = () => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1, 1);
    } else {
      handleComplete();
    }
  };

  const prev = () => {
    if (current > 0) {
      goTo(current - 1, -1);
    }
  };

  useEffect(() => {
    if (!autoPlay) return;
    timerRef.current = setTimeout(() => {
      if (current < SLIDES.length - 1) {
        setDirection(1);
        setCurrent(c => c + 1);
      } else {
        setAutoPlay(false);
      }
    }, 3500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, autoPlay]);

  const handleComplete = () => {
    localStorage.setItem('onboarding_complete', 'true');
    onComplete();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx < -50) next();
    else if (dx > 50) prev();
  };

  const slide = SLIDES[current];
  const IconComponent = slide.icon;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col bg-[#0B1526] text-text-main overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient glow */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none transition-all duration-700
        ${current === 0 ? 'bg-emerald-500' : current === 1 ? 'bg-blue-500' : current === 2 ? 'bg-amber-500' : 'bg-green-500'}`}
      />

      {/* Skip button */}
      <div className="flex justify-end px-6 pt-6 relative z-10">
        <button
          onClick={handleComplete}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors font-mono uppercase tracking-wider cursor-pointer"
        >
          Skip <X size={13} />
        </button>
      </div>

      {/* Logo */}
      <div className="flex justify-center pt-6 pb-2 relative z-10">
        <img
          src="/logo.png"
          alt="Asaan Dukan"
          className="h-8 object-contain opacity-80"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
          >
            {/* Icon badge */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 260 }}
              className={`w-24 h-24 rounded-3xl border bg-gradient-to-br ${slide.iconBg} flex items-center justify-center mb-8 shadow-2xl`}
            >
              <IconComponent size={44} className={slide.iconColor} strokeWidth={1.5} />
            </motion.div>

            {/* Step tag */}
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`text-[10px] font-mono font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full ${slide.tagColor} mb-4`}
            >
              Step {slide.step} — {slide.tag}
            </motion.span>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-serif font-bold text-2xl sm:text-3xl leading-tight text-text-main mb-3 max-w-xs"
            >
              {slide.title}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-sm text-white/50 leading-relaxed max-w-xs mb-8"
            >
              {slide.subtitle}
            </motion.p>

            {/* Bullet points */}
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2 text-left w-full max-w-xs"
            >
              {slide.bullets.map((b, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3 text-sm text-white/70"
                >
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${slide.iconBg}`}>
                    <span className={`text-[10px] font-bold ${slide.bulletColor}`}>✓</span>
                  </span>
                  {b}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-8 pb-10 pt-4 relative z-10 flex flex-col items-center gap-6">
        {/* Dot progress */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              className={`rounded-full transition-all duration-300 cursor-pointer ${i === current
                ? 'w-6 h-2 bg-white'
                : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={next}
          className="w-full max-w-xs flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm uppercase tracking-wide transition-all active:scale-[0.97] cursor-pointer shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #1A6B3A 0%, #22C55E 100%)',
            boxShadow: '0 8px 30px rgba(34,197,94,0.25)',
          }}
        >
          {current < SLIDES.length - 1 ? (
            <>
              Next Step
              <ChevronRight size={16} />
            </>
          ) : (
            <>
              Get Started
              <ChevronRight size={16} />
            </>
          )}
        </button>

        {/* Already have account */}
        <p className="text-[11px] text-white/30 font-mono">
          Already have an account?{' '}
          <button
            onClick={handleComplete}
            className="text-white/60 hover:text-white underline underline-offset-2 cursor-pointer transition-colors"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
