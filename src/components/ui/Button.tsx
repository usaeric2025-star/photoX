import React from 'react';
import { LoadingSpinner } from './feedback/LoadingSpinner.js';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isLoading = loading || disabled;

  return (
    <button
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
        ${variant === 'secondary' ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : ''}
        ${variant === 'ghost' ? 'hover:bg-slate-100' : ''}
        ${variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
        ${size === 'sm' ? 'px-3 py-1.5 text-sm' : ''}
        ${size === 'md' ? 'px-4 py-2 text-sm' : ''}
        ${size === 'lg' ? 'px-6 py-3 text-base' : ''}
        ${size === 'icon' ? 'w-9 h-9 p-0' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && <LoadingSpinner size="xs" />}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
