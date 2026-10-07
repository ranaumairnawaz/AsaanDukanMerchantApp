import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  color?: string; // Tailwind text color class, e.g. 'text-accent-amber'
}

const sizeMap = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-10 h-10 border-4',
};

const labelSizeMap = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

export default function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div
        className={`${sizeMap[size]} border-border-card border-t-accent-amber rounded-full animate-spin`}
      />
      {label && (
        <p className={`${labelSizeMap[size]} text-text-body-muted font-mono`}>
          {label}
        </p>
      )}
    </div>
  );
}
