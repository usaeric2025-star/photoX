import { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from '@/components/ui/Icon';
import { cn } from '../../lib/utils';

interface AlertProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'destructive';
  className?: string;
  icon?: ReactNode;
}

/**
 * Modern Alert component following the new UI standard.
 * Zero shadcn dependencies.
 */
export function Alert({ 
  children, 
  variant = 'info', 
  className,
  icon 
}: AlertProps) {
  const variants = {
    info: "bg-blue-50 text-blue-700 border-blue-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    destructive: "bg-red-50 text-red-700 border-red-100",
  };

  const IconMap = {
    info: Info,
    success: CheckCircle2,
    warning: AlertCircle,
    destructive: XCircle,
  };

  const DefaultIcon = IconMap[variant];

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-2xl border p-4 flex gap-3 animate-fade-in",
        variants[variant],
        className
      )}
    >
      <div className="shrink-0 pt-0.5">
        {icon || <DefaultIcon size={18} />}
      </div>
      <div className="flex-1 text-sm font-medium leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function AlertDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-xs opacity-90 mt-1 font-normal", className)}>
      {children}
    </div>
  );
}
