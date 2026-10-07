import React from 'react';
import { motion } from 'motion/react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  onClick?: () => void;
  animate?: boolean;
  delay?: number;
}

export default function Card({
  children,
  className = '',
  as: Tag = 'div',
  onClick,
  animate = false,
  delay = 0,
}: CardProps) {
  const base = `bg-bg-card border border-border-card/70 rounded-2xl transition-all duration-200 ${
    onClick ? 'cursor-pointer hover:border-accent-amber/25 hover:shadow-lg hover:shadow-black/10 active:scale-[0.99]' : ''
  } ${className}`;

  if (animate) {
    return (
      <motion.div
        onClick={onClick as any}
        className={base}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay, type: 'spring', stiffness: 240, damping: 22 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <Tag onClick={onClick} className={base}>
      {children}
    </Tag>
  );
}
