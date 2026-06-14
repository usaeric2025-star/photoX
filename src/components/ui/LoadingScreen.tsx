import React, { useEffect, useRef } from 'react';

export const LoadingScreen = () => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const skeleton = document.getElementById('app-startup-skeleton');
    if (skeleton) {
      skeleton.style.opacity = '0';
      setTimeout(() => {
        skeleton.remove();
      }, 300);
    }
  }, []);

  useEffect(() => {
    const dialogNode = ref.current;
    if (dialogNode && !dialogNode.open) {
      try {
        dialogNode.showModal();
      } catch (e) {
        console.warn('[LoadingScreen] Failed to execute showModal, falling back to open attribute:', e);
        dialogNode.setAttribute('open', '');
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
  }, []);

  return (
    <dialog
      ref={ref}
      id="full-page-loading"
      className="m-0 p-0 border-0 bg-transparent flex h-full max-h-none w-full max-w-none items-center justify-center outline-none backdrop:bg-white/90 backdrop:backdrop-blur-sm"
    >
      <div className="text-brand-primary font-black tracking-widest text-sm animate-pulse-gentle">
        PHOT
        <span className="text-amber-500">O</span>
        X
      </div>
    </dialog>
  );
};
