import { cn } from '../../lib/utils';

interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

/**
 * Modern Progress component following the new UI standard.
 * Zero shadcn dependencies.
 */
export function Progress({ 
  value = 0, 
  max = 100, 
  className,
  indicatorClassName 
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full w-full flex-1 bg-brand-navy transition-all duration-300 ease-in-out", indicatorClassName)}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}
