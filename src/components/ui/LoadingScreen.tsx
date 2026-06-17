import React, { useEffect, useRef } from 'react';

export const LoadingScreen = () => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      if (!el.open) {
        el.showModal();
      }
    } catch (e) {
      console.warn('[LoadingScreen] Failed to show modal, fallback to open attribute:', e);
      el.setAttribute('open', '');
    }
    return () => {
      try {
        if (el && el.open) {
          el.close();
        }
      } catch (e) {
        if (el) el.removeAttribute('open');
      }
    };
  }, []);

  useEffect(() => {
    const skeleton = document.getElementById('app-startup-skeleton');
    if (skeleton) {
      skeleton.style.opacity = '0';
      setTimeout(() => {
        skeleton.remove();
      }, 300);
    }
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => e.preventDefault()}
      className="m-auto w-screen h-screen max-w-none max-h-none border-none outline-none p-0 flex items-center justify-center bg-white/90 backdrop:bg-white/90 backdrop:backdrop-blur-sm shadow-none animate-in fade-in duration-200"
      id="full-page-loading"
    >
      <div className="text-brand-primary font-black tracking-widest text-sm animate-pulse-gentle">
        PHOT
        <span className="text-amber-500">O</span>
        X
      </div>
    </dialog>
  );
};
