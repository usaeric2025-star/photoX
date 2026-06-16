import React, { useEffect, useRef } from 'react';
import { Spinner } from './Spinner';
import { cn } from '@/lib/utils';

/**
 * [COMPONENT] LoadingOverlay
 * Full-screen loading overlay.
 */
interface LoadingOverlayProps {
  isPending: boolean;
  message?: string;
  className?: string;
}

export const LoadingOverlay = ({ isPending, message, className }: LoadingOverlayProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogNode = ref.current;
    if (isPending && dialogNode && !dialogNode.open) {
      try {
        dialogNode.showModal();
      } catch (e) {
        console.warn('[LoadingOverlay] Failed to execute showModal, falling back to open attribute:', e);
        dialogNode.setAttribute('open', '');
      }
    } else if (!isPending && dialogNode && dialogNode.open) {
      try {
        dialogNode.close();
      } catch (e) {
        dialogNode.removeAttribute('open');
      }
    }
    
    return () => {
      if (dialogNode && dialogNode.open) {
        try {
          dialogNode.close();
        } catch (e) {
          dialogNode.removeAttribute('open');
        }
      }
    };
  }, [isPending]);

  return (
    <dialog 
      ref={ref}
      className={cn(
        "m-0 p-0 border-0 bg-transparent flex h-full max-h-none w-full max-w-none flex-col items-center justify-center outline-none backdrop:bg-black/40 backdrop:backdrop-blur-sm transition-opacity animate-in fade-in-0",
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
    </dialog>
  );
};
