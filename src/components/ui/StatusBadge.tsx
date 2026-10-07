import { motion } from 'motion/react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function getStatusStyle(status: string): string {
  switch (status?.toLowerCase()) {
    case 'pending':    return 'bg-amber-500/10 text-accent-amber border-amber-500/20';
    case 'confirmed':  return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'processing': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'shipped':    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    case 'delivered':  return 'bg-emerald-500/10 text-success-green border-emerald-500/20';
    case 'cancelled':  return 'bg-rose-500/10 text-total-red border-rose-500/20';
    case 'active':     return 'bg-emerald-500/10 text-success-green border-emerald-500/20';
    case 'inactive':   return 'bg-gray-500/10 text-text-body-muted border-gray-500/20';
    case 'expired':    return 'bg-rose-500/10 text-total-red border-rose-500/20';
    case 'scheduled':  return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:           return 'bg-gray-500/10 text-text-body-muted border-gray-500/20';
  }
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold 
        uppercase tracking-wider border ${getStatusStyle(status)} ${className}
      `}
    >
      {status}
    </motion.span>
  );
}
