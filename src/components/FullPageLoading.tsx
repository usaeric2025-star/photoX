import React from 'react';
import { motion } from 'motion/react';

export const FullPageLoading: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-brand-bg"
    >
      <div className="relative mb-8">
        <motion.div 
          className="w-20 h-20 border-[1px] border-brand-navy/10 rounded-full"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute inset-x-0 -top-1 mx-auto w-2 h-2 bg-brand-gold rounded-full"
          animate={{ rotate: 360 }}
          style={{ originY: "44px" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      
      <motion.div 
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-[0.3em]">
          Initializing
        </span>
        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />
      </motion.div>
    </motion.div>
  );
};
