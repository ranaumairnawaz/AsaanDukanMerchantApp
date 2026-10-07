import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-btn-primary hover:bg-btn-primary-hover text-text-white shadow-md shadow-btn-primary/10 border-transparent',
  secondary: 'bg-transparent border-border-card text-text-main hover:bg-bg-card hover:border-btn-secondary-border',
  danger: 'bg-total-red/10 hover:bg-total-red/20 text-total-red border-total-red/20 hover:border-total-red/40',
  ghost: 'bg-transparent border-transparent text-text-body-muted hover:text-text-main hover:bg-bg-card',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-[10px] px-3 py-1.5 rounded-lg',
  md: 'text-xs px-4 py-2 rounded-xl',
  lg: 'text-sm px-5 py-2.5 rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-1.5 font-bold font-mono uppercase tracking-wider
        border transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current/20 border-t-current rounded-full animate-spin" />
      ) : children}
    </button>
  );
}
