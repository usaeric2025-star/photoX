import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

export const FullPageLoading = () => {
  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-[9999]"
      id="full-page-loading"
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
    </motion.div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }

  return content;
};
