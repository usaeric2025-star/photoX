import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

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
    if (ref.current && !ref.current.open) {
      ref.current.showModal();
    }
    return () => {
      if (ref.current && ref.current.open) {
        ref.current.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      id="full-page-loading"
      className="m-0 p-0 border-0 bg-transparent flex h-full max-h-none w-full max-w-none items-center justify-center outline-none backdrop:bg-white/90 backdrop:backdrop-blur-sm"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-blue-600 font-black tracking-widest text-sm"
      >
        PHOT
        <span className="text-amber-500">O</span>
        X
      </motion.div>
    </dialog>
  );
};
