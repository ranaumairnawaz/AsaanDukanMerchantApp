import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-bg-card border border-border-card flex items-center justify-center mb-4 text-text-body-muted">
        <Icon size={26} strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-bold text-text-main font-serif">{title}</h3>
      <p className="text-xs text-text-body-muted mt-1.5 max-w-xs leading-relaxed">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 text-xs font-bold text-accent-amber hover:underline uppercase tracking-wider font-mono cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
