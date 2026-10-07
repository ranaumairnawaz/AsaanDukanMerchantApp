import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'motion/react';
import { ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (!refreshing) {
      controls.start({ y: 0 });
    }
  }, [refreshing, controls]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const y = e.touches[0].clientY;
    const pullDistance = Math.max(0, y - startY);
    if (pullDistance > 0 && pullDistance < 150) {
      controls.set({ y: pullDistance * 0.4 });
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    setPulling(false);
    const y = e.changedTouches[0].clientY;
    const pullDistance = Math.max(0, y - startY);
    
    if (pullDistance > 80) {
      setRefreshing(true);
      controls.start({ y: 50 });
      await onRefresh();
      setRefreshing(false);
    } else {
      controls.start({ y: 0 });
    }
  };

  return (
    <div 
      className="relative w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div 
        animate={controls}
        className="absolute top-0 left-0 w-full flex justify-center -mt-12 z-0"
      >
        <div className={`bg-bg-card border border-border-card rounded-full p-2 shadow-lg transition-transform ${refreshing ? 'animate-spin' : ''}`}>
          <ArrowDown size={18} className="text-accent-amber" />
        </div>
      </motion.div>
      <motion.div animate={controls} className="z-10 relative bg-bg-primary min-h-full">
        {children}
      </motion.div>
    </div>
  );
}
