import React, { useEffect, useRef } from 'react';

export const LoadingScreen = () => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const skeleton = document.getElementById('app-startup-skeleton');
    if (skeleton) {
      skeleton.style.opacity = '0';
      skeleton.style.transition = 'opacity 0.2s ease-out';
      // Use a shorter delay for skeleton removal
      const timer = setTimeout(() => {
        skeleton.remove();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (ref.current && !ref.current.open) {
      try {
        ref.current.showModal();
      } catch (e) {
        console.warn('[LoadingScreen] Failed to execute showModal, falling back to open attribute:', e);
        ref.current.setAttribute('open', '');
      }
    }
    return () => {
      if (ref.current && ref.current.open) {
        try {
          ref.current.close();
        } catch (e) {
          ref.current.removeAttribute('open');
        }
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      id="full-page-loading"
      className="m-0 p-0 border-0 bg-transparent flex h-full max-h-none w-full max-w-none items-center justify-center outline-none backdrop:bg-white/50"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="text-brand-primary font-black tracking-widest text-lg animate-pulse-gentle">
          PHOT
          <span className="text-amber-500">O</span>
          X
        </div>
        <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-primary w-1/3 animate-loading-slide" />
        </div>
      </div>
    </dialog>
  );
};
