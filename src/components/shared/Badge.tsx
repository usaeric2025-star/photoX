import { ReactNode } from 'react';
import { cn } from '#lib/utils.js';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';
  className?: string;
}

/**
 * Modern Badge component following the new UI standard.
 * Zero shadcn dependencies.
 */
export function Badge({ 
  children, 
  variant = 'secondary', 
  className 
}: BadgeProps) {
  const variants = {
    primary: "bg-brand-navy text-white",
    secondary: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border border-amber-100",
    danger: "bg-red-50 text-red-600 border border-red-100",
    outline: "bg-transparent border border-slate-200 text-slate-500",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest leading-none select-none",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
