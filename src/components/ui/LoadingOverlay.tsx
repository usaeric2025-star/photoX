import React from 'react';
import { Spinner } from './Spinner';
import { cn } from '@/lib/utils';

/**
 * [COMPONENT] LoadingOverlay
 * Full-screen loading overlay that uses the --z-dialog layer.
 */
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export const LoadingOverlay = ({ isLoading, message, className }: LoadingOverlayProps) => {
  if (!isLoading) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[var(--z-loading)] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in-0",
        className
      )}
    >
      <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {message && (
          <p className="text-sm font-medium text-slate-600 animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};
