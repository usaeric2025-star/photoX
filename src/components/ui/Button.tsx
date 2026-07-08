import { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '#lib/utils.js';
import { LoadingSpinner } from './feedback/LoadingSpinner.js';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * ============================================================================
 * PHOTOX UNIFIED BUTTON COMPONENT (統一按鈕組件)
 * ============================================================================
 * 
 * 📌 [設計原則]
 * - 本組件為 PhotoX 全系統唯一、高畫質按鈕組件。
 * - 已整合 `src/components/shared/Button.tsx` 與 `src/components/ui/Button.tsx`。
 * - 嚴禁在其他目錄新增自訂 button 檔案，保持 UI 精緻度與品牌視覺一致性。
 * ============================================================================
 */
export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ref,
  ...props
}: ButtonProps) => {
  const normalizedVariant = variant === 'destructive' ? 'danger' : variant;

  const variants = {
    primary: "bg-brand-navy text-white hover:bg-slate-800 shadow-sm",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    outline: "bg-transparent border border-slate-200 text-slate-600 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs rounded-lg",
    md: "h-10 px-4 text-sm rounded-xl",
    lg: "h-12 px-6 text-base rounded-2xl",
    icon: "h-10 w-10 p-0 flex items-center justify-center rounded-xl",
  };

  const isLoading = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/20",
        variants[normalizedVariant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" variant="current" className="mr-1" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
