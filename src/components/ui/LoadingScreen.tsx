import React, { useEffect, useRef } from 'react';

export const LoadingScreen = () => {
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
    <div
      id="full-page-loading"
      className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex items-center justify-center"
    >
      <div className="text-brand-primary font-black tracking-widest text-sm animate-pulse-gentle">
        PHOT
        <span className="text-amber-500">O</span>
        X
      </div>
    </div>
  );
};
