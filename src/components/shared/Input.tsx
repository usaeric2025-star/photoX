import { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '#lib/utils.js';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: ReactNode;
  containerClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Modern Input component following the new UI standard.
 * Zero shadcn dependencies.
 */
export const Input = ({
  className,
  error,
  icon,
  containerClassName,
  ref,
  ...props
}: InputProps) => {
  return (
    <div className={cn("relative w-full group", containerClassName)}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-navy transition-colors">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-medium transition-all outline-none",
          "placeholder:text-slate-400 placeholder:font-normal",
          "focus:bg-white focus:border-brand-navy focus:ring-4 focus:ring-brand-navy/5",
          icon && "pl-10",
          error && "border-red-200 bg-red-50 focus:border-red-400 focus:ring-red-50",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 px-1 text-xs font-bold text-red-500 animate-fade-in">
          {typeof error === 'string' ? error : (typeof error === 'object' && error ? (error as { message?: string }).message || String(error) : String(error))}
        </p>
      )}
    </div>
  );
};
